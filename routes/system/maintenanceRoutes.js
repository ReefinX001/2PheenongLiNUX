// routes/system/maintenanceRoutes.js
const express = require('express');
const router = express.Router();
const maintenanceController = require('../../controllers/system/maintenanceController');
const authJWT = require('../../middlewares/authJWT');

// ป้องกันด้วย authentication (สำหรับ admin เท่านั้น)
router.use(authJWT);

// GET /api/system/check-branchstock-cost - ตรวจสอบสถานะ cost
router.get('/check-branchstock-cost', maintenanceController.checkBranchStockCost);

// POST /api/system/fix-branchstock-cost - แก้ไข cost
router.post('/fix-branchstock-cost', maintenanceController.fixBranchStockCost);

// GET /api/system/check-product-html-sync - ตรวจสอบสถานะการซิงค์จาก Product HTML
router.get('/check-product-html-sync', maintenanceController.checkProductHtmlSync);

// POST /api/system/sync-branchstock-from-product-html - ซิงค์ BranchStock จาก Product HTML
router.post('/sync-branchstock-from-product-html', maintenanceController.syncBranchStockFromProductHtml);

module.exports = router;