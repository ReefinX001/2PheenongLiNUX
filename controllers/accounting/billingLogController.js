// controllers/billingLogController.js

const BillingLog = require('../models/Account/BillingLog');

/**
 * POST /api/billing-log
 * สร้าง BillingLog ใหม่
 */
exports.createLog = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { invoice_id, action, performed_by, description } = req.body;

    if (!invoice_id || !action || !performed_by) {
      return res.status(400).json({
        error: 'invoice_id, action, and performed_by are required.',
      });
    }

    const newLog = new BillingLog({
      invoice_id,
      action,
      performed_by,
      performed_at: new Date(),
      description
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
 * GET /api/billing-log
 * ดึง BillingLog ทั้งหมด
 */
exports.getAllLogs = async (req, res) => {
  const io = req.app.get('io');
  try {
    // populate if needed, e.g. invoice_id -> invoice_number, performed_by -> username
    const logs = await BillingLog.find().limit(100).lean()
      .populate('invoice_id', 'invoice_number')
      .populate('performed_by', 'username')
      .sort({ performed_at: -1 });

    return res.json({ success: true, data: logs });
  } catch (err) {
    console.error('getAllLogs error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/billing-log/invoice/:invoiceId
 * ดึง BillingLog เฉพาะ invoice_id นั้น
 */
exports.getLogsByInvoice = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { invoiceId } = req.params;
    const logs = await BillingLog.find({ invoice_id: invoiceId }).limit(100).lean()
      .populate('performed_by', 'username')
      .sort({ performed_at: -1 });

    return res.json({ success: true, data: logs });
  } catch (err) {
    console.error('getLogsByInvoice error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * DELETE /api/billing-log/:id
 * ลบ Log ทิ้ง (ถ้าต้องการ)
 */
exports.deleteLog = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const log = await BillingLog.findById(id).lean();
    if (!log) {
      return res.status(404).json({ error: 'BillingLog not found' });
    }
    await log.remove();
    return res.json({ success: true, data: log });
  } catch (err) {
    console.error('deleteLog error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
