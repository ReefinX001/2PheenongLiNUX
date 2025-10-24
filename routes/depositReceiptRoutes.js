/**
 * depositReceiptRoutes.js - Routes สำหรับจัดการใบรับเงินมัดจำ
 * จัดการ CRUD operations และฟีเจอร์ต่าง ๆ ของระบบมัดจำ
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Import authentication middleware
const authJWT = require('../middlewares/authJWT');

// Import models
const DepositReceipt = require('../models/DepositReceipt');
const Customer = require('../models/Customer/Customer');
const Product = require('../models/Stock/Product'); // ✅ Uncomment เพราะใช้ใน populate
const Branch = require('../models/Account/Branch');
const ChartOfAccount = require('../models/Account/ChartOfAccount');
const JournalEntry = require('../models/Account/JournalEntry');

// Middleware สำหรับ error handling
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * สร้างรายการบัญชีสำหรับใบรับเงินมัดจำ
 * @param {Object} depositReceipt - ข้อมูลใบรับเงินมัดจำ
 */
async function createDepositReceiptAccountingEntry(depositReceipt) {
  try {
    console.log('📊 Creating accounting entry for deposit receipt:', depositReceipt.receiptNumber);

    const { amounts, paymentMethod, paymentDetails } = depositReceipt;
    const depositAmount = amounts.depositAmount;

    // กำหนดบัญชีตามวิธีการชำระเงิน
    let debitAccounts = [];

    if (paymentMethod === 'cash') {
      // เงินสด
      debitAccounts.push({
        accountCode: '1111', // เงินสดในมือ
        accountName: 'เงินสดในมือ',
        debitAmount: depositAmount,
        creditAmount: 0
      });
    } else if (paymentMethod === 'transfer') {
      // โอนเงิน
      debitAccounts.push({
        accountCode: '1112', // เงินฝากธนาคาร
        accountName: 'เงินฝากธนาคาร',
        debitAmount: depositAmount,
        creditAmount: 0
      });
    } else if (paymentMethod === 'mixed' && paymentDetails) {
      // การชำระแบบผสม
      if (paymentDetails.cash > 0) {
        debitAccounts.push({
          accountCode: '1111', // เงินสดในมือ
          accountName: 'เงินสดในมือ',
          debitAmount: paymentDetails.cash,
          creditAmount: 0
        });
      }

      if (paymentDetails.transfer > 0) {
        debitAccounts.push({
          accountCode: '1112', // เงินฝากธนาคาร
          accountName: 'เงินฝากธนาคาร',
          debitAmount: paymentDetails.transfer,
          creditAmount: 0
        });
      }
    }

    // บัญชีเครดิต - เงินรับล่วงหน้าจากลูกค้า (หนี้สิน)
    const creditAccount = {
      accountCode: '2130', // เงินรับล่วงหน้าจากลูกค้า
      accountName: 'เงินรับล่วงหน้าจากลูกค้า (มัดจำ)',
      debitAmount: 0,
      creditAmount: depositAmount
    };

    // สร้างรายการบัญชี
    const journalEntry = {
      date: depositReceipt.depositDate || new Date(),
      description: `รับเงินมัดจำ - ${depositReceipt.receiptNumber}`,
      reference: depositReceipt.receiptNumber,
      documentType: 'deposit_receipt',
      documentId: depositReceipt._id,
      entries: [...debitAccounts, creditAccount],
      totalDebit: depositAmount,
      totalCredit: depositAmount,
      status: 'posted',
      createdBy: depositReceipt.salesperson?.name || 'System',
      branchCode: depositReceipt.branch?.code || '00000'
    };

    console.log('📊 Journal Entry:', JSON.stringify(journalEntry, null, 2));

    // บันทึกลงในระบบบัญชี
    const journalLines = [];

    // หาบัญชีและสร้าง journal lines
    for (const account of [...debitAccounts, creditAccount]) {
      // ค้นหาบัญชีใน Chart of Accounts
      let chartAccount = await ChartOfAccount.findOne({ code: account.accountCode });

      if (!chartAccount) {
        // สร้างบัญชีใหม่หากไม่พบ
        chartAccount = new ChartOfAccount({
          code: account.accountCode,
          name: account.accountName,
          type: account.accountCode.startsWith('1') ? 'Asset' :
                account.accountCode.startsWith('2') ? 'Liabilities' : 'Equity',
          category: account.accountCode.startsWith('1') ? 'Asset' :
                   account.accountCode.startsWith('2') ? 'Liabilities' :
                   'Equity'
        });
        await chartAccount.save();
        console.log('✅ Created new chart account:', account.accountCode);
      }

      journalLines.push({
        account_id: chartAccount._id,
        debit: account.debitAmount,
        credit: account.creditAmount,
        description: `${account.accountName} - ${depositReceipt.receiptNumber}`
      });
    }

    // สร้าง Journal Entry
    const newJournalEntry = new JournalEntry({
      date: depositReceipt.depositDate || new Date(),
      reference: depositReceipt.receiptNumber,
      memo: `รับเงินมัดจำ - ${depositReceipt.customer?.name || 'ลูกค้า'} - ${depositReceipt.product?.name || 'สินค้า'}`,
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
 * สร้างรายการบัญชีย้อนกลับเมื่อยกเลิกใบรับเงินมัดจำ
 * @param {Object} depositReceipt - ข้อมูลใบรับเงินมัดจำ
 */
async function createCancelDepositAccountingEntry(depositReceipt) {
  try {
    console.log('📊 Creating reverse accounting entry for cancelled deposit:', depositReceipt.receiptNumber);

    const { amounts, paymentMethod, paymentDetails } = depositReceipt;
    const depositAmount = amounts.depositAmount;

    // กำหนดบัญชีตามวิธีการชำระเงิน (ย้อนกลับ)
    let creditAccounts = [];

    if (paymentMethod === 'cash') {
      creditAccounts.push({
        accountCode: '1111',
        accountName: 'เงินสดในมือ',
        debitAmount: 0,
        creditAmount: depositAmount
      });
    } else if (paymentMethod === 'transfer') {
      creditAccounts.push({
        accountCode: '1112',
        accountName: 'เงินฝากธนาคาร',
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

    // บัญชีเดบิต - ย้อนกลับเงินรับล่วงหน้า
    const debitAccount = {
      accountCode: '2130',
      accountName: 'เงินรับล่วงหน้าจากลูกค้า (มัดจำ)',
      debitAmount: depositAmount,
      creditAmount: 0
    };

    const journalLines = [];

    // หาบัญชีและสร้าง journal lines
    for (const account of [...creditAccounts, debitAccount]) {
      let chartAccount = await ChartOfAccount.findOne({ code: account.accountCode });

      if (!chartAccount) {
        console.error(`❌ Chart account not found: ${account.accountCode}`);
        continue;
      }

      journalLines.push({
        account_id: chartAccount._id,
        debit: account.debitAmount,
        credit: account.creditAmount,
        description: `ยกเลิกมัดจำ ${account.accountName} - ${depositReceipt.receiptNumber}`
      });
    }

    // สร้าง Reverse Journal Entry
    const reverseJournalEntry = new JournalEntry({
      date: new Date(),
      reference: `CANCEL-${depositReceipt.receiptNumber}`,
      memo: `ยกเลิกใบรับเงินมัดจำ - ${depositReceipt.customer?.name || 'ลูกค้า'} - ${depositReceipt.product?.name || 'สินค้า'}`,
      lines: journalLines,
      posted: true
    });

    await reverseJournalEntry.save();
    console.log('✅ Reverse Journal Entry saved with ID:', reverseJournalEntry._id);

    return reverseJournalEntry;
  } catch (error) {
    console.error('❌ Error creating reverse accounting entry:', error);
    throw error;
  }
}

/**
 * GET /api/deposit-receipts/list
 * ดึงรายการใบรับเงินมัดจำแบบ list format
 */
router.get('/list', asyncHandler(async (req, res) => {
  console.log('📋 GET /api/deposit-receipts/list');

  try {
    const {
      page = 1,
      limit = 50,
      status,
      branchCode,
      sort = 'desc'
    } = req.query;

    // สร้าง query filter
    const filter = {};
    if (status) filter.status = status;
    if (branchCode) filter['branch.code'] = branchCode;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = sort === 'desc' ? -1 : 1;

    const [deposits, totalCount] = await Promise.all([
      DepositReceipt.find(filter)
        .sort({ createdAt: sortOrder })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      DepositReceipt.countDocuments(filter)
    ]);

    const formattedDeposits = deposits.map(deposit => ({
      id: deposit._id,
      receiptNumber: deposit.receiptNumber,
      customerName: deposit.customer ?
        (deposit.customer.customerType === 'individual'
          ? `${deposit.customer.firstName || ''} ${deposit.customer.lastName || ''}`.trim()
          : deposit.customer.name || 'บริษัท')
        : deposit.customer?.name || 'ไม่ระบุ',
      customerPhone: deposit.customer?.phone || 'ไม่ระบุ',
      productName: deposit.productId?.name || deposit.product?.name || 'ไม่ระบุ',
      depositAmount: deposit.depositAmount || 0,
      depositType: deposit.depositType,
      status: deposit.status,
      branchCode: deposit.branch?.code,
      branchName: deposit.branch?.name,
      saleType: deposit.saleType,
      paymentMethod: deposit.paymentMethod,
      depositDate: deposit.depositDate,
      createdAt: deposit.createdAt
    }));

    res.json({
      success: true,
      data: formattedDeposits,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('❌ Error fetching deposit receipt list:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงรายการใบรับเงินมัดจำ',
      error: error.message
    });
  }
}));

/**
 * GET /api/deposit-receipts
 * ดึงรายการใบรับเงินมัดจำทั้งหมด
 */
router.get('/', asyncHandler(async (req, res) => {
  console.log('📋 GET /api/deposit-receipts');

  try {
    const {
      page = 1,
      limit = 20,
      status,
      branchCode,
      customerPhone,
      receiptNumber,
      startDate,
      endDate,
      saleType,
      depositType
    } = req.query;

    // สร้าง query filter
    const filter = {};

    if (status) filter.status = status;
    if (branchCode) filter['branch.code'] = branchCode;
    if (customerPhone) filter['customer.phone'] = { $regex: customerPhone, $options: 'i' };
    if (receiptNumber) filter.receiptNumber = { $regex: receiptNumber, $options: 'i' };
    if (saleType) filter.saleType = saleType;
    if (depositType) filter.depositType = depositType;

    // Date range filter
    if (startDate || endDate) {
      filter.depositDate = {};
      if (startDate) filter.depositDate.$gte = new Date(startDate);
      if (endDate) filter.depositDate.$lte = new Date(endDate);
    }

    // Execute query with pagination
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 },
      // No populate needed - using embedded documents
    };

    const result = await DepositReceipt.paginate(filter, options);

    // Calculate summary statistics
    const stats = await DepositReceipt.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalCount: { $sum: 1 },
          totalAmount: { $sum: '$amounts.depositAmount' },
          pendingCount: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          completedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          cancelledCount: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: result.docs,
      pagination: {
        currentPage: result.page,
        totalPages: result.totalPages,
        totalDocs: result.totalDocs,
        limit: result.limit,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage
      },
      statistics: stats[0] || {
        totalCount: 0,
        totalAmount: 0,
        pendingCount: 0,
        completedCount: 0,
        cancelledCount: 0
      }
    });

  } catch (error) {
    console.error('❌ Error fetching deposit receipts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch deposit receipts',
      error: error.message
    });
  }
}));

/**
 * GET /api/deposit-receipts/:id
 * ดึงข้อมูลใบรับเงินมัดจำตาม ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
  console.log('📋 GET /api/deposit-receipts/:id');

  try {
    const { id } = req.params;

    let depositReceipt;

    // Check if id is a valid ObjectId or a receipt number
    if (mongoose.Types.ObjectId.isValid(id)) {
      console.log('🔍 Searching by ObjectId:', id);
      depositReceipt = await DepositReceipt.findById(id);
    } else {
      console.log('🔍 Searching by receiptNumber:', id);
      depositReceipt = await DepositReceipt.findOne({ receiptNumber: id });
    }

    if (!depositReceipt) {
      return res.status(404).json({
        success: false,
        message: 'Deposit receipt not found'
      });
    }

    res.json({
      success: true,
      data: depositReceipt
    });

  } catch (error) {
    console.error('❌ Error fetching deposit receipt:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch deposit receipt',
      error: error.message
    });
  }
}));

/**
 * POST /api/deposit-receipts
 * สร้างใบรับเงินมัดจำใหม่
 */
router.post('/', authJWT, asyncHandler(async (req, res) => {
  console.log('📝 POST /api/deposit-receipts');

  try {
    const depositReceiptData = req.body;

    // 🔍 Encoding Debug: Log incoming data
    console.log('🔍 [ENCODING DEBUG] Raw request body:');
    console.log('📋 Customer name:', depositReceiptData.customer?.name);
    console.log('📋 Customer address:', depositReceiptData.customer?.address?.fullAddress);
    console.log('📋 Salesperson name:', depositReceiptData.salesperson?.name);

    // Log character encoding details
    if (depositReceiptData.customer?.name) {
      console.log('🔍 Customer name Buffer:', Buffer.from(depositReceiptData.customer.name, 'utf8'));
      console.log('🔍 Customer name hex:', Buffer.from(depositReceiptData.customer.name, 'utf8').toString('hex'));
      console.log('🔍 Customer name length:', depositReceiptData.customer.name.length);
    }

    // Validate required fields
    if (!depositReceiptData.customer || !depositReceiptData.product || !depositReceiptData.amounts) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: customer, product, and amounts are required'
      });
    }

    // Validate payment method and details
    if (depositReceiptData.paymentMethod === 'mixed') {
      const paymentDetails = depositReceiptData.paymentDetails;

      if (!paymentDetails || !paymentDetails.cash || !paymentDetails.transfer) {
        return res.status(400).json({
          success: false,
          message: 'Mixed payment requires both cash and transfer amounts'
        });
      }

      const cashAmount = parseFloat(paymentDetails.cash);
      const transferAmount = parseFloat(paymentDetails.transfer);
      const depositAmount = parseFloat(depositReceiptData.amounts.depositAmount);
      const totalPayment = cashAmount + transferAmount;

      if (cashAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Cash amount must be greater than 0 for mixed payment'
        });
      }

      if (Math.abs(totalPayment - depositAmount) > 0.01) {
        return res.status(400).json({
          success: false,
          message: `Total payment (${totalPayment}) does not match deposit amount (${depositAmount})`
        });
      }

      console.log('✅ Mixed payment validation passed:', {
        cash: cashAmount,
        transfer: transferAmount,
        total: totalPayment,
        deposit: depositAmount
      });
    }

    // Generate receipt number
    const branchCode = depositReceiptData.branch?.code || '00000';
    const receiptNumber = await DepositReceipt.generateReceiptNumber(branchCode);

    // Create new deposit receipt
    const depositReceipt = new DepositReceipt({
      ...depositReceiptData,
      receiptNumber
    });

    // 🔍 Encoding Debug: Before saving to database
    console.log('🔍 [ENCODING DEBUG] Before saving to database:');
    console.log('📋 Document customer name:', depositReceipt.customer?.name);
    console.log('📋 Document salesperson name:', depositReceipt.salesperson?.name);

    // Save to database
    const savedReceipt = await depositReceipt.save();

    // บันทึกรายการบัญชี (Journal Entry)
    try {
      const journalEntry = await createDepositReceiptAccountingEntry(savedReceipt);

      // อัปเดต Deposit Receipt ด้วย journal entry reference
      savedReceipt.relatedDocuments = savedReceipt.relatedDocuments || {};
      savedReceipt.relatedDocuments.journalEntryId = journalEntry._id;
      await savedReceipt.save();

      console.log('✅ Accounting entry created for deposit receipt:', savedReceipt.receiptNumber);
    } catch (accountingError) {
      console.error('⚠️ Failed to create accounting entry:', accountingError);
      // ไม่ให้ error นี้หยุดการทำงาน เพราะใบรับเงินมัดจำสร้างได้แล้ว
    }

    // 🔍 Encoding Debug: After saving to database
    console.log('🔍 [ENCODING DEBUG] After saving to database:');
    console.log('📋 Saved customer name:', savedReceipt.customer?.name);
    console.log('📋 Saved salesperson name:', savedReceipt.salesperson?.name);

    if (savedReceipt.customer?.name) {
      console.log('🔍 Saved customer name Buffer:', Buffer.from(savedReceipt.customer.name, 'utf8'));
      console.log('🔍 Saved customer name hex:', Buffer.from(savedReceipt.customer.name, 'utf8').toString('hex'));
    }

    // Data already embedded, no populate needed

    // 🔍 Encoding Debug: After populate
    console.log('🔍 [ENCODING DEBUG] After populate:');
    console.log('📋 Final customer name:', savedReceipt.customer?.name);
    console.log('📋 Final salesperson name:', savedReceipt.salesperson?.name);

    res.status(201).json({
      success: true,
      message: 'Deposit receipt created successfully',
      data: savedReceipt
    });

  } catch (error) {
    console.error('❌ Error creating deposit receipt:', error);

    // Handle duplicate key error (MongoDB specific)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Receipt number already exists',
        code: 'DUPLICATE_KEY',
        error: 'Duplicate receipt number'
      });
    }

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = {};
      for (const field in error.errors) {
        validationErrors[field] = error.errors[field].message;
      }

      return res.status(400).json({
        success: false,
        message: 'ข้อมูลไม่ถูกต้อง',
        code: 'VALIDATION_ERROR',
        errors: validationErrors
      });
    }

    // Handle Mongoose cast errors
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: `ข้อมูล ${error.path} ไม่ถูกต้อง`,
        code: 'CAST_ERROR',
        error: error.message
      });
    }

    // Generic server error
    res.status(500).json({
      success: false,
      message: 'Failed to create deposit receipt',
      error: error.message
    });
  }
}));

