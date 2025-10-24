// routes/productCategoryRoutes.js
const express = require('express');
const router = express.Router();
const productCategoryController = require('../../controllers/productCategoryController');

// POST /api/product-category => สร้าง
router.post('/', productCategoryController.createCategory);

// GET /api/product-category => ดึงทั้งหมด (ที่ยังไม่ถูกลบ)
router.get('/', productCategoryController.getAllCategories);

// GET /api/product-category/:id => ดึงตาม id
router.get('/:id', productCategoryController.getCategoryById);

// PATCH /api/product-category/:id => อัปเดต
router.patch('/:id', productCategoryController.updateCategory);

// DELETE /api/product-category/:id => Soft Delete
router.delete('/:id', productCategoryController.deleteCategory);

// (Optional) Force Delete
router.delete('/:id/force', productCategoryController.forceDeleteCategory);

module.exports = router;
