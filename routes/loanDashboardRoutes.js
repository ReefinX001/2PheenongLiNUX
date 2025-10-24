const express = require('express');
const router = express.Router();
const loanDashboardController = require('../controllers/loanDashboardController');

// GET /api/loan/dashboard/debtors
router.get('/debtors', loanDashboardController.getDebtors);

module.exports = router;