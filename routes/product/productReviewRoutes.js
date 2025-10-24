// routes/productReviewRoutes.js
const express = require('express');
const router = express.Router();
const productReviewController = require('../../controllers/productReviewController');

// POST /api/product-review => สร้าง
router.post('/', productReviewController.createReview);

// GET /api/product-review => ดึงทั้งหมด
router.get('/', productReviewController.getAllReviews);

// GET /api/product-review/product/:productId => เฉพาะสินค้าตัวนั้น
router.get('/product/:productId', productReviewController.getReviewsByProduct);

// GET /api/product-review/:id => ดึงตาม id
router.get('/:id', productReviewController.getReviewById);

// PATCH /api/product-review/:id => อัปเดต
router.patch('/:id', productReviewController.updateReview);

// DELETE /api/product-review/:id => ลบ
router.delete('/:id', productReviewController.deleteReview);

module.exports = router;
