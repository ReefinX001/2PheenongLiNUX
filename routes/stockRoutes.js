const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');
const stockIMEIController = require('../controllers/stockIMEIController');

// ✅ POST /api/stock => เพิ่มสินค้าเข้าสต๊อก (+ quantity ถ้ามีอยู่แล้ว)
router.post('/', stockController.createStock);

// ✅ POST /api/stock/check-after-sale => ตรวจสอบและหักสต๊อกหลังการขาย (ใช้ IMEI-based controller แทน)
router.post('/check-after-sale', stockIMEIController.checkAndUpdateIMEIStock);

// ✅ GET /api/stock => ดึง Stock ทั้งหมด หรือเฉพาะ branch_id
router.get('/', stockController.getAllStocks);

// ✅ GET /api/stock/:id => ดึง Stock ตาม _id
router.get('/:id', stockController.getStockById);

// ✅ PATCH /api/stock/:id => อัปเดต Stock
router.patch('/:id', stockController.updateStock);

// ✅ DELETE /api/stock/:id => ลบ Stock จริง
router.delete('/:id', stockController.deleteStock);

module.exports = router;
