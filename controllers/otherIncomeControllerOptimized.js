// controllers/otherIncomeControllerOptimized.js
const OtherIncome = require('../models/otherIncomeModel');
const ChartOfAccounts = require('../models/Account/ChartOfAccount');
const mongoose = require('mongoose');
const NodeCache = require('node-cache');

// Initialize cache with 5 minute TTL
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// Cache keys
const CACHE_KEYS = {
  CHART_OF_ACCOUNTS: 'chart_of_accounts',
  INCOME_CATEGORIES: 'income_categories',
  SUMMARY_PREFIX: 'summary_'
};

// Helper function to build filter query efficiently
const buildFilterQuery = (req) => {
  const {
    startDate,
    endDate,
    category,
    accountCode,
    status = 'confirmed',
    search,
    minAmount,
    maxAmount,
    paymentMethod,
    branch
  } = req.query;

  const filter = { status };

  // Use compound index for date range
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      filter.date.$lte = endOfDay;
    }
  }

  // Direct field matches (uses indexes)
  if (category) filter.category = category;
  if (accountCode) filter.accountCode = accountCode;
  if (paymentMethod) filter.paymentMethod = paymentMethod;
  if (branch) filter.branch = new mongoose.Types.ObjectId(branch);

  // Amount range filter
  if (minAmount || maxAmount) {
    filter.totalAmount = {};
    if (minAmount) filter.totalAmount.$gte = parseFloat(minAmount);
    if (maxAmount) filter.totalAmount.$lte = parseFloat(maxAmount);
  }

  // Text search optimization
  if (search) {
    // Use text index if available, otherwise use regex
    if (search.length >= 3) {  // Only search if at least 3 characters
      filter.$or = [
        { documentNumber: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } }
      ];
    }
  }

  // User permissions (optimized)
  if (req.user && req.user.role !== 'admin') {
    if (req.user.branch) {
      filter.$or = [
        { createdBy: req.user._id },
        { branch: req.user.branch }
      ];
    } else {
      filter.createdBy = req.user._id;
    }
  }

  return filter;
};

// Optimized get all with pagination, filtering, and lean queries
exports.getAllOtherIncome = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,  // Reduced default limit for better performance
      sortBy = 'date',
      sortOrder = 'desc',
      fields  // Allow field selection
    } = req.query;

    const filter = buildFilterQuery(req);

    // Calculate pagination with limit
    const skip = (page - 1) * limit;
    const parsedLimit = Math.min(parseInt(limit), 500); // Max 500 records

    // Build sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Build field selection
    let selectFields = fields ? fields.split(',').join(' ') : '';

    // Execute queries in parallel for better performance
    const [records, total, summary] = await Promise.all([
      // Main query with lean() for better performance
      OtherIncome
        .find(filter)
        .select(selectFields)
        .populate({
          path: 'createdBy',
          select: 'name email',
          options: { lean: true }
        })
        .populate({
          path: 'branch',
          select: 'name code',
          options: { lean: true }
        })
        .sort(sortOptions)
        .skip(skip)
        .limit(parsedLimit)
        .lean()
        .exec(),

      // Count with estimated count for better performance on large collections
      OtherIncome.countDocuments(filter).maxTimeMS(5000),

      // Aggregation pipeline optimized with allowDiskUse
      OtherIncome.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$totalAmount' },
            totalVat: { $sum: '$vatAmount' },
            totalWithholdingTax: { $sum: '$withholdingTaxAmount' },
            totalNet: { $sum: '$netAmount' },
            count: { $sum: 1 }
          }
        }
      ]).allowDiskUse(true).exec()
    ]);

    res.json({
      success: true,
      data: records,
      pagination: {
        total,
        page: parseInt(page),
        limit: parsedLimit,
        pages: Math.ceil(total / parsedLimit),
        hasNext: page * parsedLimit < total,
        hasPrev: page > 1
      },
      summary: summary[0] || {
        totalAmount: 0,
        totalVat: 0,
        totalWithholdingTax: 0,
        totalNet: 0,
        count: 0
      }
    });
  } catch (error) {
    console.error('Error fetching other income:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลรายได้อื่นๆ',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Optimized single record retrieval with caching
exports.getOtherIncomeById = async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `income_${id}`;

    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true
      });
    }

    const record = await OtherIncome
      .findById(id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('branch', 'name code')
      .lean();

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลรายได้อื่นๆ'
      });
    }

    // Cache the result
    cache.set(cacheKey, record);

    res.json({
      success: true,
      data: record
    });
  } catch (error) {
    console.error('Error fetching other income by ID:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
    });
  }
};

