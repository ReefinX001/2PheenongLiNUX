// routes/salesReportRoutes.js
const express = require('express');
const router = express.Router();
const salesReportController = require('../../controllers/salesReportController');

// POST /api/sales-report => สร้าง
router.post('/', salesReportController.createReport);

// GET /api/sales-report => ดึงทั้งหมด
router.get('/', salesReportController.getAllReports);

// GET /api/sales-report/:id => ดึงตาม id
router.get('/:id', salesReportController.getReportById);

// PATCH /api/sales-report/:id => อัปเดต
router.patch('/:id', salesReportController.updateReport);

// DELETE /api/sales-report/:id => ลบ
router.delete('/:id', salesReportController.deleteReport);

module.exports = router;
