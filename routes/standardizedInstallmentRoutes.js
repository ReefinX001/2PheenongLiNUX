/**
 * Standardized Installment Routes
 * Unified API endpoints for installment system with consistent patterns
 * @version 2.0.0
 */

const express = require('express');
const router = express.Router();
const ResponseStandardizer = require('../utils/responseStandardizer');
const LoanInstallmentBridge = require('../services/loanInstallmentBridge');
const installmentController = require('../controllers/installmentController');
const authenticateToken = require('../middlewares/authJWT');
const hasPermission = require('../middlewares/permission');

// Apply response standardization middleware
router.use(ResponseStandardizer.middleware);

// ==============================================
// HEALTH CHECK & SYSTEM ENDPOINTS
// ==============================================

// System health check
router.get('/health', (req, res) => {
  res.success({
    service: 'Installment System',
    status: 'operational',
    version: '2.0.0'
  }, 'Installment system is operational');
});

// API endpoints list
router.get('/endpoints', (req, res) => {
  const endpoints = [
    'GET /api/installment/health - System health check',
    'GET /api/installment/orders - Get installment orders',
    'POST /api/installment/orders - Create installment order',
    'GET /api/installment/orders/:id - Get specific order',
    'PUT /api/installment/orders/:id - Update order',
    'DELETE /api/installment/orders/:id - Delete order',
    'GET /api/installment/payments - Get payment history',
    'POST /api/installment/payments - Record payment',
    'GET /api/installment/customers/:id/orders - Customer orders',
    'GET /api/installment/customers/:id/summary - Customer summary',
    'GET /api/installment/reports/dashboard - Dashboard data',
    'GET /api/installment/reports/financial - Financial reports'
  ];

  res.success({ endpoints }, 'Available installment API endpoints');
});

// ==============================================
// INSTALLMENT ORDER MANAGEMENT
// ==============================================

// Get all installment orders
router.get('/orders',
  authenticateToken,
  ResponseStandardizer.asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      branch_code,
      customer_id,
      start_date,
      end_date,
      sort_by = 'createdAt',
      sort_order = 'desc'
    } = req.query;

    const query = { deleted_at: null };

    // Apply filters
    if (search) {
      query.$or = [
        { contractNo: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) query.status = status;
    if (branch_code) query.branch_code = branch_code;
    if (customer_id) query.customer = customer_id;

    if (start_date && end_date) {
      query.createdAt = {
        $gte: new Date(start_date),
        $lte: new Date(end_date)
      };
    }

    const InstallmentOrder = require('../models/Installment/InstallmentOrder');

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sort_by] = sort_order === 'desc' ? -1 : 1;

    // Build query chain without populate first
    let ordersQuery = InstallmentOrder.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Only populate if not causing errors
    try {
      ordersQuery = ordersQuery
        .populate({
          path: 'customer',
          select: 'individual.firstName individual.lastName individual.phone',
          strictPopulate: false
        })
        .populate({
          path: 'branchId',
          select: 'name branch_code',
          strictPopulate: false
        });
    } catch (popError) {
      console.log('⚠️ Populate error, fetching without populate:', popError.message);
    }

    const [orders, total] = await Promise.all([
      ordersQuery,
      InstallmentOrder.countDocuments(query)
    ]);

    const processedOrders = orders.map(order => ({
      id: order._id,
      contractNo: order.contractNo,
      customerName: order.customer?.individual ?
        `${order.customer.individual.firstName || ''} ${order.customer.individual.lastName || ''}`.trim() :
        order.customerName,
      customerPhone: order.customer?.individual?.phone || order.customerPhone,
      totalAmount: order.totalAmount || 0,
      paidAmount: order.paidAmount || 0,
      remainingBalance: (order.totalAmount || 0) - (order.paidAmount || 0),
      monthlyPayment: order.monthlyPayment || 0,
      nextPaymentDate: order.nextPaymentDate,
      status: order.status,
      branchName: order.branchId?.name,
      branchCode: order.branchId?.branch_code || order.branch_code,
      createdAt: order.createdAt,
      items: order.items || []
    }));

    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
      hasNext: page < Math.ceil(total / parseInt(limit)),
      hasPrev: page > 1
    };

    res.paginated(processedOrders, pagination, `Found ${processedOrders.length} installment orders`);
  })
);