// Optimized create with bulk operations support
exports.createOtherIncome = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Support bulk creation
    const isArray = Array.isArray(req.body);
    const documents = isArray ? req.body : [req.body];

    // Validate and prepare documents
    const preparedDocs = await Promise.all(documents.map(async (doc) => {
      // Generate document number if not provided
      if (!doc.documentNumber) {
        doc.documentNumber = await OtherIncome.generateDocumentNumber();
      }

      // Add metadata
      doc.createdBy = req.user._id;
      if (req.user.branch) {
        doc.branch = req.user.branch;
      }

      return doc;
    }));

    // Bulk insert for better performance
    const newRecords = await OtherIncome.insertMany(preparedDocs, { session });

    // Update chart of accounts balances in bulk
    const accountUpdates = {};
    newRecords.forEach(record => {
      if (!accountUpdates[record.accountCode]) {
        accountUpdates[record.accountCode] = 0;
      }
      accountUpdates[record.accountCode] += record.totalAmount;
    });

    // Bulk update accounts
    const bulkOps = Object.entries(accountUpdates).map(([code, amount]) => ({
      updateOne: {
        filter: { code },
        update: { $inc: { currentBalance: amount } }
      }
    }));

    if (bulkOps.length > 0) {
      await ChartOfAccounts.bulkWrite(bulkOps, { session });
    }

    await session.commitTransaction();

    // Clear relevant caches
    cache.flushAll();

    res.status(201).json({
      success: true,
      message: `บันทึก ${newRecords.length} รายการสำเร็จ`,
      data: isArray ? newRecords : newRecords[0]
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error creating other income:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล'
    });
  } finally {
    session.endSession();
  }
};

// Optimized update with partial updates support
exports.updateOtherIncome = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const updates = req.body;

    // Use findOneAndUpdate for atomic operation
    const existingRecord = await OtherIncome.findById(id).session(session);

    if (!existingRecord) {
      throw new Error('ไม่พบข้อมูลรายได้อื่นๆ');
    }

    // Check permissions
    if (req.user.role !== 'admin' &&
        existingRecord.createdBy.toString() !== req.user._id.toString()) {
      throw new Error('คุณไม่มีสิทธิ์แก้ไขข้อมูลนี้');
    }

    // Handle account balance updates efficiently
    const amountDiff = (updates.totalAmount || existingRecord.totalAmount) - existingRecord.totalAmount;

    if (amountDiff !== 0) {
      await ChartOfAccounts.updateOne(
        { code: existingRecord.accountCode },
        { $inc: { currentBalance: amountDiff } },
        { session }
      );
    }

    // Update record
    updates.updatedBy = req.user._id;
    Object.assign(existingRecord, updates);
    await existingRecord.save({ session });

    await session.commitTransaction();

    // Clear cache
    cache.del(`income_${id}`);

    res.json({
      success: true,
      message: 'อัพเดทข้อมูลสำเร็จ',
      data: existingRecord
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error updating other income:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'เกิดข้อผิดพลาดในการอัพเดทข้อมูล'
    });
  } finally {
    session.endSession();
  }
};

// Bulk delete with soft delete support
exports.bulkDeleteOtherIncome = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error('กรุณาระบุ IDs ที่ต้องการลบ');
    }

    // Soft delete by updating status
    const result = await OtherIncome.updateMany(
      {
        _id: { $in: ids },
        createdBy: req.user.role === 'admin' ? { $exists: true } : req.user._id
      },
      {
        status: 'cancelled',
        updatedBy: req.user._id,
        deletedAt: new Date()
      },
      { session }
    );

    await session.commitTransaction();

    // Clear cache
    ids.forEach(id => cache.del(`income_${id}`));

    res.json({
      success: true,
      message: `ยกเลิก ${result.modifiedCount} รายการสำเร็จ`,
      count: result.modifiedCount
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error bulk deleting:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  } finally {
    session.endSession();
  }
};

