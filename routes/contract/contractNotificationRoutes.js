// routes/contractNotificationRoutes.js
const express = require('express');
const router = express.Router();
const contractNotificationController = require('../../controllers/contractNotificationController');

// POST /api/contract-notification => สร้าง
router.post('/', contractNotificationController.createNotification);

// GET /api/contract-notification => ดึงทั้งหมด
router.get('/', contractNotificationController.getAllNotifications);

// GET /api/contract-notification/contract/:contractId => ดึงเฉพาะสัญญา
router.get('/contract/:contractId', contractNotificationController.getNotificationsByContract);

// GET /api/contract-notification/:id => ดึงตาม id
router.get('/:id', contractNotificationController.getNotificationById);

// PATCH /api/contract-notification/:id => อัปเดต
router.patch('/:id', contractNotificationController.updateNotification);

// DELETE /api/contract-notification/:id => ลบ
router.delete('/:id', contractNotificationController.deleteNotification);

module.exports = router;
