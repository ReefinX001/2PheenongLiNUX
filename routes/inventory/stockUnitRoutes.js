// routes/stockUnitRoutes.js
const express = require('express');
const router = express.Router();
const stockUnitController = require('../../controllers/stockUnitController');

// POST /api/stock-unit => สร้าง
router.post('/', stockUnitController.createUnit);

// GET /api/stock-unit => ดึงทั้งหมด (soft delete => deleted_at: null)
router.get('/', stockUnitController.getAllUnits);

// GET /api/stock-unit/:id => ดึงตาม id
router.get('/:id', stockUnitController.getUnitById);

// GET /api/stock-unit/variant/:variantId => ดึงเฉพาะ Variant
router.get('/variant/:variantId', stockUnitController.getUnitsByVariant);

// PATCH /api/stock-unit/:id => อัปเดต
router.patch('/:id', stockUnitController.updateUnit);

// DELETE /api/stock-unit/:id => ลบ
router.delete('/:id', stockUnitController.deleteUnit);

module.exports = router;
