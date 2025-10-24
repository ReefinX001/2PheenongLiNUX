// routes/auditLogRoutes.js
const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLogController');

// POST /api/audit-log => สร้าง Audit Log
router.post('/', auditLogController.createAuditLog);

// GET /api/audit-log => ดึง Audit Logs ทั้งหมด
router.get('/', auditLogController.getAllLogs);

// GET /api/audit-log/invoice/:invoiceId => ดึง Audit Logs ตาม invoice_id
router.get('/invoice/:invoiceId', auditLogController.getLogsByInvoice);

module.exports = router;