/**
 * PUT /api/deposit-receipts/:id
 * อัปเดตใบรับเงินมัดจำ
 */
router.put('/:id', asyncHandler(async (req, res) => {
  console.log('📝 PUT /api/deposit-receipts/:id');

  try {
    const { id } = req.params;
    const updateData = req.body;

    const depositReceipt = await DepositReceipt.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!depositReceipt) {
      return res.status(404).json({
        success: false,
        message: 'Deposit receipt not found'
      });
    }

    res.json({
      success: true,
      message: 'Deposit receipt updated successfully',
      data: depositReceipt
    });

  } catch (error) {
    console.error('❌ Error updating deposit receipt:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update deposit receipt',
      error: error.message
    });
  }
}));

/**
 * DELETE /api/deposit-receipts/:id
 * ลบใบรับเงินมัดจำ
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  console.log('🗑️ DELETE /api/deposit-receipts/:id');

  try {
    const { id } = req.params;

    const depositReceipt = await DepositReceipt.findByIdAndDelete(id);

    if (!depositReceipt) {
      return res.status(404).json({
        success: false,
        message: 'Deposit receipt not found'
      });
    }

    res.json({
      success: true,
      message: 'Deposit receipt deleted successfully',
      data: depositReceipt
    });

  } catch (error) {
    console.error('❌ Error deleting deposit receipt:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete deposit receipt',
      error: error.message
    });
  }
}));

/**
 * POST /api/deposit-receipts/:id/complete
 * เปลี่ยนสถานะเป็นเสร็จสิ้น (แปลงเป็นการขาย)
 */
