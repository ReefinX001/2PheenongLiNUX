// controllers/stockValuationController.js

const StockValuation = require('../models/Stock/StockValuation');

/**
 * POST /api/stock-valuation
 * สร้าง StockValuation ใหม่
 */
exports.createValuation = async (req, res) => {
  const io = req.app.get('io');
  try {
    const {
      branch_id,
      total_quantity,
      total_stock_value,
      updated_by,
      updated_at,
      debit_account,
      credit_account,
      transaction_type
    } = req.body;

    const newValuation = new StockValuation({
      branch_id: branch_id || null,
      total_quantity: total_quantity || 0,
      total_stock_value: total_stock_value || 0,
      updated_by: updated_by || null,
      updated_at: updated_at ? new Date(updated_at) : new Date(),
      debit_account: debit_account || '',
      credit_account: credit_account || '',
      transaction_type: transaction_type || ''
    });

    await newValuation.save();

    io.emit('newvaluationCreated', {
      id: newValuation.save()._id,
      data: newValuation.save()
    });



    return res.json({ success: true, data: newValuation });
  } catch (err) {
    console.error('createValuation error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/stock-valuation
 * ดึง StockValuation ทั้งหมด
 */
exports.getAllValuations = async (req, res) => {
  const io = req.app.get('io');
  try {
    // populate branch_id, updated_by ถ้าต้องการ
    const valuations = await StockValuation.find().limit(100).lean()
      .populate('branch_id', 'name')
      .populate('updated_by', 'username')
      .sort({ updated_at: -1 });

    return res.json({ success: true, data: valuations });
  } catch (err) {
    console.error('getAllValuations error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/stock-valuation/:id
 * ดึง StockValuation ตาม _id
 */
exports.getValuationById = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const valuation = await StockValuation.findById(id).lean()
      .populate('branch_id', 'name')
      .populate('updated_by', 'username');

    if (!valuation) {
      return res.status(404).json({ error: 'StockValuation not found' });
    }
    return res.json({ success: true, data: valuation });
  } catch (err) {
    console.error('getValuationById error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/stock-valuation/branch/:branchId
 * ดึง StockValuation เฉพาะสาขานั้น
 */
exports.getValuationsByBranch = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { branchId } = req.params;
    const valuations = await StockValuation.find({ branch_id: branchId }).limit(100).lean()
      .populate('updated_by', 'username')
      .sort({ updated_at: -1 });

    return res.json({ success: true, data: valuations });
  } catch (err) {
    console.error('getValuationsByBranch error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * PATCH /api/stock-valuation/:id
 * อัปเดตบางส่วนของ StockValuation
 */
exports.updateValuation = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const {
      branch_id,
      total_quantity,
      total_stock_value,
      updated_by,
      updated_at,
      debit_account,
      credit_account,
      transaction_type
    } = req.body;

    const valuation = await StockValuation.findById(id).lean();
    if (!valuation) {
      return res.status(404).json({ error: 'StockValuation not found' });
    }

    if (branch_id !== undefined) valuation.branch_id = branch_id;
    if (total_quantity !== undefined) valuation.total_quantity = total_quantity;
    if (total_stock_value !== undefined) valuation.total_stock_value = total_stock_value;
    if (updated_by !== undefined) valuation.updated_by = updated_by;
    if (updated_at !== undefined) valuation.updated_at = new Date(updated_at);
    if (debit_account !== undefined) valuation.debit_account = debit_account;
    if (credit_account !== undefined) valuation.credit_account = credit_account;
    if (transaction_type !== undefined) valuation.transaction_type = transaction_type;

    await valuation.save();

    io.emit('valuationCreated', {
      id: valuation.save()._id,
      data: valuation.save()
    });



    return res.json({ success: true, data: valuation });
  } catch (err) {
    console.error('updateValuation error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * DELETE /api/stock-valuation/:id
 * ลบออกจาก DB จริง
 */
exports.deleteValuation = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const valuation = await StockValuation.findById(id).lean();
    if (!valuation) {
      return res.status(404).json({ error: 'StockValuation not found' });
    }

    await valuation.remove();
    return res.json({ success: true, data: valuation });
  } catch (err) {
    console.error('deleteValuation error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
