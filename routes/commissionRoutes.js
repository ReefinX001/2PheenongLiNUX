const express = require('express');
const router = express.Router();
const commissionController = require('../controllers/hr/commissionController');
const commissionSettingsController = require('../controllers/hr/commissionSettingsController');
const authenticateToken = require('../middlewares/authMiddleware');

// ============ Commission Routes ============

// GET /api/commission - ดึงข้อมูลค่าคอมมิชชั่นทั้งหมด
router.get('/', authenticateToken, commissionController.getAllCommissions);

// GET /api/commission/realtime - ดึงข้อมูลค่าคอมมิชชั่นแบบ real-time
router.get('/realtime', authenticateToken, commissionController.getRealtimeCommissions);

// GET /api/commission/history - ดึงประวัติค่าคอมมิชชั่น
router.get('/history', authenticateToken, commissionController.getCommissionHistory);

// GET /api/commission/summary - ดึงสรุปค่าคอมมิชชั่น
router.get('/summary', authenticateToken, commissionController.getCommissionSummary);

// GET /api/commission/employee/:employeeId - ดึงค่าคอมมิชชั่นของพนักงานคนเดียว
router.get('/employee/:employeeId', authenticateToken, commissionController.getEmployeeCommissions);

// GET /api/commission/:id - ดึงค่าคอมมิชชั่นตาม ID
router.get('/:id', authenticateToken, commissionController.getCommissionById);

// POST /api/commission - สร้างหรืออัพเดทค่าคอมมิชชั่น
router.post('/', authenticateToken, commissionController.upsertCommission);

// POST /api/commission/add-sale - เพิ่มรายการขายใหม่
router.post('/add-sale', authenticateToken, commissionController.addSaleToCommission);

// PUT /api/commission/:id/approve - อนุมัติค่าคอมมิชชั่น
router.put('/:id/approve', authenticateToken, commissionController.approveCommission);

// PUT /api/commission/:id/pay - จ่ายค่าคอมมิชชั่น
router.put('/:id/pay', authenticateToken, commissionController.payCommission);

// ============ Commission Settings Routes ============

// GET /api/commission/settings/all - ดึงการตั้งค่าทั้งหมด
router.get('/settings/all', authenticateToken, commissionSettingsController.getAllSettings);

// GET /api/commission/settings/active - ดึงการตั้งค่าที่ใช้งานอยู่
router.get('/settings/active', authenticateToken, commissionSettingsController.getActiveSettings);

// GET /api/commission/settings/employee/:employeeId - ดึงการตั้งค่าสำหรับพนักงาน
router.get('/settings/employee/:employeeId', authenticateToken, commissionSettingsController.getEmployeeSettings);

// GET /api/commission/settings/:id - ดึงการตั้งค่าตาม ID
router.get('/settings/:id', authenticateToken, commissionSettingsController.getSettingById);

// POST /api/commission/settings - สร้างการตั้งค่าใหม่
router.post('/settings', authenticateToken, commissionSettingsController.createSetting);

// POST /api/commission/settings/calculate - คำนวณค่าคอมมิชชั่นตามการตั้งค่า
router.post('/settings/calculate', authenticateToken, commissionSettingsController.calculateCommission);

// POST /api/commission/settings/test - ทดสอบการตั้งค่า
router.post('/settings/test', authenticateToken, commissionSettingsController.testSetting);

// PUT /api/commission/settings/:id - อัพเดทการตั้งค่า
router.put('/settings/:id', authenticateToken, commissionSettingsController.updateSetting);

// DELETE /api/commission/settings/:id - ลบการตั้งค่า
router.delete('/settings/:id', authenticateToken, commissionSettingsController.deleteSetting);

module.exports = router;