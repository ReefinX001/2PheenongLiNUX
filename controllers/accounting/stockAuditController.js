// controllers/stockAuditController.js

const StockAudit = require('../models/Stock/StockAudit');

/**
 * POST /api/stock-audit
 * สร้าง StockAudit ใหม่ (บันทึกการตรวจนับสต็อก)
 */
exports.createAudit = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { branch_code, audit_date, total_quantity, remarks } = req.body;

    const newAudit = new StockAudit({
      branch_code: branch_code || null,
      audit_date: audit_date ? new Date(audit_date) : new Date(),
      total_quantity: total_quantity || 0,
      remarks: remarks || ''
    });

    await newAudit.save();

    io.emit('newauditCreated', {
      id: newAudit.save()._id,
      data: newAudit.save()
    });



    return res.json({ success: true, data: newAudit });
  } catch (err) {
    console.error('createAudit error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/stock-audit
 * ดึง StockAudit ทั้งหมด
 */
exports.getAllAudits = async (req, res) => {
  const io = req.app.get('io');
  try {
    // populate branch_id ถ้าต้องการ
    const audits = await StockAudit.find().limit(100).lean()
      .populate('branch_code', 'name') // สมมติ Branch มีฟิลด์ name
      .sort({ audit_date: -1 });

    return res.json({ success: true, data: audits });
  } catch (err) {
    console.error('getAllAudits error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/stock-audit/:id
 * ดึง StockAudit ตาม _id
 */
exports.getAuditById = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const audit = await StockAudit.findById(id).lean()
      .populate('branch_code', 'name');

    if (!audit) {
      return res.status(404).json({ error: 'StockAudit not found' });
    }
    return res.json({ success: true, data: audit });
  } catch (err) {
    console.error('getAuditById error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * PATCH /api/stock-audit/:id
 * อัปเดตข้อมูลบางส่วนของ StockAudit
 */
exports.updateAudit = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const { branch_code, audit_date, total_quantity, remarks } = req.body;

    const audit = await StockAudit.findById(id).lean();
    if (!audit) {
      return res.status(404).json({ error: 'StockAudit not found' });
    }

    if (branch_code !== undefined) audit.branch_code = branch_code;
    if (audit_date !== undefined) audit.audit_date = new Date(audit_date);
    if (total_quantity !== undefined) audit.total_quantity = total_quantity;
    if (remarks !== undefined) audit.remarks = remarks;

    await audit.save();

    io.emit('auditCreated', {
      id: audit.save()._id,
      data: audit.save()
    });



    return res.json({ success: true, data: audit });
  } catch (err) {
    console.error('updateAudit error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * DELETE /api/stock-audit/:id
 * ลบออกจาก DB จริง
 */
exports.deleteAudit = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const audit = await StockAudit.findById(id).lean();
    if (!audit) {
      return res.status(404).json({ error: 'StockAudit not found' });
    }

    await audit.remove();
    return res.json({ success: true, data: audit });
  } catch (err) {
    console.error('deleteAudit error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
