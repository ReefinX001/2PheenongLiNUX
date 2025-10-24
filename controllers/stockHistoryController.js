// controllers/stockHistoryController.js

const StockHistory = require('../models/Stock/StockHistory');

/**
 * POST /api/stock-history
 * สร้าง StockHistory ใหม่ (บันทึกประวัติการเคลื่อนไหวของสต็อก)
 */
exports.createHistory = async (req, res) => {
  const io = req.app.get('io');
  try {
    const {
      product_id,
      branch_code,
      change_type,
      quantity,
      cost_price,
      reason,
      updated_by,
      reference_id
    } = req.body;

    // ตรวจสอบ field ที่จำเป็น
    if (!product_id) {
      return res.status(400).json({ error: 'product_id is required.' });
    }

    const newHistory = new StockHistory({
      product_id,
      branch_code: branch_code || null,
      change_type: change_type || 'in',
      quantity: quantity || 0,
      cost_price: cost_price || 0,
      reason: reason || '',
      updated_by: updated_by || null,
      reference_id: reference_id || ''
    });

    await newHistory.save();

    io.emit('newhistoryCreated', {
      id: newHistory.save()._id,
      data: newHistory.save()
    });



    return res.json({ success: true, data: newHistory });
  } catch (err) {
    console.error('createHistory error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/stock-history
 * ดึง StockHistory ทั้งหมด
 */
exports.getAllHistories = async (req, res) => {
  const io = req.app.get('io');
  try {
    // populate product_id, branch_id, updated_by ถ้าต้องการ
    const histories = await StockHistory.find().limit(100).lean()
      .populate('product_id', 'name sku')
      .populate('branch_code', 'name')
      .populate('updated_by', 'username')
      .sort({ _id: -1 });

    return res.json({ success: true, data: histories });
  } catch (err) {
    console.error('getAllHistories error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/stock-history/:id
 * ดึง StockHistory ตาม _id
 */
exports.getHistoryById = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const history = await StockHistory.findById(id).lean()
      .populate('product_id', 'name sku')
      .populate('branch_code', 'name')
      .populate('updated_by', 'username');

    if (!history) {
      return res.status(404).json({ error: 'StockHistory not found' });
    }
    return res.json({ success: true, data: history });
  } catch (err) {
    console.error('getHistoryById error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/stock-history/product/:productId
 * ดึงประวัติสต็อกเฉพาะสินค้านั้น
 */
exports.getHistoryByProduct = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { productId } = req.params;
    const histories = await StockHistory.find({ product_id: productId }).limit(100).lean()
      .populate('branch_code', 'name')
      .populate('updated_by', 'username')
      .sort({ _id: -1 });

    return res.json({ success: true, data: histories });
  } catch (err) {
    console.error('getHistoryByProduct error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * PATCH /api/stock-history/:id
 * อัปเดตข้อมูลบางส่วนของ StockHistory
 */
exports.updateHistory = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const {
      branch_code,
      change_type,
      quantity,
      cost_price,
      reason,
      updated_by,
      reference_id
    } = req.body;

    const history = await StockHistory.findById(id).lean();
    if (!history) {
      return res.status(404).json({ error: 'StockHistory not found' });
    }

    if (branch_code !== undefined) history.branch_code = branch_code;
    if (change_type !== undefined) history.change_type = change_type;
    if (quantity !== undefined) history.quantity = quantity;
    if (cost_price !== undefined) history.cost_price = cost_price;
    if (reason !== undefined) history.reason = reason;
    if (updated_by !== undefined) history.updated_by = updated_by;
    if (reference_id !== undefined) history.reference_id = reference_id;

    await history.save();

    io.emit('historyCreated', {
      id: history.save()._id,
      data: history.save()
    });



    return res.json({ success: true, data: history });
  } catch (err) {
    console.error('updateHistory error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * DELETE /api/stock-history/:id
 * ลบออกจาก DB จริง
 */
exports.deleteHistory = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const history = await StockHistory.findById(id).lean();
    if (!history) {
      return res.status(404).json({ error: 'StockHistory not found' });
    }

    await history.remove();
    return res.json({ success: true, data: history });
  } catch (err) {
    console.error('deleteHistory error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
