// File: routes/hr/salaryRoutes.js
const express = require('express');
const router = express.Router();

// Import the salary controller and auth middleware
const salaryController = require('../../controllers/hr/salaryController');
const auth = require('../../middlewares/authJWT');
const hasPermission = require('../../middlewares/hasPermission');
const { autoApproval, logAutoApproval, verifyApproval } = require('../../middlewares/autoApproval');

// ================= BASIC SALARY ROUTES (STEP 1) =================

// GET /api/hr/salaries/basic - ดึงข้อมูลเงินเดือนพื้นฐานทั้งหมด
router.get('/basic', auth, hasPermission('hr:read'), salaryController.getAllBasicSalaries);

// GET /api/hr/salaries/basic/:userId - ดึงข้อมูลเงินเดือนพื้นฐานของพนักงาน
router.get('/basic/:userId', auth, salaryController.getBasicSalaryByUser);

// POST /api/hr/salaries/basic - สร้างข้อมูลเงินเดือนพื้นฐาน (Step 1)
router.post('/basic', autoApproval, logAutoApproval, verifyApproval, salaryController.createBasicSalary);

// PUT /api/hr/salaries/basic/:id - แก้ไขข้อมูลเงินเดือนพื้นฐาน
router.put('/basic/:id', autoApproval, logAutoApproval, verifyApproval, salaryController.updateBasicSalary);

// ================= MONTHLY SALARY ROUTES (STEP 2) =================

// GET /api/hr/salaries/monthly - ดึงข้อมูลเงินเดือนรายเดือนทั้งหมด
router.get('/monthly', auth, hasPermission('hr:read'), salaryController.getAllMonthlySalaries);

// GET /api/hr/salaries/monthly/:userId/:year/:month - ดึงข้อมูลเงินเดือนรายเดือนของพนักงานในเดือนที่ระบุ
router.get('/monthly/:userId/:year/:month', auth, salaryController.getMonthlySalaryByUserAndPeriod);

// POST /api/hr/salaries/monthly - สร้าง/อัปเดตข้อมูลเงินเดือนรายเดือน (Step 2)
router.post('/monthly', autoApproval, logAutoApproval, verifyApproval, salaryController.createOrUpdateMonthlySalary);

// ================= SALARY HISTORY & REPORTS ROUTES (STEP 3) =================

// GET /api/hr/salaries/history/:userId - ดึงประวัติเงินเดือนของพนักงาน
router.get('/history/:userId', auth, salaryController.getSalaryHistory);

// GET /api/hr/salaries/summary - ดึงข้อมูลสรุปเงินเดือนทั้งหมด
router.get('/summary', auth, hasPermission('hr:read'), salaryController.getSalarySummary);

// ================= UTILITY ROUTES =================

// GET /api/hr/salaries/check-basic/:userId - ตรวจสอบว่าพนักงานมีข้อมูลพื้นฐานหรือไม่
router.get('/check-basic/:userId', auth, salaryController.checkBasicSalary);

// ================= LEGACY ROUTES (สำหรับ backward compatibility) =================

// GET /api/hr/salaries - ดึงข้อมูลเงินเดือนทั้งหมด (legacy)
router.get('/', auth, salaryController.getAllSalaries);

module.exports = router;
