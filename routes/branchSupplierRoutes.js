// routes/branchSupplierRoutes.js
const express = require('express');
const router = express.Router();
const branchSupplierController = require('../controllers/branchSupplierController');

// POST /api/branch-supplier => สร้าง
router.post('/', branchSupplierController.createBranchSupplier);

// GET /api/branch-supplier => ดึงทั้งหมด
router.get('/', branchSupplierController.getAllBranchSuppliers);

// GET /api/branch-supplier/:id => ดึงตาม id
router.get('/:id', branchSupplierController.getBranchSupplierById);

// PATCH /api/branch-supplier/:id => อัปเดต
router.patch('/:id', branchSupplierController.updateBranchSupplier);

// DELETE /api/branch-supplier/:id => ลบ
router.delete('/:id', branchSupplierController.deleteBranchSupplier);

module.exports = router;
