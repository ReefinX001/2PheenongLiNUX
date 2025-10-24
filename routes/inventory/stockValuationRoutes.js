// routes/stockValuationRoutes.js
const express = require('express');
const router = express.Router();
const stockValuationController = require('../../controllers/stockValuationController');

// POST /api/stock-valuation => สร้าง
router.post('/', stockValuationController.createValuation);

// GET /api/stock-valuation => ดึงทั้งหมด
router.get('/', stockValuationController.getAllValuations);

// GET /api/stock-valuation/:id => ดึงตาม id
router.get('/:id', stockValuationController.getValuationById);

// GET /api/stock-valuation/branch/:branchId => ดึงตาม branch
router.get('/branch/:branchId', stockValuationController.getValuationsByBranch);

// PATCH /api/stock-valuation/:id => อัปเดต
router.patch('/:id', stockValuationController.updateValuation);

// DELETE /api/stock-valuation/:id => ลบ
router.delete('/:id', stockValuationController.deleteValuation);

module.exports = router;