router.post('/:id/complete', asyncHandler(async (req, res) => {
  console.log('✅ POST /api/deposit-receipts/:id/complete');

  try {
    const { id } = req.params;
    const { convertedTo, saleOrderId, convertedBy } = req.body;

    const depositReceipt = await DepositReceipt.findById(id);

    if (!depositReceipt) {
      return res.status(404).json({
        success: false,
        message: 'Deposit receipt not found'
      });
    }

    if (depositReceipt.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Deposit receipt is already completed'
      });
    }

    await depositReceipt.markAsCompleted({
      convertedTo,
      saleOrderId,
      convertedBy
    });

    res.json({
      success: true,
      message: 'Deposit receipt completed successfully',
      data: depositReceipt
    });

  } catch (error) {
    console.error('❌ Error completing deposit receipt:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete deposit receipt',
      error: error.message
    });
  }
}));

/**
 * POST /api/deposit-receipts/:id/cancel
 * ยกเลิกใบรับเงินมัดจำ
 */
router.post('/:id/cancel', asyncHandler(async (req, res) => {
  console.log('❌ POST /api/deposit-receipts/:id/cancel');

  try {
    const { id } = req.params;
    const { cancelReason, refundAmount, refundMethod, cancelledBy } = req.body;

    const depositReceipt = await DepositReceipt.findById(id);

    if (!depositReceipt) {
      return res.status(404).json({
        success: false,
        message: 'Deposit receipt not found'
      });
    }

    if (depositReceipt.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Deposit receipt is already cancelled'
      });
    }

    await depositReceipt.markAsCancelled({
      cancelReason,
      refundAmount,
      refundMethod,
      cancelledBy
    });

    // สร้างรายการบัญชีย้อนกลับ (Reverse Journal Entry)
    try {
      const reverseJournalEntry = await createCancelDepositAccountingEntry(depositReceipt);

      // อัปเดต Deposit Receipt ด้วย reverse journal entry reference
      depositReceipt.relatedDocuments = depositReceipt.relatedDocuments || {};
      depositReceipt.relatedDocuments.reverseJournalEntryId = reverseJournalEntry._id;
      await depositReceipt.save();

      console.log('✅ Reverse accounting entry created for cancelled deposit:', depositReceipt.receiptNumber);
    } catch (accountingError) {
      console.error('⚠️ Failed to create reverse accounting entry:', accountingError);
      // ไม่ให้ error นี้หยุดการทำงาน เพราะการยกเลิกสำเร็จแล้ว
    }

    res.json({
      success: true,
      message: 'Deposit receipt cancelled successfully',
      data: depositReceipt
    });

  } catch (error) {
    console.error('❌ Error cancelling deposit receipt:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel deposit receipt',
      error: error.message
    });
  }
}));

