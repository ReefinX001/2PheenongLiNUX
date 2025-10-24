// routes/paymentLogRoutes.js
const express = require('express');
const router = express.Router();
const paymentLogController = require('../../controllers/paymentLogController');

// POST /api/payment-log => สร้าง
router.post('/', paymentLogController.createLog);

// GET /api/payment-log => ดึงทั้งหมด
router.get('/', paymentLogController.getAllLogs);

// GET /api/payment-log/transaction/:transactionId => เฉพาะ transaction นั้น
router.get('/transaction/:transactionId', paymentLogController.getLogsByTransaction);

// GET /api/payment-log/:id => ดึงตาม id
router.get('/:id', paymentLogController.getLogById);

// PATCH /api/payment-log/:id => อัปเดต
router.patch('/:id', paymentLogController.updateLog);

// DELETE /api/payment-log/:id => ลบ
router.delete('/:id', paymentLogController.deleteLog);

module.exports = router;