// Get specific installment order
router.get('/orders/:id',
  authenticateToken,
  ResponseStandardizer.asyncHandler(async (req, res) => {
    const { id } = req.params;
    const InstallmentOrder = require('../models/Installment/InstallmentOrder');

    const order = await InstallmentOrder.findById(id)
      .populate('customer')
      .populate('branchId')
      .populate('payments')
      .lean();

    if (!order) {
      return res.notFound('Installment order');
    }

    const processedOrder = {
      id: order._id,
      contractNo: order.contractNo,
      customer: order.customer,
      branch: order.branchId,
      totalAmount: order.totalAmount || 0,
      paidAmount: order.paidAmount || 0,
      remainingBalance: (order.totalAmount || 0) - (order.paidAmount || 0),
      monthlyPayment: order.monthlyPayment || 0,
      installmentMonths: order.installmentMonths || 0,
      paidPeriods: order.paidPeriods || 0,
      nextPaymentDate: order.nextPaymentDate,
      status: order.status,
      items: order.items || [],
      payments: order.payments || [],
      paymentSchedule: order.paymentSchedule || [],
      notes: order.notes,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    };

    res.success(processedOrder, 'Installment order details retrieved successfully');
  })
);

// Create installment order
router.post('/orders',
  authenticateToken,
  hasPermission('create_installment'),
  ResponseStandardizer.asyncHandler(async (req, res) => {
    const result = await installmentController.createOrder(req.body, req.user);

    if (!result.success) {
      return res.error(result.error, 400, result.code);
    }

    res.success(result.data, 'Installment order created successfully', 201);
  })
);

// Update installment order
router.put('/orders/:id',
  authenticateToken,
  hasPermission('edit_installment'),
  ResponseStandardizer.asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await installmentController.updateOrder(id, req.body, req.user);

    if (!result.success) {
      return res.error(result.error, result.statusCode || 400, result.code);
    }

    res.success(result.data, 'Installment order updated successfully');
  })
);

// Delete installment order (soft delete)
router.delete('/orders/:id',
  authenticateToken,
  hasPermission('delete_installment'),
  ResponseStandardizer.asyncHandler(async (req, res) => {
    const { id } = req.params;
    const InstallmentOrder = require('../models/Installment/InstallmentOrder');

    const order = await InstallmentOrder.findById(id);
    if (!order) {
      return res.notFound('Installment order');
    }

    order.deleted_at = new Date();
    order.updatedBy = req.user.id;
    await order.save();

    res.success(null, 'Installment order deleted successfully');
  })
);

// ==============================================
// PAYMENT MANAGEMENT
// ==============================================

// Get payment history
router.get('/payments',
  authenticateToken,
  ResponseStandardizer.asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      contract_id,
      customer_id,
      start_date,
      end_date,
      payment_method
    } = req.query;

    const InstallmentPayment = require('../models/Installment/InstallmentPayment');

    const query = { deleted_at: null };

    if (contract_id) query.contractId = contract_id;
    if (customer_id) query.customerId = customer_id;
    if (payment_method) query.paymentMethod = payment_method;

    if (start_date && end_date) {
      query.paymentDate = {
        $gte: new Date(start_date),
        $lte: new Date(end_date)
      };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [payments, total] = await Promise.all([
      InstallmentPayment.find(query)
        .populate('contractId', 'contractNo')
        .populate('customerId', 'individual.firstName individual.lastName')
        .sort({ paymentDate: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      InstallmentPayment.countDocuments(query)
    ]);

    const processedPayments = payments.map(payment => ({
      id: payment._id,
      contractNo: payment.contractId?.contractNo,
      customerName: payment.customerId?.individual ?
        `${payment.customerId.individual.firstName || ''} ${payment.customerId.individual.lastName || ''}`.trim() :
        'ไม่ระบุ',
      amount: payment.amount,
      paymentDate: payment.paymentDate,
      paymentMethod: payment.paymentMethod,
      periodNumber: payment.periodNumber,
      status: payment.status,
      notes: payment.notes,
      createdAt: payment.createdAt
    }));

    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
      hasNext: page < Math.ceil(total / parseInt(limit)),
      hasPrev: page > 1
    };

    res.paginated(processedPayments, pagination, `Found ${processedPayments.length} payments`);
  })
);

// Record payment
router.post('/payments',
  authenticateToken,
  hasPermission('record_payment'),
  ResponseStandardizer.asyncHandler(async (req, res) => {
    const result = await installmentController.recordPayment(req.body, req.user);

    if (!result.success) {
      return res.error(result.error, 400, result.code);
    }

    res.success(result.data, 'Payment recorded successfully', 201);
  })
);

// ==============================================
// CUSTOMER-SPECIFIC ENDPOINTS
// ==============================================

// Get customer installment orders
router.get('/customers/:customerId/orders',
  authenticateToken,
  ResponseStandardizer.asyncHandler(async (req, res) => {
    const { customerId } = req.params;
    const result = await LoanInstallmentBridge.getCustomerData(customerId, {
      includeInstallments: true,
      includePayments: req.query.includePayments === 'true'
    });

    if (!result.success) {
      return res.error(result.error, 400);
    }

    res.success({
      customer: result.data.customer,
      orders: result.data.installmentOrders,
      summary: {
        totalOrders: result.data.installmentOrders.length,
        totalAmount: result.data.summary.totalInstallmentAmount,
        paidAmount: result.data.summary.totalInstallmentPaid,
        remainingAmount: result.data.summary.totalInstallmentRemaining
      }
    }, 'Customer installment orders retrieved successfully');
  })
);

