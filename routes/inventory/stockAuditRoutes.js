// routes/stockAuditRoutes.js
const express = require('express');
const router = express.Router();
const stockAuditController = require('../../controllers/stockAuditController');

// POST /api/stock-audit => สร้าง
router.post('/', stockAuditController.createAudit);

// GET /api/stock-audit => ดึงทั้งหมด
router.get('/', stockAuditController.getAllAudits);

// GET /api/stock-audit/:id => ดึงตาม id
router.get('/:id', stockAuditController.getAuditById);

// PATCH /api/stock-audit/:id => อัปเดต
router.patch('/:id', stockAuditController.updateAudit);

// DELETE /api/stock-audit/:id => ลบ
router.delete('/:id', stockAuditController.deleteAudit);

module.exports = router;
