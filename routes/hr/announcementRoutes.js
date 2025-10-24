// routes/hr/announcementRoutes.js
const express = require('express');
const router = express.Router();

// Mock announcement controller
const announcementController = {
  getAllAnnouncements: async (req, res) => {
    try {
      const { branchId } = req.query;

      // Mock announcement data
      const mockAnnouncements = [
        {
          _id: '64f8b2c1234567890abcdef1',
          title: 'ประกาศจ่ายโบนัสประจำปี',
          content: 'บริษัทมีความยินดีแจ้งให้ทราบว่าจะมีการจ่ายโบนัสประจำปี 2024 ในวันที่ 31 ธันวาคม 2024',
          message: 'บริษัทมีความยินดีแจ้งให้ทราบว่าจะมีการจ่ายโบนัสประจำปี 2024',
          type: 'general',
          priority: 'high',
          targetBranch: branchId || 'all',
          isActive: true,
          date: new Date('2024-11-20'),
          createdAt: new Date('2024-11-20'),
          updatedAt: new Date('2024-11-20')
        },
        {
          _id: '64f8b2c1234567890abcdef2',
          title: 'เปลี่ยนแปลงเวลาทำงาน',
          content: 'เริ่มวันที่ 1 ธันวาคม 2024 เวลาทำงานจะเปลี่ยนเป็น 8:30-17:30 น.',
          message: 'แจ้งเปลี่ยนแปลงเวลาทำงานใหม่',
          type: 'policy',
          priority: 'medium',
          targetBranch: branchId || 'all',
          isActive: true,
          date: new Date('2024-11-15'),
          createdAt: new Date('2024-11-15'),
          updatedAt: new Date('2024-11-15')
        },
        {
          _id: '64f8b2c1234567890abcdef3',
          title: 'วันหยุดพิเศษ',
          content: 'วันที่ 29 พฤศจิกายน 2024 เป็นวันหยุดพิเศษเนื่องในโอกาสวันสำคัญ',
          message: 'ประกาศวันหยุดพิเศษ',
          type: 'holiday',
          priority: 'medium',
          targetBranch: branchId || 'all',
          isActive: true,
          date: new Date('2024-11-10'),
          createdAt: new Date('2024-11-10'),
          updatedAt: new Date('2024-11-10')
        }
      ];

      res.json({
        success: true,
        data: mockAnnouncements,
        message: 'Announcements retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching announcements:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
};

// Routes
router.get('/', announcementController.getAllAnnouncements);

module.exports = router;