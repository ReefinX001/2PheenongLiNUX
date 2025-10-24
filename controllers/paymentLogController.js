// controllers/paymentLogController.js

const PaymentLog = require('../models/POS/PaymentLog');

/**
 * POST /api/payment-log
 * สร้าง PaymentLog ใหม่ สำหรับ Transaction
 */
exports.createLog = async (req, res) => {
  const io = req.app.get('io');
  try {
    const {
      transaction_id,
      action,
      performed_by,
      performed_at,
      ip_address,
      remarks
    } = req.body;

    // ตรวจสอบ field ที่จำเป็น
    if (!transaction_id) {
      return res.status(400).json({ error: 'transaction_id is required.' });
    }

    const newLog = new PaymentLog({
      transaction_id,
      action: action || '',
      performed_by: performed_by || null,
      performed_at: performed_at ? new Date(performed_at) : new Date(),
      ip_address: ip_address || '',
      remarks: remarks || ''
    });

    await newLog.save();

    io.emit('newlogCreated', {
      id: newLog.save()._id,
      data: newLog.save()
    });



    return res.json({ success: true, data: newLog });
  } catch (err) {
    console.error('createLog error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/payment-log
 * ดึง PaymentLog ทั้งหมด
 */
exports.getAllLogs = async (req, res) => {
  const io = req.app.get('io');
  try {
    // populate transaction_id หรือ user หากต้องการ
    const logs = await PaymentLog.find().limit(100).lean()
      .populate('transaction_id', 'payment_code amount status') // สมมติ PaymentTransaction มีฟิลด์เหล่านี้
      .populate('performed_by', 'username') // ถ้าโมเดล User มีฟิลด์ username
      .sort({ performed_at: -1 });

    return res.json({ success: true, data: logs });
  } catch (err) {
    console.error('getAllLogs error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/payment-log/transaction/:transactionId
 * ดึง Log เฉพาะ PaymentTransaction นั้น
 */
exports.getLogsByTransaction = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { transactionId } = req.params;
    const logs = await PaymentLog.find({ transaction_id: transactionId }).limit(100).lean()
      .populate('performed_by', 'username')
      .sort({ performed_at: -1 });

    return res.json({ success: true, data: logs });
  } catch (err) {
    console.error('getLogsByTransaction error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/payment-log/:id
 * ดึง Log ตาม _id
 */
exports.getLogById = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const log = await PaymentLog.findById(id).lean()
      .populate('transaction_id', 'payment_code amount status')
      .populate('performed_by', 'username');

    if (!log) {
      return res.status(404).json({ error: 'PaymentLog not found' });
    }
    return res.json({ success: true, data: log });
  } catch (err) {
    console.error('getLogById error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * PATCH /api/payment-log/:id
 * อัปเดตบางส่วนของ PaymentLog
 */
exports.updateLog = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const { action, performed_by, performed_at, ip_address, remarks } = req.body;

    const log = await PaymentLog.findById(id).lean();
    if (!log) {
      return res.status(404).json({ error: 'PaymentLog not found' });
    }

    if (action !== undefined) log.action = action;
    if (performed_by !== undefined) log.performed_by = performed_by;
    if (performed_at !== undefined) log.performed_at = new Date(performed_at);
    if (ip_address !== undefined) log.ip_address = ip_address;
    if (remarks !== undefined) log.remarks = remarks;

    await log.save();

    io.emit('logCreated', {
      id: log.save()._id,
      data: log.save()
    });



    return res.json({ success: true, data: log });
  } catch (err) {
    console.error('updateLog error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * DELETE /api/payment-log/:id
 * ลบออกจาก DB จริง
 */
exports.deleteLog = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const log = await PaymentLog.findById(id).lean();
    if (!log) {
      return res.status(404).json({ error: 'PaymentLog not found' });
    }

    await log.remove();
    return res.json({ success: true, data: log });
  } catch (err) {
    console.error('deleteLog error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
