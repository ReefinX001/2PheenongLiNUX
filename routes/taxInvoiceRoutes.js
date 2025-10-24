// File: routes/taxInvoiceRoutes.js

const express = require('express');
const router = express.Router();
const TaxInvoiceController = require('../controllers/TaxInvoiceController');
const protect = require('../middlewares/authJWT');

// Tax Invoice CRUD Routes

// POST /api/tax-invoice - สร้าง Tax Invoice ใหม่
router.post('/', protect, TaxInvoiceController.create);

// GET /api/tax-invoice - ดึง Tax Invoice ทั้งหมด (มี pagination และ filter)
router.get('/', protect, TaxInvoiceController.getAll);

// GET /api/tax-invoice/statistics - สถิติ Tax Invoice
router.get('/statistics', protect, TaxInvoiceController.getStatistics);

// GET /api/tax-invoice/number/:number - ดึง Tax Invoice ตามเลขที่
router.get('/number/:number', protect, TaxInvoiceController.getByNumber);

// GET /api/tax-invoice/:id - ดึง Tax Invoice ตาม ID
router.get('/:id', protect, TaxInvoiceController.getById);

// PUT /api/tax-invoice/:id - อัปเดต Tax Invoice
router.put('/:id', protect, TaxInvoiceController.update);

// DELETE /api/tax-invoice/:id - ลบ Tax Invoice
router.delete('/:id', protect, TaxInvoiceController.delete);

module.exports = router;
