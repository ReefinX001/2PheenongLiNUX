const express = require('express');
const router = express.Router();
const quickSaleController = require('../../controllers/POS/quickSaleController');
const authJWT = require('../../middlewares/authJWT'); // เปลี่ยนจาก authenticate เป็น authJWT
const { auditLogger } = require('../../middlewares/auditLogger'); // destructure auditLogger

/**
 * Quick Sale Routes
 * สำหรับระบบขายด่วนในกรณีฉุกเฉิน
 */

/**
 * POST /api/quick-sale
 * เพิ่มสินค้าโหมดขายด่วน
 *
 * Body:
 * {
 *   "imei": "123456789012345",
 *   "name": "iPhone 15 Pro Max 256GB",
 *   "brand": "Apple",
 *   "cost": 35000,
 *   "supplierId": "supplier_id",
 *   "supplier": { supplier_object },
 *   "branchCode": "00001",
 *   "urgentSale": true,
 *   "timestamp": "2024-01-01T00:00:00.000Z"
 * }
 */
router.post('/',
  authJWT,
  auditLogger('QUICK_SALE_ATTEMPT'),
  quickSaleController.createQuickSale
);

/**
 * GET /api/quick-sale
 * ดึงรายการสินค้าที่ขายด่วน
 *
 * Query params:
 * - branchCode: รหัสสาขา (ไม่บังคับ)
 * - page: หน้าที่ต้องการ (default: 1)
 * - limit: จำนวนรายการต่อหน้า (default: 10)
 */
router.get('/',
  authJWT,
  auditLogger('QUICK_SALE_LIST_VIEW'),
  quickSaleController.getQuickSaleProducts
);

/**
 * GET /api/quick-sale/pending
 * ดึงรายการสินค้าขายด่วนที่รอการอนุมัติ
 *
 * Query params:
 * - branchCode: รหัสสาขา (ไม่บังคับ)
 * - page: หน้าที่ต้องการ (default: 1)
 * - limit: จำนวนรายการต่อหน้า (default: 10)
 */
router.get('/pending',
  authJWT,
  auditLogger('QUICK_SALE_PENDING_LIST_VIEW'),
  quickSaleController.getQuickSalePendingProducts
);

/**
 * GET /api/quick-sale/stats
 * ดึงสถิติการขายด่วน
 *
 * Query params:
 * - branchCode: รหัสสาขา (ไม่บังคับ)
 * - startDate: วันที่เริ่มต้น (ไม่บังคับ)
 * - endDate: วันที่สิ้นสุด (ไม่บังคับ)
 */
router.get('/stats',
  authJWT,
  auditLogger('QUICK_SALE_STATS_VIEW'),
  quickSaleController.getQuickSaleStats
);

module.exports = router;