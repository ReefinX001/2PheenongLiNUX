// routes/quickSaleRoutes.js
const express = require('express');
const router = express.Router();

// Import middleware
const authJWT = require('../middlewares/authJWT');

// Import controller
const {
  getAllQuickSales,
  createQuickSale,
  updateQuickSale,
  bulkCreatePO,
  getStatistics,
  deleteQuickSale
} = require('../controllers/quickSaleController');

// Middleware สำหรับทุก route
router.use(authJWT);

// GET /api/quick-sale - ดึงรายการสินค้าขายด่วน
router.get('/', getAllQuickSales);

// GET /api/quick-sale/statistics - ดึงสถิติ
router.get('/statistics', getStatistics);

// POST /api/quick-sale - สร้างรายการสินค้าขายด่วนใหม่
router.post('/', createQuickSale);

// POST /api/quick-sale/bulk-create-po - สร้าง PO ย้อนหลังจากรายการที่เลือก
router.post('/bulk-create-po', bulkCreatePO);

// PUT /api/quick-sale/:id - อัพเดทรายการสินค้าขายด่วน
router.put('/:id', updateQuickSale);

// DELETE /api/quick-sale/:id - ลบรายการสินค้าขายด่วน
router.delete('/:id', deleteQuickSale);

module.exports = router;
