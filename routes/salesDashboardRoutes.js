const express = require('express');
const router = express.Router();
const SalesDashboardController = require('../controllers/salesDashboardController');

// GET /api/sales-dashboard/today-summary => สรุปยอดขายวันนี้
router.get('/today-summary', SalesDashboardController.getTodaySummary);

// GET /api/sales-dashboard/today-sales => รายการขายวันนี้
router.get('/today-sales', SalesDashboardController.getTodaySales);

// GET /api/sales-dashboard/branch-stats => สถิติการขายตามสาขา
router.get('/branch-stats', SalesDashboardController.getBranchStats);

// GET /api/sales-dashboard/product-distribution => สัดส่วนประเภทสินค้า
router.get('/product-distribution', SalesDashboardController.getProductDistribution);

// GET /api/sales-dashboard/color-distribution => สัดส่วนสีที่ขายได้
router.get('/color-distribution', SalesDashboardController.getColorDistribution);

// GET /api/sales-dashboard/top-sales-staff => พนักงานขายยอดเยี่ยม
router.get('/top-sales-staff', SalesDashboardController.getTopSalesStaff);

// GET /api/sales-dashboard/branches => รายชื่อสาขาทั้งหมด
router.get('/branches', SalesDashboardController.getBranches);

// GET /api/sales-dashboard/salespersons => รายชื่อพนักงานขายทั้งหมด
router.get('/salespersons', SalesDashboardController.getSalespersons);

module.exports = router;