/**
 * POST /api/deposit-receipts/:id/update-stock
 * อัปเดตสถานะสต็อกสินค้า
 */
router.post('/:id/update-stock', asyncHandler(async (req, res) => {
  console.log('📦 POST /api/deposit-receipts/:id/update-stock');

  try {
    const { id } = req.params;
    const { inStock, checkedBy } = req.body;

    const depositReceipt = await DepositReceipt.findById(id);

    if (!depositReceipt) {
      return res.status(404).json({
        success: false,
        message: 'Deposit receipt not found'
      });
    }

    await depositReceipt.updateStockStatus(inStock, checkedBy);

    res.json({
      success: true,
      message: 'Stock status updated successfully',
      data: depositReceipt
    });

  } catch (error) {
    console.error('❌ Error updating stock status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update stock status',
      error: error.message
    });
  }
}));

/**
 * GET /api/deposit-receipts/search/by-receipt-number/:receiptNumber
 * ค้นหาใบรับเงินมัดจำด้วยเลขที่
 */
router.get('/search/by-receipt-number/:receiptNumber', asyncHandler(async (req, res) => {
  console.log('🔍 GET /api/deposit-receipts/search/by-receipt-number/:receiptNumber');

  try {
    const { receiptNumber } = req.params;

    const depositReceipt = await DepositReceipt.findByReceiptNumber(receiptNumber);

    if (!depositReceipt) {
      return res.status(404).json({
        success: false,
        message: 'Deposit receipt not found'
      });
    }

    res.json({
      success: true,
      data: depositReceipt
    });

  } catch (error) {
    console.error('❌ Error searching deposit receipt:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search deposit receipt',
      error: error.message
    });
  }
}));

