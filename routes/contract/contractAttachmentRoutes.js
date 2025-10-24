// routes/contractAttachmentRoutes.js
const express = require('express');
const router = express.Router();
const contractAttachmentController = require('../../controllers/contractAttachmentController');

// POST /api/contract-attachment => สร้าง
router.post('/', contractAttachmentController.createAttachment);

// GET /api/contract-attachment => ดึงทั้งหมด
router.get('/', contractAttachmentController.getAllAttachments);

// GET /api/contract-attachment/contract/:contractId => เฉพาะสัญญา
router.get('/contract/:contractId', contractAttachmentController.getAttachmentsByContract);

// GET /api/contract-attachment/:id => ดึงตาม id
router.get('/:id', contractAttachmentController.getAttachmentById);

// PATCH /api/contract-attachment/:id => อัปเดต (option)
router.patch('/:id', contractAttachmentController.updateAttachment);

// DELETE /api/contract-attachment/:id => ลบ
router.delete('/:id', contractAttachmentController.deleteAttachment);

module.exports = router;
