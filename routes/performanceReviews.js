// routes/performanceReviews.js
const express = require('express');
const router = express.Router();
const authJWT = require('../middlewares/authJWT');

// Import performance review controller
const {
  getAllReviews,
  getReviewById,
  createReview,
  updateReview,
  deleteReview,
  getReviewStats
} = require('../controllers/hr/performanceReviewController');

// Apply authentication to all routes
router.use(authJWT);

// GET /api/performance_reviews - ดึงรายการประเมินทั้งหมด
router.get('/', getAllReviews);

// GET /api/performance_reviews/stats - ดึงสถิติการประเมิน
router.get('/stats', getReviewStats);

// GET /api/performance_reviews/:id - ดึงประเมินรายการเดียว
router.get('/:id', getReviewById);

// POST /api/performance_reviews - สร้างการประเมินใหม่
router.post('/', createReview);

// PATCH /api/performance_reviews/:id - อัปเดตการประเมิน
router.patch('/:id', updateReview);

// DELETE /api/performance_reviews/:id - ลบการประเมิน
router.delete('/:id', deleteReview);

module.exports = router;
