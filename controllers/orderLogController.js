// controllers/orderLogController.js

const OrderLog = require('../models/POS/OrderLog');

/**
 * POST /api/order-log
 * สร้าง Log ใหม่ให้คำสั่งซื้อ
 */
exports.createLog = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { order_id, action, performed_by, performed_at, description } = req.body;

    // ตรวจสอบ field ที่จำเป็น
    if (!order_id) {
      return res.status(400).json({ error: 'order_id is required.' });
    }

    const newLog = new OrderLog({
      order_id,
      action: action || '',
      performed_by: performed_by || null,
      performed_at: performed_at ? new Date(performed_at) : new Date(),
      description: description || ''
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
 * GET /api/order-log
 * ดึง OrderLog ทั้งหมด
 */
exports.getAllLogs = async (req, res) => {
  const io = req.app.get('io');
  try {
    // populate order หรือ user ถ้าต้องการ
    const logs = await OrderLog.find().limit(100).lean()
      .populate('order_id', 'order_number')
      .populate('performed_by', 'username') // ถ้าโมเดล User มีฟิลด์ username
      .sort({ performed_at: -1 });

    return res.json({ success: true, data: logs });
  } catch (err) {
    console.error('getAllLogs error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/order-log/order/:orderId
 * ดึง Log เฉพาะออร์เดอร์นั้น
 */
exports.getLogsByOrder = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { orderId } = req.params;
    const logs = await OrderLog.find({ order_id: orderId }).limit(100).lean()
      .populate('performed_by', 'username')
      .sort({ performed_at: -1 });

    return res.json({ success: true, data: logs });
  } catch (err) {
    console.error('getLogsByOrder error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/order-log/:id
 * ดึง Log ตาม _id
 */
exports.getLogById = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const log = await OrderLog.findById(id).lean()
      .populate('order_id', 'order_number')
      .populate('performed_by', 'username');

    if (!log) {
      return res.status(404).json({ error: 'OrderLog not found' });
    }
    return res.json({ success: true, data: log });
  } catch (err) {
    console.error('getLogById error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * PATCH /api/order-log/:id
 * อัปเดต Log บางส่วน
 */
exports.updateLog = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const { action, performed_by, performed_at, description } = req.body;

    const log = await OrderLog.findById(id).lean();
    if (!log) {
      return res.status(404).json({ error: 'OrderLog not found' });
    }

    if (action !== undefined) log.action = action;
    if (performed_by !== undefined) log.performed_by = performed_by;
    if (performed_at !== undefined) log.performed_at = new Date(performed_at);
    if (description !== undefined) log.description = description;

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
 * DELETE /api/order-log/:id
 * ลบออกจาก DB จริง
 */
exports.deleteLog = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const log = await OrderLog.findById(id).lean();
    if (!log) {
      return res.status(404).json({ error: 'OrderLog not found' });
    }

    await log.remove();
    return res.json({ success: true, data: log });
  } catch (err) {
    console.error('deleteLog error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
