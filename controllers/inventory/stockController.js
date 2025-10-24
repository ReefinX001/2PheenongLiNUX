const Stock = require('../../models/Stock/Stock');
const BranchStock = require('../../models/POS/BranchStock');
const StockHistory = require('../../models/Stock/StockHistory');
const AuditLog = require('../../models/Account/AuditLog');
const { validationResult } = require('express-validator');

/**
 * ✅ POST /api/stock
 * ตรวจสอบว่ามีสินค้าอยู่ในสต๊อกแล้วหรือไม่ ถ้ามีให้บวกจำนวน ไม่ต้องสร้างใหม่
 */
exports.createStock = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { product_id, branch_code, quantity, updated_by } = req.body;

    if (!product_id || !branch_code) {
      return res.status(400).json({ error: 'product_id และ branch_code จำเป็น' });
    }

    const stock = await Stock.findOneAndUpdate(
            { product_id, branch_code }, // ค้นหาสินค้าเดิม
            {
              $inc: { quantity: quantity || 0 }, // บวกจำนวนแทนการสร้างใหม่
              updated_by: updated_by || null
            },
            { new: true, upsert: true } // ถ้ายังไม่มี ให้สร้างใหม่
          );
    io.emit('stockUpdated', {
      id: stock._id,
      data: stock
    });

    return res.json({ success: true, data: stock });
  } catch (err) {
    console.error('createStock error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * ✅ GET /api/stock
 * ถ้ามี ?branch_id=xxx ให้กรองเฉพาะสาขานั้น
 */
exports.getAllStocks = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    if (req.query.branch) filter.branch = req.query.branch;
    if (req.query.product) filter.product = req.query.product;
    if (req.query.status) filter.status = req.query.status;

    // Apply branch restriction for non-admin users
    if (req.user.role !== 'admin' && req.user.branch) {
      filter.branch = req.user.branch;
    }

    const [stocks, total] = await Promise.all([
      Stock.find(filter).lean()
        .populate('product', 'name sku')
        .populate('branch', 'name')
        .sort({ updatedAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean(),
      Stock.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: stocks,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get stocks error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve stocks'
    });
  }
};

/**
 * ✅ GET /api/stock/:id
 * ดึง Stock ตาม _id
 */
exports.getStock = async (req, res) => {
  try {
    const stock = await Stock.findById(req.params.id).lean()
      .populate('product', 'name sku category')
      .populate('branch', 'name code')
      .populate('lastModifiedBy', 'name email')
      .lean();

    if (!stock) {
      return res.status(404).json({
        success: false,
        error: 'Stock not found'
      });
    }

    // Check branch access
    if (req.user.role !== 'admin' && stock.branch.toString() !== req.user.branch) {
      await AuditLog.logActivity(req, 'READ', 'Stock', req.params.id, {
        status: 'unauthorized',
        error: 'Attempted to access stock from different branch'
      });

      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: stock
    });
  } catch (error) {
    console.error('Get stock error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve stock'
    });
  }
};

/**
 * ✅ PATCH /api/stock/:id
 * อัปเดตข้อมูลสต๊อก
 */
exports.updateStock = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { quantity, type, reference, notes } = req.body;

    const stock = await Stock.findById(req.params.id).lean();
    if (!stock) {
      return res.status(404).json({
        success: false,
        error: 'Stock not found'
      });
    }

    // Check branch access
    if (req.user.role !== 'admin' && stock.branch.toString() !== req.user.branch) {
      await AuditLog.logActivity(req, 'UPDATE', 'Stock', req.params.id, {
        status: 'unauthorized',
        error: 'Attempted to update stock from different branch'
      });

      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const balanceBefore = stock.quantity;
    let balanceAfter;

    // Calculate new balance based on type
    switch (type) {
      case 'add':
        balanceAfter = balanceBefore + quantity;
        break;
      case 'subtract':
        if (balanceBefore < quantity) {
          return res.status(400).json({
            success: false,
            error: 'Insufficient stock'
          });
        }
        balanceAfter = balanceBefore - quantity;
        break;
      case 'adjust':
        balanceAfter = quantity;
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid operation type'
        });
    }

    // Update stock
    stock.quantity = balanceAfter;
    stock.lastModifiedBy = req.user._id;
    stock.lastModifiedAt = new Date();

    // Check stock levels
    if (balanceAfter <= stock.minQuantity) {
      stock.status = 'low';
    } else if (balanceAfter >= stock.maxQuantity) {
      stock.status = 'overstock';
    } else {
      stock.status = 'normal';
    }

    await stock.save();

    // Create stock history
    await StockHistory.create({
      stock: stock._id,
      product: stock.product,
      branch: stock.branch,
      type,
      quantity,
      balanceBefore,
      balanceAfter,
      user: req.user._id,
      reference,
      notes
    });

    // Log activity
    await AuditLog.logActivity(req, 'UPDATE', 'Stock', stock._id, {
      resourceName: `Stock quantity update`,
      changes: {
        before: { quantity: balanceBefore },
        after: { quantity: balanceAfter },
        fields: ['quantity']
      },
      metadata: {
        type,
        reference,
        notes
      }
    });

    res.json({
      success: true,
      data: stock
    });
  } catch (error) {
    console.error('Update stock error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update stock'
    });
  }
};

