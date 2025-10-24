//routes//invoiceRoutes.js
const express           = require('express');
const router            = express.Router();
const invoiceController = require('../../controllers/invoiceController');
const protect           = require('../../middlewares/authJWT');

// GET  /api/invoice/next-number
// คืนเลข Invoice ถัดไป
router.get(
  '/next-number',
  protect,
  invoiceController.getNextInvoiceNumber
);

// GET  /api/invoice
// ดึงใบแจ้งหนี้ทั้งหมด
router.get(
  '/',
  protect,
  invoiceController.listInvoices
);

// GET  /api/invoice/:invoiceNumber/pdf
// ดาวน์โหลด PDF ใบแจ้งหนี้
router.get(
  '/:invoiceNumber/pdf',
  protect,
  invoiceController.getPdf
);

// GET  /api/invoice/:invoiceNumber
// ดึงใบแจ้งหนี้ฉบับเดียว (JSON)
router.get(
  '/:invoiceNumber',
  protect,
  invoiceController.getInvoice
);


// POST /api/invoice
// สร้าง Invoice ใหม่
router.post(
  '/',
  protect,
  invoiceController.createInvoice
);

// DELETE /api/invoice/:invoiceNumber
// ลบ Invoice
router.delete(
  '/:invoiceNumber',
  protect,
  invoiceController.deleteInvoice
);

module.exports = router;
