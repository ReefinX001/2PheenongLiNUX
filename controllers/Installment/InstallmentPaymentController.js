/**
 * controllers/Installment/InstallmentPaymentController.js - Controller สำหรับการชำระค่างวดผ่อน
 */

const InstallmentPayment = require('../../models/Installment/InstallmentPayment');
const InstallmentOrder = require('../../models/Installment/InstallmentOrder');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs').promises;

class InstallmentPaymentController {

  // บันทึกการชำระค่างวด
  static async recordPayment(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const {
        contractId,
        installmentNumber,
        totalAmount,
        paymentDate,
        paymentMethod,
        cashAmount,
        changeAmount,
        mixedPayment,
        transferDetails,
        notes
      } = req.body;

      // รองรับทั้งชื่อเก่าและใหม่
      const amount = totalAmount || req.body.amount;

      // Validate required fields
      if (!contractId || !installmentNumber || !amount || !paymentMethod) {
        return res.status(400).json({
          success: false,
          message: 'ข้อมูลไม่ครบถ้วน'
        });
      }

      // ดึงข้อมูลสัญญา
      const contract = await InstallmentOrder.findById(contractId).session(session);
      if (!contract) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบข้อมูลสัญญา'
        });
      }

      // ตรวจสอบว่างวดนี้ชำระแล้วหรือยัง
      const existingPayment = await InstallmentPayment.findOne({
        contractId,
        installmentNumber,
        status: 'confirmed'
      }).session(session);

      if (existingPayment) {
        return res.status(400).json({
          success: false,
          message: `งวดที่ ${installmentNumber} ชำระแล้ว`
        });
      }

      // Validate payment method
      if (!['cash', 'transfer', 'card', 'mixed'].includes(paymentMethod)) {
        return res.status(400).json({
          success: false,
          message: 'วิธีการชำระไม่ถูกต้อง (รองรับ: cash, transfer, card, mixed)'
        });
      }

      // Validate mixed payment
      if (paymentMethod === 'mixed') {
        if (!mixedPayment) {
          return res.status(400).json({
            success: false,
            message: 'ข้อมูลการชำระแบบผสมไม่ครบถ้วน'
          });
        }

        // รองรับการชำระผสม 3 ช่องทาง: เงินสด, โอนเงิน, บัตรเครดิต
        const cashAmount = parseFloat(mixedPayment.cashAmount || mixedPayment.cash || 0);
        const transferAmount = parseFloat(mixedPayment.transferAmount || mixedPayment.transfer || 0);
        const cardAmount = parseFloat(mixedPayment.cardAmount || mixedPayment.card || 0);

        const totalMixed = cashAmount + transferAmount + cardAmount;

        if (totalMixed === 0) {
          return res.status(400).json({
            success: false,
            message: 'กรุณาระบุจำนวนเงินอย่างน้อย 1 ช่องทาง'
          });
        }

        if (Math.abs(totalMixed - parseFloat(amount)) > 0.01) {
          return res.status(400).json({
            success: false,
            message: `ยอดรวมการชำระแบบผสม (${totalMixed.toFixed(2)}) ไม่ตรงกับยอดที่ต้องชำระ (${parseFloat(amount).toFixed(2)})`
          });
        }
      }

      // สร้างข้อมูลการชำระ
      const paymentData = {
        contractId,
        contractNumber: contract.contractNumber,
        customerId: contract.customerId,
        customerName: contract.customer_info ?
          `${contract.customer_info.prefix || ''} ${contract.customer_info.firstName || ''} ${contract.customer_info.lastName || ''}`.trim() :
          contract.displayCustomerName || 'ไม่ระบุ',
        customerPhone: contract.customer_info?.phone || 'ไม่ระบุ',
        installmentNumber: parseInt(installmentNumber),
        dueDate: contract.installmentSchedule[installmentNumber - 1]?.dueDate || new Date(),
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        amount: parseFloat(amount),
        paymentMethod,
        notes,
        branchCode: req.user?.branchCode || contract.branchCode || '00000',
        branchName: req.user?.branchName || contract.branchName || 'สำนักงานใหญ่',
        recordedBy: req.user?._id,
        recordedByName: req.user?.name || 'ระบบ'
      };

      // เพิ่มข้อมูลการชำระเงินสด
      if (paymentMethod === 'cash') {
        paymentData.cashDetails = {
          cashAmount: parseFloat(cashAmount) || parseFloat(amount),
          changeAmount: parseFloat(changeAmount) || 0
        };
      }

      // เพิ่มข้อมูลการชำระแบบผสม
      if (paymentMethod === 'mixed' && mixedPayment) {
        paymentData.mixedPayment = {
          cashAmount: parseFloat(mixedPayment.cashAmount || mixedPayment.cash || 0),
          transferAmount: parseFloat(mixedPayment.transferAmount || mixedPayment.transfer || 0),
          cardAmount: parseFloat(mixedPayment.cardAmount || mixedPayment.card || 0),
          total: parseFloat(mixedPayment.total || amount)
        };
      }

      // เพิ่มข้อมูลการโอนเงิน
      if ((paymentMethod === 'transfer' || paymentMethod === 'mixed') && transferDetails) {
        // แปลง bank code เป็นชื่อธนาคาร
        const bankNames = {
          'kbank': 'ธนาคารกสิกรไทย',
          'scb': 'ธนาคารไทยพาณิชย์',
          'bbl': 'ธนาคารกรุงเทพ',
          'ktb': 'ธนาคารกรุงไทย',
          'tmb': 'ธนาคารทหารไทยธนชาต',
          'bay': 'ธนาคารกรุงศรีอยุธยา',
          'gsb': 'ธนาคารออมสิน',
          'other': 'ธนาคารอื่นๆ'
        };

        paymentData.transferDetails = {
          bankName: bankNames[transferDetails.bank] || transferDetails.bankName || 'ไม่ระบุธนาคาร',
          bankCode: transferDetails.bank,
          accountNumber: transferDetails.accountNumber,
          transferTime: transferDetails.transferTime ? new Date(transferDetails.transferTime) : new Date(),
          referenceNumber: transferDetails.referenceNumber
        };
      }

      // สร้างการชำระใหม่
      const payment = new InstallmentPayment(paymentData);
      await payment.save({ session });

      // อัปเดตสถานะสัญญา
      const installmentIndex = installmentNumber - 1;
      if (contract.installmentSchedule[installmentIndex]) {
        contract.installmentSchedule[installmentIndex].paidAmount = parseFloat(amount);
        contract.installmentSchedule[installmentIndex].paidDate = payment.paymentDate;
        contract.installmentSchedule[installmentIndex].status = 'paid';
        contract.installmentSchedule[installmentIndex].paymentId = payment._id;
      }

      // คำนวณยอดที่ชำระแล้วทั้งหมด
      const totalPaid = contract.installmentSchedule.reduce((sum, inst) => {
        return sum + (inst.paidAmount || 0);
      }, 0);

      contract.paidAmount = totalPaid;
      contract.remainingAmount = contract.totalAmount - totalPaid;

      // ตรวจสอบว่าชำระครบแล้วหรือยัง
      const allPaid = contract.installmentSchedule.every(inst => inst.status === 'paid');
      if (allPaid) {
        contract.status = 'completed';
        contract.completedAt = new Date();
      } else {
        contract.status = 'active';
      }

      contract.updatedAt = new Date();
      await contract.save({ session });

      await session.commitTransaction();

      res.json({
        success: true,
        message: 'บันทึกการชำระเรียบร้อย',
        data: {
          payment: {
            paymentId: payment.paymentId,
            contractId: payment.contractId,
            installmentNumber: payment.installmentNumber,
            amount: payment.amount,
            paymentMethod: payment.paymentMethod,
            paymentMethodDisplay: payment.paymentMethodDisplay,
            paymentDate: payment.paymentDate,
            status: payment.status,
            cashDetails: payment.cashDetails,
            mixedPayment: payment.mixedPayment,
            transferDetails: payment.transferDetails,
            notes: payment.notes,
            createdAt: payment.createdAt
          },
          contract: {
            id: contract._id,
            contractNumber: contract.contractNumber,
            status: contract.status,
            paidAmount: contract.paidAmount,
            remainingAmount: contract.remainingAmount,
            completedInstallments: contract.installmentSchedule.filter(inst => inst.status === 'paid').length,
            totalInstallments: contract.installmentSchedule.length
          }
        }
      });

    } catch (error) {
      await session.abortTransaction();
      console.error('Record payment error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการบันทึกการชำระ',
        error: error.message
      });
    } finally {
      session.endSession();
    }
  }

  // อัปโหลดสลิปโอนเงิน
  static async uploadTransferSlip(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'ไม่พบไฟล์สลิป'
        });
      }

      const { paymentId } = req.params;

      // ค้นหาการชำระ
      const payment = await InstallmentPayment.findOne({ paymentId });
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบข้อมูลการชำระ'
        });
      }

      // สร้างโฟลเดอร์สำหรับเก็บสลิป
      const uploadDir = path.join(__dirname, '../../uploads/transfer-slips');
      await fs.mkdir(uploadDir, { recursive: true });

      // สร้างชื่อไฟล์ใหม่
      const fileExt = path.extname(req.file.originalname);
      const fileName = `slip-${paymentId}-${Date.now()}${fileExt}`;
      const filePath = path.join(uploadDir, fileName);

      // บันทึกไฟล์
      await fs.writeFile(filePath, req.file.buffer);

      // อัปเดตข้อมูลการชำระ
      if (payment.paymentMethod === 'transfer') {
        if (!payment.transferDetails) {
          payment.transferDetails = {};
        }
        payment.transferDetails.slipImage = {
          fileName,
          filePath: `/uploads/transfer-slips/${fileName}`,
          originalName: req.file.originalname,
          fileSize: req.file.size,
          uploadedAt: new Date()
        };
      } else if (payment.paymentMethod === 'mixed') {
        if (!payment.mixedPayment) {
          payment.mixedPayment = {};
        }
        payment.mixedPayment.transferSlip = {
          fileName,
          filePath: `/uploads/transfer-slips/${fileName}`,
          originalName: req.file.originalname,
          fileSize: req.file.size,
          uploadedAt: new Date()
        };
      }

      await payment.save();

      res.json({
        success: true,
        message: 'อัปโหลดสลิปเรียบร้อย',
        data: {
          fileName,
          filePath: `/uploads/transfer-slips/${fileName}`
        }
      });

    } catch (error) {
      console.error('Upload slip error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการอัปโหลดสลิป',
        error: error.message
      });
    }
  }

  // ดึงประวัติการชำระ
  static async getPaymentHistory(req, res) {
    try {
      const { contractId } = req.params;
      const { page = 1, limit = 20, status } = req.query;

      const options = {
        limit: parseInt(limit),
        status
      };

      const payments = await InstallmentPayment.getPaymentHistory(contractId, options);

      res.json({
        success: true,
        data: payments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: payments.length
        }
      });

    } catch (error) {
      console.error('Get payment history error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงประวัติการชำระ',
        error: error.message
      });
    }
  }

  // ยกเลิกการชำระ
  static async cancelPayment(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { paymentId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: 'กรุณาระบุเหตุผลในการยกเลิก'
        });
      }

      // ค้นหาการชำระ
      const payment = await InstallmentPayment.findOne({ paymentId }).session(session);
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบข้อมูลการชำระ'
        });
      }

      if (payment.status === 'cancelled') {
        return res.status(400).json({
          success: false,
          message: 'การชำระนี้ถูกยกเลิกแล้ว'
        });
      }

      // ยกเลิกการชำระ
      await payment.cancel(req.user?._id, reason);

      // อัปเดตสถานะสัญญา
      const contract = await InstallmentOrder.findById(payment.contractId).session(session);
      if (contract) {
        const installmentIndex = payment.installmentNumber - 1;
        if (contract.installmentSchedule[installmentIndex]) {
          contract.installmentSchedule[installmentIndex].paidAmount = 0;
          contract.installmentSchedule[installmentIndex].paidDate = null;
          contract.installmentSchedule[installmentIndex].status = 'pending';
          contract.installmentSchedule[installmentIndex].paymentId = null;
        }

        // คำนวณยอดที่ชำระแล้วใหม่
        const totalPaid = contract.installmentSchedule.reduce((sum, inst) => {
          return sum + (inst.paidAmount || 0);
        }, 0);

        contract.paidAmount = totalPaid;
        contract.remainingAmount = contract.totalAmount - totalPaid;
        contract.status = 'active';
        contract.updatedAt = new Date();

        await contract.save({ session });
      }

      await session.commitTransaction();

      res.json({
        success: true,
        message: 'ยกเลิกการชำระเรียบร้อย',
        data: {
          paymentId: payment.paymentId,
          status: payment.status
        }
      });

    } catch (error) {
      await session.abortTransaction();
      console.error('Cancel payment error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการยกเลิกการชำระ',
        error: error.message
      });
    } finally {
      session.endSession();
    }
  }

  // ดึงรายงานการชำระตามช่วงวันที่
  static async getPaymentReport(req, res) {
    try {
      const { startDate, endDate, branchCode, paymentMethod } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'กรุณาระบุช่วงวันที่'
        });
      }

      let query = {
        paymentDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        },
        status: 'confirmed'
      };

      if (branchCode) {
        query.branchCode = branchCode;
      }

      if (paymentMethod) {
        query.paymentMethod = paymentMethod;
      }

      const payments = await InstallmentPayment.find(query)
        .populate('contractId', 'contractNumber customerName')
        .populate('recordedBy', 'name')
        .sort({ paymentDate: -1 });

      // สรุปข้อมูล
      const summary = {
        totalPayments: payments.length,
        totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
        byMethod: {
          cash: payments.filter(p => p.paymentMethod === 'cash').reduce((sum, p) => sum + p.amount, 0),
          transfer: payments.filter(p => p.paymentMethod === 'transfer').reduce((sum, p) => sum + p.amount, 0),
          mixed: payments.filter(p => p.paymentMethod === 'mixed').reduce((sum, p) => sum + p.amount, 0)
        },
        byBranch: {}
      };

      // สรุปตามสาขา
      payments.forEach(payment => {
        if (!summary.byBranch[payment.branchCode]) {
          summary.byBranch[payment.branchCode] = {
            branchName: payment.branchName,
            count: 0,
            amount: 0
          };
        }
        summary.byBranch[payment.branchCode].count++;
        summary.byBranch[payment.branchCode].amount += payment.amount;
      });

      res.json({
        success: true,
        data: {
          payments,
          summary
        }
      });

    } catch (error) {
      console.error('Get payment report error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงรายงาน',
        error: error.message
      });
    }
  }

  // ดึงข้อมูลการชำระตาม ID
  static async getPaymentById(req, res) {
    try {
      const { paymentId } = req.params;

      const payment = await InstallmentPayment.findOne({ paymentId })
        .populate('contractId', 'contractNumber customerName customerPhone')
        .populate('recordedBy', 'name email')
        .populate('cancelledBy', 'name email');

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบข้อมูลการชำระ'
        });
      }

      res.json({
        success: true,
        data: payment
      });

    } catch (error) {
      console.error('Get payment by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการชำระ',
        error: error.message
      });
    }
  }

  // ดึงรายละเอียดสัญญาพร้อมตารางการชำระ
  static async getContractWithPaymentSchedule(req, res) {
    try {
      const { contractId } = req.params;

      const InstallmentOrder = require('../../models/Installment/InstallmentOrder');

      // ดึงข้อมูลสัญญา
      const contract = await InstallmentOrder.findById(contractId)
        .populate('customer', 'name phone email')
        .lean();

      if (!contract) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบข้อมูลสัญญา'
        });
      }

      // ดึงประวัติการชำระ
      const payments = await InstallmentPayment.find({
        contractId: contractId,
        status: { $ne: 'cancelled' }
      }).sort({ installmentNumber: 1 }).lean();

      // สร้างตารางการชำระ
      const installmentSchedule = [];
      for (let i = 1; i <= (contract.installmentCount || 0); i++) {
        const payment = payments.find(p => p.installmentNumber === i);
        const dueDate = new Date(contract.createdAt);
        dueDate.setMonth(dueDate.getMonth() + i - 1);

        installmentSchedule.push({
          installmentNumber: i,
          dueDate: dueDate.toISOString().split('T')[0],
          amount: contract.monthlyPayment || contract.amountPerInstallment || 0,
          status: payment ? (payment.status === 'confirmed' ? 'ชำระแล้ว' : payment.status) : 'รอชำระ',
          paidDate: payment?.paymentDate ? payment.paymentDate.toISOString().split('T')[0] : null,
          paymentMethod: payment?.paymentMethodDisplay || null,
          paymentId: payment?.paymentId || null
        });
      }

      // Transform data
      const transformedContract = {
        _id: contract._id,
        contractNumber: contract.contractNumber,
        customerName: contract.customer_info ?
          `${contract.customer_info.prefix || ''} ${contract.customer_info.firstName || ''} ${contract.customer_info.lastName || ''}`.trim() :
          contract.displayCustomerName || 'ไม่ระบุ',
        customerPhone: contract.customer_info?.phone || 'ไม่ระบุ',
        customerIdCard: contract.customer_info?.taxId,
        customerEmail: contract.customer_info?.email,
        customerAddress: contract.customer_info?.address,
        type: contract.installmentType || contract.planType || 'INSTALLMENT',
        startDate: contract.createdAt,
        endDate: null,
        status: contract.status || 'ongoing',
        totalAmount: contract.totalAmount || contract.finalTotalAmount || 0,
        downPayment: contract.downPayment || 0,
        financeAmount: (contract.totalAmount || 0) - (contract.downPayment || 0),
        monthlyAmount: contract.monthlyPayment || contract.amountPerInstallment || 0,
        totalInstallments: contract.installmentCount || 0,
        paidInstallments: payments.filter(p => p.status === 'confirmed').length,
        paidAmount: contract.paidAmount || 0,
        remainingAmount: contract.remainingAmount || 0,
        products: (contract.items || []).map(item => ({
          name: item.name || 'ไม่ระบุสินค้า',
          description: `IMEI: ${item.imei || 'ไม่ระบุ'}`,
          price: item.pricePayOff || item.price || 0,
          quantity: item.qty || 1,
          imei: item.imei || ''
        })),
        payments: installmentSchedule
      };

      res.json({
        success: true,
        data: transformedContract
      });

    } catch (error) {
      console.error('Error getting contract with payment schedule:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสัญญา',
        error: error.message
      });
    }
  }
}

module.exports = InstallmentPaymentController;
