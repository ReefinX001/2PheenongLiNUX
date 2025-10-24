/**
 * controllers/CreditNoteController.js - Controller สำหรับจัดการใบลดหนี้
 */

const CreditNote = require('../models/POS/CreditNote');
const DepositReceipt = require('../models/DepositReceipt');
const Counter = require('../models/POS/Counter');
const mongoose = require('mongoose');

class CreditNoteController {

  // สร้างเลขใบลดหนี้ CN-680819-001
  static async generateCreditNoteNumber() {
    const now = new Date();
    const year = String(now.getFullYear()).slice(-2); // 68 (2568 - 2500)
    const month = String(now.getMonth() + 1).padStart(2, '0'); // 08
    const day = String(now.getDate()).padStart(2, '0'); // 19
    const dateKey = `${year}${month}${day}`; // 680819

    const key = `CN-${dateKey}`;

    let doc = await Counter.findOne({ key });
    if (!doc) {
      doc = new Counter({ key, seq: 0 });
    }
    doc.seq = (Number(doc.seq) || 0) + 1;
    await doc.save();

    const seq3 = String(doc.seq).padStart(3, '0');
    return `CN-${dateKey}-${seq3}`; // CN-680819-001
  }

  // สร้างใบลดหนี้จากใบรับเงินมัดจำ
  static async createFromDepositReceipt(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const {
        depositReceiptId,
        creditAmount,
        creditReason,
        creditReasonText,
        refundMethod = 'CASH',
        refundDetails,
        notes
      } = req.body;

      const userId = req.user?.userId || req.user?.id;
      const userName = req.user?.userName || req.user?.name || 'Unknown';

      if (!depositReceiptId || !creditAmount || !creditReason || !creditReasonText) {
        return res.status(400).json({
          success: false,
          message: 'กรุณาระบุข้อมูลที่จำเป็น: depositReceiptId, creditAmount, creditReason, creditReasonText'
        });
      }

      // ตรวจสอบใบรับเงินมัดจำ
      const depositReceipt = await DepositReceipt.findById(depositReceiptId).session(session);
      if (!depositReceipt) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบใบรับเงินมัดจำ'
        });
      }

      // ตรวจสอบว่าจำนวนเงินลดหนี้ไม่เกินจำนวนที่ชำระ
      const depositAmount = depositReceipt.amounts?.depositAmount || 0;
      if (creditAmount > depositAmount) {
        return res.status(400).json({
          success: false,
          message: `จำนวนเงินลดหนี้ (${creditAmount.toLocaleString()}) ไม่สามารถเกินจำนวนเงินมัดจำ (${depositAmount.toLocaleString()}) ได้`
        });
      }

      // ตรวจสอบใบลดหนี้ที่มีอยู่แล้ว
      const existingCreditNotes = await CreditNote.find({
        depositReceiptId: depositReceiptId,
        status: { $in: ['PENDING', 'APPROVED'] }
      }).session(session);

      const totalExistingCredit = existingCreditNotes.reduce((sum, cn) => sum + cn.creditAmount, 0);
      if (totalExistingCredit + creditAmount > depositAmount) {
        return res.status(400).json({
          success: false,
          message: `จำนวนเงินลดหนี้รวม (${(totalExistingCredit + creditAmount).toLocaleString()}) ไม่สามารถเกินจำนวนเงินมัดจำ (${depositAmount.toLocaleString()}) ได้`
        });
      }

      // สร้างเลขใบลดหนี้
      const creditNoteNumber = await this.generateCreditNoteNumber();

      // สร้างใบลดหนี้ตาม schema ที่มีอยู่
      const creditNote = new CreditNote({
        creditNoteNumber,
        creditNoteDate: new Date(),
        depositReceiptId,
        depositReceiptNumber: depositReceipt.receiptNumber || depositReceipt.documentNumber,
        reason: creditReason === 'CANCELLATION' ? 'cancel_deposit' :
                creditReason === 'PARTIAL_REFUND' ? 'partial_refund' :
                creditReason === 'FULL_REFUND' ? 'partial_refund' : 'other',
        reasonDetail: creditReasonText,
        customerName: depositReceipt.customer?.name || 'ไม่ระบุ',
        customerAddress: typeof depositReceipt.customer?.address === 'object'
          ? depositReceipt.customer.address.fullAddress || JSON.stringify(depositReceipt.customer.address)
          : depositReceipt.customer?.address,
        customerPhone: depositReceipt.customer?.phone,
        customerTaxId: depositReceipt.customer?.taxId,
        items: [{
          productName: depositReceipt.product?.name || 'ไม่ระบุ',
          quantity: 1,
          pricePerUnit: depositReceipt.product?.price || 0,
          amount: creditAmount
        }],
        subtotal: creditAmount,
        afterDiscount: creditAmount,
        vatType: 'none',
        vatAmount: 0,
        totalAmount: creditAmount,
        refundMethod: refundMethod?.toLowerCase(),
        refundAmount: creditAmount,
        status: 'approved', // อนุมัติทันทีตาม schema เดิม
        createdBy: userId,
        branch_code: depositReceipt.branchCode || depositReceipt.branch?.code || BRANCH_CODE,
        notes: notes
      });

      await creditNote.save({ session });

      // อัปเดตสถานะใบรับเงินมัดจำ
      if (creditReason === 'CANCELLATION' || creditAmount === depositAmount) {
        depositReceipt.status = 'cancelled';
        await depositReceipt.save({ session });
      }

      await session.commitTransaction();

      return res.status(201).json({
        success: true,
        data: creditNote,
        message: `สร้างใบลดหนี้ ${creditNoteNumber} เรียบร้อยแล้ว`
      });

    } catch (error) {
      await session.abortTransaction();
      console.error('Error creating credit note:', error);

      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการสร้างใบลดหนี้',
        error: error.message
      });
    } finally {
      session.endSession();
    }
  }

  // ดึงรายการใบลดหนี้
  static async getCreditNotes(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        branchCode,
        status,
        search,
        startDate,
        endDate
      } = req.query;

      const query = {};

      // กรองตามสาขา
      if (branchCode) {
        query.branchCode = branchCode;
      }

      // กรองตามสถานะ
      if (status) {
        query.status = status;
      }

      // ค้นหา
      if (search) {
        query.$or = [
          { creditNoteNumber: new RegExp(search, 'i') },
          { depositReceiptNumber: new RegExp(search, 'i') },
          { 'customer.name': new RegExp(search, 'i') },
          { 'customer.phone': new RegExp(search, 'i') },
          { creditReasonText: new RegExp(search, 'i') }
        ];
      }

      // กรองตามวันที่
      if (startDate || endDate) {
        query.creditDate = {};
        if (startDate) query.creditDate.$gte = new Date(startDate);
        if (endDate) query.creditDate.$lte = new Date(endDate);
      }

      const skip = (page - 1) * limit;

      const [creditNotes, total] = await Promise.all([
        CreditNote.find(query)
          .populate('depositReceiptId', 'receiptNumber documentNumber')
          .populate('createdBy', 'name username')
          .populate('approvedBy', 'name username')
          .sort({ creditDate: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        CreditNote.countDocuments(query)
      ]);

      return res.json({
        success: true,
        data: creditNotes,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      });

    } catch (error) {
      console.error('Error getting credit notes:', error);
      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลใบลดหนี้',
        error: error.message
      });
    }
  }

  // ดึงใบลดหนี้ตาม ID
  static async getCreditNoteById(req, res) {
    try {
      const { id } = req.params;

      const creditNote = await CreditNote.findById(id)
        .populate('depositReceiptId')
        .populate('createdBy', 'name username')
        .populate('approvedBy', 'name username')
        .lean();

      if (!creditNote) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบใบลดหนี้'
        });
      }

      return res.json({
        success: true,
        data: creditNote
      });

    } catch (error) {
      console.error('Error getting credit note by ID:', error);
      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลใบลดหนี้',
        error: error.message
      });
    }
  }

  // อนุมัติใบลดหนี้
  static async approveCreditNote(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { id } = req.params;
      const { approvalNotes } = req.body;
      const userId = req.user?.userId || req.user?.id;
      const userName = req.user?.userName || req.user?.name || 'Unknown';

      const creditNote = await CreditNote.findById(id).session(session);
      if (!creditNote) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบใบลดหนี้'
        });
      }

      if (creditNote.status !== 'PENDING') {
        return res.status(400).json({
          success: false,
          message: 'ใบลดหนี้นี้ไม่สามารถอนุมัติได้'
        });
      }

      // อัปเดตสถานะ
      creditNote.status = 'APPROVED';
      creditNote.approvedBy = userId;
      creditNote.approvedByName = userName;
      creditNote.approvedAt = new Date();
      creditNote.approvalNotes = approvalNotes;

      await creditNote.save({ session });

      await session.commitTransaction();

      return res.json({
        success: true,
        data: creditNote,
        message: `อนุมัติใบลดหนี้ ${creditNote.creditNoteNumber} เรียบร้อยแล้ว`
      });

    } catch (error) {
      await session.abortTransaction();
      console.error('Error approving credit note:', error);

      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการอนุมัติใบลดหนี้',
        error: error.message
      });
    } finally {
      session.endSession();
    }
  }

  // ปฏิเสธใบลดหนี้
  static async rejectCreditNote(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { id } = req.params;
      const { rejectionReason } = req.body;
      const userId = req.user?.userId || req.user?.id;
      const userName = req.user?.userName || req.user?.name || 'Unknown';

      if (!rejectionReason) {
        return res.status(400).json({
          success: false,
          message: 'กรุณาระบุเหตุผลในการปฏิเสธ'
        });
      }

      const creditNote = await CreditNote.findById(id).session(session);
      if (!creditNote) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบใบลดหนี้'
        });
      }

      if (creditNote.status !== 'PENDING') {
        return res.status(400).json({
          success: false,
          message: 'ใบลดหนี้นี้ไม่สามารถปฏิเสธได้'
        });
      }

      // อัปเดตสถานะ
      creditNote.status = 'REJECTED';
      creditNote.approvedBy = userId;
      creditNote.approvedByName = userName;
      creditNote.approvedAt = new Date();
      creditNote.rejectionReason = rejectionReason;

      await creditNote.save({ session });

      await session.commitTransaction();

      return res.json({
        success: true,
        data: creditNote,
        message: `ปฏิเสธใบลดหนี้ ${creditNote.creditNoteNumber} เรียบร้อยแล้ว`
      });

    } catch (error) {
      await session.abortTransaction();
      console.error('Error rejecting credit note:', error);

      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการปฏิเสธใบลดหนี้',
        error: error.message
      });
    } finally {
      session.endSession();
    }
  }

  // ดึงใบลดหนี้สำหรับใบรับเงินมัดจำ
  static async getCreditNotesForDeposit(req, res) {
    try {
      const { depositReceiptId } = req.params;

      const creditNotes = await CreditNote.find({
        depositReceiptId: depositReceiptId
      })
      .populate('createdBy', 'name username')
      .populate('approvedBy', 'name username')
      .sort({ creditDate: -1 })
      .lean();

      return res.json({
        success: true,
        data: creditNotes
      });

    } catch (error) {
      console.error('Error getting credit notes for deposit:', error);
      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลใบลดหนี้',
        error: error.message
      });
    }
  }

  // ยกเลิกใบลดหนี้
  static async cancelCreditNote(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { id } = req.params;
      const userId = req.user?.userId || req.user?.id;

      const creditNote = await CreditNote.findById(id).session(session);
      if (!creditNote) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบใบลดหนี้'
        });
      }

      if (!['DRAFT', 'PENDING'].includes(creditNote.status)) {
        return res.status(400).json({
          success: false,
          message: 'ใบลดหนี้นี้ไม่สามารถยกเลิกได้'
        });
      }

      // ตรวจสอบสิทธิ์ (เฉพาะผู้สร้างหรือ admin)
      if (creditNote.createdBy.toString() !== userId) {
        const userRole = req.user?.role?.name;
        if (!userRole || !userRole.toLowerCase().includes('admin')) {
          return res.status(403).json({
            success: false,
            message: 'คุณไม่มีสิทธิ์ยกเลิกใบลดหนี้นี้'
          });
        }
      }

      creditNote.status = 'CANCELLED';
      await creditNote.save({ session });

      await session.commitTransaction();

      return res.json({
        success: true,
        data: creditNote,
        message: `ยกเลิกใบลดหนี้ ${creditNote.creditNoteNumber} เรียบร้อยแล้ว`
      });

    } catch (error) {
      await session.abortTransaction();
      console.error('Error cancelling credit note:', error);

      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการยกเลิกใบลดหนี้',
        error: error.message
      });
    } finally {
      session.endSession();
    }
  }
}

module.exports = CreditNoteController;
