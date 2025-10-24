// routes/contractAdjustmentRoutes.js
const express = require('express');
const router = express.Router();
const contractAdjustmentController = require('../controllers/contractAdjustmentController');

// POST /api/contract-adjustment => สร้าง
router.post('/', contractAdjustmentController.createAdjustment);

// GET /api/contract-adjustment => ดึงทั้งหมด
router.get('/', contractAdjustmentController.getAllAdjustments);

// GET /api/contract-adjustment/contract/:contractId => ดึงเฉพาะสัญญา
router.get('/contract/:contractId', contractAdjustmentController.getAdjustmentsByContract);

// GET /api/contract-adjustment/:id => ดึงตาม id
router.get('/:id', contractAdjustmentController.getAdjustmentById);

// PATCH /api/contract-adjustment/:id => อัปเดต (option)
router.patch('/:id', contractAdjustmentController.updateAdjustment);

// DELETE /api/contract-adjustment/:id => ลบ (option)
router.delete('/:id', contractAdjustmentController.deleteAdjustment);

module.exports = router;
