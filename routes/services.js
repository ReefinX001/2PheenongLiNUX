const express = require('express');
const router = express.Router();
const authJWT = require('../middlewares/authJWT');
const {
  getServiceHistory,
  checkServiceEligibility,
  recordServiceUsage,
  getCustomerServiceHistory,
  updateServiceStatus,
  deleteServiceRecord,
  getServiceStatistics
} = require('../controllers/servicesController');

// Apply authentication middleware to all routes
router.use(authJWT);

/**
 * GET /api/services/history
 * ดึงประวัติการให้บริการ
 * Query params: branchCode, page, limit
 */
router.get('/history', getServiceHistory);

/**
 * GET /api/services/eligibility
 * ตรวจสอบสิทธิ์การใช้บริการของลูกค้า
 * Query params: customerName, phone, idCard
 */
router.get('/eligibility', checkServiceEligibility);

/**
 * POST /api/services/usage
 * บันทึกการใช้บริการ
 */
router.post('/usage', recordServiceUsage);

/**
 * GET /api/services/customer/:customerId
 * ดึงประวัติการใช้บริการของลูกค้าคนหนึ่ง
 */
router.get('/customer/:customerId', getCustomerServiceHistory);

/**
 * PUT /api/services/:serviceId/status
 * อัปเดตสถานะการใช้บริการ
 */
router.put('/:serviceId/status', updateServiceStatus);

/**
 * DELETE /api/services/:serviceId
 * ลบ/ยกเลิกการใช้บริการ (soft delete)
 */
router.delete('/:serviceId', deleteServiceRecord);

/**
 * GET /api/services/statistics
 * ดึงสถิติการใช้บริการ
 * Query params: branchCode, startDate, endDate
 */
router.get('/statistics', getServiceStatistics);

module.exports = router;