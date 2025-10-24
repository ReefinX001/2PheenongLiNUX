/**
 * Loan Management Routes
 * Complete route definitions for loan management system
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();

// Import controllers
const LoanDashboardController = require('../controllers/loanDashboardController');
const BadDebtController = require('../controllers/badDebtController');

// Import middleware
const authenticateToken = require('../middlewares/authJWT');
const hasPermission = require('../middlewares/permission');

// Import services
const LoanInstallmentIntegration = require('../services/loanInstallmentIntegration');

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================


// ============================================
// DASHBOARD ROUTES
// ============================================

// Dashboard summary data
router.get('/dashboard/summary', authenticateToken, async (req, res) => {
  try {
    await LoanDashboardController.getDashboardSummary(req, res);
  } catch (error) {
    console.error('❌ Error in dashboard summary route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Dashboard statistics (alias for summary to match frontend expectations)
router.get('/dashboard/statistics', authenticateToken, async (req, res) => {
  try {
    await LoanDashboardController.getDashboardSummary(req, res);
  } catch (error) {
    console.error('❌ Error in dashboard statistics route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Dashboard trends data
router.get('/dashboard/trends', authenticateToken, async (req, res) => {
  try {
    await LoanDashboardController.getDashboardTrends(req, res);
  } catch (error) {
    console.error('❌ Error in dashboard trends route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Status distribution
router.get('/dashboard/status-distribution', async (req, res) => {
  try {
    await LoanDashboardController.getStatusDistribution(req, res);
  } catch (error) {
    console.error('❌ Error in status distribution route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Payment proportions
router.get('/dashboard/proportions', async (req, res) => {
  try {
    await LoanDashboardController.getProportions(req, res);
  } catch (error) {
    console.error('❌ Error in proportions route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Recent loans
router.get('/dashboard/recent-loans', async (req, res) => {
  try {
    await LoanDashboardController.getRecentLoans(req, res);
  } catch (error) {
    console.error('❌ Error in recent loans route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Daily statistics
router.get('/dashboard/daily-stats', authenticateToken, async (req, res) => {
  try {
    await LoanDashboardController.getDailyStats(req, res);
  } catch (error) {
    console.error('❌ Error in daily stats route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Dashboard debtors data
router.get('/dashboard/debtors', authenticateToken, async (req, res) => {
  try {
    await LoanDashboardController.getDebtors(req, res);
  } catch (error) {
    console.error('❌ Error in dashboard debtors route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Debt trends
router.get('/dashboard/debt-trends', async (req, res) => {
  try {
    await LoanDashboardController.getDebtTrends(req, res);
  } catch (error) {
    console.error('❌ Error in debt trends route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Branch status
router.get('/dashboard/branch-status', async (req, res) => {
  try {
    await LoanDashboardController.getBranchStatus(req, res);
  } catch (error) {
    console.error('❌ Error in branch status route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Notification count
router.get('/dashboard/notifications/count', async (req, res) => {
  try {
    await LoanDashboardController.getUnreadNotificationCount(req, res);
  } catch (error) {
    console.error('❌ Error in notification count route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ============================================
// MISSING ROUTES - เพิ่ม routes ที่หายไป
// ============================================

// Dashboard main endpoint - redirect to summary
router.get('/dashboard', async (req, res) => {
  try {
    // Redirect to dashboard summary
    return res.redirect('/api/loan/dashboard/summary');
  } catch (error) {
    console.error('❌ Error in dashboard route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Notifications unread count (ตรงกับที่ frontend เรียก)
router.get('/notifications/unread-count', async (req, res) => {
  try {
    // ส่งข้อมูล mock สำหรับตอนนี้ หรือเรียก controller จริง
    res.json({
      success: true,
      data: {
        unreadCount: 0,
        notifications: []
      }
    });
  } catch (error) {
    console.error('❌ Error in notifications unread-count route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ============================================
// BAD DEBT MANAGEMENT ROUTES
// ============================================

// Get bad debt list
router.get('/bad-debt/list', hasPermission('view_bad_debt'), async (req, res) => {
  try {
    await BadDebtController.getList(req, res);
  } catch (error) {
    console.error('❌ Error in bad debt list route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Get bad debt statistics
router.get('/bad-debt/statistics', hasPermission('view_bad_debt'), async (req, res) => {
  try {
    await BadDebtController.getStatistics(req, res);
  } catch (error) {
    console.error('❌ Error in bad debt statistics route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Get aged analysis
router.get('/bad-debt/aged-analysis', hasPermission('view_bad_debt'), async (req, res) => {
  try {
    await BadDebtController.getAgedAnalysis(req, res);
  } catch (error) {
    console.error('❌ Error in aged analysis route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Get bad debt criteria
router.get('/bad-debt/criteria', hasPermission('view_bad_debt'), async (req, res) => {
  try {
    await BadDebtController.getCriteria(req, res);
  } catch (error) {
    console.error('❌ Error in get criteria route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Update bad debt criteria
router.post('/bad-debt/criteria', hasPermission('manage_bad_debt'), async (req, res) => {
  try {
    await BadDebtController.updateCriteria(req, res);
  } catch (error) {
    console.error('❌ Error in update criteria route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Export bad debt report
router.get('/bad-debt/export', hasPermission('export_reports'), async (req, res) => {
  try {
    await BadDebtController.exportReport(req, res);
  } catch (error) {
    console.error('❌ Error in export report route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ============================================
// INSTALLMENT CONTRACT ROUTES
// ============================================

// Get all installment contracts for status page
router.get('/installment/contracts', authenticateToken, async (req, res) => {
  try {
    const Installment = require('../models/Installment');

    const contracts = await Installment.find({ deleted_at: null })
      .populate('customerId', 'firstName lastName phone address')
      .populate('productId', 'name description image price')
      .sort({ createdAt: -1 })
      .lean();

    const processedContracts = contracts.map(contract => ({
      contractNo: contract.contractNumber,
      customerId: contract.customerId?._id,
      customerName: contract.customerName || `${contract.customerId?.firstName || ''} ${contract.customerId?.lastName || ''}`.trim(),
      customerPhone: contract.customerPhone || contract.customerId?.phone,
      productName: contract.productName,
      productDescription: contract.productId?.description || '',
      productImage: contract.productId?.image || '/api/placeholder/120/120',
      totalAmount: contract.totalAmount,
      paidAmount: contract.paidAmount || 0,
      remainingAmount: Math.max(0, contract.totalAmount - (contract.paidAmount || 0)),
      monthlyPayment: contract.monthlyPayment,
      totalPeriods: contract.installmentMonths,
      paidPeriods: contract.paidPeriods || 0,
      remainingPeriods: Math.max(0, contract.installmentMonths - (contract.paidPeriods || 0)),
      firstPaymentDate: contract.startDate,
      nextDueDate: contract.nextDueDate || contract.startDate,
      overdueAmount: contract.overdueAmount || 0,
      overduePeriods: contract.overduePeriods || 0,
      status: contract.status,
      createdAt: contract.createdAt
    }));

    res.json({
      success: true,
      data: processedContracts
    });
  } catch (error) {
    console.error('❌ Error in installment contracts route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch installment contracts',
      message: error.message
    });
  }
});

// Get specific installment contract details
router.get('/installment/contract/:contractId', authenticateToken, async (req, res) => {
  try {
    const { contractId } = req.params;
    const Installment = require('../models/Installment');
    const InstallmentPayment = require('../models/Installment/InstallmentPayment');

    const contract = await Installment.findById(contractId)
      .populate('customerId', 'firstName lastName phone address idCard')
      .populate('productId', 'name description image price')
      .lean();

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Contract not found'
      });
    }

    // Get payment history
    const payments = await InstallmentPayment.find({ contractId })
      .sort({ paymentDate: -1 })
      .lean();

    const response = {
      contractNumber: contract.contractNumber,
      customerName: contract.customerName || `${contract.customerId?.firstName || ''} ${contract.customerId?.lastName || ''}`.trim(),
      customerPhone: contract.customerPhone || contract.customerId?.phone,
      customerIdCard: contract.customerId?.idCard,
      customerAddress: contract.customerAddress || contract.customerId?.address,
      productName: contract.productName,
      productDescription: contract.productId?.description || '',
      productImage: contract.productId?.image || '/api/placeholder/120/120',
      totalAmount: contract.totalAmount,
      paidAmount: contract.paidAmount || 0,
      remainingAmount: Math.max(0, contract.totalAmount - (contract.paidAmount || 0)),
      monthlyPayment: contract.monthlyPayment,
      installmentMonths: contract.installmentMonths,
      paidPeriods: contract.paidPeriods || 0,
      remainingPeriods: Math.max(0, contract.installmentMonths - (contract.paidPeriods || 0)),
      downPayment: contract.downPayment,
      interestRate: contract.interestRate,
      status: contract.status,
      startDate: contract.startDate,
      endDate: contract.endDate,
      nextDueDate: contract.nextDueDate || contract.startDate,
      payments: payments
    };

    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('❌ Error in get contract route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch contract details',
      message: error.message
    });
  }
});

// Get installment history for repayment page
router.get('/installment/history', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, startDate, endDate } = req.query;
    const Installment = require('../models/Installment');

    const query = { deleted_at: null };

    // Apply filters
    if (search) {
      query.$or = [
        { contractNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      query.status = status;
    }

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [contracts, total] = await Promise.all([
      Installment.find(query)
        .populate('customerId', 'firstName lastName phone')
        .populate('productId', 'name image')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Installment.countDocuments(query)
    ]);

    const processedContracts = contracts.map(contract => ({
      id: contract._id,
      contractNo: contract.contractNumber,
      customerName: contract.customerName,
      customerPhone: contract.customerPhone,
      productName: contract.productName,
      totalAmount: contract.totalAmount,
      paidAmount: contract.paidAmount || 0,
      remainingAmount: Math.max(0, contract.totalAmount - (contract.paidAmount || 0)),
      monthlyPayment: contract.monthlyPayment,
      installmentMonths: contract.installmentMonths,
      paidPeriods: contract.paidPeriods || 0,
      status: contract.status,
      nextDueDate: contract.nextDueDate || contract.startDate,
      createdAt: contract.createdAt
    }));

    res.json({
      success: true,
      data: processedContracts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('❌ Error in installment history route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch installment history',
      message: error.message
    });
  }
});

// Get repayment statistics for repayment page
router.get('/installment/reports/repayment-stats', authenticateToken, async (req, res) => {
  try {
    const Installment = require('../models/Installment');
    const moment = require('moment');

    const currentMonth = moment().startOf('month').toDate();
    const endCurrentMonth = moment().endOf('month').toDate();
    const lastMonth = moment().subtract(1, 'month').startOf('month').toDate();
    const endLastMonth = moment().subtract(1, 'month').endOf('month').toDate();

    const [
      totalContracts,
      thisMonthPayments,
      lastMonthPayments,
      overdueContracts,
      onTimePayments,
      totalPayments
    ] = await Promise.all([
      // Total contracts
      Installment.countDocuments({ deleted_at: null }),

      // This month payments
      Installment.aggregate([
        {
          $match: {
            deleted_at: null,
            lastPaymentDate: { $gte: currentMonth, $lte: endCurrentMonth }
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$lastPaymentAmount' }
          }
        }
      ]),

      // Last month payments for comparison
      Installment.aggregate([
        {
          $match: {
            deleted_at: null,
            lastPaymentDate: { $gte: lastMonth, $lte: endLastMonth }
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$lastPaymentAmount' }
          }
        }
      ]),

      // Overdue contracts
      Installment.countDocuments({
        deleted_at: null,
        status: { $in: ['active', 'ongoing'] },
        nextDueDate: { $lt: new Date() }
      }),

      // On-time payments calculation
      Installment.countDocuments({
        deleted_at: null,
        status: { $ne: 'overdue' },
        lastPaymentDate: { $exists: true }
      }),

      // Total payments made
      Installment.countDocuments({
        deleted_at: null,
        lastPaymentDate: { $exists: true }
      })
    ]);

    const thisMonthAmount = thisMonthPayments[0]?.totalAmount || 0;
    const lastMonthAmount = lastMonthPayments[0]?.totalAmount || 0;

    const paymentsGrowth = lastMonthAmount > 0
      ? ((thisMonthAmount - lastMonthAmount) / lastMonthAmount * 100).toFixed(1)
      : 0;

    const onTimeRate = totalPayments > 0
      ? ((onTimePayments / totalPayments) * 100).toFixed(1)
      : 0;

    res.json({
      success: true,
      data: {
        totalContracts,
        monthlyPayments: thisMonthAmount,
        overdueContracts,
        onTimeRate: parseFloat(onTimeRate),
        contractsGrowth: 0, // Can implement month-over-month growth
        paymentsGrowth: parseFloat(paymentsGrowth)
      }
    });
  } catch (error) {
    console.error('❌ Error in repayment stats route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch repayment statistics',
      message: error.message
    });
  }
});

// Get tax summary for tax page
router.get('/installment/reports/tax-summary', authenticateToken, async (req, res) => {
  try {
    const { year, month, branch_code } = req.query;
    const Installment = require('../models/Installment');

    const query = { deleted_at: null };

    if (branch_code) {
      query.branch_code = branch_code;
    }

    // Filter by year/month if provided
    if (year && month) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      query.createdAt = { $gte: startDate, $lte: endDate };
    }

    const contracts = await Installment.find(query)
      .populate('customerId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();

    const VAT_RATE = 0.07;

    const taxDetails = contracts.map(contract => {
      const totalAmount = contract.totalAmount || 0;
      const netAmount = totalAmount / (1 + VAT_RATE);
      const taxAmount = totalAmount - netAmount;

      return {
        contractNo: contract.contractNumber,
        customerName: contract.customerName,
        product: contract.productName,
        contractValue: totalAmount,
        taxAmount: Math.round(taxAmount * 100) / 100,
        dueDate: contract.createdAt,
        status: contract.taxPaymentDate ? 'paid' :
               (contract.status === 'overdue' ? 'overdue' : 'pending'),
        taxPaymentDate: contract.taxPaymentDate
      };
    });

    // Calculate summary
    const summary = taxDetails.reduce((acc, item) => {
      acc.totalTax += item.taxAmount;

      if (item.status === 'paid') {
        acc.paidTax += item.taxAmount;
      } else if (item.status === 'overdue') {
        acc.overdueTax += item.taxAmount;
      } else {
        acc.pendingTax += item.taxAmount;
      }

      return acc;
    }, {
      totalTax: 0,
      pendingTax: 0,
      overdueTax: 0,
      paidTax: 0
    });

    res.json({
      success: true,
      data: {
        summary,
        details: taxDetails
      }
    });
  } catch (error) {
    console.error('❌ Error in tax summary route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tax summary',
      message: error.message
    });
  }
});

// ============================================
// CUSTOMER LOAN INTEGRATION ROUTES
// ============================================

// Get customer loans (unified view)
router.get('/customer/:customerId/loans', async (req, res) => {
  try {
    const { customerId } = req.params;
    const options = {
      includePayments: req.query.includePayments === 'true',
      includeHistory: req.query.includeHistory === 'true',
      status: req.query.status,
      sortBy: req.query.sortBy || 'createdAt',
      sortOrder: req.query.sortOrder || 'desc'
    };

    const result = await LoanInstallmentIntegration.getCustomerLoans(customerId, options);
    res.json(result);
  } catch (error) {
    console.error('❌ Error in customer loans route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch customer loans',
      message: error.message
    });
  }
});

// Get customer installments
router.get('/customer/:customerId/installments', async (req, res) => {
  try {
    const { customerId } = req.params;
    const options = {
      includePayments: req.query.includePayments === 'true',
      status: req.query.status,
      sortBy: req.query.sortBy || 'createdAt',
      sortOrder: req.query.sortOrder || 'desc'
    };

    const result = await LoanInstallmentIntegration.getCustomerLoans(customerId, options);

    // Filter only installment orders
    const installmentOrders = result.data.loans.filter(loan => loan.type === 'installment_order');

    res.json({
      success: true,
      data: {
        installments: installmentOrders,
        summary: {
          totalInstallments: installmentOrders.length,
          totalAmount: installmentOrders.reduce((sum, loan) => sum + loan.totalAmount, 0),
          totalPaid: installmentOrders.reduce((sum, loan) => sum + loan.paidAmount, 0),
          activeInstallments: installmentOrders.filter(loan => ['active', 'ongoing'].includes(loan.status)).length
        }
      }
    });
  } catch (error) {
    console.error('❌ Error in customer installments route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch customer installments',
      message: error.message
    });
  }
});

// ============================================
// PAYOFF APPROVAL ROUTES
// ============================================

// Reject payoff approval
router.put('/payoff-approval/reject/:approvalId', authenticateToken, async (req, res) => {
  try {
    const { approvalId } = req.params;
    const { rejectionReason, rejectionNotes } = req.body;
    const Installment = require('../models/Installment');

    const contract = await Installment.findById(approvalId);
    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Contract not found'
      });
    }

    // Update contract with rejection details
    await Installment.findByIdAndUpdate(approvalId, {
      approvalStatus: 'rejected',
      rejectionReason,
      rejectionNotes,
      rejectedBy: req.user.id,
      rejectedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Contract rejected successfully'
    });
  } catch (error) {
    console.error('❌ Error in reject payoff approval route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject contract',
      message: error.message
    });
  }
});

// ============================================
// BRANCH STOCK ROUTES
// ============================================

// Check boxset stock
router.post('/branch-stock/check-boxset', authenticateToken, async (req, res) => {
  try {
    const { contractNo } = req.body;
    const Installment = require('../models/Installment');
    const BranchStock = require('../models/BranchStock');

    const contract = await Installment.findOne({ contractNumber: contractNo })
      .populate('productId')
      .lean();

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Contract not found'
      });
    }

    // Check stock for the product
    const stock = await BranchStock.findOne({
      productId: contract.productId,
      branch_code: contract.branch_code || 'default'
    });

    const availableStock = stock ? stock.quantity : 0;
    const isAvailable = availableStock >= 1;

    res.json({
      success: true,
      data: {
        contractNo,
        productName: contract.productName,
        requiredQuantity: 1,
        availableStock,
        isAvailable,
        stockStatus: isAvailable ? 'sufficient' : 'insufficient'
      }
    });
  } catch (error) {
    console.error('❌ Error in check boxset stock route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check stock',
      message: error.message
    });
  }
});

// Deduct boxset stock
router.post('/branch-stock/deduct-boxset', authenticateToken, async (req, res) => {
  try {
    const { contractNo } = req.body;
    const Installment = require('../models/Installment');
    const BranchStock = require('../models/BranchStock');
    const BranchStockHistory = require('../models/BranchStockHistory');

    const contract = await Installment.findOne({ contractNumber: contractNo })
      .populate('productId')
      .lean();

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Contract not found'
      });
    }

    // Check and deduct stock atomically
    const session = await mongoose.startSession();
    await session.withTransaction(async () => {
      const stock = await BranchStock.findOne({
        productId: contract.productId,
        branch_code: contract.branch_code || 'default'
      }).session(session);

      if (!stock || stock.quantity < 1) {
        throw new Error('Insufficient stock');
      }

      // Deduct stock
      await BranchStock.findByIdAndUpdate(
        stock._id,
        { $inc: { quantity: -1 } },
        { session }
      );

      // Record stock history
      await BranchStockHistory.create([{
        productId: contract.productId,
        branch_code: contract.branch_code || 'default',
        type: 'outbound',
        quantity: 1,
        reason: 'installment_delivery',
        referenceId: contract._id,
        referenceType: 'installment_contract',
        performedBy: req.user.id,
        notes: `Stock deduction for contract ${contractNo}`
      }], { session });

      // Update contract status
      await Installment.findByIdAndUpdate(
        contract._id,
        {
          deliveryStatus: 'delivered',
          deliveredAt: new Date(),
          deliveredBy: req.user.id
        },
        { session }
      );
    });

    await session.endSession();

    res.json({
      success: true,
      message: 'Stock deducted and delivery recorded successfully'
    });
  } catch (error) {
    console.error('❌ Error in deduct boxset stock route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to deduct stock',
      message: error.message
    });
  }
});

// ============================================
// COST AND EXPENSE ROUTES
// ============================================

// Costs and expenses summary
router.get('/costs-expenses/summary', async (req, res) => {
  try {
    const { startDate, endDate, category, branch_code } = req.query;
    const Expense = require('../models/expenseModel');

    const query = { deleted_at: null };

    if (branch_code) {
      query.branch_code = branch_code;
    }

    if (category) {
      query.category = category;
    }

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const [expenses, categories, monthlyTrends] = await Promise.all([
      // Total expenses
      Expense.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalExpenses: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),

      // Category breakdown
      Expense.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$category',
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { totalAmount: -1 } }
      ]),

      // Monthly trends (last 6 months)
      Expense.aggregate([
        {
          $match: {
            ...query,
            createdAt: {
              $gte: new Date(new Date().setMonth(new Date().getMonth() - 6))
            }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            amount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ])
    ]);

    const summary = {
      totalCosts: expenses[0]?.totalExpenses || 0,
      totalExpenses: expenses[0]?.totalExpenses || 0,
      categories: categories.map(cat => ({
        name: cat._id,
        amount: cat.totalAmount,
        count: cat.count
      })),
      monthlyTrends: monthlyTrends.map(trend => ({
        period: `${trend._id.year}-${String(trend._id.month).padStart(2, '0')}`,
        amount: trend.amount,
        count: trend.count
      })),
      topExpenses: categories.slice(0, 5)
    };

    res.json({
      success: true,
      data: summary,
      filters: { startDate, endDate, category, branch_code }
    });
  } catch (error) {
    console.error('❌ Error in costs expenses route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch costs and expenses',
      message: error.message
    });
  }
});

// ============================================
// DEPOSITS ROUTES
// ============================================

// Get deposits list
router.get('/deposits/list', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, branch_code, startDate, endDate } = req.query;
    const DepositReceipt = require('../models/DepositReceipt');

    const query = { deleted_at: null };

    if (status) {
      query.status = status;
    }

    if (branch_code) {
      query.branch_code = branch_code;
    }

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [deposits, total] = await Promise.all([
      DepositReceipt.find(query)
        .populate('customerId', 'firstName lastName phone')
        .populate('contractId', 'contractNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      DepositReceipt.countDocuments(query)
    ]);

    const processedDeposits = deposits.map(deposit => ({
      id: deposit._id,
      receiptNumber: deposit.receiptNumber,
      customerName: deposit.customerId ?
        `${deposit.customerId.firstName} ${deposit.customerId.lastName}` :
        deposit.customerName,
      contractNumber: deposit.contractId?.contractNumber || deposit.contractNumber,
      amount: deposit.amount,
      depositType: deposit.depositType,
      paymentMethod: deposit.paymentMethod,
      status: deposit.status,
      receivedBy: deposit.receivedBy,
      receivedAt: deposit.receivedAt,
      notes: deposit.notes,
      createdAt: deposit.createdAt
    }));

    res.json({
      success: true,
      data: processedDeposits,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      filters: { status, branch_code, startDate, endDate }
    });
  } catch (error) {
    console.error('❌ Error in deposits list route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch deposits',
      message: error.message
    });
  }
});

// ============================================
// TAX CALCULATION ROUTES
// ============================================

// Get tax calculations
router.get('/tax/calculations', async (req, res) => {
  try {
    const { period, year, month, branch_code } = req.query;
    const Installment = require('../models/Installment');
    const Sale = require('../models/Sale');

    const query = { deleted_at: null };

    if (branch_code) {
      query.branch_code = branch_code;
    }

    // Filter by period
    if (year && month) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      query.createdAt = { $gte: startDate, $lte: endDate };
    }

    const VAT_RATE = 0.07;

    const [installmentTax, salesTax] = await Promise.all([
      // VAT from installment contracts
      Installment.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalSales: { $sum: '$totalAmount' },
            totalVAT: { $sum: { $multiply: ['$totalAmount', VAT_RATE / (1 + VAT_RATE)] } }
          }
        }
      ]),

      // VAT from direct sales
      Sale.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalSales: { $sum: '$totalAmount' },
            totalVAT: { $sum: { $multiply: ['$totalAmount', VAT_RATE / (1 + VAT_RATE)] } }
          }
        }
      ])
    ]);

    const installmentVAT = installmentTax[0]?.totalVAT || 0;
    const salesVAT = salesTax[0]?.totalVAT || 0;
    const totalVATPayable = installmentVAT + salesVAT;

    // For simplicity, assuming VAT receivable is 10% of payable (from purchases)
    const vatReceivable = totalVATPayable * 0.1;
    const netVAT = totalVATPayable - vatReceivable;

    const taxCalculations = {
      vatPayable: Math.round(totalVATPayable * 100) / 100,
      vatReceivable: Math.round(vatReceivable * 100) / 100,
      withholdingTax: 0, // Would need withholding tax data
      corporateTax: Math.round(netVAT * 0.2 * 100) / 100, // 20% corporate tax estimate
      summary: {
        totalTaxLiability: Math.round(totalVATPayable * 100) / 100,
        totalTaxAssets: Math.round(vatReceivable * 100) / 100,
        netTaxPosition: Math.round(netVAT * 100) / 100
      }
    };

    res.json({
      success: true,
      data: taxCalculations,
      period: { period, year, month, branch_code }
    });
  } catch (error) {
    console.error('❌ Error in tax calculations route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tax calculations',
      message: error.message
    });
  }
});

// Record tax payment
router.post('/installment/tax-reports/:contractNo/payment', authenticateToken, async (req, res) => {
  try {
    const { contractNo } = req.params;
    const { paymentDate, taxAmount } = req.body;
    const Installment = require('../models/Installment');

    const contract = await Installment.findOne({ contractNumber: contractNo });
    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Contract not found'
      });
    }

    // Update contract with tax payment information
    await Installment.findByIdAndUpdate(contract._id, {
      taxPaymentDate: new Date(paymentDate),
      taxAmount: taxAmount,
      taxStatus: 'paid',
      taxPaidBy: req.user.id
    });

    res.json({
      success: true,
      message: 'Tax payment recorded successfully'
    });
  } catch (error) {
    console.error('❌ Error in record tax payment route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record tax payment',
      message: error.message
    });
  }
});

// ============================================
// CLAIM ITEMS ROUTES
// ============================================

// Get claim items list
router.get('/claim-items/list', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, priority, branch_code } = req.query;
    const Installment = require('../models/Installment');

    const query = {
      deleted_at: null,
      status: 'completed', // Only completed contracts can claim items
      deliveryStatus: { $ne: 'delivered' } // Items not yet delivered
    };

    if (status) {
      query.claimStatus = status;
    }

    if (priority) {
      query.claimPriority = priority;
    }

    if (branch_code) {
      query.branch_code = branch_code;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [claimableContracts, total, summary] = await Promise.all([
      Installment.find(query)
        .populate('customerId', 'firstName lastName phone')
        .populate('productId', 'name description image')
        .sort({ endDate: 1 }) // Oldest completed contracts first
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Installment.countDocuments(query),

      // Summary statistics
      Installment.aggregate([
        { $match: { deleted_at: null, status: 'completed' } },
        {
          $group: {
            _id: '$claimStatus',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const processedClaims = claimableContracts.map(contract => ({
      id: contract._id,
      contractNumber: contract.contractNumber,
      customerName: contract.customerName,
      customerPhone: contract.customerPhone,
      productName: contract.productName,
      productDescription: contract.productId?.description || '',
      totalAmount: contract.totalAmount,
      completedDate: contract.endDate,
      claimStatus: contract.claimStatus || 'pending',
      claimPriority: contract.claimPriority || 'normal',
      claimEligibleDate: contract.endDate,
      daysSinceCompletion: Math.floor((new Date() - new Date(contract.endDate)) / (1000 * 60 * 60 * 24)),
      canClaim: !contract.deliveryStatus || contract.deliveryStatus !== 'delivered'
    }));

    // Build summary from aggregation
    const summaryStats = summary.reduce((acc, item) => {
      switch (item._id) {
        case 'pending':
          acc.pendingClaims = item.count;
          break;
        case 'approved':
          acc.approvedClaims = item.count;
          break;
        case 'rejected':
          acc.rejectedClaims = item.count;
          break;
      }
      acc.totalClaims += item.count;
      return acc;
    }, {
      totalClaims: 0,
      pendingClaims: 0,
      approvedClaims: 0,
      rejectedClaims: 0
    });

    res.json({
      success: true,
      data: processedClaims,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      summary: summaryStats,
      filters: { status, priority, branch_code }
    });
  } catch (error) {
    console.error('❌ Error in claim items route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch claim items',
      message: error.message
    });
  }
});

// ============================================
// CREDIT APPROVAL ROUTES
// ============================================

// Get pending credit approvals
router.get('/credit-approval/pending', hasPermission('approve_credit'), async (req, res) => {
  try {
    const { page = 1, limit = 20, branch_code, priority } = req.query;
    const Installment = require('../models/Installment');

    const query = {
      deleted_at: null,
      approvalStatus: 'pending'
    };

    if (branch_code) {
      query.branch_code = branch_code;
    }

    if (priority) {
      query.priority = priority;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [pendingContracts, total, summary, avgProcessingTime] = await Promise.all([
      Installment.find(query)
        .populate('customerId', 'firstName lastName phone idCard')
        .populate('productId', 'name description price')
        .sort({ createdAt: 1 }) // Oldest first
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Installment.countDocuments(query),

      // Priority summary
      Installment.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$priority',
            count: { $sum: 1 }
          }
        }
      ]),

      // Average processing time for approved contracts
      Installment.aggregate([
        {
          $match: {
            deleted_at: null,
            approvalStatus: 'approved',
            approvedAt: { $exists: true }
          }
        },
        {
          $project: {
            processingTime: {
              $divide: [
                { $subtract: ['$approvedAt', '$createdAt'] },
                86400000 // Convert to days
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            avgProcessingTime: { $avg: '$processingTime' }
          }
        }
      ])
    ]);

    const processedApprovals = pendingContracts.map(contract => {
      const waitingDays = Math.floor((new Date() - new Date(contract.createdAt)) / (1000 * 60 * 60 * 24));

      return {
        id: contract._id,
        contractNumber: contract.contractNumber,
        customerName: contract.customerName,
        customerPhone: contract.customerPhone,
        customerIdCard: contract.customerId?.idCard,
        productName: contract.productName,
        totalAmount: contract.totalAmount,
        downPayment: contract.downPayment,
        financeAmount: contract.financeAmount,
        monthlyPayment: contract.monthlyPayment,
        installmentMonths: contract.installmentMonths,
        interestRate: contract.interestRate,
        priority: contract.priority || 'medium',
        waitingDays,
        riskScore: contract.riskScore || 0,
        submittedDate: contract.createdAt,
        urgency: waitingDays > 7 ? 'high' : waitingDays > 3 ? 'medium' : 'low'
      };
    });

    // Build summary from aggregation
    const prioritySummary = summary.reduce((acc, item) => {
      switch (item._id) {
        case 'high':
          acc.highPriority = item.count;
          break;
        case 'medium':
          acc.mediumPriority = item.count;
          break;
        case 'low':
          acc.lowPriority = item.count;
          break;
      }
      return acc;
    }, {
      totalPending: total,
      highPriority: 0,
      mediumPriority: 0,
      lowPriority: 0,
      averageProcessingTime: Math.round((avgProcessingTime[0]?.avgProcessingTime || 0) * 10) / 10
    });

    res.json({
      success: true,
      data: processedApprovals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      summary: prioritySummary,
      filters: { branch_code, priority }
    });
  } catch (error) {
    console.error('❌ Error in credit approval route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending approvals',
      message: error.message
    });
  }
});

// ============================================
// INTEGRATION SYNC ROUTES
// ============================================

// Sync customer data
router.post('/sync/customer/:customerId', hasPermission('manage_integrations'), async (req, res) => {
  try {
    const { customerId } = req.params;
    const result = await LoanInstallmentIntegration.syncCustomerData(customerId);
    res.json(result);
  } catch (error) {
    console.error('❌ Error in sync customer route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync customer data',
      message: error.message
    });
  }
});

// Sync payment status
router.post('/sync/payment/:contractId', hasPermission('manage_integrations'), async (req, res) => {
  try {
    const { contractId } = req.params;
    const result = await LoanInstallmentIntegration.syncPaymentStatus(contractId);
    res.json(result);
  } catch (error) {
    console.error('❌ Error in sync payment route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync payment status',
      message: error.message
    });
  }
});

// Get system health
router.get('/system/health', hasPermission('view_system_health'), async (req, res) => {
  try {
    const result = await LoanInstallmentIntegration.getSystemHealth();
    res.json(result);
  } catch (error) {
    console.error('❌ Error in system health route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check system health',
      message: error.message
    });
  }
});

// ============================================
// REPORTING ROUTES
// ============================================

// Generate consolidated reports
router.get('/reports/:reportType', hasPermission('view_reports'), async (req, res) => {
  try {
    const { reportType } = req.params;
    const options = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      branchCode: req.query.branchCode,
      status: req.query.status,
      groupBy: req.query.groupBy || 'month'
    };

    const result = await LoanInstallmentIntegration.consolidateReports(reportType, options);
    res.json(result);
  } catch (error) {
    console.error('❌ Error in reports route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate report',
      message: error.message
    });
  }
});

// ============================================
// REPAYMENT & LOAN CONTRACT ROUTES
// ============================================

// Import required models at the top (add these imports)
const InstallmentOrder = require('../models/Installment/InstallmentOrder');
const InstallmentPayment = require('../models/Installment/InstallmentPayment');

// GET /api/loan/contracts - For repayment.html and installment_integration.html
router.get('/contracts', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Getting loan contracts...');

    const { limit = 50, status, search, branch } = req.query;

    const query = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { contractNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } }
      ];
    }
    if (branch) query.branchCode = branch;

    // ดึงข้อมูลจาก InstallmentOrder model
    const contracts = await InstallmentOrder.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    console.log(`📊 Found ${contracts.length} contracts in database`);

    const processedContracts = await Promise.all(contracts.map(async contract => {
      // สร้างข้อมูลแบบครบถ้วนสำหรับ frontend โดยใช้ข้อมูลจาก customer_info
      const customerInfo = contract.customer_info || {};

      // ดึงข้อมูล payment history จาก InstallmentPayment
      const paymentHistory = await InstallmentPayment.find({
        contractNumber: contract.contractNumber || contract.contractNo,
        status: 'confirmed'
      }).sort({ paymentDate: 1 }).lean();

      const customerName = contract.customerName ||
                          customerInfo.customerName ||
                          `${customerInfo.firstName || ''} ${customerInfo.lastName || ''}`.trim() ||
                          `${contract.firstName || ''} ${contract.lastName || ''}`.trim() ||
                          contract.name ||
                          'ไม่ระบุชื่อ';

      const monthlyAmount = contract.monthlyAmount ||
                           contract.installmentAmount ||
                           (contract.totalAmount && contract.installmentCount ?
                            Math.round(contract.totalAmount / contract.installmentCount) : 0);

      const paidInstallments = contract.paidInstallments || 0;
      const totalInstallments = contract.installmentCount || contract.totalInstallments || 12;
      const remainingInstallments = Math.max(0, totalInstallments - paidInstallments);

      // สร้างข้อมูลผลิตภัณฑ์ - ใช้ข้อมูลจาก items array
      let productInfo = 'ไม่ระบุสินค้า';
      if (contract.items && contract.items.length > 0) {
        productInfo = contract.items.map(item =>
          `${item.name || item.productName || item.product || 'สินค้า'} (${item.qty || item.quantity || 1} ชิ้น)`
        ).join(', ');
      } else if (contract.products && contract.products.length > 0) {
        productInfo = contract.products.map(product =>
          `${product.name || product.productName || 'สินค้า'} (${product.quantity || 1} ชิ้น)`
        ).join(', ');
      } else if (contract.productName) {
        productInfo = contract.productName;
      } else if (contract.product) {
        productInfo = contract.product;
      }

      // คำนวณ status
      let calculatedStatus = contract.status || 'current';
      const today = new Date();
      const dueDate = contract.nextPaymentDate ? new Date(contract.nextPaymentDate) : null;

      if (paidInstallments >= totalInstallments) {
        calculatedStatus = 'completed';
      } else if (dueDate && dueDate < today) {
        calculatedStatus = 'overdue';
      } else {
        calculatedStatus = 'current';
      }

      return {
        _id: contract._id,
        contractId: contract._id,
        contractNumber: contract.contractNumber || contract.contractNo || `INST${contract._id.toString().slice(-8)}`,
        customerName: customerName,
        customerPhone: contract.customerPhone ||
                      customerInfo.phone ||
                      contract.phone ||
                      contract.tel ||
                      'ไม่ระบุ',
        customerIdCard: contract.customerIdCard ||
                       customerInfo.taxId ||
                       contract.idCard || '',
        customerAddress: contract.customerAddress ||
                        (customerInfo.address ?
                         `${customerInfo.address.houseNo || ''} หมู่ ${customerInfo.address.moo || ''} ${customerInfo.address.subDistrict || ''} ${customerInfo.address.district || ''} ${customerInfo.address.province || ''} ${customerInfo.address.zipcode || ''}`.trim() :
                         contract.address) || '',
        totalAmount: contract.totalAmount || 0,
        remainingAmount: contract.remainingAmount || contract.remainingBalance || 0,
        paidAmount: contract.paidAmount || 0,
        monthlyAmount: monthlyAmount,
        installmentCount: totalInstallments,
        paidInstallments: paidInstallments,
        remainingInstallments: remainingInstallments,
        nextPaymentDate: contract.nextPaymentDate || contract.dueDate,
        dueDate: contract.nextPaymentDate || contract.dueDate,
        status: calculatedStatus,
        type: contract.type || 'INSTALLMENT',
        branchCode: contract.branchCode || '00000',
        branchName: contract.branchName || 'สำนักงานใหญ่',
        startDate: contract.createdAt || contract.startDate,
        endDate: contract.endDate,
        downPayment: contract.downPayment || 0,
        financeAmount: contract.financeAmount || contract.totalAmount || 0,
        items: contract.items || contract.products || [],
        productInfo: productInfo,
        // เพิ่มข้อมูลสำหรับ SAVINGS และ PAYOFF types
        savedAmount: contract.savedAmount || 0,
        targetAmount: contract.targetAmount || contract.totalAmount || 0,
        // เพิ่ม payment history
        paymentHistory: paymentHistory,
        createdAt: contract.createdAt,
        updatedAt: contract.updatedAt
      };
    }));

    res.json({
      success: true,
      data: processedContracts,
      message: `พบสัญญา ${processedContracts.length} รายการ`,
      total: processedContracts.length
    });

  } catch (error) {
    console.error('❌ Error getting loan contracts:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสัญญา: ' + error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// GET /api/repayment/stats - For repayment.html
router.get('/repayment/stats', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Getting repayment stats...');

    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Get payment statistics
    const [totalReceived, overduePayments, activeContracts] = await Promise.all([
      InstallmentPayment.aggregate([
        { $match: { paymentDate: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      InstallmentOrder.countDocuments({
        nextPaymentDate: { $lt: today },
        status: 'active',
        remainingBalance: { $gt: 0 }
      }),
      InstallmentOrder.countDocuments({
        status: 'active'
      })
    ]);

    const stats = {
      totalReceived: totalReceived[0]?.total || 0,
      overdueCount: overduePayments,
      activeContracts: activeContracts,
      collectionRate: activeContracts > 0 ?
        ((activeContracts - overduePayments) / activeContracts * 100).toFixed(1) : 0
    };

    res.json({
      success: true,
      data: stats,
      message: 'ดึงข้อมูลสถิติการชำระเงินเรียบร้อยแล้ว'
    });

  } catch (error) {
    console.error('❌ Error getting repayment stats:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสถิติ: ' + error.message
    });
  }
});

// GET /api/installment/orders - For installment_integration.html
router.get('/installment/orders', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Getting installment orders...');

    const { status = 'pending', limit = 10 } = req.query;

    const orders = await InstallmentOrder.find({ status })
      .populate('customer', 'individual.firstName individual.lastName')
      .populate('branchId', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    const processedOrders = orders.map(order => ({
      orderId: order._id,
      contractNo: order.contractNo,
      customerName: order.customer?.individual ?
        `${order.customer.individual.firstName || ''} ${order.customer.individual.lastName || ''}`.trim() : 'ไม่ระบุ',
      totalAmount: order.totalAmount || 0,
      status: order.status,
      branchName: order.branchId?.name || 'ไม่ระบุ',
      createdAt: order.createdAt
    }));

    res.json({
      success: true,
      data: processedOrders,
      message: `พบออเดอร์ผ่อนชำระ ${processedOrders.length} รายการ`
    });

  } catch (error) {
    console.error('❌ Error getting installment orders:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลออเดอร์: ' + error.message
    });
  }
});

// ============================================
// ERROR HANDLING MIDDLEWARE
// ============================================

// Global error handler for loan routes
router.use((error, req, res, next) => {
  console.error('❌ Loan route error:', error);

  // Don't send error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(error.status || 500).json({
    success: false,
    error: error.message || 'Internal server error',
    ...(isDevelopment && { stack: error.stack })
  });
});

module.exports = router;