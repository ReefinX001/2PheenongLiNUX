const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/POS/creditNoteController');
const auth = require('../../middlewares/authJWT');

// สร้างใบลดหนี้
router.post('/', auth, ctrl.createCreditNote);

// ดึงใบลดหนี้ทั้งหมด (filter by date/status/search)
router.get('/', auth, ctrl.getCreditNotes);

// ดึงใบลดหนี้ตาม ID
router.get('/:id', auth, ctrl.getCreditNoteById);

// ดาวน์โหลดใบลดหนี้ (PDF)
router.get('/:id/download', auth, ctrl.downloadCreditNote);

// อนุมัติใบลดหนี้
router.put('/:id/approve', auth, ctrl.approveCreditNote);

// ยกเลิกใบลดหนี้
router.put('/:id/cancel', auth, ctrl.cancelCreditNote);

// ลบใบลดหนี้
router.delete('/:id', auth, ctrl.deleteCreditNote);

module.exports = router;
