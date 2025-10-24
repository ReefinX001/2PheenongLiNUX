// routes/stockReportRoutes.js
const express = require('express');
const router = express.Router();
const stockReportController = require('../../controllers/stockReportController');

// POST /api/stock-report => สร้าง
router.post('/', stockReportController.createReport);

// GET /api/stock-report => ดึงทั้งหมด
router.get('/', stockReportController.getAllReports);

// GET /api/stock-report/:id => ดึงตาม id
router.get('/:id', stockReportController.getReportById);

// GET /api/stock-report/branch/:branchId => ดึงตามสาขา
router.get('/branch/:branchId', stockReportController.getReportsByBranch);

// GET /api/stock-report/product/:productId => ดึงตามสินค้า
router.get('/product/:productId', stockReportController.getReportsByProduct);

// PATCH /api/stock-report/:id => อัปเดต
router.patch('/:id', stockReportController.updateReport);

// DELETE /api/stock-report/:id => ลบ
router.delete('/:id', stockReportController.deleteReport);

module.exports = router;
