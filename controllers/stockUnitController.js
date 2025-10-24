// controllers/stockUnitController.js

const StockUnit = require('../models/Stock/StockUnit');

/**
 * POST /api/stock-unit
 * สร้าง StockUnit ใหม่ (หน่วยสต็อกของสินค้า Variant หนึ่ง)
 */
exports.createUnit = async (req, res) => {
  const io = req.app.get('io');
  try {
    const {
      variant_id,
      imei,
      branch_code,
      status,
      received_date,
      cost_price
    } = req.body;

    // ตรวจสอบ field ที่จำเป็น
    if (!variant_id) {
      return res.status(400).json({ error: 'variant_id is required.' });
    }

    const newUnit = new StockUnit({
      variant_id,
      imei: imei || '',
      branch_code: branch_code || null,
      status: status || 'in_stock',
      received_date: received_date ? new Date(received_date) : null,
      cost_price: cost_price || 0,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null
    });

    await newUnit.save();

    io.emit('newunitCreated', {
      id: newUnit.save()._id,
      data: newUnit.save()
    });



    return res.json({ success: true, data: newUnit });
  } catch (err) {
    console.error('createUnit error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/stock-unit
 * ดึง StockUnit ทั้งหมด (ที่ยังไม่ถูกลบ ถ้ามี soft delete)
 * - ถ้าคุณใช้ soft delete => filter { deleted_at: null }
 */
exports.getAllUnits = async (req, res) => {
  const io = req.app.get('io');
  try {
    // populate variant_id, branch_id ถ้าต้องการ
    const units = await StockUnit.find({ deleted_at: null }).limit(100).lean()
      .populate('variant_id', 'name model') // สมมติ ProductVariant มีฟิลด์ name, model
      .populate('branch_code', 'name')
      .sort({ created_at: -1 });

    return res.json({ success: true, data: units });
  } catch (err) {
    console.error('getAllUnits error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/stock-unit/:id
 * ดึง StockUnit ตาม _id
 */
exports.getUnitById = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const unit = await StockUnit.findOne({
      _id: id,
      deleted_at: null // ถ้าใช้ soft delete
    })
      .populate('variant_id', 'name model')
      .populate('branch_code', 'name');

    if (!unit) {
      return res.status(404).json({ error: 'StockUnit not found or deleted' });
    }
    return res.json({ success: true, data: unit });
  } catch (err) {
    console.error('getUnitById error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/stock-unit/variant/:variantId
 * ดึง StockUnit เฉพาะ ProductVariant นั้น
 */
exports.getUnitsByVariant = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { variantId } = req.params;
    const units = await StockUnit.find({
      variant_id: variantId,
      deleted_at: null // ถ้าใช้ soft delete
    })
      .populate('branch_code', 'name')
      .sort({ created_at: -1 });

    return res.json({ success: true, data: units });
  } catch (err) {
    console.error('getUnitsByVariant error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * PATCH /api/stock-unit/:id
 * อัปเดตข้อมูลบางส่วนของ StockUnit
 */
exports.updateUnit = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const {
      variant_id,
      imei,
      branch_code,
      status,
      received_date,
      cost_price
    } = req.body;

    const unit = await StockUnit.findOne({
      _id: id,
      deleted_at: null // ถ้าใช้ soft delete
    });
    if (!unit) {
      return res.status(404).json({ error: 'StockUnit not found or deleted' });
    }

    if (variant_id !== undefined) unit.variant_id = variant_id;
    if (imei !== undefined) unit.imei = imei;
    if (branch_code !== undefined) unit.branch_code = branch_code;
    if (status !== undefined) unit.status = status;
    if (received_date !== undefined) unit.received_date = new Date(received_date);
    if (cost_price !== undefined) unit.cost_price = cost_price;

    unit.updated_at = new Date();

    await unit.save();

    io.emit('unitCreated', {
      id: unit.save()._id,
      data: unit.save()
    });



    return res.json({ success: true, data: unit });
  } catch (err) {
    console.error('updateUnit error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * DELETE /api/stock-unit/:id
 * ลบจริง หรือ Soft Delete => deleted_at = new Date()
 */
exports.deleteUnit = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const unit = await StockUnit.findOne({
      _id: id,
      deleted_at: null // ถ้าใช้ soft delete
    });
    if (!unit) {
      return res.status(404).json({ error: 'StockUnit not found or already deleted' });
    }

    // ถ้าต้องการลบจริง => unit.remove()
    // หรือถ้าต้องการ Soft Delete =>
    unit.deleted_at = new Date();
    await unit.save();

    io.emit('unitCreated', {
      id: unit.save()._id,
      data: unit.save()
    });



    return res.json({ success: true, data: unit });
  } catch (err) {
    console.error('deleteUnit error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
