// controllers/otherIncomeController.js
const OtherIncome = require('../models/otherIncomeModel');
const ChartOfAccounts = require('../models/Account/ChartOfAccount');
const mongoose = require('mongoose');

// Get all other income records with filtering and pagination
exports.getAllOtherIncome = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 100,
      startDate,
      endDate,
      category,
      accountCode,
      status = 'confirmed',
      search,
      sortBy = 'date',
      sortOrder = 'desc'
    } = req.query;

    // Build filter query
    const filter = { status };

    // Add user/branch filter if not admin
    if (req.user && req.user.role !== 'admin') {
      const userId = req.user.userId || req.user._id;
      filter.$or = [
        { createdBy: userId },
        { branch: req.user.branch }
      ];
    }

    // Date range filter
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    // Category filter
    if (category) {
      filter.category = category;
    }

    // Account code filter
    if (accountCode) {
      filter.accountCode = accountCode;
    }

    // Search filter
    if (search) {
      filter.$or = [
        { documentNumber: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [records, total] = await Promise.all([
      OtherIncome.find(filter)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .populate('branch', 'name code')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      OtherIncome.countDocuments(filter)
    ]);

    // Calculate summary
    const summary = await OtherIncome.aggregate([
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
    ]);

    res.json({
      success: true,
      data: records,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
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
      error: error.message
    });
  }
};

// Get single other income record
exports.getOtherIncomeById = async (req, res) => {
  try {
    const record = await OtherIncome.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('branch', 'name code');

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลรายได้อื่นๆ'
      });
    }

    res.json({
      success: true,
      data: record
    });
  } catch (error) {
    console.error('Error fetching other income by ID:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูล',
      error: error.message
    });
  }
};

// Create new other income record
exports.createOtherIncome = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Generate document number if not provided
    if (!req.body.documentNumber) {
      req.body.documentNumber = await OtherIncome.generateDocumentNumber();
    }

    // Validate account code if provided
    let accountExists = null;
    if (req.body.accountCode) {
      accountExists = await ChartOfAccounts.findOne({
        $or: [
          { code: req.body.accountCode },
          { account_code: req.body.accountCode }
        ]
      });

      if (!accountExists) {
        throw new Error('รหัสบัญชีไม่ถูกต้องหรือไม่พร้อมใช้งาน');
      }
    }

    // Add user and branch info
    if (req.user) {
      // JWT token uses userId field, not _id
      req.body.createdBy = req.user.userId || req.user._id;
      if (req.user.branch) {
        req.body.branch = req.user.branch;
      }
    }

    // Add fiscal year and accounting period from date
    const recordDate = new Date(req.body.date);
    req.body.fiscalYear = recordDate.getFullYear();
    req.body.accountingPeriod = recordDate.getMonth() + 1; // Month is 0-based, so add 1

    // Create new record
    const newRecord = new OtherIncome(req.body);
    await newRecord.save({ session });

    // Update chart of accounts balance if needed
    if (accountExists) {
      await ChartOfAccounts.findByIdAndUpdate(
        accountExists._id,
        {
          $inc: { currentBalance: newRecord.totalAmount },
          $push: {
            transactions: {
              date: newRecord.date,
              type: 'income',
              reference: newRecord.documentNumber,
              debit: 0,
              credit: newRecord.totalAmount,
              balance: accountExists.currentBalance + newRecord.totalAmount
            }
          }
        },
        { session }
      );
    }

    await session.commitTransaction();

    // Populate and return the created record
    const populatedRecord = await OtherIncome.findById(newRecord._id)
      .populate('createdBy', 'name email')
      .populate('branch', 'name code');

    res.status(201).json({
      success: true,
      message: 'บันทึกรายได้อื่นๆ สำเร็จ',
      data: populatedRecord
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

// Update other income record
exports.updateOtherIncome = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    // Find existing record
    const existingRecord = await OtherIncome.findById(id);
    if (!existingRecord) {
      throw new Error('ไม่พบข้อมูลรายได้อื่นๆ');
    }

    // Check permission
    const userId = req.user.userId || req.user._id;
    if (req.user.role !== 'admin' &&
        existingRecord.createdBy.toString() !== userId.toString()) {
      throw new Error('คุณไม่มีสิทธิ์แก้ไขข้อมูลนี้');
    }

    // Validate account code if changed
    if (req.body.accountCode && req.body.accountCode !== existingRecord.accountCode) {
      const accountExists = await ChartOfAccounts.findOne({
        code: req.body.accountCode
      });

      if (!accountExists) {
        throw new Error('รหัสบัญชีไม่ถูกต้องหรือไม่พร้อมใช้งาน');
      }

      // Reverse old account balance
      await ChartOfAccounts.findOneAndUpdate(
        { code: existingRecord.accountCode },
        { $inc: { currentBalance: -existingRecord.totalAmount } },
        { session }
      );

      // Update new account balance
      await ChartOfAccounts.findOneAndUpdate(
        { code: req.body.accountCode },
        { $inc: { currentBalance: req.body.totalAmount || existingRecord.totalAmount } },
        { session }
      );
    } else if (req.body.totalAmount && req.body.totalAmount !== existingRecord.totalAmount) {
      // Update balance for amount change
      const difference = req.body.totalAmount - existingRecord.totalAmount;
      await ChartOfAccounts.findOneAndUpdate(
        { code: existingRecord.accountCode },
        { $inc: { currentBalance: difference } },
        { session }
      );
    }

    // Update record
    req.body.updatedBy = req.user.userId || req.user._id;
    const updatedRecord = await OtherIncome.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true, session }
    );

    await session.commitTransaction();

    // Populate and return
    const populatedRecord = await OtherIncome.findById(updatedRecord._id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('branch', 'name code');

    res.json({
      success: true,
      message: 'อัพเดทข้อมูลรายได้อื่นๆ สำเร็จ',
      data: populatedRecord
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

// Delete (soft delete) other income record
exports.deleteOtherIncome = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    // Find existing record
    const existingRecord = await OtherIncome.findById(id);
    if (!existingRecord) {
      throw new Error('ไม่พบข้อมูลรายได้อื่นๆ');
    }

    // Check permission
    const userId = req.user.userId || req.user._id;
    if (req.user.role !== 'admin' &&
        existingRecord.createdBy.toString() !== userId.toString()) {
      throw new Error('คุณไม่มีสิทธิ์ลบข้อมูลนี้');
    }

    // Reverse account balance
    await ChartOfAccounts.findOneAndUpdate(
      { code: existingRecord.accountCode },
      { $inc: { currentBalance: -existingRecord.totalAmount } },
      { session }
    );

    // Soft delete by updating status
    existingRecord.status = 'cancelled';
    existingRecord.updatedBy = req.user._id;
    await existingRecord.save({ session });

    await session.commitTransaction();

    res.json({
      success: true,
      message: 'ยกเลิกรายได้อื่นๆ สำเร็จ'
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error deleting other income:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'เกิดข้อผิดพลาดในการยกเลิกข้อมูล'
    });
  } finally {
    session.endSession();
  }
};

// Get categories
exports.getCategories = async (req, res) => {
  try {
    const categories = [
      'ดอกเบี้ยรับ',
      'เงินปันผล',
      'กำไรจากการขายสินทรัพย์',
      'รายได้ค่าเช่า',
      'รายได้ค่าบริการ',
      'รายได้อื่นๆ'
    ];

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงหมวดหมู่'
    });
  }
};

