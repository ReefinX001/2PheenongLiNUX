// controllers/contractAdjustmentController.js

const ContractAdjustment = require('../models/Load/ContractAdjustment');

/**
 * POST /api/contract-adjustment
 * สร้างการปรับแก้ (Adjustment) ใหม่สำหรับ Contract
 */
exports.createAdjustment = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { contract_id, adjustment_type, old_value, new_value, reason, adjusted_by } = req.body;

    // ตรวจสอบ field จำเป็น
    if (!contract_id || !adjustment_type) {
      return res.status(400).json({
        error: 'contract_id and adjustment_type are required.',
      });
    }

    const newAdj = new ContractAdjustment({
      contract_id,
      adjustment_type,
      old_value: old_value || '',
      new_value: new_value || '',
      reason: reason || '',
      adjusted_by: adjusted_by || null,
      adjusted_at: new Date()
    });

    await newAdj.save();

    io.emit('newadjCreated', {
      id: newAdj.save()._id,
      data: newAdj.save()
    });



    return res.json({ success: true, data: newAdj });
  } catch (err) {
    console.error('createAdjustment error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/contract-adjustment
 * ดึง Adjustments ทั้งหมด (ถ้าจะ filter ภายหลังก็ปรับ logic ได้)
 */
exports.getAllAdjustments = async (req, res) => {
  const io = req.app.get('io');
  try {
    const adjustments = await ContractAdjustment.find().limit(100).lean()
      .populate('contract_id', 'contract_number status')
      .populate('adjusted_by', 'username')  // หรือฟิลด์อื่นของโมเดล User
      .sort({ adjusted_at: -1 });

    return res.json({ success: true, data: adjustments });
  } catch (err) {
    console.error('getAllAdjustments error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/contract-adjustment/contract/:contractId
 * ดึง Adjustments เฉพาะ contract_id
 */
exports.getAdjustmentsByContract = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { contractId } = req.params;
    const adjustments = await ContractAdjustment.find({ contract_id: contractId }).limit(100).lean()
      .populate('adjusted_by', 'username')
      .sort({ adjusted_at: -1 });

    return res.json({ success: true, data: adjustments });
  } catch (err) {
    console.error('getAdjustmentsByContract error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/contract-adjustment/:id
 * ดึง Adjustment ตาม _id
 */
exports.getAdjustmentById = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const adjustment = await ContractAdjustment.findById(id).lean()
      .populate('contract_id', 'contract_number status')
      .populate('adjusted_by', 'username');

    if (!adjustment) {
      return res.status(404).json({ error: 'Adjustment not found' });
    }
    return res.json({ success: true, data: adjustment });
  } catch (err) {
    console.error('getAdjustmentById error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * (Optional) PATCH /api/contract-adjustment/:id
 * อัปเดตบางส่วนของ Adjustment (กรณีต้องการแก้เหตุผล หรือข้อมูล)
 */
exports.updateAdjustment = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const { old_value, new_value, reason, adjusted_by } = req.body;

    const adjustment = await ContractAdjustment.findById(id).lean();
    if (!adjustment) {
      return res.status(404).json({ error: 'Adjustment not found' });
    }

    if (old_value !== undefined) adjustment.old_value = old_value;
    if (new_value !== undefined) adjustment.new_value = new_value;
    if (reason !== undefined) adjustment.reason = reason;
    if (adjusted_by !== undefined) adjustment.adjusted_by = adjusted_by;

    // ถ้าปรับเวลาการแก้ให้เป็นปัจจุบัน
    adjustment.adjusted_at = new Date();

    await adjustment.save();

    io.emit('adjustmentCreated', {
      id: adjustment.save()._id,
      data: adjustment.save()
    });



    return res.json({ success: true, data: adjustment });
  } catch (err) {
    console.error('updateAdjustment error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * (Optional) DELETE /api/contract-adjustment/:id
 * ลบออกจาก DB จริง (ถ้าต้องการเก็บ log ตลอด อาจไม่ลบ)
 */
exports.deleteAdjustment = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const adjustment = await ContractAdjustment.findById(id).lean();
    if (!adjustment) {
      return res.status(404).json({ error: 'Adjustment not found' });
    }

    await adjustment.remove();
    return res.json({ success: true, data: adjustment });
  } catch (err) {
    console.error('deleteAdjustment error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
