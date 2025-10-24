// routes/productVariantRoutes.js
const express = require('express');
const router = express.Router();
const productVariantController = require('../../controllers/productVariantController');

// POST /api/product-variant => สร้าง
router.post('/', productVariantController.createVariant);

// GET /api/product-variant => ดึงทั้งหมด
router.get('/', productVariantController.getAllVariants);

// GET /api/product-variant/product/:productId => ดึงเฉพาะสินค้าตัวนั้น
router.get('/product/:productId', productVariantController.getVariantsByProduct);

// GET /api/product-variant/:id => ดึงตาม id
router.get('/:id', productVariantController.getVariantById);

// PATCH /api/product-variant/:id => อัปเดต
router.patch('/:id', productVariantController.updateVariant);

// DELETE /api/product-variant/:id => ลบ
router.delete('/:id', productVariantController.deleteVariant);

module.exports = router;