/**
 * ✅ DELETE /api/stock/:id
 * ลบ Stock ออกจาก DB จริง
 */
exports.deleteStock = async (req, res) => {
  try {
    const stock = await Stock.findById(req.params.id).lean();
    if (!stock) {
      return res.status(404).json({
        success: false,
        error: 'Stock not found'
      });
    }

    // Check branch access
    if (req.user.role !== 'admin' && stock.branch.toString() !== req.user.branch) {
      await AuditLog.logActivity(req, 'DELETE', 'Stock', req.params.id, {
        status: 'unauthorized',
        error: 'Attempted to delete stock from different branch'
      });

      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Soft delete
    stock.isDeleted = true;
    stock.deletedBy = req.user._id;
    stock.deletedAt = new Date();
    await stock.save();

    // Log activity
    await AuditLog.logActivity(req, 'DELETE', 'Stock', stock._id, {
      resourceName: `Stock for product ${stock.product}`,
      metadata: {
        reason: req.body.reason
      }
    });

    res.json({
      success: true,
      message: 'Stock deleted successfully'
    });
  } catch (error) {
    console.error('Delete stock error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete stock'
    });
  }
};

// Transfer stock between branches
exports.transferStock = async (req, res) => {
  const session = await Stock.startSession();
  session.startTransaction();

  try {
    const { fromBranch, toBranch, product, quantity, notes } = req.body;

    // Validate user can transfer from source branch
    if (req.user.role !== 'admin' && req.user.branch !== fromBranch) {
      await AuditLog.logActivity(req, 'UPDATE', 'Stock', null, {
        status: 'unauthorized',
        error: 'Attempted to transfer stock from unauthorized branch'
      });

      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Get source stock
    const sourceStock = await Stock.findOne({ branch: fromBranch, product }).lean().session(session);
    if (!sourceStock || sourceStock.quantity < quantity) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: 'Insufficient stock in source branch'
      });
    }

    // Get or create destination stock
    let destStock = await Stock.findOne({ branch: toBranch, product }).lean().session(session);
    if (!destStock) {
      destStock = new Stock({
        product,
        branch: toBranch,
        quantity: 0,
        minQuantity: sourceStock.minQuantity,
        maxQuantity: sourceStock.maxQuantity,
        lastModifiedBy: req.user._id
      });
    }

    // Update quantities
    const sourceBefore = sourceStock.quantity;
    const destBefore = destStock.quantity;

    sourceStock.quantity -= quantity;
    destStock.quantity += quantity;

    sourceStock.lastModifiedBy = req.user._id;
    destStock.lastModifiedBy = req.user._id;

    await sourceStock.save({ session });
    await destStock.save({ session });

    // Create history records
    await StockHistory.create([
      {
        stock: sourceStock._id,
        product,
        branch: fromBranch,
        type: 'transfer_out',
        quantity,
        balanceBefore: sourceBefore,
        balanceAfter: sourceStock.quantity,
        user: req.user._id,
        reference: `Transfer to ${toBranch}`,
        notes
      },
      {
        stock: destStock._id,
        product,
        branch: toBranch,
        type: 'transfer_in',
        quantity,
        balanceBefore: destBefore,
        balanceAfter: destStock.quantity,
        user: req.user._id,
        reference: `Transfer from ${fromBranch}`,
        notes
      }
    ], { session });

    await session.commitTransaction();

    // Log activity
    await AuditLog.logActivity(req, 'UPDATE', 'Stock', null, {
      resourceName: 'Stock Transfer',
      metadata: {
        fromBranch,
        toBranch,
        product,
        quantity,
        notes
      }
    });

    res.json({
      success: true,
      message: 'Stock transferred successfully',
      data: {
        source: sourceStock,
        destination: destStock
      }
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Transfer stock error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to transfer stock'
    });
  } finally {
    session.endSession();
  }
};

// Get stock history
exports.getStockHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const filter = { stock: req.params.id };
    if (req.query.type) filter.type = req.query.type;
    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate) filter.createdAt.$gte = new Date(req.query.startDate);
      if (req.query.endDate) filter.createdAt.$lte = new Date(req.query.endDate);
    }

    const [history, total] = await Promise.all([
      StockHistory.find(filter).lean()
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean(),
      StockHistory.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: history,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get stock history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve stock history'
    });
  }
};
