const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// POST /api/order => สร้างคำสั่งซื้อใหม่
router.post('/', orderController.createOrder);

// GET /api/order => ดึงรายการ Order ทั้งหมดที่ยังไม่ถูกลบ
router.get('/', orderController.getAllOrders);

// GET /api/order/:id => ดึงข้อมูล Order ตาม _id (ที่ยังไม่ถูกลบ)
router.get('/:id', orderController.getOrderById);

// PATCH /api/order/:id => อัปเดตข้อมูลบางส่วนของ Order
router.patch('/:id', orderController.updateOrder);

// DELETE /api/order/:id => Soft Delete (set deleted_at ให้เป็นปัจจุบัน)
router.delete('/:id', orderController.deleteOrder);

// (Optional) DELETE /api/order/:id/force => ลบจริงจาก DB
router.delete('/:id/force', orderController.forceDeleteOrder);

module.exports = router;
