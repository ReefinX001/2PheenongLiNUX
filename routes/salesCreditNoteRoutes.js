/**
 * routes/salesCreditNoteRoutes.js - Routes สำหรับจัดการใบลดหนี้การขาย
 */

const express = require('express');
const router = express.Router();
const SalesCreditNoteController = require('../controllers/SalesCreditNoteController');
const authMiddleware = require('../middlewares/authJWT');

// Routes

/**
 * GET /api/sales-credit-notes/stats
 * ดึงสถิติใบลดหนี้
 */
router.get('/stats', authMiddleware, SalesCreditNoteController.getStats);

/**
 * GET /api/sales-credit-notes
 * ดึงรายการใบลดหนี้ (พร้อม pagination และ filter)
 */
router.get('/', authMiddleware, SalesCreditNoteController.getCreditNotes);

/**
 * GET /api/sales-credit-notes/:id
 * ดึงใบลดหนี้ตาม ID
 */
router.get('/:id', authMiddleware, SalesCreditNoteController.getCreditNoteById);

/**
 * POST /api/sales-credit-notes
 * สร้างใบลดหนี้ใหม่
 */
router.post('/', authMiddleware, SalesCreditNoteController.createCreditNote);

/**
 * POST /api/sales-credit-notes/:id/approve
 * อนุมัติใบลดหนี้
 */
router.post('/:id/approve', authMiddleware, SalesCreditNoteController.approveCreditNote);

/**
 * POST /api/sales-credit-notes/:id/reject
 * ปฏิเสธใบลดหนี้
 */
router.post('/:id/reject', authMiddleware, SalesCreditNoteController.rejectCreditNote);

/**
 * DELETE /api/sales-credit-notes/:id
 * ยกเลิกใบลดหนี้
 */
router.delete('/:id', authMiddleware, SalesCreditNoteController.cancelCreditNote);

module.exports = router;