// Cached categories endpoint
exports.getCategories = async (req, res) => {
  try {
    // Check cache first
    let categories = cache.get(CACHE_KEYS.INCOME_CATEGORIES);

    if (!categories) {
      // Get from database
      categories = await OtherIncome.distinct('category');

      // Add default categories if missing
      const defaultCategories = [
        'ดอกเบี้ยรับ',
        'เงินปันผล',
        'กำไรจากการขายสินทรัพย์',
        'รายได้ค่าเช่า',
        'รายได้ค่าบริการ',
        'รายได้อื่นๆ'
      ];

      categories = [...new Set([...categories, ...defaultCategories])];
      cache.set(CACHE_KEYS.INCOME_CATEGORIES, categories);
    }

    res.json({
      success: true,
      data: categories,
      cached: cache.has(CACHE_KEYS.INCOME_CATEGORIES)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงหมวดหมู่'
    });
  }
};

// Optimized summary with caching
exports.getSummaryByCategory = async (req, res) => {
  try {
    const { startDate, endDate, branch } = req.query;

    // Generate cache key based on parameters
    const cacheKey = `${CACHE_KEYS.SUMMARY_PREFIX}${startDate}_${endDate}_${branch}`;

    // Check cache
    let summary = cache.get(cacheKey);

    if (!summary) {
      const match = { status: 'confirmed' };

      if (startDate || endDate) {
        match.date = {};
        if (startDate) match.date.$gte = new Date(startDate);
        if (endDate) match.date.$lte = new Date(endDate);
      }

      if (branch) {
        match.branch = new mongoose.Types.ObjectId(branch);
      }

      // Optimized aggregation pipeline
      summary = await OtherIncome.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$category',
            totalAmount: { $sum: '$totalAmount' },
            totalVat: { $sum: '$vatAmount' },
            totalNet: { $sum: '$netAmount' },
            count: { $sum: 1 },
            avgAmount: { $avg: '$totalAmount' }
          }
        },
        { $sort: { totalAmount: -1 } },
        {
          $project: {
            category: '$_id',
            totalAmount: { $round: ['$totalAmount', 2] },
            totalVat: { $round: ['$totalVat', 2] },
            totalNet: { $round: ['$totalNet', 2] },
            avgAmount: { $round: ['$avgAmount', 2] },
            count: 1,
            _id: 0
          }
        }
      ]).allowDiskUse(true).exec();

      // Cache for 5 minutes
      cache.set(cacheKey, summary);
    }

    res.json({
      success: true,
      data: summary,
      cached: cache.has(cacheKey)
    });
  } catch (error) {
    console.error('Error getting summary:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสรุปข้อมูล'
    });
  }
};

// Stream large exports for better memory usage
exports.exportToExcel = async (req, res) => {
  try {
    const filter = buildFilterQuery(req);

    // Use cursor for streaming large datasets
    const cursor = OtherIncome
      .find(filter)
      .populate('createdBy', 'name')
      .populate('branch', 'name')
      .sort({ date: -1 })
      .cursor();

    const exportData = [];

    cursor.on('data', (doc) => {
      exportData.push({
        'เลขที่เอกสาร': doc.documentNumber,
        'วันที่': doc.date.toLocaleDateString('th-TH'),
        'หมวดหมู่': doc.category,
        'รายละเอียด': doc.description,
        'จำนวนเงิน': doc.amount,
        'VAT': doc.vatAmount,
        'รวมทั้งสิ้น': doc.totalAmount,
        'วิธีชำระเงิน': doc.paymentMethod,
        'รหัสบัญชี': doc.accountCode,
        'หมายเหตุ': doc.notes || '-'
      });
    });

    cursor.on('error', (err) => {
      console.error('Export error:', err);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการส่งออกข้อมูล'
      });
    });

    cursor.on('end', () => {
      res.json({
        success: true,
        data: exportData,
        count: exportData.length
      });
    });
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการส่งออกข้อมูล'
    });
  }
};

// Get chart of accounts with caching
exports.getChartOfAccounts = async (req, res) => {
  try {
    // Check cache first
    let accounts = cache.get(CACHE_KEYS.CHART_OF_ACCOUNTS);

    if (!accounts) {
      // Get income accounts only
      accounts = await ChartOfAccounts
        .find({
          $or: [
            { code: { $regex: '^44' } },
            { type: 'Income' },
            { category: 'Income' }
          ]
        })
        .select('code name type category')
        .sort('code')
        .lean();

      // Cache for 10 minutes
      cache.set(CACHE_KEYS.CHART_OF_ACCOUNTS, accounts, 600);
    }

    res.json({
      success: true,
      data: accounts,
      cached: cache.has(CACHE_KEYS.CHART_OF_ACCOUNTS)
    });
  } catch (error) {
    console.error('Error fetching chart of accounts:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงผังบัญชี'
    });
  }
};

module.exports = exports;