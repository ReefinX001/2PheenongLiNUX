// routes/quotationRoutes.js

const express             = require('express');
const router              = express.Router();
const invoiceController   = require('../../controllers/invoiceController');
const quotationController = require('../../controllers/quotationController');
// สมมติคุณมี middleware สำหรับตรวจ JWT แล้วเก็บ user ไว้ใน req.user
const protect     = require('../../middlewares/authJWT');

// GET /api/quotation/next-number
// คืนเลขใบเสนอราคาฉบับถัดไป
router.get('/next-number', protect, quotationController.getNextNumber);

// GET /api/quotation
// ดึงใบเสนอราคาทั้งหมด
router.get('/', protect, quotationController.getAllQuotations);

// **ต้องวางก่อน** generic '/:id'
// ดาวน์โหลด PDF ใบเสนอราคา
router.get('/:id/pdf', protect, quotationController.getPdf);

// GET /api/quotation/:id
// ดึงรายละเอียดใบเสนอราคาฉบับเดียว (JSON)
router.get('/:id', protect, quotationController.getQuotation);

// POST /api/quotation
// สร้างใบเสนอราคาใหม่
router.post(
  '/',
  protect,                    // ← ตรวจ token แล้วเซ็ต req.user.id
  quotationController.createQuotation
);

// POST /api/quotation/:quotationNumber/invoice
// สร้าง Invoice โดยอ้างอิงจากเลข Quotation
router.post(
  '/:quotationNumber/invoice',
  protect,
  invoiceController.createFromQuotation
);

module.exports = router;
