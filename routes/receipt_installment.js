// routes/receipt_installment.js

const express = require('express');
const router = express.Router();
const InvoiceReceiptController = require('../controllers/InvoiceReceiptController');

// สร้างใบเสร็จ (POST /api/receipt)
router.post('/', InvoiceReceiptController.create);

// ดาวน์โหลด PDF ตาม _id (GET /api/receipt/:id/pdf)
router.get('/:id/pdf', InvoiceReceiptController.getPdf);

// สร้างจาก Quotation (POST /api/receipt/:quotationId/invoice)
router.post('/:quotationId/invoice', InvoiceReceiptController.createFromQuotation);

// ลบใบเสร็จ (DELETE /api/receipt/:id)
router.delete('/:id', InvoiceReceiptController.remove);

module.exports = router;
