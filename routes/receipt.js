const express = require('express');
const router = express.Router();
const ReceiptController = require('../controllers/ReceiptController');

// Receipt Routes

// POST /api/receipt - สร้าง Receipt ใหม่
router.post('/', ReceiptController.create);

// GET /api/receipt - ดึง Receipt ทั้งหมด (with pagination & filters)
router.get('/', ReceiptController.getAll);

// GET /api/receipt/statistics - สถิติ Receipt
router.get('/statistics', ReceiptController.getStatistics);

// GET /api/receipt/:id - ดึง Receipt ตาม ID
router.get('/:id', ReceiptController.getById);

// PUT /api/receipt/:id - อัปเดต Receipt
router.put('/:id', ReceiptController.update);

// DELETE /api/receipt/:id - ลบ Receipt
router.delete('/:id', ReceiptController.delete);

// GET /api/receipt/check-duplicate - ตรวจสอบใบเสร็จซ้ำ
router.get('/check-duplicate', ReceiptController.checkDuplicate);

// GET /api/receipt/number/:number - ดึง Receipt ตามเลขที่
router.get('/number/:number', ReceiptController.getByNumber);

module.exports = router;
