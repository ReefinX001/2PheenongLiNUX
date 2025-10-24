/**
 * Deposit Receipts API Routes - Secure API endpoints
 * API endpoints สำหรับใบรับเงินมัดจำแบบปลอดภัย
 */

const express = require('express');
const router = express.Router();

// Import middleware
const { authenticate, authorize, requireBranchAccess } = require('../../middleware/auth');
const { rateLimits } = require('../../middleware/security');
const { depositReceiptValidation } = require('../../middleware/validation');
const { asyncHandler } = require('../../utils/error-handler');

// Import error classes
const {
  NotFoundError,
  ValidationError,
  DatabaseError
} = require('../../utils/error-handler');

// Import DepositReceipt model
const DepositReceipt = require('../../models/DepositReceipt');

// Apply rate limiting
router.use('/deposit-receipts', rateLimits.general);
router.use('/deposit-receipts', rateLimits.create); // for POST requests

/**
 * GET /api/deposit-receipts
 * Get all deposit receipts for a branch
 */
router.get('/',
  authenticate,
  requireBranchAccess,
  depositReceiptValidation.list,
  asyncHandler(async (req, res) => {
    const {
      branchCode,
      limit = 50,
      offset = 0,
      startDate,
      endDate,
      search,
      status
    } = req.query;

    const user = req.user;

    // Build MongoDB filter
    const filter = {};

    // Branch filter
    if (branchCode) {
      filter['branch.code'] = branchCode;
    } else if (user.role !== 'admin' && user.branchCode) {
      filter['branch.code'] = user.branchCode;
    }

    // Date range filter
    if (startDate || endDate) {
      filter.depositDate = {};
      if (startDate) filter.depositDate.$gte = new Date(startDate);
      if (endDate) filter.depositDate.$lte = new Date(endDate);
    }

    // Status filter
    if (status) {
      filter.status = status;
    }

    // Search filter using $or
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { 'customer.name': searchRegex },
        { 'product.name': searchRegex },
        { 'receiptNumber': searchRegex },
        { 'customer.phone': searchRegex }
      ];
    }

    // Query database with pagination
    const total = await DepositReceipt.countDocuments(filter);
    const depositReceipts = await DepositReceipt.find(filter)
      .sort({ createdAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .lean(); // Use lean() for better performance

    // Transform data for frontend compatibility
    const paginatedReceipts = depositReceipts.map(receipt => ({
      ...receipt,
      // Ensure receiptNumber exists
      receiptNumber: receipt.receiptNumber || receipt.documentNumber || `DR-${receipt._id}`,
      // Map amounts structure if needed
      amounts: receipt.amounts || {
        totalAmount: receipt.totalAmount || 0,
        depositAmount: receipt.depositAmount || 0,
        remainingAmount: receipt.remainingAmount || 0
      }
    }));

    res.json({
      success: true,
      data: paginatedReceipts,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < total
      }
    });
  })
);

/**
 * GET /api/deposit-receipts/:id
 * Get single deposit receipt by ID
 */
router.get('/:id',
  authenticate,
  requireBranchAccess,
  depositReceiptValidation.get,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = req.user;

    // Find by MongoDB ObjectId or receiptNumber
    let receipt;

    // Try to find by ObjectId first
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      receipt = await DepositReceipt.findById(id).lean();
    }

    // If not found by ObjectId, try by receiptNumber
    if (!receipt) {
      receipt = await DepositReceipt.findOne({
        $or: [
          { receiptNumber: id },
          { documentNumber: id }
        ]
      }).lean();
    }

    if (!receipt) {
      throw new NotFoundError('ไม่พบใบรับเงินมัดจำ');
    }

    // Check branch access
    if (user.role !== 'admin' && receipt.branch?.code !== user.branchCode) {
      throw new NotFoundError('ไม่พบใบรับเงินมัดจำ');
    }

    // Transform data for frontend compatibility
    const transformedReceipt = {
      ...receipt,
      receiptNumber: receipt.receiptNumber || receipt.documentNumber || `DR-${receipt._id}`,
      amounts: receipt.amounts || {
        totalAmount: receipt.totalAmount || 0,
        depositAmount: receipt.depositAmount || 0,
        remainingAmount: receipt.remainingAmount || 0
      }
    };

    res.json({
      success: true,
      data: transformedReceipt
    });
  })
);

/**
 * POST /api/deposit-receipts
 * Create new deposit receipt
 */
