// routes/contractOverdueNotificationRoutes.js
const express = require('express');
const router = express.Router();
const contractOverdueNotificationController = require('../controllers/contractOverdueNotificationController');

// POST /api/contract-overdue-notification => สร้าง
router.post('/', contractOverdueNotificationController.createOverdueNotification);

// GET /api/contract-overdue-notification => ดึงทั้งหมด
router.get('/', contractOverdueNotificationController.getAllOverdueNotifications);

// GET /api/contract-overdue-notification/contract/:contractId => ดึงเฉพาะสัญญา
router.get('/contract/:contractId', contractOverdueNotificationController.getOverdueNotificationsByContract);

// GET /api/contract-overdue-notification/:id => ดึงตาม id
router.get('/:id', contractOverdueNotificationController.getOverdueNotificationById);

// PATCH /api/contract-overdue-notification/:id => อัปเดต
router.patch('/:id', contractOverdueNotificationController.updateOverdueNotification);

// DELETE /api/contract-overdue-notification/:id => ลบ
router.delete('/:id', contractOverdueNotificationController.deleteOverdueNotification);

module.exports = router;
