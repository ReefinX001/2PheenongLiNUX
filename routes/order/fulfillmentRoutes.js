// routes/fulfillmentRoutes.js
const express = require('express');
const router = express.Router();
const fulfillmentController = require('../../controllers/fulfillmentController');

// POST /api/fulfillment => สร้าง
router.post('/', fulfillmentController.createFulfillment);

// GET /api/fulfillment => ดึงทั้งหมด
router.get('/', fulfillmentController.getAllFulfillments);

// GET /api/fulfillment/order/:orderId => ดึงเฉพาะออร์เดอร์
router.get('/order/:orderId', fulfillmentController.getFulfillmentsByOrder);

// GET /api/fulfillment/:id => ดึงตาม id
router.get('/:id', fulfillmentController.getFulfillmentById);

// PATCH /api/fulfillment/:id => อัปเดต
router.patch('/:id', fulfillmentController.updateFulfillment);

// DELETE /api/fulfillment/:id => ลบ
router.delete('/:id', fulfillmentController.deleteFulfillment);

module.exports = router;
