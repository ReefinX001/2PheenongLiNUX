// File: routes/employeesRoutes.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const employeeController = require('../../controllers/hr/employeeController');
const auth = require('../../middlewares/authJWT');
const validateEmployee = require('../../middlewares/validateEmployee');
const { autoApproval, logAutoApproval, verifyApproval } = require('../../middlewares/autoApproval');

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
// ใช้ auth สำหรับความปลอดภัย
router.get(
  '/next-code',
  auth,
  employeeController.getNextEmployeeCode
);

// ── Create & List ────────────────────────────────────────
// ใช้ JWT authentication สำหรับความปลอดภัย
router.post(
  '/',
  auth,                               // JWT Authentication
  upload.single('image'),              // Parse multipart/form-data
  validateEmployee.employeeCreate,     // Validate และสร้าง req.validatedBody
  employeeController.createEmployee
);

router.get(
  '/',
  auth,                               // JWT Authentication
  employeeController.getEmployees
);

// ── Special employee routes ─────────────────────────────
// Get employee by user ID - for employee_only.html compatibility
// Removed as method doesn't exist in controller

// Get employee profile for current user - requires JWT auth
// Removed as method doesn't exist in controller

// ── Parameterized routes ─────────────────────────────────
router.get(
  '/:id',
  auth,                               // JWT Authentication
  employeeController.getEmployeeById
);

router.patch(
  '/:id',
  auth,                               // JWT Authentication
  upload.single('image'),              // Parse multipart/form-data
  validateEmployee.employeeUpdate,     // Validate และสร้าง req.validatedBody
  employeeController.updateEmployee
);

router.delete(
  '/:id',
  auth,                               // JWT Authentication
  employeeController.deleteEmployee
);

module.exports = router;