/**
 * GET /api/deposit-receipts/search/by-customer-phone/:phone
 * ค้นหาใบรับเงินมัดจำด้วยเบอร์โทรลูกค้า
 */
router.get('/search/by-customer-phone/:phone', asyncHandler(async (req, res) => {
  console.log('🔍 GET /api/deposit-receipts/search/by-customer-phone/:phone');

  try {
    const { phone } = req.params;

    const depositReceipts = await DepositReceipt.findByCustomerPhone(phone);

    res.json({
      success: true,
      data: depositReceipts,
      count: depositReceipts.length
    });

  } catch (error) {
    console.error('❌ Error searching deposit receipts by phone:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search deposit receipts',
      error: error.message
    });
  }
}));

/**
 * GET /api/deposit-receipts/statistics/dashboard
 * สถิติสำหรับ dashboard
 */
router.get('/statistics/dashboard', asyncHandler(async (req, res) => {
  console.log('📊 GET /api/deposit-receipts/statistics/dashboard');

  try {
    const { branchCode } = req.query;

    // Base filter
    const baseFilter = {};
    if (branchCode) baseFilter['branch.code'] = branchCode;

    // Today's statistics
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const todayStats = await DepositReceipt.aggregate([
      {
        $match: {
          ...baseFilter,
          depositDate: { $gte: startOfDay, $lt: endOfDay }
        }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalAmount: { $sum: '$amounts.depositAmount' }
        }
      }
    ]);

    // This month's statistics
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthStats = await DepositReceipt.aggregate([
      {
        $match: {
          ...baseFilter,
          depositDate: { $gte: startOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalAmount: { $sum: '$amounts.depositAmount' }
        }
      }
    ]);

    // Status breakdown
    const statusStats = await DepositReceipt.aggregate([
      { $match: baseFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amounts.depositAmount' }
        }
      }
    ]);

    // Expiring soon (next 7 days)
    const expiringSoon = await DepositReceipt.countDocuments({
      ...baseFilter,
      expiryDate: {
        $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        $gte: new Date()
      },
      status: { $nin: ['completed', 'cancelled'] }
    });

    res.json({
      success: true,
      data: {
        today: todayStats[0] || { count: 0, totalAmount: 0 },
        thisMonth: monthStats[0] || { count: 0, totalAmount: 0 },
        statusBreakdown: statusStats,
        expiringSoon
      }
    });

  } catch (error) {
    console.error('❌ Error fetching dashboard statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
}));

/**
 * POST /api/deposit-receipts/:id/signature
 * บันทึกลายเซ็นอิเล็กทรอนิกส์
 */
router.post('/:id/signature', authJWT, asyncHandler(async (req, res) => {
  console.log('✍️ POST /api/deposit-receipts/:id/signature');

  try {
    const { id } = req.params;
    const { signatureType, signatureData } = req.body;

    // Validate required fields
    if (!signatureType || !signatureData) {
      return res.status(400).json({
        success: false,
        message: 'signatureType and signatureData are required'
      });
    }

    // Validate signature type
    if (!['customer', 'cashier'].includes(signatureType)) {
      return res.status(400).json({
        success: false,
        message: 'signatureType must be either "customer" or "cashier"'
      });
    }

    // Find deposit receipt
    let depositReceipt;

    // Check if id is a valid ObjectId or a receipt number
    if (mongoose.Types.ObjectId.isValid(id)) {
      console.log('🔍 Searching by ObjectId:', id);
      depositReceipt = await DepositReceipt.findById(id);
    } else {
      console.log('🔍 Searching by receiptNumber:', id);
      depositReceipt = await DepositReceipt.findOne({ receiptNumber: id });
    }

    if (!depositReceipt) {
      return res.status(404).json({
        success: false,
        message: 'Deposit receipt not found'
      });
    }

    // Get client IP address
    const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress ||
                     (req.connection.socket ? req.connection.socket.remoteAddress : null);

    // Prepare signature data
    const signatureInfo = {
      data: signatureData,
      signedAt: new Date(),
      ipAddress: clientIP
    };

    if (signatureType === 'customer') {
      signatureInfo.signedBy = depositReceipt.customer.name || 'ไม่ระบุ';
      depositReceipt.signatures = depositReceipt.signatures || {};
      depositReceipt.signatures.customerSignature = signatureInfo;
    } else if (signatureType === 'cashier') {
      signatureInfo.signedBy = depositReceipt.salesperson.name || 'ไม่ระบุ';
      signatureInfo.employeeId = depositReceipt.salesperson.employeeId;
      depositReceipt.signatures = depositReceipt.signatures || {};
      depositReceipt.signatures.cashierSignature = signatureInfo;
    }

    // Save to database
    const savedReceipt = await depositReceipt.save();

    console.log(`✅ บันทึกลายเซ็น ${signatureType} สำเร็จ สำหรับใบรับเงินมัดจำ ${depositReceipt.receiptNumber}`);

    res.json({
      success: true,
      message: `บันทึกลายเซ็น${signatureType === 'customer' ? 'ผู้ชำระเงิน' : 'ผู้รับเงิน'}สำเร็จ`,
      data: {
        receiptId: savedReceipt._id,
        receiptNumber: savedReceipt.receiptNumber,
        signatureType: signatureType,
        signedAt: signatureInfo.signedAt,
        signedBy: signatureInfo.signedBy
      }
    });

  } catch (error) {
    console.error('❌ Error saving signature:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save signature',
      error: error.message
    });
  }
}));

