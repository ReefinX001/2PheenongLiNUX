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
    const { page = 1, limit = 10, filter = '', search = '' } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    let query = { deleted_at: null };

    // Add status filter
    if (filter) {
      query.status = filter;
    }

    // Add search functionality
    if (search) {
      query.$or = [
        { transferNo: { $regex: search, $options: 'i' } },
        { note: { $regex: search, $options: 'i' } },
        { reason: { $regex: search, $options: 'i' } }
      ];
    }

    const transfers = await BranchTransfer.find(query)
      .populate('source_branch_code', 'name branch_code address phone')
      .populate('destination_branch_code', 'name branch_code address phone')
      .populate('product_id', 'name brand model sku imei')
      .populate('performed_by', 'username fullName firstName lastName employee')
      .populate('preparedBy', 'username fullName firstName lastName employee')
      .populate('receivedBy', 'username fullName firstName lastName employee')
      .populate('cancelledBy', 'username fullName firstName lastName employee')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const total = await BranchTransfer.countDocuments(query);

    // Transform data to match frontend expectations
    const transformedTransfers = transfers.map(transfer => ({
      ...transfer,
      fromBranch: transfer.source_branch_code,
      toBranch: transfer.destination_branch_code,
      items: transfer.product_id ? [transfer.product_id] : [],
      transferDate: transfer.transfer_date,
      senderName: getSenderName(transfer),
      receiverName: getReceiverName(transfer)
    }));

    return res.json({
      success: true,
      data: transformedTransfers,
      total: total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('getAllTransfers error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Helper functions for name resolution
function getSenderName(transfer) {
  if (transfer.preparedBy) {
    return transfer.preparedBy.employee?.name ||
           transfer.preparedBy.fullName ||
           `${transfer.preparedBy.firstName || ''} ${transfer.preparedBy.lastName || ''}`.trim() ||
           transfer.preparedBy.username ||
           'ไม่ระบุผู้ส่ง';
  }
  return 'ไม่ระบุผู้ส่ง';
}

function getReceiverName(transfer) {
  if (transfer.receivedBy) {
    return transfer.receivedBy.employee?.name ||
           transfer.receivedBy.fullName ||
           `${transfer.receivedBy.firstName || ''} ${transfer.receivedBy.lastName || ''}`.trim() ||
           transfer.receivedBy.username ||
           'ไม่ระบุผู้รับ';
  }
  return 'ไม่ระบุผู้รับ';
}

/**
 * GET /api/branch-transfer/:id
 * ดึงรายการโอนสินค้าตาม _id
 */
exports.getTransferById = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const transfer = await BranchTransfer.findById(id)
      .populate('source_branch_code', 'name branch_code address phone')
      .populate('destination_branch_code', 'name branch_code address phone')
      .populate('product_id', 'name brand model sku imei')
      .populate('performed_by', 'username fullName firstName lastName employee')
      .populate('preparedBy', 'username fullName firstName lastName employee')
      .populate('receivedBy', 'username fullName firstName lastName employee')
      .populate('cancelledBy', 'username fullName firstName lastName employee')
      .lean();

    if (!transfer) {
      return res.status(404).json({ error: 'Transfer not found' });
    }

    // Transform data to match frontend expectations
    const transformedTransfer = {
      ...transfer,
      fromBranch: transfer.source_branch_code,
      toBranch: transfer.destination_branch_code,
      items: transfer.product_id ? [transfer.product_id] : [],
      transferDate: transfer.transfer_date,
      senderName: getSenderName(transfer),
      receiverName: getReceiverName(transfer)
    };

    return res.json({ success: true, data: transformedTransfer });
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
 * PUT /api/branch-transfer/:id/prepare
 * ผู้จัดเตรียมเซ็น (pending → in-transit)
 */
exports.prepareTransfer = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const { preparedSignature, preparedBy, preparedAt } = req.body;

    const transfer = await BranchTransfer.findById(id);
    if (!transfer) {
      return res.status(404).json({ error: 'Transfer not found.' });
    }

    if (transfer.status !== 'pending') {
      return res.status(400).json({
        error: 'Transfer must be in pending status to prepare.'
      });
    }

    // Update transfer status and signature
    transfer.status = 'in-transit';
    transfer.preparedSignature = preparedSignature;
    transfer.preparedBy = preparedBy;
    transfer.preparedAt = preparedAt || new Date();
    transfer.updated_at = new Date();

    const updatedTransfer = await transfer.save();

    io.emit('transferPrepared', {
      id: updatedTransfer._id,
      data: updatedTransfer.toObject()
    });

    return res.json({
      success: true,
      data: updatedTransfer,
      message: 'Transfer prepared successfully'
    });
  } catch (err) {
    console.error('prepareTransfer error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * PUT /api/branch-transfer/:id/receive
 * ผู้รับเซ็น (in-transit → received)
 */
exports.receiveTransfer = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const { receiverSignature, receivedBy, receivedAt } = req.body;

    const transfer = await BranchTransfer.findById(id);
    if (!transfer) {
      return res.status(404).json({ error: 'Transfer not found.' });
    }

    if (transfer.status !== 'in-transit' && transfer.status !== 'pending-receive') {
      return res.status(400).json({
        error: 'Transfer must be in-transit status to receive.'
      });
    }

    // Update transfer status and signature
    transfer.status = 'received';
    transfer.receiverSignature = receiverSignature;
    transfer.receivedBy = receivedBy;
    transfer.receivedAt = receivedAt || new Date();
    transfer.updated_at = new Date();

    const updatedTransfer = await transfer.save();

    io.emit('transferReceived', {
      id: updatedTransfer._id,
      data: updatedTransfer.toObject()
    });

    return res.json({
      success: true,
      data: updatedTransfer,
      message: 'Transfer received successfully'
    });
  } catch (err) {
    console.error('receiveTransfer error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * PUT /api/branch-transfer/:id/cancel
 * ยกเลิกการโอนย้าย
 */
exports.cancelTransfer = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const { cancelledBy, cancelledAt, reason } = req.body;

    const transfer = await BranchTransfer.findById(id);
    if (!transfer) {
      return res.status(404).json({ error: 'Transfer not found.' });
    }

    if (transfer.status === 'received' || transfer.status === 'cancelled') {
      return res.status(400).json({
        error: 'Cannot cancel transfer that is already received or cancelled.'
      });
    }

    // Update transfer status
    transfer.status = 'cancelled';
    transfer.cancelledBy = cancelledBy;
    transfer.cancelledAt = cancelledAt || new Date();
    transfer.cancelReason = reason || 'Cancelled by user';
    transfer.updated_at = new Date();

    const updatedTransfer = await transfer.save();

    io.emit('transferCancelled', {
      id: updatedTransfer._id,
      data: updatedTransfer.toObject()
    });

    return res.json({
      success: true,
      data: updatedTransfer,
      message: 'Transfer cancelled successfully'
    });
  } catch (err) {
    console.error('cancelTransfer error:', err);
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
