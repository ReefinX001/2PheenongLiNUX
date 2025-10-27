// File: routes/receipts.js

const express = require('express');
const router = express.Router();
const Order = require('../models/POS/Order');
const PDFoooRasterController = require('../controllers/PDFoooRasterController');
const ReceiptController = require('../controllers/ReceiptController');
// ↑ เรียกไฟล์ Raster version แทน

// ==================== CRUD Routes ====================

// GET /api/receipts/statistics - Get receipt statistics
router.get('/statistics', ReceiptController.getStatistics);

// GET /api/receipts - Get all receipts with pagination, search, and filters
router.get('/', ReceiptController.getAll);

// GET /api/receipts/number/:number - Get receipt by receipt number
router.get('/number/:number', ReceiptController.getByNumber);

// GET /api/receipts/check-duplicate - Check for duplicate receipt
router.get('/check-duplicate', ReceiptController.checkDuplicate);

// GET /api/receipts/:id - Get receipt by ID
router.get('/:id', ReceiptController.getById);

// POST /api/receipts - Create new receipt
router.post('/', ReceiptController.create);

// PUT /api/receipts/:id - Update receipt
router.put('/:id', ReceiptController.update);

// DELETE /api/receipts/:id - Delete receipt
router.delete('/:id', ReceiptController.delete);

// ==================== Print Route ====================

// Route สำหรับพิมพ์ใบเสร็จลงเครื่อง ESC/POS (Raster)
router.post('/print/:id', async (req, res) => {
  try {
    const orderId = req.params.id;
    // 1) หาออเดอร์จาก DB
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ error: 'ไม่พบใบเสร็จสำหรับรหัสที่ระบุ' });
    }

    // 2) เรียกพิมพ์ด้วย PDFoooRasterController
    await PDFoooRasterController.printReceipt(order);

    // ถ้าพิมพ์สำเร็จ
    return res.json({ success: true, message: 'พิมพ์ใบเสร็จ (Raster) สำเร็จ' });
  } catch (error) {
    console.error('❌ Error printing receipt (raster):', error);
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการพิมพ์ใบเสร็จ (Raster)' });
  }
});

module.exports = router;