/**
 * GET /api/deposit-receipts/:id/signatures/public
 * ดึงข้อมูลลายเซ็นทั้งหมด (สำหรับ PDF viewer - ไม่ต้อง authentication)
 */
router.get('/:id/signatures/public', asyncHandler(async (req, res) => {
  console.log('👀 GET /api/deposit-receipts/:id/signatures/public');

  try {
    const { id } = req.params;

    let depositReceipt;

    // Check if id is a valid ObjectId or a receipt number
    if (mongoose.Types.ObjectId.isValid(id)) {
      console.log('🔍 Searching by ObjectId:', id);
      depositReceipt = await DepositReceipt.findById(id).select('receiptNumber signatures');
    } else {
      console.log('🔍 Searching by receiptNumber:', id);
      depositReceipt = await DepositReceipt.findOne({ receiptNumber: id }).select('receiptNumber signatures');
    }

    if (!depositReceipt) {
      return res.status(404).json({
        success: false,
        message: 'Deposit receipt not found'
      });
    }

    res.json({
      success: true,
      data: {
        receiptId: depositReceipt._id,
        receiptNumber: depositReceipt.receiptNumber,
        signatures: depositReceipt.signatures || {}
      }
    });

  } catch (error) {
    console.error('❌ Error fetching signatures (public):', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch signatures',
      error: error.message
    });
  }
}));

