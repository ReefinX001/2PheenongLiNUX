// routes/paymentMethodRoutes.js
const express = require('express');
const router = express.Router();
const paymentMethodController = require('../../controllers/paymentMethodController');

// POST /api/payment-method => สร้าง
router.post('/', paymentMethodController.createPaymentMethod);

// GET /api/payment-method => ดึงทั้งหมด
router.get('/', paymentMethodController.getAllPaymentMethods);

// GET /api/payment-method/:id => ดึงตาม id
router.get('/:id', paymentMethodController.getPaymentMethodById);

// PATCH /api/payment-method/:id => อัปเดต
router.patch('/:id', paymentMethodController.updatePaymentMethod);

// DELETE /api/payment-method/:id => ลบ
router.delete('/:id', paymentMethodController.deletePaymentMethod);

module.exports = router;
