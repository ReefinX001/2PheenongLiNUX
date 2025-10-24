// File: routes/receiptRoutes.js

const express = require('express');
const router = express.Router();
const ReceiptController = require('../controllers/ReceiptController');
const protect = require('../middlewares/authJWT');

// Receipt CRUD Routes

// POST /api/receipt - สร้าง Receipt ใหม่
router.post('/', protect, ReceiptController.create);

// GET /api/receipt - ดึง Receipt ทั้งหมด (มี pagination และ filter)
router.get('/', protect, ReceiptController.getAll);

// GET /api/receipt/statistics - สถิติ Receipt
router.get('/statistics', protect, ReceiptController.getStatistics);

// GET /api/receipt/number/:number - ดึง Receipt ตามเลขที่
router.get('/number/:number', protect, ReceiptController.getByNumber);

// GET /api/receipt/:id - ดึง Receipt ตาม ID
router.get('/:id', protect, ReceiptController.getById);

// PUT /api/receipt/:id - อัปเดต Receipt
router.put('/:id', protect, ReceiptController.update);

// DELETE /api/receipt/:id - ลบ Receipt
router.delete('/:id', protect, ReceiptController.delete);

module.exports = router;
