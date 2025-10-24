const express = require('express');
const router = express.Router();
const AccountingController = require('../controllers/accountingController');

// /api/accounting

// Deposit receipt accounting entries
router.post('/deposit-receipt/:id/entries', AccountingController.createDepositReceiptEntries);
router.post('/deposit-receipt/:id/reverse-entries', AccountingController.reverseDepositReceiptEntries);
router.get('/deposit-receipt/:id/entries', AccountingController.getDepositReceiptEntries);

// Journal entries and reports
router.get('/journal-entries', AccountingController.getJournalEntries);
router.get('/account-balance/:accountCode', AccountingController.getAccountBalance);
router.get('/trial-balance', AccountingController.getTrialBalance);

module.exports = router;