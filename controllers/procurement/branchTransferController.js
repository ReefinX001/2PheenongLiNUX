// controllers/branchTransferController.js

const BranchTransfer = require('../models/Stock/BranchTransfer');

/**
 * POST /api/branch-transfer
 * สร้างรายการโอนสินค้าระหว่างสาขา
 */
exports.createTransfer = async (req, res) => {
  const io = req.app.get('io');
  try {
    const {
      source_branch_code,
      destination_branch_code,
      product_id,
      quantity,
      status,
      reason,
      transfer_cost,
      tracking_number,
      performed_by
    } = req.body;

    // ตรวจสอบ field ที่จำเป็น
    if (!source_branch_code || !destination_branch_code || !product_id) {
      return res.status(400).json({
        error: 'source_branch_code, destination_branch_code, and product_id are required.'
      });
    }

    const newTransfer = new BranchTransfer({
      source_branch_code,
      destination_branch_code,
      product_id,
      quantity: quantity || 0,
      status: status || 'pending',
      reason: reason || '',
      transfer_cost: transfer_cost || 0,
      tracking_number: tracking_number || '',
      performed_by: performed_by || null,
      transfer_date: new Date()
    });

    const savedTransfer = await newTransfer.save();

    io.emit('newtransferCreated', {
      id: savedTransfer._id,
      data: savedTransfer.toObject()
    });



    return res.json({ success: true, data: savedTransfer.toObject() });
  } catch (err) {
    console.error('createTransfer error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/branch-transfer
 * ดึงรายการโอนสินค้าระหว่างสาขาทั้งหมด
 */
exports.getAllTransfers = async (req, res) => {
  const io = req.app.get('io');
  try {
    // populate branch, product, user ตามต้องการ
    const transfers = await BranchTransfer.find().limit(100).lean()
      .populate('source_branch_code', 'branch_code name')
      .populate('destination_branch_code', 'branch_code name')
      .populate('product_id', 'product_name sku')
      .populate('performed_by', 'username')
      .sort({ createdAt: -1 });

    return res.json({ success: true, data: transfers });
  } catch (err) {
    console.error('getAllTransfers error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/branch-transfer/:id
 * ดึงรายการโอนสินค้าตาม _id
 */
exports.getTransferById = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const transfer = await BranchTransfer.findById(id).lean()
      .populate('source_branch_code', 'branch_code name')
      .populate('destination_branch_code', 'branch_code name')
      .populate('product_id', 'product_name sku')
      .populate('performed_by', 'username');

    if (!transfer) {
      return res.status(404).json({ error: 'BranchTransfer not found' });
    }
    return res.json({ success: true, data: transfer });
  } catch (err) {
    console.error('getTransferById error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * PATCH /api/branch-transfer/:id
 * อัปเดตข้อมูลการโอน
 */
exports.updateTransfer = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const {
      product_id,
      quantity,
      status,
      reason,
      transfer_cost,
      tracking_number,
      performed_by
    } = req.body;

    const transfer = await BranchTransfer.findById(id);
    if (!transfer) {
      return res.status(404).json({ error: 'BranchTransfer not found' });
    }

    if (product_id !== undefined) transfer.product_id = product_id;
    if (quantity !== undefined) transfer.quantity = quantity;
    if (status !== undefined) transfer.status = status;
    if (reason !== undefined) transfer.reason = reason;
    if (transfer_cost !== undefined) transfer.transfer_cost = transfer_cost;
    if (tracking_number !== undefined) transfer.tracking_number = tracking_number;
    if (performed_by !== undefined) transfer.performed_by = performed_by;

    // ถ้าต้องการเปลี่ยนวันที่ transfer_date => transfer.transfer_date = ...
    const savedTransfer = await transfer.save();

    io.emit('transferCreated', {
      id: savedTransfer._id,
      data: savedTransfer.toObject()
    });



    return res.json({ success: true, data: savedTransfer.toObject() });
  } catch (err) {
    console.error('updateTransfer error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * DELETE /api/branch-transfer/:id
 * ลบรายการโอน (ลบจริง)
 */
exports.deleteTransfer = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const transfer = await BranchTransfer.findById(id);
    if (!transfer) {
      return res.status(404).json({ error: 'BranchTransfer not found' });
    }

    const transferData = transfer.toObject();
    await transfer.remove();
    return res.json({ success: true, data: transferData });
  } catch (err) {
    console.error('deleteTransfer error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
