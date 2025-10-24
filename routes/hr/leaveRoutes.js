// routes/hr/leaveRoutes.js
const express = require('express');
const router = express.Router();
const { autoApproval, logAutoApproval, verifyApproval } = require('../../middlewares/autoApproval');

// Mock leave controller
const leaveController = {
  getAllLeaves: async (req, res) => {
    try {
      const { userId, employeeId } = req.query;

      // Mock leave data
      const mockLeaves = [
        {
          _id: '64f8b2c1234567890abcdef1',
          userId: userId || '64f8b2c1234567890abcdef0',
          employeeId: employeeId || 'EMP001',
          type: 'sick',
          startDate: new Date('2024-11-20'),
          endDate: new Date('2024-11-21'),
          days: 2,
          reason: 'ป่วยไข้หวัด',
          status: 'approved',
          approvedBy: 'ผู้จัดการฝ่าย HR',
          appliedDate: new Date('2024-11-18'),
          createdAt: new Date('2024-11-18'),
          updatedAt: new Date('2024-11-19')
        },
        {
          _id: '64f8b2c1234567890abcdef2',
          userId: userId || '64f8b2c1234567890abcdef0',
          employeeId: employeeId || 'EMP001',
          type: 'personal',
          startDate: new Date('2024-10-15'),
          endDate: new Date('2024-10-15'),
          days: 1,
          reason: 'ธุระส่วนตัว',
          status: 'approved',
          approvedBy: 'ผู้จัดการฝ่าย HR',
          appliedDate: new Date('2024-10-10'),
          createdAt: new Date('2024-10-10'),
          updatedAt: new Date('2024-10-12')
        },
        {
          _id: '64f8b2c1234567890abcdef3',
          userId: userId || '64f8b2c1234567890abcdef0',
          employeeId: employeeId || 'EMP001',
          type: 'vacation',
          startDate: new Date('2024-12-23'),
          endDate: new Date('2024-12-27'),
          days: 5,
          reason: 'พักร้อนช่วงปีใหม่',
          status: 'pending',
          approvedBy: null,
          appliedDate: new Date('2024-11-25'),
          createdAt: new Date('2024-11-25'),
          updatedAt: new Date('2024-11-25')
        }
      ];

      res.json({
        success: true,
        data: mockLeaves,
        message: 'Leave data retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching leave data:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
};

// Routes
router.get('/',
  autoApproval,                        // ระบบอนุมัติอัตโนมัติ
  logAutoApproval,                     // บันทึก log การอนุมัติ
  verifyApproval,                      // ตรวจสอบการอนุมัติ
  leaveController.getAllLeaves
);

module.exports = router;