// Get income summary by category
exports.getSummaryByCategory = async (req, res) => {
  try {
    const { startDate, endDate, branch } = req.query;

    const match = { status: 'confirmed' };

    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = new Date(startDate);
      if (endDate) match.date.$lte = new Date(endDate);
    }

    if (branch) {
      match.branch = new mongoose.Types.ObjectId(branch);
    }

    const summary = await OtherIncome.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$category',
          totalAmount: { $sum: '$totalAmount' },
          totalVat: { $sum: '$vatAmount' },
          totalNet: { $sum: '$netAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error getting summary by category:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสรุปข้อมูล'
    });
  }
};

// Export data to Excel
exports.exportToExcel = async (req, res) => {
  try {
    const { startDate, endDate, category, status = 'confirmed' } = req.query;

    const filter = { status };

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    if (category) {
      filter.category = category;
    }

    const records = await OtherIncome.find(filter)
      .populate('createdBy', 'name')
      .populate('branch', 'name')
      .sort({ date: -1 });

    // Format data for export
    const exportData = records.map(record => ({
      'เลขที่เอกสาร': record.documentNumber,
      'วันที่': record.date.toLocaleDateString('th-TH'),
      'หมวดหมู่': record.category,
      'รายละเอียด': record.description,
      'จำนวนเงิน': record.amount,
      'VAT': record.vatAmount,
      'รวมทั้งสิ้น': record.totalAmount,
      'ภาษีหัก ณ ที่จ่าย': record.withholdingTaxAmount,
      'จำนวนสุทธิ': record.netAmount,
      'วิธีชำระเงิน': record.paymentMethod,
      'รหัสบัญชี': record.accountCode,
      'ลูกค้า': record.customerName || '-',
      'หมายเหตุ': record.notes || '-',
      'สถานะ': record.status,
      'สร้างโดย': record.createdBy?.name || '-',
      'สาขา': record.branch?.name || '-'
    }));

    res.json({
      success: true,
      data: exportData
    });
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการส่งออกข้อมูล'
    });
  }
};