// routes/billingCorrectionRoutes.js

const express = require('express');
const router = express.Router();
const billingCorrectionController = require('../../controllers/billingCorrectionController');

// POST /api/billing-correction => สร้าง Correction
router.post('/', billingCorrectionController.createCorrection);

// GET /api/billing-correction => ดึงทั้งหมด
router.get('/', billingCorrectionController.getAllCorrections);

// GET /api/billing-correction/invoice/:invoiceId => ดึงของ invoice นั้น ๆ
router.get('/invoice/:invoiceId', billingCorrectionController.getCorrectionsByInvoice);

module.exports = router;