router.post('/',
  authenticate,
  authorize('admin', 'manager', 'cashier'),
  requireBranchAccess,
  rateLimits.create,
  depositReceiptValidation.create,
  asyncHandler(async (req, res) => {
    const user = req.user;
    const receiptData = req.body;

    // Generate receipt number if not provided
    const receiptNumber = receiptData.receiptNumber ||
      await DepositReceipt.generateReceiptNumber(receiptData.branchCode);

    // Prepare receipt data for MongoDB
    const depositReceiptData = {
      ...receiptData,
      receiptNumber,
      status: receiptData.status || 'pending',
      // Map salesperson data
      salesperson: receiptData.salesperson || {
        name: user.name || user.username,
        employeeId: user.userId
      },
      // Ensure amounts structure exists
      amounts: receiptData.amounts || {},
      // Set metadata
      metadata: {
        source: 'api',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    };

    // Validate deposit amount vs total amount
    if (depositReceiptData.amounts.depositAmount >= depositReceiptData.amounts.totalAmount) {
      throw new ValidationError('จำนวนเงินมัดจำต้องน้อยกว่าจำนวนเงินรวม');
    }

    // Create and save to MongoDB
    const newReceipt = new DepositReceipt(depositReceiptData);
    await newReceipt.save();

    console.log(`✅ Deposit receipt created: ${receiptNumber} by ${user.username}`);

    res.status(201).json({
      success: true,
      message: 'สร้างใบรับเงินมัดจำสำเร็จ',
      data: newReceipt
    });
  })
);

/**
 * PUT /api/deposit-receipts/:id
 * Update deposit receipt
 */
router.put('/:id',
  authenticate,
  authorize('admin', 'manager', 'cashier'),
  requireBranchAccess,
  depositReceiptValidation.update,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = req.user;
    const updateData = req.body;

    const receiptIndex = depositReceipts.findIndex(r => r.id === parseInt(id));

    if (receiptIndex === -1) {
      throw new NotFoundError('ไม่พบใบรับเงินมัดจำ');
    }

    const receipt = depositReceipts[receiptIndex];

    // Check branch access
    if (user.role !== 'admin' && receipt.branchCode !== user.branchCode) {
      throw new NotFoundError('ไม่พบใบรับเงินมัดจำ');
    }

    // Check if receipt can be modified
    if (receipt.status === 'completed' || receipt.status === 'cancelled') {
      throw new ValidationError('ไม่สามารถแก้ไขใบรับเงินมัดจำที่เสร็จสิ้นแล้วได้');
    }

    // Update receipt
    const updatedReceipt = {
      ...receipt,
      ...updateData,
      id: receipt.id, // Preserve ID
      receiptNumber: receipt.receiptNumber, // Preserve receipt number
      createdAt: receipt.createdAt, // Preserve creation date
      updatedAt: new Date().toISOString(),
      updatedBy: {
        userId: user.userId,
        username: user.username,
        name: user.name || user.username
      },
      version: receipt.version + 1
    };

    // Recalculate remaining amount if payment amounts changed
    if (updateData.payment) {
      const totalAmount = updateData.payment.totalAmount || receipt.payment.totalAmount;
      const depositAmount = updateData.payment.depositAmount || receipt.payment.depositAmount;

      if (depositAmount >= totalAmount) {
        throw new ValidationError('จำนวนเงินมัดจำต้องน้อยกว่าจำนวนเงินรวม');
      }

      updatedReceipt.payment.remainingAmount = totalAmount - depositAmount;
    }

    depositReceipts[receiptIndex] = updatedReceipt;

    console.log(`✅ Deposit receipt updated: ${receipt.receiptNumber} by ${user.username}`);

    res.json({
      success: true,
      message: 'อัปเดตใบรับเงินมัดจำสำเร็จ',
      data: updatedReceipt
    });
  })
);

/**
 * DELETE /api/deposit-receipts/:id
 * Cancel/Delete deposit receipt
 */
router.delete('/:id',
  authenticate,
  authorize('admin', 'manager'),
  requireBranchAccess,
  depositReceiptValidation.get,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = req.user;

    const receiptIndex = depositReceipts.findIndex(r => r.id === parseInt(id));

    if (receiptIndex === -1) {
      throw new NotFoundError('ไม่พบใบรับเงินมัดจำ');
    }

    const receipt = depositReceipts[receiptIndex];

    // Check branch access
    if (user.role !== 'admin' && receipt.branchCode !== user.branchCode) {
      throw new NotFoundError('ไม่พบใบรับเงินมัดจำ');
    }

    // Check if receipt can be cancelled
    if (receipt.status === 'completed') {
      throw new ValidationError('ไม่สามารถยกเลิกใบรับเงินมัดจำที่เสร็จสิ้นแล้วได้');
    }

    // Soft delete - mark as cancelled
    receipt.status = 'cancelled';
    receipt.updatedAt = new Date().toISOString();
    receipt.cancelledBy = {
      userId: user.userId,
      username: user.username,
      name: user.name || user.username
    };
    receipt.cancelledAt = new Date().toISOString();

    console.log(`🗑️ Deposit receipt cancelled: ${receipt.receiptNumber} by ${user.username}`);

    res.json({
      success: true,
      message: 'ยกเลิกใบรับเงินมัดจำสำเร็จ',
      data: receipt
    });
  })
);

