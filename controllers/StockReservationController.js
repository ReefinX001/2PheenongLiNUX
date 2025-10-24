/**
 * controllers/StockReservationController.js - Controller สำหรับจัดการการจองสต็อกจากมัดจำ
 */

const StockReservation = require('../models/StockReservation');
const DepositReceipt = require('../models/DepositReceipt');
const BranchStock = require('../models/POS/BranchStock');
const mongoose = require('mongoose');

class StockReservationController {

  // สร้างการจองสต็อกจากใบรับเงินมัดจำ
  static async createReservationFromDeposit(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { depositReceiptId, expirationHours = 72 } = req.body;

      if (!depositReceiptId) {
        return res.status(400).json({
          success: false,
          message: 'กรุณาระบุ ID ใบรับเงินมัดจำ'
        });
      }

      // ดึงข้อมูลใบรับเงินมัดจำ
      const depositReceipt = await DepositReceipt.findById(depositReceiptId).session(session);
      if (!depositReceipt) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบใบรับเงินมัดจำ'
        });
      }

      // ตรวจสอบว่ามีการจองอยู่แล้วหรือไม่
      const existingReservation = await StockReservation.findOne({
        depositReceiptId: depositReceiptId,
        status: 'active'
      }).session(session);

      if (existingReservation) {
        return res.status(400).json({
          success: false,
          message: 'มีการจองสต็อกสำหรับใบรับเงินมัดจำนี้แล้ว',
          data: existingReservation
        });
      }

      // ตรวจสอบว่าสินค้ามีในสต็อกหรือไม่
      const stockItem = await BranchStock.findOne({
        _id: depositReceipt.product.id,
        branch_code: depositReceipt.branchCode,
        imei: depositReceipt.product.imei,
        stock_value: { $gt: 0 },
        verified: true
      }).session(session);

      if (!stockItem) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบสินค้าในสต็อกสาขา หรือสินค้าหมด',
          productInfo: {
            name: depositReceipt.product.name,
            imei: depositReceipt.product.imei,
            branchCode: depositReceipt.branchCode
          }
        });
      }

      // สร้างการจองสต็อก
      const reservation = await StockReservation.createFromDepositReceipt(
        depositReceipt,
        expirationHours
      );

      // อัปเดตสถานะใบรับเงินมัดจำ
      depositReceipt.status = 'stock_reserved';
      depositReceipt.tracking.stockChecked = true;
      depositReceipt.tracking.stockCheckedAt = new Date();
      depositReceipt.tracking.stockCheckedBy = req.user?._id;
      await depositReceipt.save({ session });

      await session.commitTransaction();

      res.json({
        success: true,
        message: 'จองสต็อกสำเร็จ',
        data: {
          reservation: {
            reservationId: reservation.reservationId,
            productName: reservation.productName,
            productImei: reservation.productImei,
            customerName: reservation.customerName,
            expiresAt: reservation.expiresAt,
            status: reservation.status
          },
          depositReceipt: {
            id: depositReceipt._id,
            status: depositReceipt.status
          }
        }
      });

    } catch (error) {
      await session.abortTransaction();
      console.error('Create reservation error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการจองสต็อก',
        error: error.message
      });
    } finally {
      session.endSession();
    }
  }

  // ใช้การจองสต็อก (เมื่อขายจริง)
  static async useReservation(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { reservationId, transactionId, saleType } = req.body;

      if (!reservationId || !transactionId) {
        return res.status(400).json({
          success: false,
          message: 'ข้อมูลไม่ครบถ้วน'
        });
      }

      // ค้นหาการจอง
      const reservation = await StockReservation.findOne({
        reservationId: reservationId,
        status: 'active'
      }).session(session);

      if (!reservation) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบการจองสต็อกหรือการจองหมดอายุแล้ว'
        });
      }

      // ตรวจสอบว่าหมดอายุหรือไม่
      if (reservation.isExpired) {
        reservation.status = 'expired';
        await reservation.save({ session });

        return res.status(400).json({
          success: false,
          message: 'การจองสต็อกหมดอายุแล้ว'
        });
      }

      // ตรวจสอบสต็อกอีกครั้ง
      const stockItem = await BranchStock.findOne({
        _id: reservation.productId,
        branch_code: reservation.branchCode,
        imei: reservation.productImei,
        stock_value: { $gt: 0 },
        verified: true
      }).session(session);

      if (!stockItem) {
        return res.status(404).json({
          success: false,
          message: 'สินค้าที่จองไม่มีในสต็อกแล้ว',
          productInfo: {
            name: reservation.productName,
            imei: reservation.productImei,
            branchCode: reservation.branchCode
          }
        });
      }

      // ใช้การจอง
      await reservation.use(
        req.user?._id,
        req.user?.name || 'ระบบ',
        transactionId
      );

      // ตัดสต็อก
      stockItem.stock_value = Math.max(0, stockItem.stock_value - 1);
      stockItem.updatedAt = new Date();
      await stockItem.save({ session });

      // อัปเดตใบรับเงินมัดจำ
      const depositReceipt = await DepositReceipt.findById(reservation.depositReceiptId).session(session);
      if (depositReceipt) {
        depositReceipt.status = 'completed';
        depositReceipt.completedAt = new Date();
        await depositReceipt.save({ session });
      }

      await session.commitTransaction();

      res.json({
        success: true,
        message: 'ใช้การจองสต็อกและตัดสต็อกสำเร็จ',
        data: {
          reservation: {
            reservationId: reservation.reservationId,
            status: reservation.status,
            usedAt: reservation.usedAt,
            transactionId: reservation.usedInTransaction
          },
          stock: {
            productName: stockItem.name,
            imei: stockItem.imei,
            remainingStock: stockItem.stock_value,
            branchCode: stockItem.branch_code
          }
        }
      });

    } catch (error) {
      await session.abortTransaction();
      console.error('Use reservation error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการใช้การจองสต็อก',
        error: error.message
      });
    } finally {
      session.endSession();
    }
  }

  // ยกเลิกการจองสต็อก
  static async cancelReservation(req, res) {
    try {
      const { reservationId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: 'กรุณาระบุเหตุผลในการยกเลิก'
        });
      }

      const reservation = await StockReservation.findOne({
        reservationId: reservationId,
        status: 'active'
      });

      if (!reservation) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบการจองสต็อกหรือถูกยกเลิกแล้ว'
        });
      }

      await reservation.cancel(
        req.user?._id,
        req.user?.name || 'ระบบ',
        reason
      );

      res.json({
        success: true,
        message: 'ยกเลิกการจองสต็อกสำเร็จ',
        data: {
          reservationId: reservation.reservationId,
          status: reservation.status,
          cancelledAt: reservation.cancelledAt,
          reason: reservation.cancellationReason
        }
      });

    } catch (error) {
      console.error('Cancel reservation error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการยกเลิกการจองสต็อก',
        error: error.message
      });
    }
  }

  // ดึงรายการการจองสต็อก
  static async getReservations(req, res) {
    try {
      const {
        branchCode,
        status,
        page = 1,
        limit = 20,
        search,
        includeExpired = false
      } = req.query;

      let query = {};

      if (branchCode) {
        query.branchCode = branchCode;
      }

      if (status) {
        query.status = status;
      } else if (!includeExpired) {
        query.status = { $ne: 'expired' };
      }

      if (search) {
        query.$or = [
          { customerName: { $regex: search, $options: 'i' } },
          { productName: { $regex: search, $options: 'i' } },
          { productImei: { $regex: search, $options: 'i' } },
          { reservationId: { $regex: search, $options: 'i' } },
          { depositReceiptNumber: { $regex: search, $options: 'i' } }
        ];
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const limitNum = parseInt(limit);

      const totalDocs = await StockReservation.countDocuments(query);
      const totalPages = Math.ceil(totalDocs / limitNum);

      const reservations = await StockReservation.find(query)
        .populate('depositReceiptId', 'receiptNumber documentNumber status')
        .populate('createdBy', 'name email')
        .populate('usedBy', 'name email')
        .populate('cancelledBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

      res.json({
        success: true,
        data: reservations,
        pagination: {
          currentPage: parseInt(page),
          totalPages: totalPages,
          totalDocs: totalDocs,
          limit: limitNum,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        }
      });

    } catch (error) {
      console.error('Get reservations error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการจองสต็อก',
        error: error.message
      });
    }
  }

  // ตรวจสอบการจองสต็อกสำหรับสินค้า
  static async checkReservation(req, res) {
    try {
      const { imei, branchCode } = req.params;

      const reservation = await StockReservation.findActiveByImei(imei, branchCode);

      if (!reservation) {
        return res.json({
          success: true,
          reserved: false,
          message: 'สินค้าไม่มีการจอง'
        });
      }

      res.json({
        success: true,
        reserved: true,
        data: {
          reservationId: reservation.reservationId,
          customerName: reservation.customerName,
          customerPhone: reservation.customerPhone,
          depositReceiptNumber: reservation.depositReceiptNumber,
          depositAmount: reservation.depositAmount,
          expiresAt: reservation.expiresAt,
          timeRemaining: reservation.timeRemaining,
          isExpired: reservation.isExpired
        }
      });

    } catch (error) {
      console.error('Check reservation error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการตรวจสอบการจองสต็อก',
        error: error.message
      });
    }
  }

  // ดึงข้อมูลการจองจากใบรับเงินมัดจำ
  static async getReservationByDepositReceipt(req, res) {
    try {
      const { depositReceiptId } = req.params;

      const reservations = await StockReservation.findByDepositReceipt(depositReceiptId);

      res.json({
        success: true,
        data: reservations,
        count: reservations.length
      });

    } catch (error) {
      console.error('Get reservation by deposit receipt error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการจอง',
        error: error.message
      });
    }
  }

  // ขยายเวลาการจอง
  static async extendReservation(req, res) {
    try {
      const { reservationId } = req.params;
      const { additionalHours = 24 } = req.body;

      const reservation = await StockReservation.findOne({
        reservationId: reservationId,
        status: 'active'
      });

      if (!reservation) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบการจองสต็อกที่ใช้งานได้'
        });
      }

      await reservation.extend(additionalHours);

      res.json({
        success: true,
        message: 'ขยายเวลาการจองสำเร็จ',
        data: {
          reservationId: reservation.reservationId,
          newExpiresAt: reservation.expiresAt,
          additionalHours: additionalHours
        }
      });

    } catch (error) {
      console.error('Extend reservation error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการขยายเวลาการจอง',
        error: error.message
      });
    }
  }

  // รายงานการจองสต็อก
  static async getReservationReport(req, res) {
    try {
      const { branchCode, startDate, endDate } = req.query;

      let query = {};

      if (branchCode) {
        query.branchCode = branchCode;
      }

      if (startDate && endDate) {
        query.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      const reservations = await StockReservation.find(query)
        .populate('depositReceiptId', 'receiptNumber documentNumber')
        .sort({ createdAt: -1 });

      // สรุปข้อมูล
      const summary = {
        total: reservations.length,
        active: reservations.filter(r => r.status === 'active').length,
        used: reservations.filter(r => r.status === 'used').length,
        expired: reservations.filter(r => r.status === 'expired').length,
        cancelled: reservations.filter(r => r.status === 'cancelled').length,
        totalValue: reservations.reduce((sum, r) => sum + r.totalAmount, 0),
        totalDeposit: reservations.reduce((sum, r) => sum + r.depositAmount, 0)
      };

      res.json({
        success: true,
        data: {
          reservations,
          summary
        }
      });

    } catch (error) {
      console.error('Get reservation report error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงรายงาน',
        error: error.message
      });
    }
  }

  // ทำความสะอาดการจองที่หมดอายุ
  static async cleanupExpiredReservations(req, res) {
    try {
      const now = new Date();

      const expiredReservations = await StockReservation.updateMany(
        {
          status: 'active',
          expiresAt: { $lt: now }
        },
        {
          status: 'expired',
          updatedAt: now
        }
      );

      res.json({
        success: true,
        message: 'ทำความสะอาดการจองที่หมดอายุเรียบร้อย',
        data: {
          expiredCount: expiredReservations.modifiedCount,
          cleanupTime: now
        }
      });

    } catch (error) {
      console.error('Cleanup expired reservations error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการทำความสะอาด',
        error: error.message
      });
    }
  }
}

module.exports = StockReservationController;
