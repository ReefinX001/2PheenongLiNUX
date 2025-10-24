const express = require('express');
const router = express.Router();

const upload = require('../../middlewares/productImageUpload');
const productController = require('../../controllers/productController');

/**
 * POST /api/product
 * สร้างสินค้าใหม่ + อัปโหลดรูป (field "image")
 */
router.post('/', upload.single('image'), productController.createProduct);

/**
 * GET /api/product
 * ดึงสินค้าที่ยังไม่ถูกลบ (deleted_at: null)
 */
router.get('/', productController.getAllProducts);

/**
 * GET /api/product/find-by-barcode?code=...
 * ค้นหาสินค้าจาก barcode
 */
router.get('/find-by-barcode', productController.findByBarcode);

/**
 * GET /api/product/:id
 * ดึงข้อมูลสินค้า 1 รายการตาม _id
 */
router.get('/:id', productController.getProductById);

/**
 * PATCH /api/product/:id
 * แก้ไขข้อมูลสินค้า (optionally อัปโหลดรูปใหม่)
 */
router.patch('/:id', upload.single('image'), productController.updateProduct);

/**
 * DELETE /api/product/:id
 * Soft Delete => ตั้งค่า deleted_at เป็นวันที่ปัจจุบัน
 */
router.delete('/:id', productController.deleteProduct);

/**
 * DELETE /api/product/:id/force
 * ลบสินค้าออกจากฐานข้อมูล (Physical Delete)
 */
router.delete('/:id/force', productController.forceDeleteProduct);

/**
 * POST /api/product/:id/transfer
 * สแกนเข้าสาขา: ย้ายข้อมูลสินค้าไปเก็บใน ProductHistory แล้วลบสินค้าออกจาก Product
 */
router.post('/:id/transfer', productController.transferProduct);

module.exports = router;
