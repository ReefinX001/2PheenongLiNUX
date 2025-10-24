// routes/branchTransferRoutes.js

const express = require('express');
const router = express.Router();
const branchTransferController = require('../controllers/branchTransferController');

// POST /api/branch-transfer
router.post('/', branchTransferController.createTransfer);

// GET /api/branch-transfer
router.get('/', branchTransferController.getAllTransfers);

// GET /api/branch-transfer/:id
router.get('/:id', branchTransferController.getTransferById);

// PATCH /api/branch-transfer/:id
router.patch('/:id', branchTransferController.updateTransfer);

// PUT /api/branch-transfer/:id/prepare - ผู้จัดเตรียมเซ็น (pending → in-transit)
router.put('/:id/prepare', branchTransferController.prepareTransfer);

// PUT /api/branch-transfer/:id/receive - ผู้รับเซ็น (in-transit → received)
router.put('/:id/receive', branchTransferController.receiveTransfer);

// PUT /api/branch-transfer/:id/cancel - ยกเลิกการโอนย้าย
router.put('/:id/cancel', branchTransferController.cancelTransfer);

// DELETE /api/branch-transfer/:id
router.delete('/:id', branchTransferController.deleteTransfer);

module.exports = router;
