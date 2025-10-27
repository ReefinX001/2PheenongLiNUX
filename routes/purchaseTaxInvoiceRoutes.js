// File: routes/purchaseTaxInvoiceRoutes.js

const express = require('express');
const router = express.Router();
const PurchaseTaxInvoiceController = require('../controllers/PurchaseTaxInvoiceController');
const protect = require('../middlewares/authJWT');

// Purchase Tax Invoice CRUD Routes

// POST /api/purchase-tax-invoice - สร้างใบกำกับภาษีซื้อใหม่
router.post('/', protect, PurchaseTaxInvoiceController.create);

// GET /api/purchase-tax-invoice - ดึงใบกำกับภาษีซื้อทั้งหมด (มี pagination และ filter)
router.get('/', protect, PurchaseTaxInvoiceController.getAll);

// GET /api/purchase-tax-invoice/statistics - สถิติใบกำกับภาษีซื้อ
router.get('/statistics', protect, PurchaseTaxInvoiceController.getStatistics);

// GET /api/purchase-tax-invoice/number/:invoiceNumber - ดึงใบกำกับภาษีซื้อตามเลขที่
router.get('/number/:invoiceNumber', protect, PurchaseTaxInvoiceController.getByInvoiceNumber);

// GET /api/purchase-tax-invoice/:id - ดึงใบกำกับภาษีซื้อตาม ID
router.get('/:id', protect, PurchaseTaxInvoiceController.getById);

// PUT /api/purchase-tax-invoice/:id - อัปเดทใบกำกับภาษีซื้อ
router.put('/:id', protect, PurchaseTaxInvoiceController.update);

// DELETE /api/purchase-tax-invoice/:id - ลบใบกำกับภาษีซื้อ (soft delete)
router.delete('/:id', protect, PurchaseTaxInvoiceController.delete);

// PUT /api/purchase-tax-invoice/:id/payment - อัปเดทสถานะการชำระเงิน
router.put('/:id/payment', protect, PurchaseTaxInvoiceController.updatePayment);

// PUT /api/purchase-tax-invoice/:id/approve - อนุมัติใบกำกับภาษีซื้อ
router.put('/:id/approve', protect, PurchaseTaxInvoiceController.approve);

// PUT /api/purchase-tax-invoice/:id/cancel - ยกเลิกใบกำกับภาษีซื้อ
router.put('/:id/cancel', protect, PurchaseTaxInvoiceController.cancel);

module.exports = router;
