// routes/productAttributeRoutes.js
const express = require('express');
const router = express.Router();
const productAttributeController = require('../../controllers/productAttributeController');

// POST /api/product-attribute => สร้าง attribute
router.post('/', productAttributeController.createAttribute);

// GET /api/product-attribute => ดึงทั้งหมด
router.get('/', productAttributeController.getAllAttributes);

// GET /api/product-attribute/product/:productId => ดึงเฉพาะ product
router.get('/product/:productId', productAttributeController.getAttributesByProduct);

// GET /api/product-attribute/:id => ดึงตาม id
router.get('/:id', productAttributeController.getAttributeById);

// PATCH /api/product-attribute/:id => อัปเดต
router.patch('/:id', productAttributeController.updateAttribute);

// DELETE /api/product-attribute/:id => ลบ
router.delete('/:id', productAttributeController.deleteAttribute);

module.exports = router;