/**
 * GET /api/deposit-receipts/stats/:branchCode
 * Get deposit receipt statistics for a branch
 */
router.get('/stats/:branchCode',
  authenticate,
  requireBranchAccess,
  asyncHandler(async (req, res) => {
    const { branchCode } = req.params;
    const user = req.user;

    // Check branch access
    if (user.role !== 'admin' && branchCode !== user.branchCode) {
      throw new NotFoundError('ไม่มีสิทธิ์เข้าถึงข้อมูลสาขานี้');
    }

    const branchReceipts = depositReceipts.filter(r => r.branchCode === branchCode);

    const stats = {
      total: branchReceipts.length,
      active: branchReceipts.filter(r => r.status === 'active').length,
      completed: branchReceipts.filter(r => r.status === 'completed').length,
      cancelled: branchReceipts.filter(r => r.status === 'cancelled').length,
      totalAmount: branchReceipts.reduce((sum, r) => sum + (r.payment?.totalAmount || 0), 0),
      depositAmount: branchReceipts.reduce((sum, r) => sum + (r.payment?.depositAmount || 0), 0)
    };

    res.json({
      success: true,
      data: stats
    });
  })
);

/**
 * POST /api/deposit-receipts/:receiptId/signature
 * Save signature for deposit receipt
 */
router.post('/:receiptId/signature',
  authenticate,
  asyncHandler(async (req, res) => {
    const { receiptId } = req.params;
    const { signatureType, signatureData } = req.body;

    if (!signatureType || !signatureData) {
      throw new ValidationError('signatureType and signatureData are required');
    }

    console.log(`💾 Saving ${signatureType} signature for receipt ${receiptId}`);

    // Find receipt
    const receipt = await DepositReceipt.findOne({
      $or: [
        { _id: receiptId },
        { receiptNumber: receiptId }
      ]
    });

    if (!receipt) {
      throw new NotFoundError('ไม่พบใบรับเงินมัดจำ');
    }

    // Initialize signatures object if not exists
    if (!receipt.signatures) {
      receipt.signatures = {};
    }
    if (!receipt.fingerprints) {
      receipt.fingerprints = {};
    }

    // Save signature based on type
    if (signatureType === 'customer') {
      receipt.signatures.customerSignature = {
        data: signatureData,
        timestamp: new Date(),
        method: 'qr-mobile'
      };
    } else if (signatureType === 'cashier' || signatureType === 'employee') {
      receipt.signatures.employeeSignature = {
        data: signatureData,
        timestamp: new Date(),
        method: 'qr-mobile'
      };
    }

    // Save to database
    await receipt.save();

    console.log(`✅ Signature saved successfully for ${receiptId}`);

    res.json({
      success: true,
      message: 'บันทึกลายเซ็นสำเร็จ',
      data: {
        receiptId: receipt._id,
        receiptNumber: receipt.receiptNumber,
        signatureType
      }
    });
  })
);

/**
 * GET /api/deposit-receipts/:receiptId/signatures
 * Get all signatures for deposit receipt
 */
router.get('/:receiptId/signatures',
  authenticate,
  asyncHandler(async (req, res) => {
    const { receiptId } = req.params;

    console.log(`🔍 Loading signatures for receipt ${receiptId}`);

    // Find receipt
    const receipt = await DepositReceipt.findOne({
      $or: [
        { _id: receiptId },
        { receiptNumber: receiptId }
      ]
    });

    if (!receipt) {
      throw new NotFoundError('ไม่พบใบรับเงินมัดจำ');
    }

    res.json({
      success: true,
      data: {
        signatures: receipt.signatures || {},
        fingerprints: receipt.fingerprints || {}
      }
    });
  })
);

// Helper function to generate receipt number (fallback)
function generateReceiptNumber(branchCode) {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const timestamp = Date.now().toString().slice(-6);

  return `${branchCode?.toUpperCase() || '00000'}-DP-${year}${month}${day}-${timestamp}`;
}

module.exports = router;