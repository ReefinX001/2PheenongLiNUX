// routes/supplierMappingRoutes.js
const express = require('express');
const router = express.Router();
const supplierMappingController = require('../controllers/supplierMappingController');

// POST /api/supplier-mapping => สร้าง
router.post('/', supplierMappingController.createMapping);

// GET /api/supplier-mapping => ดึงทั้งหมด
router.get('/', supplierMappingController.getAllMappings);

// GET /api/supplier-mapping/:id => ดึงตาม id
router.get('/:id', supplierMappingController.getMappingById);

// GET /api/supplier-mapping/supplier/:supplierId => เฉพาะ supplier
router.get('/supplier/:supplierId', supplierMappingController.getMappingsBySupplier);

// GET /api/supplier-mapping/product/:productId => เฉพาะ product
router.get('/product/:productId', supplierMappingController.getMappingsByProduct);

// GET /api/supplier-mapping/order/:orderId => เฉพาะ order_id (BranchSupplier)
router.get('/order/:orderId', supplierMappingController.getMappingsByOrder);

// PATCH /api/supplier-mapping/:id => อัปเดต
router.patch('/:id', supplierMappingController.updateMapping);

// DELETE /api/supplier-mapping/:id => ลบ
router.delete('/:id', supplierMappingController.deleteMapping);

module.exports = router;
