const express = require('express');
const router = express.Router();
const upload = require('../middlewares/productImageUpload');
const productImageController = require('../controllers/productImageController');

// POST /api/product-image
// => สร้างข้อมูลใหม่ โดยต้องมี name, image (สำหรับ mobile) หรือไม่มี image (สำหรับ boxset)
router.post('/', upload.single('image'), productImageController.createImage);

// POST /api/product-image/boxset
// => สร้าง Boxset จากสินค้าที่มีอยู่
router.post('/boxset', upload.single('image'), productImageController.createBoxset);

// GET /api/product-image
// => ดึงข้อมูลทั้งหมด
router.get('/', productImageController.getAllImages);

// GET /api/product-image/pricing[?type=installment|cash]
router.get('/pricing', productImageController.getPricingData);

// GET /api/product-image/not-in-stock - ดึงสินค้าที่ไม่มีในสต็อกของสาขา
router.get('/not-in-stock', productImageController.getProductsNotInStock);

// เฉพาะผ่อน
router.get('/pricing/installment', productImageController.getPricingInstallment);

// เฉพาะสด
router.get('/pricing/cash', productImageController.getPricingCash);

// GET /api/product-image/boxset/:id/details
// => ดูรายละเอียด boxset พร้อมสินค้าข้างใน
router.get('/boxset/:id/details', productImageController.getBoxsetDetails);

// GET /api/product-image/name/:name
// => ดึงข้อมูลภาพทั้งหมดของสินค้าตามชื่อ
router.get('/name/:name', productImageController.getImagesByName);

// PATCH /api/product-image/price/name/:productName
router.patch('/price/name/:productName', productImageController.updatePriceByName);

// GET /api/product-image/:id
router.get('/:id', productImageController.getImageById);

// PATCH /api/product-image/:id
router.patch('/:id', upload.single('image'), productImageController.updateImage);

// DELETE /api/product-image/:id
router.delete('/:id', productImageController.deleteImage);

module.exports = router;
