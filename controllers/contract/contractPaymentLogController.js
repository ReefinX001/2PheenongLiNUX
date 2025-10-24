// controllers/contractPaymentLogController.js

const ContractPaymentLog = require('../models/Load/ContractPaymentLog');

/**
 * POST /api/contract-payment-log
 * สร้าง PaymentLog ใหม่สำหรับสัญญา
 */
exports.createPaymentLog = async (req, res) => {
  const io = req.app.get('io');
  try {
    const {
      contract_id,
      installment_id,
      payment_date,
      amount,
      payment_method,
      receipt_path,
      penalty_paid
    } = req.body;

    if (!contract_id || !installment_id) {
      return res.status(400).json({
        error: 'contract_id and installment_id are required.'
      });
    }

    const newLog = new ContractPaymentLog({
      contract_id,
      installment_id,
      payment_date: payment_date ? new Date(payment_date) : new Date(),
      amount: amount || 0,
      payment_method: payment_method || '',
      receipt_path: receipt_path || '',
      penalty_paid: penalty_paid || 0
    });

    await newLog.save();

    io.emit('newlogCreated', {
      id: newLog.save()._id,
      data: newLog.save()
    });



    return res.json({ success: true, data: newLog });
  } catch (err) {
    console.error('createPaymentLog error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/contract-payment-log
 * ดึง PaymentLogs ทั้งหมด
 */
exports.getAllPaymentLogs = async (req, res) => {
  const io = req.app.get('io');
  try {
    // populate contract_id, installment_id ตามต้องการ
    const logs = await ContractPaymentLog.find().limit(100).lean()
      .populate('contract_id', 'contract_number status')
      .populate('installment_id', 'installment_number due_date')
      .sort({ payment_date: -1 });
    return res.json({ success: true, data: logs });
  } catch (err) {
    console.error('getAllPaymentLogs error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/contract-payment-log/contract/:contractId
 * ดึง PaymentLogs เฉพาะสัญญา
 */
exports.getPaymentLogsByContract = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { contractId } = req.params;
    const logs = await ContractPaymentLog.find({ contract_id: contractId }).limit(100).lean()
      .populate('installment_id', 'installment_number due_date')
      .sort({ payment_date: -1 });
    return res.json({ success: true, data: logs });
  } catch (err) {
    console.error('getPaymentLogsByContract error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/contract-payment-log/:id
 * ดึง PaymentLog ตาม _id
 */
exports.getPaymentLogById = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const log = await ContractPaymentLog.findById(id).lean()
      .populate('contract_id', 'contract_number')
      .populate('installment_id', 'installment_number due_date');

    if (!log) {
      return res.status(404).json({ error: 'PaymentLog not found' });
    }
    return res.json({ success: true, data: log });
  } catch (err) {
    console.error('getPaymentLogById error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * PATCH /api/contract-payment-log/:id
 * อัปเดตข้อมูลการชำระเงินบางส่วน
 */
exports.updatePaymentLog = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const {
      payment_date,
      amount,
      payment_method,
      receipt_path,
      penalty_paid
    } = req.body;

    const log = await ContractPaymentLog.findById(id).lean();
    if (!log) {
      return res.status(404).json({ error: 'PaymentLog not found' });
    }

    if (payment_date !== undefined) log.payment_date = new Date(payment_date);
    if (amount !== undefined) log.amount = amount;
    if (payment_method !== undefined) log.payment_method = payment_method;
    if (receipt_path !== undefined) log.receipt_path = receipt_path;
    if (penalty_paid !== undefined) log.penalty_paid = penalty_paid;

    await log.save();

    io.emit('logCreated', {
      id: log.save()._id,
      data: log.save()
    });



    return res.json({ success: true, data: log });
  } catch (err) {
    console.error('updatePaymentLog error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * DELETE /api/contract-payment-log/:id
 * ลบ PaymentLog (จาก DB จริง)
 */
exports.deletePaymentLog = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const log = await ContractPaymentLog.findById(id).lean();
    if (!log) {
      return res.status(404).json({ error: 'PaymentLog not found' });
    }

    await log.remove();
    return res.json({ success: true, data: log });
  } catch (err) {
    console.error('deletePaymentLog error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
