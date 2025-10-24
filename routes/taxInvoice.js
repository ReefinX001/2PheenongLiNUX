const express = require('express');
const router = express.Router();
const TaxInvoiceController = require('../controllers/TaxInvoiceController');
const authenticateToken = require('../middlewares/authJWT');

// Debug logging
console.log('🔍 TaxInvoiceController:', TaxInvoiceController);
console.log('🔍 TaxInvoiceController.create:', TaxInvoiceController.create);
console.log('🔍 authenticateToken:', authenticateToken);

// Tax Invoice Routes

// POST /api/tax-invoice - สร้าง Tax Invoice ใหม่
router.post('/', authenticateToken, TaxInvoiceController.create);

// GET /api/tax-invoice - ดึง Tax Invoice ทั้งหมด (with pagination & filters)
router.get('/', authenticateToken, TaxInvoiceController.getAll);

// GET /api/tax-invoice/statistics - สถิติ Tax Invoice
router.get('/statistics', authenticateToken, TaxInvoiceController.getStatistics);

// GET /api/tax-invoice/:id - ดึง Tax Invoice ตาม ID
router.get('/:id', authenticateToken, TaxInvoiceController.getById);

// PUT /api/tax-invoice/:id - อัปเดต Tax Invoice
router.put('/:id', authenticateToken, TaxInvoiceController.update);

// DELETE /api/tax-invoice/:id - ลบ Tax Invoice
router.delete('/:id', authenticateToken, TaxInvoiceController.delete);

// GET /api/tax-invoice/number/:number - ดึง Tax Invoice ตามเลขที่
router.get('/number/:number', authenticateToken, TaxInvoiceController.getByNumber);

// GET /api/tax-invoice/contract/:contractNo - ดึง Tax Invoice ตามเลขที่สัญญา
router.get('/contract/:contractNo', authenticateToken, TaxInvoiceController.getByContractNumber);

module.exports = router;
