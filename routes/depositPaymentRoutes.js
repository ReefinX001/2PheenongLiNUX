/**
 * depositPaymentRoutes.js - Routes สำหรับจัดการใบจ่ายเงินมัดจำ
 * จัดการ CRUD operations สำหรับการจ่ายเงินมัดจำให้ผู้จำหน่าย
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Import authentication middleware
const authJWT = require('../middlewares/authJWT');

// Import models
const DepositPayment = require('../models/Account/DepositPayment');
const Supplier = require('../models/Stock/Supplier');
const ChartOfAccount = require('../models/Account/ChartOfAccount');
const JournalEntry = require('../models/Account/JournalEntry');

// Middleware สำหรับ error handling
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * สร้างรายการบัญชีสำหรับใบจ่ายเงินมัดจำ
 */
async function createDepositPaymentAccountingEntry(depositPayment) {
  try {
    console.log('📊 Creating accounting entry for deposit payment:', depositPayment.paymentNumber);

    const { amounts, paymentMethod, paymentDetails } = depositPayment;
    const depositAmount = amounts.depositAmount;

    // บัญชีเดบิต - เงินจ่ายล่วงหน้า (สินทรัพย์)
    const debitAccount = {
      accountCode: '1130', // เงินจ่ายล่วงหน้าผู้จำหน่าย
      accountName: 'เงินจ่ายล่วงหน้าผู้จำหน่าย',
      debitAmount: depositAmount,
      creditAmount: 0
    };

    // กำหนดบัญชีเครดิตตามวิธีการชำระเงิน
    let creditAccounts = [];

    if (paymentMethod === 'cash') {
      creditAccounts.push({
        accountCode: '1111', // เงินสดในมือ
        accountName: 'เงินสดในมือ',
        debitAmount: 0,
        creditAmount: depositAmount
      });
    } else if (paymentMethod === 'transfer') {
      creditAccounts.push({
        accountCode: '1112', // เงินฝากธนาคาร
        accountName: 'เงินฝากธนาคาร',
        debitAmount: 0,
        creditAmount: depositAmount
      });
    } else if (paymentMethod === 'check') {
      creditAccounts.push({
        accountCode: '1112', // เงินฝากธนาคาร
        accountName: 'เงินฝากธนาคาร (เช็ค)',
        debitAmount: 0,
        creditAmount: depositAmount
      });
    } else if (paymentMethod === 'mixed' && paymentDetails) {
      if (paymentDetails.cash > 0) {
        creditAccounts.push({
          accountCode: '1111',
          accountName: 'เงินสดในมือ',
          debitAmount: 0,
          creditAmount: paymentDetails.cash
        });
      }
      if (paymentDetails.transfer > 0) {
        creditAccounts.push({
          accountCode: '1112',
          accountName: 'เงินฝากธนาคาร',
          debitAmount: 0,
          creditAmount: paymentDetails.transfer
        });
      }
    }

    const journalLines = [];

    // สร้าง journal lines สำหรับบัญชีเดบิต
    let debitChartAccount = await ChartOfAccount.findOne({ code: debitAccount.accountCode });
    if (!debitChartAccount) {
      debitChartAccount = new ChartOfAccount({
        code: debitAccount.accountCode,
        name: debitAccount.accountName,
        type: 'Asset',
        category: 'Current Asset'
      });
      await debitChartAccount.save();
      console.log('✅ Created new chart account:', debitAccount.accountCode);
    }

    journalLines.push({
      account_id: debitChartAccount._id,
      debit: debitAccount.debitAmount,
      credit: debitAccount.creditAmount,
      description: `${debitAccount.accountName} - ${depositPayment.paymentNumber} - ${depositPayment.supplier.name}`
    });

    // สร้าง journal lines สำหรับบัญชีเครดิต
    for (const account of creditAccounts) {
      let chartAccount = await ChartOfAccount.findOne({ code: account.accountCode });

      if (!chartAccount) {
        chartAccount = new ChartOfAccount({
          code: account.accountCode,
          name: account.accountName,
          type: 'Asset',
          category: 'Current Asset'
        });
        await chartAccount.save();
        console.log('✅ Created new chart account:', account.accountCode);
      }

      journalLines.push({
        account_id: chartAccount._id,
        debit: account.debitAmount,
        credit: account.creditAmount,
        description: `${account.accountName} - ${depositPayment.paymentNumber}`
      });
    }

    // สร้าง Journal Entry
    const newJournalEntry = new JournalEntry({
      date: depositPayment.paymentDate || new Date(),
      reference: depositPayment.paymentNumber,
      memo: `จ่ายเงินมัดจำ - ${depositPayment.supplier.name} - ${depositPayment.paymentNumber}`,
      lines: journalLines,
      posted: true
    });

    await newJournalEntry.save();
    console.log('✅ Journal Entry saved with ID:', newJournalEntry._id);

    return newJournalEntry;
  } catch (error) {
    console.error('❌ Error creating accounting entry:', error);
    throw error;
  }
}

