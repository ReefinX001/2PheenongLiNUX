// routes/orderItemRoutes.js
const express = require('express');
const router = express.Router();
const orderItemController = require('../../controllers/orderItemController');

// POST /api/order-item => สร้าง
router.post('/', orderItemController.createOrderItem);

// GET /api/order-item => ดึงทั้งหมด
router.get('/', orderItemController.getAllOrderItems);

// GET /api/order-item/order/:orderId => เฉพาะออร์เดอร์นั้น
router.get('/order/:orderId', orderItemController.getItemsByOrder);

// GET /api/order-item/:id => ดึงตาม id
router.get('/:id', orderItemController.getOrderItemById);

// PATCH /api/order-item/:id => อัปเดต
router.patch('/:id', orderItemController.updateOrderItem);

// DELETE /api/order-item/:id => ลบ
router.delete('/:id', orderItemController.deleteOrderItem);

module.exports = router;