/**
 * GET /api/deposit-receipts/:id/signatures
 * ดึงข้อมูลลายเซ็นทั้งหมด
 */
router.get('/:id/signatures', authJWT, asyncHandler(async (req, res) => {
  console.log('👀 GET /api/deposit-receipts/:id/signatures');

  try {
    const { id } = req.params;

    let depositReceipt;

    // Check if id is a valid ObjectId or a receipt number
    if (mongoose.Types.ObjectId.isValid(id)) {
      console.log('🔍 Searching by ObjectId:', id);
      depositReceipt = await DepositReceipt.findById(id).select('receiptNumber signatures');
    } else {
      console.log('🔍 Searching by receiptNumber:', id);
      depositReceipt = await DepositReceipt.findOne({ receiptNumber: id }).select('receiptNumber signatures');
    }

    if (!depositReceipt) {
      return res.status(404).json({
        success: false,
        message: 'Deposit receipt not found'
      });
    }

    res.json({
      success: true,
      data: {
        receiptId: depositReceipt._id,
        receiptNumber: depositReceipt.receiptNumber,
        signatures: depositReceipt.signatures || {}
      }
    });

  } catch (error) {
    console.error('❌ Error fetching signatures:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch signatures',
      error: error.message
    });
  }
}));

/**
 * Error handling middleware
 */
router.use((error, req, res, next) => {
  console.error('❌ Deposit Receipt Routes Error:', error);

  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
});

module.exports = router;