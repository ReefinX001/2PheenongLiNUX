// controllers/auditLogController.js
const AuditLog = require('../../models/Account/AuditLog');

/**
 * สร้าง Audit Log ใหม่
 * POST /api/audit-log
 */
exports.createAuditLog = async (req, res) => {
  const io = req.app.get('io');  // ดึง instance ของ Socket.IO
  try {
    const { invoice_id, field_name, old_value, new_value, changed_by } = req.body;

    if (!invoice_id || !field_name || !changed_by) {
      return res.status(400).json({ error: 'invoice_id, field_name, and changed_by are required.' });
    }

    const newLog = new AuditLog({
      invoice_id,
      field_name,
      old_value,
      new_value,
      changed_by,
      changed_at: new Date()
    });
    await newLog.save();

    // ส่ง event ว่า audit log ถูกสร้างขึ้น
    io.emit('auditLogCreated', { id: newLog._id, data: newLog });

    return res.json({ success: true, data: newLog });
  } catch (err) {
    console.error('createAuditLog error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * ดึง Audit Logs ทั้งหมด
 * GET /api/audit-log
 */
exports.getAllLogs = async (req, res) => {
  try {
    // Populate invoice_id, changed_by หากต้องการ
    const logs = await AuditLog.find().limit(100).lean()
      .populate('invoice_id', 'invoice_number') // optional
      .populate('changed_by', 'username')       // optional
      .sort({ changed_at: -1 });
    return res.json({ success: true, data: logs });
  } catch (err) {
    console.error('getAllLogs error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * ดึง Audit Logs ตาม invoice_id
 * GET /api/audit-log/invoice/:invoiceId
 */
exports.getLogsByInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const logs = await AuditLog.find({ invoice_id: invoiceId }).limit(100).lean()
      .populate('changed_by', 'username')
      .sort({ changed_at: -1 });
    return res.json({ success: true, data: logs });
  } catch (err) {
    console.error('getLogsByInvoice error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
