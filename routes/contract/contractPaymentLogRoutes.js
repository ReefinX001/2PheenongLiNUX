// routes/contractPaymentLogRoutes.js
const express = require('express');
const router = express.Router();
const contractPaymentLogController = require('../../controllers/contractPaymentLogController');

// POST /api/contract-payment-log => สร้าง
router.post('/', contractPaymentLogController.createPaymentLog);

// GET /api/contract-payment-log => ดึงทั้งหมด
router.get('/', contractPaymentLogController.getAllPaymentLogs);

// GET /api/contract-payment-log/contract/:contractId => ดึงเฉพาะสัญญา
router.get('/contract/:contractId', contractPaymentLogController.getPaymentLogsByContract);

// GET /api/contract-payment-log/:id => ดึงตาม id
router.get('/:id', contractPaymentLogController.getPaymentLogById);

// PATCH /api/contract-payment-log/:id => อัปเดต
router.patch('/:id', contractPaymentLogController.updatePaymentLog);

// DELETE /api/contract-payment-log/:id => ลบ
router.delete('/:id', contractPaymentLogController.deletePaymentLog);

module.exports = router;
