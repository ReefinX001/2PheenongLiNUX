const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// POST /api/payment => สร้างการชำระ
router.post('/', paymentController.createPayment);
// GET /api/payment => ดูการชำระทั้งหมด
router.get('/', paymentController.getAllPayments);

module.exports = router;
