const express = require('express');
const router = express.Router();
const multer = require('multer');
// ใช้ memory storage สำหรับรับข้อมูลแบบ multipart/form-data (ไม่มีการจัดเก็บไฟล์จริง)
const upload = multer();
const supplierController = require('../controllers/supplierController');

// ✅ GET /api/supplier => ดึงข้อมูลซัพพลายเออร์ทั้งหมดที่ยังไม่ถูกลบ
router.get('/', supplierController.getAllSuppliers);

// ✅ GET /api/supplier/:id => ดึงซัพพลายเออร์ตาม ID
router.get('/:id', supplierController.getSupplierById);

// ✅ POST /api/supplier => สร้างซัพพลายเออร์ใหม่
// ใช้ upload.none() เพื่อให้ multer ทำการ parse multipart/form-data ที่ไม่มีไฟล์แนบ
router.post('/', upload.none(), supplierController.createSupplier);

// ✅ PATCH /api/supplier/:id => อัปเดตข้อมูลซัพพลายเออร์
router.patch('/:id', upload.none(), supplierController.updateSupplier);

// ✅ DELETE /api/supplier/:id => ลบซัพพลายเออร์ (soft delete)
router.delete('/:id', supplierController.deleteSupplier);

// ✅ (Optional) Force Delete
router.delete('/:id/force', supplierController.forceDeleteSupplier);

module.exports = router;
