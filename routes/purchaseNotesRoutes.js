/**
 * routes/purchaseNotesRoutes.js - Routes สำหรับใบลดหนี้และใบเพิ่มหนี้การซื้อ
 */

const express = require('express');
const router = express.Router();
const PurchaseNotesController = require('../controllers/purchaseNotesController');
const authJWT = require('../middlewares/authJWT');

// Apply authentication middleware to all routes
router.use(authJWT);

// =============== CREDIT NOTES ROUTES ===============

// GET /api/purchase-notes/credit-notes - List credit notes
router.get('/credit-notes', PurchaseNotesController.getCreditNotes);

// POST /api/purchase-notes/credit-notes - Create credit note
router.post('/credit-notes', PurchaseNotesController.createCreditNote);

// GET /api/purchase-notes/credit-notes/stats - Credit notes statistics
router.get('/credit-notes/stats', PurchaseNotesController.getCreditNoteStats);

// POST /api/purchase-notes/credit-notes/:id/approve - Approve credit note
router.post('/credit-notes/:id/approve', PurchaseNotesController.approveCreditNote);

// POST /api/purchase-notes/credit-notes/:id/reject - Reject credit note
router.post('/credit-notes/:id/reject', PurchaseNotesController.rejectCreditNote);

// DELETE /api/purchase-notes/credit-notes/:id - Delete credit note
router.delete('/credit-notes/:id', PurchaseNotesController.deleteCreditNote);

// =============== DEBIT NOTES ROUTES ===============

// GET /api/purchase-notes/debit-notes - List debit notes
router.get('/debit-notes', PurchaseNotesController.getDebitNotes);

// POST /api/purchase-notes/debit-notes - Create debit note
router.post('/debit-notes', PurchaseNotesController.createDebitNote);

// GET /api/purchase-notes/debit-notes/stats - Debit notes statistics
router.get('/debit-notes/stats', PurchaseNotesController.getDebitNoteStats);

// POST /api/purchase-notes/debit-notes/:id/approve - Approve debit note
router.post('/debit-notes/:id/approve', PurchaseNotesController.approveDebitNote);

// POST /api/purchase-notes/debit-notes/:id/reject - Reject debit note
router.post('/debit-notes/:id/reject', PurchaseNotesController.rejectDebitNote);

// DELETE /api/purchase-notes/debit-notes/:id - Delete debit note
router.delete('/debit-notes/:id', PurchaseNotesController.deleteDebitNote);

module.exports = router;