/**
 * Loan Integration Routes
 * Provides API endpoints for loan system to work with installment data
 */

const express = require('express');
const router = express.Router();
const LoanIntegrationController = require('../controllers/loanIntegrationController');
const authJWT = require('../middlewares/authJWT');

// Apply auth middleware to all routes (optional - remove if not needed)
// router.use(authJWT);

// Contract Management
router.get('/contracts', LoanIntegrationController.getContracts);
router.get('/installment/contract/:contractId', LoanIntegrationController.getContractById);
router.get('/installment/history', LoanIntegrationController.getInstallmentHistory);
router.post('/installment/payment', LoanIntegrationController.processPayment);

// Bad Debt Management
router.get('/bad-debt/criteria', LoanIntegrationController.getBadDebtCriteria);
router.get('/bad-debt/export', async (req, res) => {
  // Export bad debt data as CSV
  try {
    const data = await LoanIntegrationController.getBadDebtCriteria(req, res);
    // Transform to CSV format
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="bad_debt_report.csv"');
    // Send CSV data
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Claim Items (Ready for delivery)
router.get('/claim-items/list', LoanIntegrationController.getClaimItems);
router.post('/branch-stock/deduct-boxset', async (req, res) => {
  // Handle stock deduction after full payment
  const { contractId } = req.body;
  try {
    // Update contract to mark items as delivered
    const InstallmentOrder = require('../models/Installment/InstallmentOrder');
    await InstallmentOrder.findByIdAndUpdate(contractId, {
      itemsDelivered: true,
      deliveredAt: new Date()
    });
    res.json({ success: true, message: 'Stock deducted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Dashboard Statistics
router.get('/dashboard/trends', LoanIntegrationController.getTrends);
router.get('/dashboard/status-distribution', LoanIntegrationController.getStatusDistribution);
router.get('/dashboard/recent-loans', LoanIntegrationController.getRecentLoans);
router.get('/dashboard/debtors', LoanIntegrationController.getDebtors);
router.get('/dashboard/proportions', async (req, res) => {
  const InstallmentOrder = require('../models/Installment/InstallmentOrder');
  const total = await InstallmentOrder.countDocuments();
  const active = await InstallmentOrder.countDocuments({ status: 'active' });
  const completed = await InstallmentOrder.countDocuments({ status: 'completed' });
  const overdue = await InstallmentOrder.countDocuments({ status: 'overdue' });

  res.json({
    success: true,
    data: {
      total,
      active,
      completed,
      overdue,
      activePercent: total > 0 ? (active / total * 100).toFixed(2) : 0,
      completedPercent: total > 0 ? (completed / total * 100).toFixed(2) : 0,
      overduePercent: total > 0 ? (overdue / total * 100).toFixed(2) : 0
    }
  });
});

router.get('/dashboard/daily-stats', async (req, res) => {
  const InstallmentOrder = require('../models/Installment/InstallmentOrder');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayContracts = await InstallmentOrder.countDocuments({
    createdAt: { $gte: today }
  });

  const todayAmount = await InstallmentOrder.aggregate([
    { $match: { createdAt: { $gte: today } } },
    { $group: { _id: null, total: { $sum: '$totalAmount' } } }
  ]);

  res.json({
    success: true,
    data: {
      contracts: todayContracts,
      amount: todayAmount[0]?.total || 0,
      date: today
    }
  });
});

router.get('/dashboard/debt-trends', async (req, res) => {
  const InstallmentOrder = require('../models/Installment/InstallmentOrder');
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const debtTrends = await InstallmentOrder.aggregate([
    { $match: {
      status: { $in: ['overdue', 'defaulted'] },
      createdAt: { $gte: thirtyDaysAgo }
    }},
    { $group: {
      _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
      count: { $sum: 1 },
      amount: { $sum: '$remainingAmount' }
    }},
    { $sort: { _id: 1 } }
  ]);

  res.json({ success: true, data: debtTrends });
});

router.get('/dashboard/branch-status', async (req, res) => {
  const InstallmentOrder = require('../models/Installment/InstallmentOrder');
  const branchStats = await InstallmentOrder.aggregate([
    { $group: {
      _id: '$branch_code',
      total: { $sum: 1 },
      active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
      completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
      overdue: { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] } },
      totalAmount: { $sum: '$totalAmount' },
      paidAmount: { $sum: '$paidAmount' }
    }}
  ]);

  res.json({ success: true, data: branchStats });
});

// Credit Approval
router.get('/credit-approval/pending', async (req, res) => {
  const InstallmentOrder = require('../models/Installment/InstallmentOrder');
  const pending = await InstallmentOrder.find({
    status: 'pending',
    creditApproved: { $ne: true }
  }).populate('customer');

  const pendingApprovals = pending.map(order => ({
    id: order._id,
    contractNo: order.contractNo,
    customerName: order.customer?.displayName,
    amount: order.totalAmount,
    requestDate: order.createdAt,
    creditScore: order.customer?.creditScore || 0
  }));

  res.json({ success: true, data: pendingApprovals });
});

// Customer Loans
router.get('/customer/:customerId/loans', async (req, res) => {
  const { customerId } = req.params;
  const InstallmentOrder = require('../models/Installment/InstallmentOrder');

  const loans = await InstallmentOrder.find({
    customer: customerId
  }).sort({ createdAt: -1 });

  const customerLoans = loans.map(loan => ({
    id: loan._id,
    contractNo: loan.contractNo,
    amount: loan.totalAmount,
    remainingAmount: loan.remainingAmount || loan.totalAmount,
    status: loan.status,
    startDate: loan.createdAt,
    monthlyPayment: loan.monthlyPayment
  }));

  res.json({ success: true, data: customerLoans });
});

// Notifications
router.get('/notifications/unread-count', async (req, res) => {
  // For now, return 0 or implement notification system
  res.json({ success: true, count: 0 });
});

// Orders/Contracts (alternative endpoints)
router.get('/installment/orders', async (req, res) => {
  const { status } = req.query;
  const InstallmentOrder = require('../models/Installment/InstallmentOrder');

  const query = {};
  if (status) query.status = status;

  const orders = await InstallmentOrder.find(query)
    .populate('customer')
    .sort({ createdAt: -1 });

  res.json({ success: true, data: orders });
});

// Bad debt stats
router.get('/bad-debt/stats', async (req, res) => {
  const InstallmentOrder = require('../models/Installment/InstallmentOrder');

  const stats = await InstallmentOrder.aggregate([
    { $match: { status: { $in: ['overdue', 'defaulted'] } } },
    { $group: {
      _id: null,
      totalDebt: { $sum: '$remainingAmount' },
      totalContracts: { $sum: 1 },
      avgDebt: { $avg: '$remainingAmount' }
    }}
  ]);

  res.json({
    success: true,
    data: {
      totalDebt: stats[0]?.totalDebt || 0,
      totalContracts: stats[0]?.totalContracts || 0,
      avgDebt: stats[0]?.avgDebt || 0,
      recoveryRate: 0 // Implement recovery calculation if needed
    }
  });
});

module.exports = router;