// Get customer financial summary
router.get('/customers/:customerId/summary',
  authenticateToken,
  ResponseStandardizer.asyncHandler(async (req, res) => {
    const { customerId } = req.params;
    const result = await LoanInstallmentBridge.getCustomerData(customerId);

    if (!result.success) {
      return res.error(result.error, 400);
    }

    res.success(result.data.summary, 'Customer financial summary retrieved successfully');
  })
);

// ==============================================
// REPORTING ENDPOINTS
// ==============================================

// Dashboard statistics
router.get('/reports/dashboard',
  authenticateToken,
  ResponseStandardizer.asyncHandler(async (req, res) => {
    const { branch_code, start_date, end_date } = req.query;

    const InstallmentOrder = require('../models/Installment/InstallmentOrder');
    const InstallmentPayment = require('../models/Installment/InstallmentPayment');

    const dateFilter = {};
    if (start_date && end_date) {
      dateFilter.createdAt = {
        $gte: new Date(start_date),
        $lte: new Date(end_date)
      };
    }

    const branchFilter = branch_code ? { branch_code } : {};
    const query = { ...dateFilter, ...branchFilter, deleted_at: null };

    const [
      totalOrders,
      activeOrders,
      completedOrders,
      overdueOrders,
      totalPayments,
      monthlyPayments
    ] = await Promise.all([
      InstallmentOrder.countDocuments(query),
      InstallmentOrder.countDocuments({ ...query, status: { $in: ['active', 'ongoing'] } }),
      InstallmentOrder.countDocuments({ ...query, status: 'completed' }),
      InstallmentOrder.countDocuments({ ...query, status: 'overdue' }),
      InstallmentPayment.aggregate([
        { $match: { ...query } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      InstallmentPayment.aggregate([
        {
          $match: {
            ...query,
            paymentDate: {
              $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
              $lte: new Date()
            }
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ])
    ]);

    const dashboardData = {
      orders: {
        total: totalOrders,
        active: activeOrders,
        completed: completedOrders,
        overdue: overdueOrders
      },
      payments: {
        totalAmount: totalPayments[0]?.total || 0,
        totalCount: totalPayments[0]?.count || 0,
        monthlyAmount: monthlyPayments[0]?.total || 0,
        monthlyCount: monthlyPayments[0]?.count || 0
      },
      performance: {
        completionRate: totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(2) : 0,
        overdueRate: totalOrders > 0 ? ((overdueOrders / totalOrders) * 100).toFixed(2) : 0
      }
    };

    res.success(dashboardData, 'Dashboard statistics retrieved successfully');
  })
);

// Financial reports
router.get('/reports/financial',
  authenticateToken,
  ResponseStandardizer.asyncHandler(async (req, res) => {
    const { start_date, end_date, branch_code, group_by = 'month' } = req.query;

    const result = await LoanInstallmentBridge.getConsolidatedFinancialReport({
      startDate: start_date,
      endDate: end_date,
      branchCode: branch_code,
      groupBy: group_by
    });

    if (!result.success) {
      return res.error(result.error, 400);
    }

    res.success(result.data, 'Financial report generated successfully');
  })
);

// ==============================================
// INTEGRATION ENDPOINTS
// ==============================================

// Sync with loan system
router.post('/sync/loan/:contractId',
  authenticateToken,
  hasPermission('manage_integrations'),
  ResponseStandardizer.asyncHandler(async (req, res) => {
    const { contractId } = req.params;
    const result = await LoanInstallmentBridge.syncContractData(contractId, 'installment');

    if (!result.success) {
      return res.error(result.error, 400);
    }

    res.success(result.data, result.message);
  })
);

// Check stock availability
router.post('/stock/check',
  authenticateToken,
  ResponseStandardizer.asyncHandler(async (req, res) => {
    const { contractId } = req.body;
    const result = await LoanInstallmentBridge.checkStockAvailability(contractId, 'installment');

    if (!result.success) {
      return res.error(result.error, 400);
    }

    res.success(result.data, 'Stock availability checked successfully');
  })
);

// Reserve stock
router.post('/stock/reserve',
  authenticateToken,
  hasPermission('manage_stock'),
  ResponseStandardizer.asyncHandler(async (req, res) => {
    const { contractId } = req.body;
    const result = await LoanInstallmentBridge.reserveStock(contractId, 'installment', req.user.id);

    if (!result.success) {
      return res.error(result.error, 400);
    }

    res.success(result.data, result.data.message);
  })
);

// ==============================================
// LEGACY ENDPOINTS (DEPRECATED)
// ==============================================

// Legacy deposits endpoint (redirect to new structure)
router.get('/deposits', (req, res) => {
  res.error('This endpoint is deprecated. Use /api/installment/orders instead.', 410, 'DEPRECATED_ENDPOINT');
});

module.exports = router;