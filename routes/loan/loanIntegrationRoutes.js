// File: routes/loan/loanIntegrationRoutes.js
// Purpose: API routes for loan module integration with pattani installment system

const express = require('express');
const router = express.Router();
const loanIntegrationController = require('../../controllers/loan/loanIntegrationController');
const authJWT = require('../../middlewares/authJWT'); // แก้ไข: ไม่ต้อง destructure
const hasPermission = require('../../middlewares/permission');

// Middleware to check authentication
router.use(authJWT);

// Loan Contract Routes
router.post('/contracts/create-from-installment',
  hasPermission('loan.contract.create'),
  loanIntegrationController.createLoanContract
);

router.get('/contracts',
  hasPermission('loan.contract.view'),
  loanIntegrationController.getLoanContracts
);

// Get single contract by ID
router.get('/installment/contract/:contractId',
  hasPermission('loan.contract.view'),
  loanIntegrationController.getContractById
);

// Get installment history
router.get('/installment/history',
  hasPermission('loan.contract.view'),
  loanIntegrationController.getInstallmentHistory
);

// Process payment
router.post('/installment/payment',
  hasPermission('loan.payment.create'),
  loanIntegrationController.processPayment
);

// Dashboard routes
router.get('/dashboard/debtors',
  hasPermission('loan.dashboard.view'),
  loanIntegrationController.getDashboardDebtors
);

// Claim items routes
router.get('/claim-items/list',
  hasPermission('loan.claim.view'),
  loanIntegrationController.getClaimItems
);

// Bad Debt Criteria Routes
router.get('/bad-debt/criteria',
  hasPermission('loan.baddebt.view'),
  loanIntegrationController.getBadDebtCriteria
);

router.get('/bad-debt-criteria',
  hasPermission('loan.baddebt.view'),
  loanIntegrationController.getBadDebtCriteria
);

router.put('/bad-debt-criteria',
  hasPermission('loan.baddebt.edit'),
  loanIntegrationController.updateBadDebtCriteria
);

// Debtors Routes
router.get('/debtors',
  hasPermission('loan.debtors.view'),
  loanIntegrationController.getDebtors
);

// Deposit Receipts Routes
router.get('/deposits',
  hasPermission('loan.deposits.view'),
  loanIntegrationController.getDepositReceipts
);

router.post('/deposits',
  hasPermission('loan.deposits.create'),
  loanIntegrationController.createDepositReceipt
);

// Credit Approval Routes
router.get('/credit-approved',
  hasPermission('loan.credit.view'),
  loanIntegrationController.getCreditApproved
);

// Sync Route
router.post('/sync-installment/:installmentOrderId',
  hasPermission('loan.sync'),
  loanIntegrationController.syncInstallmentData
);

module.exports = router;