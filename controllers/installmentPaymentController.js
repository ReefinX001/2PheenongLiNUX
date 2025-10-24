// File: controllers/installmentPaymentController.js

const InstallmentOrder   = require('../models/Installment/InstallmentOrder');
const InstallmentPayment = require('../models/Installment/InstallmentPayment');

/**
 * GET /api/installment/customers/:id/installments/history
 * ดึงประวัติการชำระของลูกค้า พร้อมสรุป paidCount และ totalPaid (ตัดดาวน์ออก)
 */
exports.getInstallmentHistory = async (req, res) => {
  const io = req.app.get('io');
  try {
    const customerId = req.params.id;

    // 1. หาใบสัญญาของลูกค้าคนนี้
    const order = await InstallmentOrder.findOne({ customer_id: customerId }).lean();
    if (!order) {
      return res.status(404).json({ success: false, error: 'ไม่พบสัญญาของลูกค้า' });
    }

    // 2. ดึงประวัติการจ่ายจาก tb_installment_payments
    const history = await InstallmentPayment.find({
      installmentOrder: order._id,
      deleted_at: null
    }).sort({ installmentNumber: 1 });

    // 3. แยกเอาเรคอร์ดที่เป็นดาวน์ (note มีคำว่า down) ออก
    const downRecord = history.find(h => /down/i.test(h.note).limit(100).lean());
    const installments = history.filter(h => !( /down/i.test(h.note) ));

    // 4. คำนวณจำนวนงวดที่จ่ายและยอดรวมที่จ่ายจริง (ไม่รวมดาวน์)
    const paidCount = installments.filter(h => (h.amountPaid || 0) > 0).length;
    const totalPaid = installments.reduce((sum, h) => sum + (h.amountPaid || 0), 0);

    // 5. ตอบกลับ
    return res.json({
      success: true,
      data: {
        history,                   // ตอบทั้ง list (รวมดาวน์ด้วย เพื่อให้ตาราง history ยังแสดงครบ)
        paidCount,                 // จำนวนงวดปกติที่จ่ายแล้ว (ไม่รวมดาวน์)
        totalPaid,                 // ยอดรวมที่จ่ายแล้ว (บาท, ไม่รวมดาวน์)
        installmentCount: order.installmentCount,
        monthlyPayment:  order.monthlyPayment,
        downPayment:     downRecord ? downRecord.amountPaid : 0  // ยอดดาวน์ (ถ้ามี) กลับไปแสดงแยกต่างหาก
      }
    });
  } catch (err) {
    console.error('getInstallmentHistory error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};