/**
 * GET /api/deposit-payments/list
 * ดึงรายการใบจ่ายเงินมัดจำแบบ list format
 */
router.get('/list', asyncHandler(async (req, res) => {
  console.log('📋 GET /api/deposit-payments/list');

  try {
    const {
      page = 1,
      limit = 50,
      status,
      branchCode,
      sort = 'desc'
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (branchCode) filter['branch.code'] = branchCode;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = sort === 'desc' ? -1 : 1;

    const [payments, totalCount] = await Promise.all([
      DepositPayment.find(filter)
        .sort({ createdAt: sortOrder })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      DepositPayment.countDocuments(filter)
    ]);

    const formattedPayments = payments.map(payment => ({
      id: payment._id,
      paymentNumber: payment.paymentNumber,
      supplierName: payment.supplier?.name || 'ไม่ระบุ',
      supplierCode: payment.supplier?.code || '',
      depositAmount: payment.amounts?.depositAmount || 0,
      totalAmount: payment.amounts?.totalAmount || 0,
      remainingAmount: payment.amounts?.remainingAmount || 0,
      depositType: payment.depositType,
      paymentMethod: payment.paymentMethod,
      status: payment.status,
      branchCode: payment.branch?.code,
      branchName: payment.branch?.name,
      paymentDate: payment.paymentDate,
      createdAt: payment.createdAt
    }));

    res.json({
      success: true,
      data: formattedPayments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('❌ Error fetching deposit payment list:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงรายการใบจ่ายเงินมัดจำ',
      error: error.message
    });
  }
}));

/**
 * GET /api/deposit-payments
 * ดึงรายการใบจ่ายเงินมัดจำทั้งหมด
 */
router.get('/', asyncHandler(async (req, res) => {
  console.log('📋 GET /api/deposit-payments');

  try {
    const {
      page = 1,
      limit = 20,
      status,
      branchCode,
      supplierCode,
      paymentNumber,
      startDate,
      endDate
    } = req.query;

    const filter = {};

    if (status) filter.status = status;
    if (branchCode) filter['branch.code'] = branchCode;
    if (supplierCode) filter['supplier.code'] = supplierCode;
    if (paymentNumber) filter.paymentNumber = { $regex: paymentNumber, $options: 'i' };

    if (startDate || endDate) {
      filter.paymentDate = {};
      if (startDate) filter.paymentDate.$gte = new Date(startDate);
      if (endDate) filter.paymentDate.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [payments, totalCount] = await Promise.all([
      DepositPayment.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      DepositPayment.countDocuments(filter)
    ]);

    // Calculate summary statistics
    const stats = await DepositPayment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalCount: { $sum: 1 },
          totalAmount: { $sum: '$amounts.depositAmount' },
          pendingCount: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          approvedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          },
          paidCount: {
            $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: payments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalDocs: totalCount,
        limit: parseInt(limit)
      },
      statistics: stats[0] || {
        totalCount: 0,
        totalAmount: 0,
        pendingCount: 0,
        approvedCount: 0,
        paidCount: 0
      }
    });

  } catch (error) {
    console.error('❌ Error fetching deposit payments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch deposit payments',
      error: error.message
    });
  }
}));

/**
 * GET /api/deposit-payments/:id
 * ดึงข้อมูลใบจ่ายเงินมัดจำตาม ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
  console.log('📋 GET /api/deposit-payments/:id');

  try {
    const { id } = req.params;

    let depositPayment;

    if (mongoose.Types.ObjectId.isValid(id)) {
      depositPayment = await DepositPayment.findById(id);
    } else {
      depositPayment = await DepositPayment.findOne({ paymentNumber: id });
    }

    if (!depositPayment) {
      return res.status(404).json({
        success: false,
        message: 'Deposit payment not found'
      });
    }

    res.json({
      success: true,
      data: depositPayment
    });

  } catch (error) {
    console.error('❌ Error fetching deposit payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch deposit payment',
      error: error.message
    });
  }
}));

/**
 * POST /api/deposit-payments
 * สร้างใบจ่ายเงินมัดจำใหม่
 */
