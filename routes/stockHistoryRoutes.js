// routes/stockHistoryRoutes.js
const express = require('express');
const router = express.Router();
const stockHistoryController = require('../controllers/stockHistoryController');

// POST /api/stock-history => สร้าง
router.post('/', stockHistoryController.createHistory);

// GET /api/stock-history => ดึงทั้งหมด
router.get('/', stockHistoryController.getAllHistories);

// GET /api/stock-history/:id => ดึงตาม id
router.get('/:id', stockHistoryController.getHistoryById);

// GET /api/stock-history/product/:productId => ดึงเฉพาะสินค้า
router.get('/product/:productId', stockHistoryController.getHistoryByProduct);

// PATCH /api/stock-history/:id => อัปเดต
router.patch('/:id', stockHistoryController.updateHistory);

// DELETE /api/stock-history/:id => ลบ
router.delete('/:id', stockHistoryController.deleteHistory);

module.exports = router;
