// routes/paymentTransactionRoutes.js

const express = require('express');
const router = express.Router();
const paymentTransactionController = require('../controllers/paymentTransactionController');

// POST /api/payment-transaction => สร้าง
router.post('/', paymentTransactionController.createTransaction);

// GET /api/payment-transaction => ดึงทั้งหมด
router.get('/', paymentTransactionController.getAllTransactions);

// GET /api/payment-transaction/:id => ดึงทีละตัว
router.get('/:id', paymentTransactionController.getTransactionById);

// PATCH /api/payment-transaction/:id => อัปเดต
router.patch('/:id', paymentTransactionController.updateTransaction);

// DELETE /api/payment-transaction/:id => ลบ
router.delete('/:id', paymentTransactionController.deleteTransaction);

module.exports = router;
