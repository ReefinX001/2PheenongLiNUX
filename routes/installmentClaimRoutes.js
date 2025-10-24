// routes/installmentClaimRoutes.js

const express = require('express');
const router = express.Router();
const InstallmentOrder = require('../models/Installment/InstallmentOrder');
const InstallmentCustomer = require('../models/Installment/InstallmentCustomer');
const InstallmentPayment = require('../models/Installment/InstallmentPayment');
const auth = require('../middlewares/auth');

/**
 * GET /api/claim-items
 * รายการทั้งหมดของผ่อนไปใช้ไปและผ่อนหมดรับของ
 */
router.get('/', auth, async (req, res) => {
  try {
    const { type, status, search, startDate, endDate } = req.query;

    // สร้างเงื่อนไขในการค้นหา
    const query = { deleted_at: null };

    // กรองตามประเภท (ผ่อนไปใช้ไป/ผ่อนหมดรับของ)
    if (type === 'pay-as-you-go') {
      query.installmentType = 'pay-as-you-go';
    } else if (type === 'pay-in-full') {
      query.installmentType = 'pay-in-full';
    }

    // กรองตามสถานะ
    if (status) {
      query.status = status;
    }

    // กรองตามคำค้นหา (ชื่อลูกค้า, เลขสัญญา)
    if (search) {
      query.$or = [
        { contractNo: { $regex: search, $options: 'i' } },
        { 'customer.fullName': { $regex: search, $options: 'i' } },
        { 'customer.phone': { $regex: search, $options: 'i' } }
      ];
    }

    // กรองตามวันที่
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // ดึงข้อมูลจากฐานข้อมูล
    const installments = await InstallmentOrder.find(query)
      .populate('customer_id')
      .sort({ createdAt: -1 });

    // สำหรับแต่ละรายการ ดึงข้อมูลเพิ่มเติมเช่น การชำระเงินล่าสุด
    const enhancedInstallments = await Promise.all(installments.map(async (item) => {
      const payments = await InstallmentPayment.find({
        installmentOrder: item._id,
        deleted_at: null
      }).sort({ paymentDate: -1 });

      const paidCount = payments.length;
      const totalPaid = payments.reduce((sum, payment) => sum + payment.amountPaid, 0);

      return {
        ...item.toObject(),
        paidCount,
        totalPaid,
        lastPayment: payments[0] || null
      };
    }));

    return res.json({
      success: true,
      data: enhancedInstallments
    });
  } catch (error) {
    console.error('Error fetching installment claims:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
    });
  }
});

/**
 * POST /api/claim-items
 * สร้างรายการผ่อนไปใช้ไปหรือผ่อนหมดรับของใหม่
 */
router.post('/', auth, async (req, res) => {
  try {
    const {
      customerData,
      productData,
      installmentType, // 'pay-as-you-go' หรือ 'pay-in-full'
      totalAmount,
      downPayment,
      installmentCount,
      monthlyPayment,
      startDate,
      interestRate
    } = req.body;

    // 1. สร้างหรือค้นหาข้อมูลลูกค้า
    let customer = await InstallmentCustomer.findOne({
      idCardNumber: customerData.idCardNumber
    });

    if (!customer) {
      customer = new InstallmentCustomer({
        fullName: customerData.fullName,
        phone: customerData.phone,
        idCardNumber: customerData.idCardNumber,
        address: customerData.address
      });
      await customer.save();
    }

    // 2. สร้างรายการสัญญาผ่อน
    const contractNo = await getNextContractNo(); // ใช้ฟังก์ชันจาก installmentController

    const installmentOrder = new InstallmentOrder({
      contractNo,
      customer_id: customer._id,
      products: productData,
      installmentType,
      totalAmount,
      downPayment: downPayment || 0,
      financedAmount: totalAmount - (downPayment || 0),
      installmentCount,
      monthlyPayment,
      startDate: new Date(startDate),
      interestRate: interestRate || 0,
      status: 'ACTIVE',
      created_by: req.user._id
    });

    await installmentOrder.save();

    // 3. สร้างรายการชำระเงินดาวน์ (ถ้ามี)
    if (downPayment && downPayment > 0) {
      const downPaymentRecord = new InstallmentPayment({
        installmentOrder: installmentOrder._id,
        installmentNumber: 0, // 0 = ดาวน์
        dueDate: new Date(startDate),
        paymentDate: new Date(),
        amountDue: downPayment,
        amountPaid: downPayment,
        paymentMethod: 'cash', // หรือตามที่ระบุ
        note: 'down payment',
        status: 'PAID',
        created_by: req.user._id
      });

      await downPaymentRecord.save();
    }

    return res.status(201).json({
      success: true,
      message: 'สร้างสัญญาใหม่สำเร็จ',
      data: {
        contractNo,
        installmentId: installmentOrder._id
      }
    });
  } catch (error) {
    console.error('Error creating new installment claim:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างสัญญา'
    });
  }
});

