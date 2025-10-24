/**
 * routes/stockReservationRoutes.js - Routes สำหรับจัดการการจองสต็อกจากมัดจำ
 */

const express = require('express');
const router = express.Router();
const StockReservationController = require('../controllers/StockReservationController');
const authMiddleware = require('../middlewares/authMiddleware');

// Routes

/**
 * POST /api/stock-reservation/create
 * สร้างการจองสต็อกจากใบรับเงินมัดจำ
 */
router.post('/create', authMiddleware, StockReservationController.createReservationFromDeposit);

/**
 * POST /api/stock-reservation/use
 * ใช้การจองสต็อก (เมื่อขายจริง)
 */
router.post('/use', authMiddleware, StockReservationController.useReservation);

/**
 * GET /api/stock-reservation/check/:imei/:branchCode
 * ตรวจสอบการจองสต็อกสำหรับสินค้า
 */
router.get('/check/:imei/:branchCode', authMiddleware, StockReservationController.checkReservation);

/**
 * GET /api/stock-reservation/deposit/:depositReceiptId
 * ดึงข้อมูลการจองจากใบรับเงินมัดจำ
 */
router.get('/deposit/:depositReceiptId', authMiddleware, StockReservationController.getReservationByDepositReceipt);

/**
 * PUT /api/stock-reservation/:reservationId/cancel
 * ยกเลิกการจองสต็อก
 */
router.put('/:reservationId/cancel', authMiddleware, StockReservationController.cancelReservation);

/**
 * PUT /api/stock-reservation/:reservationId/extend
 * ขยายเวลาการจองสต็อก
 */
router.put('/:reservationId/extend', authMiddleware, StockReservationController.extendReservation);

/**
 * GET /api/stock-reservation
 * ดึงรายการการจองสต็อก
 */
router.get('/', authMiddleware, StockReservationController.getReservations);

/**
 * GET /api/stock-reservation/report
 * รายงานการจองสต็อก
 */
router.get('/report', authMiddleware, StockReservationController.getReservationReport);

/**
 * POST /api/stock-reservation/cleanup
 * ทำความสะอาดการจองที่หมดอายุ
 */
router.post('/cleanup', authMiddleware, StockReservationController.cleanupExpiredReservations);

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Stock Reservation API is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
