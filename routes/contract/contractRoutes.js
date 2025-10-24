// routes/contractRoutes.js

const express = require('express');
const router = express.Router();
const contractController = require('../../controllers/contractController');

// POST /api/contract => สร้าง Contract
router.post('/', contractController.createContract);

// GET /api/contract => ดึงทั้งหมด
router.get('/', contractController.getAllContracts);

// GET /api/contract/:id => ดึงตาม id
router.get('/:id', contractController.getContractById);

// PATCH /api/contract/:id => อัปเดต
router.patch('/:id', contractController.updateContract);

// DELETE /api/contract/:id => Soft Delete
router.delete('/:id', contractController.deleteContract);

// (Optional) DELETE /api/contract/:id/force => Force Delete
router.delete('/:id/force', contractController.forceDeleteContract);

module.exports = router;
