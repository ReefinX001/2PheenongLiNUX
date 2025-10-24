// routes/saleRoutes.js
const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');

// POST /api/sale => สร้าง
router.post('/', saleController.createSale);

// GET /api/sale => ดึงทั้งหมดที่ไม่ถูกลบ
router.get('/', saleController.getAllSales);

// GET /api/sale/:id => ดึงการขายตาม id
router.get('/:id', saleController.getSaleById);

// PATCH /api/sale/:id => อัปเดต
router.patch('/:id', saleController.updateSale);

// DELETE /api/sale/:id => Soft Delete
router.delete('/:id', saleController.deleteSale);

// (Optional) Force Delete
router.delete('/:id/force', saleController.forceDeleteSale);

module.exports = router;
