// File: routes/employeesRoutes.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const employeeController = require('../controllers/employeeController');
const auth = require('../middlewares/authJWT');
const validateEmployee = require('../middlewares/validateEmployee');
const { autoApproval, logAutoApproval, verifyApproval } = require('../middlewares/autoApproval');

// ── กำหนด multer สำหรับ upload รูปภาพ ──
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/employees/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'emp-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// ── API สำหรับดึงรหัสถัดไป ────────────────────────────────
// ไม่ต้อง auth สำหรับการดึงรหัสพนักงานถัดไป (อนุมัติอัตโนมัติ)
router.get(
  '/next-code',
  employeeController.getNextEmployeeCode
);

// ── API สำหรับดึงโปรไฟล์พนักงาน ────────────────────────────────
router.get(
  '/profile',
  auth,  // เปิด auth กลับมาใช้งาน
  employeeController.getProfile
);

// ── API สำหรับดึงข้อมูลพนักงานจาก userId ────────────────────────────────
router.get(
  '/user/:userId',
  auth,  // เปิด auth กลับมาใช้งาน
  employeeController.getEmployeeByUserId
);

// ── Create & List ────────────────────────────────────────
// ใช้ระบบอนุมัติอัตโนมัติแทน auth ธรรมดา
router.post(
  '/',
  autoApproval,                        // ระบบอนุมัติอัตโนมัติ
  logAutoApproval,                     // บันทึก log การอนุมัติ
  verifyApproval,                      // ตรวจสอบการอนุมัติ
  upload.single('image'),              // Parse multipart/form-data
  validateEmployee.employeeCreate,     // Validate และสร้าง req.validatedBody
  employeeController.createEmployee
);

router.get(
  '/',
  autoApproval,                        // ระบบอนุมัติอัตโนมัติ
  logAutoApproval,                     // บันทึก log การอนุมัติ
  verifyApproval,                      // ตรวจสอบการอนุมัติ
  employeeController.getEmployees
);

// ── Parameterized routes ─────────────────────────────────
router.get(
  '/:id',
  autoApproval,                        // ระบบอนุมัติอัตโนมัติ
  logAutoApproval,                     // บันทึก log การอนุมัติ
  verifyApproval,                      // ตรวจสอบการอนุมัติ
  employeeController.getEmployeeById
);

router.patch(
  '/:id',
  autoApproval,                        // ระบบอนุมัติอัตโนมัติ
  logAutoApproval,                     // บันทึก log การอนุมัติ
  verifyApproval,                      // ตรวจสอบการอนุมัติ
  upload.single('image'),              // Parse multipart/form-data
  validateEmployee.employeeUpdate,     // Validate และสร้าง req.validatedBody
  employeeController.updateEmployee
);

router.delete(
  '/:id',
  autoApproval,                        // ระบบอนุมัติอัตโนมัติ
  logAutoApproval,                     // บันทึก log การอนุมัติ
  verifyApproval,                      // ตรวจสอบการอนุมัติ
  employeeController.deleteEmployee
);

module.exports = router;
