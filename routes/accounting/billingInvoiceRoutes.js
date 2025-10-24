// routes/billingInvoiceRoutes.js
const express = require('express');
const router = express.Router();
const billingInvoiceController = require('../../controllers/billingInvoiceController');

// POST /api/billing-invoice => สร้าง Invoice
router.post('/', billingInvoiceController.createInvoice);

// GET /api/billing-invoice => ดึงทั้งหมด
router.get('/', billingInvoiceController.getAllInvoices);

// GET /api/billing-invoice/:id => ดึงตาม _id
router.get('/:id', billingInvoiceController.getInvoiceById);

// PATCH /api/billing-invoice/:id => อัปเดต
router.patch('/:id', billingInvoiceController.updateInvoice);

// DELETE /api/billing-invoice/:id => ลบ
router.delete('/:id', billingInvoiceController.deleteInvoice);

module.exports = router;
