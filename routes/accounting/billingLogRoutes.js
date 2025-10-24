// routes/billingLogRoutes.js
const express = require('express');
const router = express.Router();
const billingLogController = require('../../controllers/billingLogController');

// POST /api/billing-log => สร้าง Log
router.post('/', billingLogController.createLog);

// GET /api/billing-log => ดึงทั้งหมด
router.get('/', billingLogController.getAllLogs);

// GET /api/billing-log/invoice/:invoiceId => ดึงตาม invoice
router.get('/invoice/:invoiceId', billingLogController.getLogsByInvoice);

// DELETE /api/billing-log/:id => ลบ
router.delete('/:id', billingLogController.deleteLog);

module.exports = router;