router.post('/', authJWT, asyncHandler(async (req, res) => {
  console.log('📝 POST /api/deposit-payments');

  try {
    const depositPaymentData = req.body;

    // Validate required fields
    if (!depositPaymentData.supplier || !depositPaymentData.amounts) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: supplier and amounts are required'
      });
    }

    // Validate payment method
    if (depositPaymentData.paymentMethod === 'mixed') {
      const paymentDetails = depositPaymentData.paymentDetails;
      if (!paymentDetails || (!paymentDetails.cash && !paymentDetails.transfer)) {
        return res.status(400).json({
          success: false,
          message: 'Mixed payment requires cash and/or transfer amounts'
        });
      }
    }

    // Generate payment number
    const branchCode = depositPaymentData.branch?.code || '00000';
    const paymentNumber = await DepositPayment.generatePaymentNumber(branchCode);

    // Create new deposit payment
    const depositPayment = new DepositPayment({
      ...depositPaymentData,
      paymentNumber
    });

    const savedPayment = await depositPayment.save();

    // บันทึกรายการบัญชี (Journal Entry)
    try {
      const journalEntry = await createDepositPaymentAccountingEntry(savedPayment);

      savedPayment.relatedDocuments = savedPayment.relatedDocuments || {};
      savedPayment.relatedDocuments.journalEntryId = journalEntry._id;
      await savedPayment.save();

      console.log('✅ Accounting entry created for deposit payment:', savedPayment.paymentNumber);
    } catch (accountingError) {
      console.error('⚠️ Failed to create accounting entry:', accountingError);
    }

    res.status(201).json({
      success: true,
      message: 'Deposit payment created successfully',
      data: savedPayment
    });

  } catch (error) {
    console.error('❌ Error creating deposit payment:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Payment number already exists',
        error: 'Duplicate payment number'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create deposit payment',
      error: error.message
    });
  }
}));

/**
 * PUT /api/deposit-payments/:id
 * อัปเดตใบจ่ายเงินมัดจำ
 */
router.put('/:id', authJWT, asyncHandler(async (req, res) => {
  console.log('📝 PUT /api/deposit-payments/:id');

  try {
    const { id } = req.params;
    const updateData = req.body;

    const depositPayment = await DepositPayment.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!depositPayment) {
      return res.status(404).json({
        success: false,
        message: 'Deposit payment not found'
      });
    }

    res.json({
      success: true,
      message: 'Deposit payment updated successfully',
      data: depositPayment
    });

  } catch (error) {
    console.error('❌ Error updating deposit payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update deposit payment',
      error: error.message
    });
  }
}));

/**
 * DELETE /api/deposit-payments/:id
 * ลบ/ยกเลิกใบจ่ายเงินมัดจำ
 */
router.delete('/:id', authJWT, asyncHandler(async (req, res) => {
  console.log('🗑️ DELETE /api/deposit-payments/:id');

  try {
    const { id } = req.params;

    const depositPayment = await DepositPayment.findByIdAndDelete(id);

    if (!depositPayment) {
      return res.status(404).json({
        success: false,
        message: 'Deposit payment not found'
      });
    }

    res.json({
      success: true,
      message: 'Deposit payment deleted successfully',
      data: depositPayment
    });

  } catch (error) {
    console.error('❌ Error deleting deposit payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete deposit payment',
      error: error.message
    });
  }
}));

/**
 * POST /api/deposit-payments/:id/approve
 * อนุมัติใบจ่ายเงินมัดจำ
 */
router.post('/:id/approve', authJWT, asyncHandler(async (req, res) => {
  console.log('✅ POST /api/deposit-payments/:id/approve');

  try {
    const { id } = req.params;
    const { approvedBy } = req.body;

    const depositPayment = await DepositPayment.findById(id);

    if (!depositPayment) {
      return res.status(404).json({
        success: false,
        message: 'Deposit payment not found'
      });
    }

    await depositPayment.approve(approvedBy);

    res.json({
      success: true,
      message: 'Deposit payment approved successfully',
      data: depositPayment
    });

  } catch (error) {
    console.error('❌ Error approving deposit payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve deposit payment',
      error: error.message
    });
  }
}));

/**
 * Error handling middleware
 */
router.use((error, req, res, next) => {
  console.error('❌ Deposit Payment Routes Error:', error);

  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
});

module.exports = router;
