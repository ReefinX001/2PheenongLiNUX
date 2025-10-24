// routes/branchTransferRoutes.js

const express = require('express');
const router = express.Router();
const branchTransferController = require('../../controllers/branchTransferController');

// POST /api/branch-transfer
router.post('/', branchTransferController.createTransfer);

// GET /api/branch-transfer
router.get('/', branchTransferController.getAllTransfers);

// GET /api/branch-transfer/:id
router.get('/:id', branchTransferController.getTransferById);

// PATCH /api/branch-transfer/:id
router.patch('/:id', branchTransferController.updateTransfer);

// DELETE /api/branch-transfer/:id
router.delete('/:id', branchTransferController.deleteTransfer);

module.exports = router;
