const express = require('express');
const router = express.Router();
const AnnouncementController = require('../../controllers/announcementController');
const authenticateToken = require('../../middlewares/authJWT');

// Public routes (ไม่ต้อง auth สำหรับการอ่าน)
router.get('/', AnnouncementController.getAllAnnouncements);
router.get('/latest', AnnouncementController.getLatestAnnouncements);
router.get('/statistics', AnnouncementController.getStatistics);
router.get('/:id', AnnouncementController.getAnnouncementById);

// Protected routes (ต้อง auth สำหรับการเขียน/แก้ไข)
router.post('/', authenticateToken, AnnouncementController.createAnnouncement);
router.patch('/:id', authenticateToken, AnnouncementController.updateAnnouncement);
router.put('/:id', authenticateToken, AnnouncementController.updateAnnouncement);
router.delete('/:id', authenticateToken, AnnouncementController.deleteAnnouncement);
router.post('/:id/read', authenticateToken, AnnouncementController.markAsRead);

module.exports = router;
