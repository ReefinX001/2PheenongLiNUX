// routes/orderLogRoutes.js
const express = require('express');
const router = express.Router();
const orderLogController = require('../../controllers/orderLogController');

// POST /api/order-log => สร้าง
router.post('/', orderLogController.createLog);

// GET /api/order-log => ดึงทั้งหมด
router.get('/', orderLogController.getAllLogs);

// GET /api/order-log/order/:orderId => ดึงเฉพาะออร์เดอร์
router.get('/order/:orderId', orderLogController.getLogsByOrder);

// GET /api/order-log/:id => ดึงตาม id
router.get('/:id', orderLogController.getLogById);

// PATCH /api/order-log/:id => อัปเดต
router.patch('/:id', orderLogController.updateLog);

// DELETE /api/order-log/:id => ลบ
router.delete('/:id', orderLogController.deleteLog);

module.exports = router;
