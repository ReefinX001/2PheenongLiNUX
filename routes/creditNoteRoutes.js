/**
 * routes/creditNoteRoutes.js - Routes สำหรับจัดการใบลดหนี้
 */

const express = require('express');
const router = express.Router();
const CreditNoteController = require('../controllers/CreditNoteController');
const authMiddleware = require('../middlewares/authJWT');

// Routes

/**
 * POST /api/credit-note/create
 * สร้างใบลดหนี้จากใบรับเงินมัดจำ
 */
router.post('/create', authMiddleware, CreditNoteController.createFromDepositReceipt);

/**
 * GET /api/credit-note
 * ดึงรายการใบลดหนี้ (พร้อม pagination และ filter)
 */
router.get('/', authMiddleware, CreditNoteController.getCreditNotes);

/**
 * GET /api/credit-note/:id
 * ดึงใบลดหนี้ตาม ID
 */
router.get('/:id', authMiddleware, CreditNoteController.getCreditNoteById);

/**
 * POST /api/credit-note/:id/approve
 * อนุมัติใบลดหนี้
 */
router.post('/:id/approve', authMiddleware, CreditNoteController.approveCreditNote);

/**
 * POST /api/credit-note/:id/reject
 * ปฏิเสธใบลดหนี้
 */
router.post('/:id/reject', authMiddleware, CreditNoteController.rejectCreditNote);

/**
 * GET /api/credit-note/deposit/:depositReceiptId
 * ดึงใบลดหนี้สำหรับใบรับเงินมัดจำ
 */
router.get('/deposit/:depositReceiptId', authMiddleware, CreditNoteController.getCreditNotesForDeposit);

/**
 * DELETE /api/credit-note/:id
 * ยกเลิกใบลดหนี้
 */
router.delete('/:id', authMiddleware, CreditNoteController.cancelCreditNote);

module.exports = router;
