/**
 * routes/salesDebitNoteRoutes.js - Routes สำหรับจัดการใบเพิ่มหนี้การขาย
 */

const express = require('express');
const router = express.Router();
const SalesDebitNoteController = require('../controllers/SalesDebitNoteController');
const authMiddleware = require('../middlewares/authJWT');

// Routes

/**
 * GET /api/debit-note/stats
 * ดึงสถิติใบเพิ่มหนี้
 */
router.get('/stats', authMiddleware, SalesDebitNoteController.getStats);

/**
 * GET /api/debit-note
 * ดึงรายการใบเพิ่มหนี้ (พร้อม pagination และ filter)
 */
router.get('/', authMiddleware, SalesDebitNoteController.getSalesDebitNotes);

/**
 * GET /api/debit-note/:id
 * ดึงใบเพิ่มหนี้ตาม ID
 */
router.get('/:id', authMiddleware, SalesDebitNoteController.getSalesDebitNoteById);

/**
 * POST /api/debit-note
 * สร้างใบเพิ่มหนี้ใหม่
 */
router.post('/', authMiddleware, SalesDebitNoteController.createSalesDebitNote);

/**
 * POST /api/debit-note/:id/approve
 * อนุมัติใบเพิ่มหนี้
 */
router.post('/:id/approve', authMiddleware, SalesDebitNoteController.approveSalesDebitNote);

/**
 * POST /api/debit-note/:id/reject
 * ปฏิเสธใบเพิ่มหนี้
 */
router.post('/:id/reject', authMiddleware, SalesDebitNoteController.rejectSalesDebitNote);

/**
 * DELETE /api/debit-note/:id
 * ยกเลิกใบเพิ่มหนี้
 */
router.delete('/:id', authMiddleware, SalesDebitNoteController.cancelSalesDebitNote);

module.exports = router;