/**
 * GET /api/claim-items/:id
 * ดึงข้อมูลสัญญาและประวัติการชำระรายการเดียว
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // ดึงข้อมูลสัญญา
    const installmentOrder = await InstallmentOrder.findById(id)
      .populate('customer_id')
      .populate('created_by');

    if (!installmentOrder) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลสัญญา'
      });
    }

    // ดึงประวัติการชำระ
    const paymentHistory = await InstallmentPayment.find({
      installmentOrder: id,
      deleted_at: null
    }).sort({ installmentNumber: 1 });

    // คำนวณสรุป
    const paidCount = paymentHistory.filter(p => p.installmentNumber > 0).length;
    const totalPaid = paymentHistory.reduce((sum, p) => {
      if (p.installmentNumber > 0) { // ไม่รวมเงินดาวน์
        return sum + p.amountPaid;
      }
      return sum;
    }, 0);

    // ดึงเงินดาวน์ (ถ้ามี)
    const downPaymentRecord = paymentHistory.find(p => p.installmentNumber === 0);
    const downPayment = downPaymentRecord ? downPaymentRecord.amountPaid : 0;

    // ตรวจสอบว่าชำระครบหรือยัง
    const isComplete = paidCount >= installmentOrder.installmentCount;

    return res.json({
      success: true,
      data: {
        contract: installmentOrder,
        paymentHistory,
        summary: {
          paidCount,
          totalPaid,
          downPayment,
          remainingAmount: installmentOrder.financedAmount - totalPaid,
          remainingInstallments: installmentOrder.installmentCount - paidCount,
          isComplete
        }
      }
    });
  } catch (error) {
    console.error('Error fetching installment claim details:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
    });
  }
});

/**
 * POST /api/claim-items/:id/payment
 * บันทึกการชำระเงินงวดใหม่
 */
router.post('/:id/payment', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      installmentNumber,
      paymentDate,
      amountPaid,
      paymentMethod,
      note
    } = req.body;

    // ตรวจสอบว่าสัญญามีอยู่จริง
    const installmentOrder = await InstallmentOrder.findById(id);
    if (!installmentOrder) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลสัญญา'
      });
    }

    // ตรวจสอบว่าไม่เคยชำระงวดนี้มาก่อน
    const existingPayment = await InstallmentPayment.findOne({
      installmentOrder: id,
      installmentNumber,
      deleted_at: null
    });

    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: 'งวดนี้มีการบันทึกชำระเงินแล้ว'
      });
    }

    // คำนวณวันที่ครบกำหนดชำระ
    const dueDate = new Date(installmentOrder.startDate);
    dueDate.setMonth(dueDate.getMonth() + installmentNumber - 1);

    // บันทึกการชำระ
    const payment = new InstallmentPayment({
      installmentOrder: id,
      installmentNumber,
      dueDate,
      paymentDate: new Date(paymentDate),
      amountDue: installmentOrder.monthlyPayment,
      amountPaid,
      paymentMethod,
      note,
      status: 'PAID',
      created_by: req.user._id
    });

    await payment.save();

    // ตรวจสอบว่าชำระครบทุกงวดหรือยัง
    const paymentHistory = await InstallmentPayment.find({
      installmentOrder: id,
      installmentNumber: { $gt: 0 }, // ไม่รวมดาวน์
      deleted_at: null
    });

    if (paymentHistory.length >= installmentOrder.installmentCount) {
      installmentOrder.status = 'COMPLETED';
      await installmentOrder.save();
    }

    // แจ้งเตือนผ่าน Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('new-installment-payment', {
        contractNo: installmentOrder.contractNo,
        customerName: req.body.customerName || 'ลูกค้า',
        installmentNumber,
        amountPaid
      });
    }

    return res.status(201).json({
      success: true,
      message: 'บันทึกการชำระเงินสำเร็จ',
      data: payment
    });
  } catch (error) {
    console.error('Error recording payment:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการบันทึกการชำระเงิน'
    });
  }
});

/**
 * GET /api/claim-items/statistics/summary
 * ดึงข้อมูลสถิติภาพรวม
 */
router.get('/statistics/summary', auth, async (req, res) => {
  try {
    // จำนวนลูกค้าทั้งหมด
    const customerCount = await InstallmentOrder.countDocuments({
      deleted_at: null
    });

    // จำนวนลูกค้าแยกตามประเภท
    const payAsYouGoCount = await InstallmentOrder.countDocuments({
      installmentType: 'pay-as-you-go',
      deleted_at: null
    });

    const payInFullCount = await InstallmentOrder.countDocuments({
      installmentType: 'pay-in-full',
      deleted_at: null
    });

    // ยอดรับชำระเดือนนี้
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const paymentsThisMonth = await InstallmentPayment.find({
      paymentDate: {
        $gte: firstDayOfMonth,
        $lte: lastDayOfMonth
      },
      deleted_at: null
    });

    const totalAmountThisMonth = paymentsThisMonth.reduce((sum, payment) => {
      return sum + payment.amountPaid;
    }, 0);

    // จำนวนลูกค้าค้างชำระ
    const overdueCount = await InstallmentOrder.countDocuments({
      status: 'OVERDUE',
      deleted_at: null
    });

    // จำนวนรายการรอส่งมอบ (สำหรับผ่อนหมดรับของ)
    const pendingDeliveryCount = await InstallmentOrder.countDocuments({
      installmentType: 'pay-in-full',
      status: { $ne: 'COMPLETED' },
      deleted_at: null
    });

    return res.json({
      success: true,
      data: {
        customerCount,
        payAsYouGoCount,
        payInFullCount,
        totalAmountThisMonth,
        overdueCount,
        pendingDeliveryCount
      }
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสถิติ'
    });
  }
});

module.exports = router;

// Helper function to generate contract number
async function getNextContractNo() {
  const InstallmentCounter = require('../models/Installment/InstallmentCounter');
  const now = new Date();
  const yearCE = now.getFullYear();
  const month = now.getMonth() + 1;
  const yearBE = yearCE + 543;

  const doc = await InstallmentCounter.findOneAndUpdate(
    { name: 'installment', year: yearBE, month },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const seqStr = String(doc.seq).padStart(4, '0');
  return `INST${yearBE}${String(month).padStart(2, '0')}${seqStr}`;
}
