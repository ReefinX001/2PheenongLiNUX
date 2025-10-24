/**
 * Quotation API Routes
 * API endpoints สำหรับใบเสนอราคา
 */

const express = require('express');
const router = express.Router();

// Import middleware
const { authenticate, requireBranchAccess } = require('../../middleware/auth');
const { asyncHandler } = require('../../utils/error-handler');

// Import error classes
const {
  NotFoundError,
  ValidationError
} = require('../../utils/error-handler');

// Import Quotation model
const Quotation = require('../../models/Installment/Quotation');

/**
 * GET /api/quotation
 * Get all quotations for a branch
 */
router.get('/',
  asyncHandler(async (req, res) => {
    const {
      branchCode,
      limit = 100,
      offset = 0,
      startDate,
      endDate,
      search,
      status
    } = req.query;

    const user = req.user || {};

    // Build MongoDB filter
    const filter = {};

    // Branch filter
    if (branchCode) {
      filter.branchCode = branchCode;
    } else if (user.role !== 'admin' && user.branchCode) {
      filter.branchCode = user.branchCode;
    }

    // Date range filter
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    // Status filter
    if (status) {
      filter.status = status;
    }

    // Search filter
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { 'customer.name': searchRegex },
        { 'quotationNumber': searchRegex },
        { 'number': searchRegex },
        { 'customer.phone': searchRegex }
      ];
    }

    // Query database with pagination
    const total = await Quotation.countDocuments(filter);
    const quotations = await Quotation.find(filter)
      .sort({ createdAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .lean();

    console.log(`📊 Loaded ${quotations.length} quotations for branch ${branchCode || 'all'}`);

    res.json({
      success: true,
      data: quotations,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + quotations.length) < total
      }
    });
  })
);

/**
 * GET /api/quotation/:id
 * Get single quotation by ID
 */
router.get('/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const quotation = await Quotation.findOne({
      $or: [
        { _id: id },
        { quotationNumber: id },
        { number: id }
      ]
    });

    if (!quotation) {
      throw new NotFoundError('ไม่พบใบเสนอราคา');
    }

    res.json({
      success: true,
      data: quotation
    });
  })
);

/**
 * POST /api/quotation
 * Create new quotation
 */
router.post('/',
  asyncHandler(async (req, res) => {
    const quotationData = req.body;
    const user = req.user;

    // Set branch code from user if not provided
    if (!quotationData.branchCode && user.branchCode) {
      quotationData.branchCode = user.branchCode;
    }

    // Create quotation
    const quotation = new Quotation(quotationData);
    await quotation.save();

    console.log(`✅ Created quotation: ${quotation.quotationNumber}`);

    res.status(201).json({
      success: true,
      message: 'สร้างใบเสนอราคาสำเร็จ',
      data: quotation
    });
  })
);

/**
 * PUT /api/quotation/:id
 * Update quotation
 */
router.put('/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    const quotation = await Quotation.findOne({
      $or: [
        { _id: id },
        { quotationNumber: id },
        { number: id }
      ]
    });

    if (!quotation) {
      throw new NotFoundError('ไม่พบใบเสนอราคา');
    }

    // Update fields
    Object.assign(quotation, updateData);
    await quotation.save();

    console.log(`✅ Updated quotation: ${quotation.quotationNumber}`);

    res.json({
      success: true,
      message: 'อัพเดทใบเสนอราคาสำเร็จ',
      data: quotation
    });
  })
);

/**
 * DELETE /api/quotation/:id
 * Delete quotation
 */
router.delete('/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const quotation = await Quotation.findOne({
      $or: [
        { _id: id },
        { quotationNumber: id },
        { number: id }
      ]
    });

    if (!quotation) {
      throw new NotFoundError('ไม่พบใบเสนอราคา');
    }

    await quotation.deleteOne();

    console.log(`🗑️ Deleted quotation: ${quotation.quotationNumber}`);

    res.json({
      success: true,
      message: 'ลบใบเสนอราคาสำเร็จ'
    });
  })
);

module.exports = router;