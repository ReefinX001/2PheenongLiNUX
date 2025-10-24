// routes/branchRoutes.js
const express = require('express');
const router = express.Router();
const branchController = require('../../controllers/branchController');

// POST /api/branch => สร้างสาขา
router.post('/', branchController.createBranch);

// GET /api/branch => ดึงสาขาทั้งหมด (deleted_at: null)
router.get('/', branchController.getAllBranches);

// GET /api/branch/:id => ดึงสาขาตาม id
router.get('/:id', branchController.getBranchById);

// PATCH /api/branch/:id => อัปเดตสาขา
router.patch('/:id', branchController.updateBranch);

// DELETE /api/branch/:id => Soft Delete
router.delete('/:id', branchController.deleteBranch);

// (Optional) ลบออกจาก DB จริง ๆ
router.delete('/:id/force', branchController.forceDeleteBranch);

module.exports = router;
