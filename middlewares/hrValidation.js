// middlewares/hrValidation.js
const { body, param, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Employee = require('../models/HR/Employee');
const Zone = require('../models/HR/zoneModel');
const rateLimit = require('express-rate-limit');

// Rate limiter specifically for HR operations
const hrRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // limit each IP to 30 HR requests per windowMs
  message: {
    error: 'Too many HR requests from this IP, please try again later.',
    retryAfter: 900 // 15 minutes in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Custom validation for MongoDB ObjectId
const isValidObjectId = (value) => {
  return mongoose.Types.ObjectId.isValid(value);
};

// Custom validation for Thai time format (HH:MM)
const isValidThaiTime = (value) => {
  return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value);
};

// Custom validation for Thai date format
const isValidThaiDate = (value) => {
  const date = new Date(value);
  return date instanceof Date && !isNaN(date) && date >= new Date('1900-01-01');
};

// Validation rules for attendance operations
const attendanceValidation = {
  checkin: [
    body('branch')
      .notEmpty()
      .withMessage('กรุณาระบุสาขา')
      .custom(isValidObjectId)
      .withMessage('รหัสสาขาไม่ถูกต้อง'),
    body('checkInType')
      .optional()
      .isIn(['normal', 'outside_area', 'other_branch'])
      .withMessage('ประเภทการเช็กอินไม่ถูกต้อง'),
    body('isOT')
      .optional()
      .isBoolean()
      .withMessage('สถานะ OT ต้องเป็น true หรือ false'),
    body('location.latitude')
      .optional()
      .isFloat({ min: -90, max: 90 })
      .withMessage('ละติจูดต้องอยู่ระหว่าง -90 ถึง 90'),
    body('location.longitude')
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage('ลองจิจูดต้องอยู่ระหว่าง -180 ถึง 180'),
    body('note')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 500 })
      .withMessage('หมายเหตุต้องไม่เกิน 500 ตัวอักษร')
  ],

  checkout: [
    body('branch')
      .optional()
      .custom(isValidObjectId)
      .withMessage('รหัสสาขาไม่ถูกต้อง'),
    body('location.latitude')
      .optional()
      .isFloat({ min: -90, max: 90 })
      .withMessage('ละติจูดต้องอยู่ระหว่าง -90 ถึง 90'),
    body('location.longitude')
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage('ลองจิจูดต้องอยู่ระหว่าง -180 ถึง 180')
  ]
};

// Validation rules for work schedule operations
const workScheduleValidation = {
  create: [
    body('name')
      .notEmpty()
      .withMessage('ชื่อตารางเวลาไม่สามารถว่างได้')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('ชื่อตารางเวลาต้องมีความยาว 2-100 ตัวอักษร'),
    body('branchId')
      .notEmpty()
      .withMessage('กรุณาระบุสาขา')
      .custom(isValidObjectId)
      .withMessage('รหัสสาขาไม่ถูกต้อง'),
    body('scheduleType')
      .isIn(['regular', 'shift', 'flexible', 'remote'])
      .withMessage('ประเภทตารางเวลาไม่ถูกต้อง'),
    body('workDays')
      .isArray({ min: 1 })
      .withMessage('กรุณาระบุวันทำงานอย่างน้อย 1 วัน'),
    body('workDays.*.day')
      .isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
      .withMessage('วันทำงานไม่ถูกต้อง'),
    body('workDays.*.startTime')
      .custom(isValidThaiTime)
      .withMessage('เวลาเริ่มงานไม่ถูกต้อง (ใช้รูปแบบ HH:MM)'),
    body('workDays.*.endTime')
      .custom(isValidThaiTime)
      .withMessage('เวลาเลิกงานไม่ถูกต้อง (ใช้รูปแบบ HH:MM)'),
    body('startDate')
      .custom(isValidThaiDate)
      .withMessage('วันที่เริ่มต้นไม่ถูกต้อง'),
    body('endDate')
      .optional()
      .custom((value) => !value || isValidThaiDate(value))
      .withMessage('วันที่สิ้นสุดไม่ถูกต้อง'),
    body('maxOvertimeHours')
      .optional()
      .isFloat({ min: 0, max: 12 })
      .withMessage('ชั่วโมง OT สูงสุดต้องอยู่ระหว่าง 0-12'),
    body('employeeId')
      .optional()
      .custom(isValidObjectId)
      .withMessage('รหัสพนักงานไม่ถูกต้อง')
  ],

  update: [
    param('id')
      .custom(isValidObjectId)
      .withMessage('รหัสตารางเวลาไม่ถูกต้อง'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('ชื่อตารางเวลาต้องมีความยาว 2-100 ตัวอักษร'),
    body('workDays.*.startTime')
      .optional()
      .custom(isValidThaiTime)
      .withMessage('เวลาเริ่มงานไม่ถูกต้อง'),
    body('workDays.*.endTime')
      .optional()
      .custom(isValidThaiTime)
      .withMessage('เวลาเลิกงานไม่ถูกต้อง')
  ]
};

// Validation rules for overtime operations
const overtimeValidation = {
  create: [
    body('date')
      .custom(isValidThaiDate)
      .withMessage('วันที่ไม่ถูกต้อง')
      .custom((value) => {
        const date = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date >= today;
      })
      .withMessage('วันที่ต้องไม่เป็นอดีต'),
    body('startTime')
      .custom(isValidThaiTime)
      .withMessage('เวลาเริ่มต้นไม่ถูกต้อง (ใช้รูปแบบ HH:MM)'),
    body('endTime')
      .custom(isValidThaiTime)
      .withMessage('เวลาสิ้นสุดไม่ถูกต้อง (ใช้รูปแบบ HH:MM)')
      .custom((value, { req }) => {
        if (req.body.startTime) {
          const start = new Date(`2000-01-01 ${req.body.startTime}`);
          const end = new Date(`2000-01-01 ${value}`);
          return end > start;
        }
        return true;
      })
      .withMessage('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น'),
    body('reason')
      .notEmpty()
      .withMessage('เหตุผลไม่สามารถว่างได้')
      .trim()
      .isLength({ min: 10, max: 500 })
      .withMessage('เหตุผลต้องมีความยาว 10-500 ตัวอักษร'),
    body('branch')
      .notEmpty()
      .withMessage('กรุณาระบุสาขา')
      .custom(isValidObjectId)
      .withMessage('รหัสสาขาไม่ถูกต้อง'),
    body('plannedHours')
      .optional()
      .isFloat({ min: 0.5, max: 12 })
      .withMessage('ชั่วโมงที่วางแผนต้องอยู่ระหว่าง 0.5-12'),
    body('overtimeType')
      .optional()
      .isIn(['regular', 'holiday', 'weekend', 'emergency'])
      .withMessage('ประเภท OT ไม่ถูกต้อง'),
    body('priority')
      .optional()
      .isIn(['low', 'normal', 'high', 'urgent'])
      .withMessage('ระดับความสำคัญไม่ถูกต้อง'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('รายละเอียดต้องไม่เกิน 1000 ตัวอักษร'),
    body('workDetails')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('รายละเอียดงานต้องไม่เกิน 1000 ตัวอักษร')
  ],

  approve: [
    param('id')
      .custom(isValidObjectId)
      .withMessage('รหัสคำขอ OT ไม่ถูกต้อง'),
    body('approvalNote')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('หมายเหตุการอนุมัติต้องไม่เกิน 500 ตัวอักษร')
  ]
};

// Validation rules for employee operations
const employeeValidation = {
  create: [
    body('name')
      .notEmpty()
      .withMessage('ชื่อพนักงานไม่สามารถว่างได้')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('ชื่อพนักงานต้องมีความยาว 2-100 ตัวอักษร'),
    body('email')
      .isEmail()
      .withMessage('รูปแบบอีเมลไม่ถูกต้อง')
      .normalizeEmail(),
    body('citizenId')
      .matches(/^\d{13}$/)
      .withMessage('รหัสบัตรประชาชนต้องเป็นตัวเลข 13 หลัก'),
    body('phone')
      .matches(/^[0-9]{9,10}$/)
      .withMessage('หมายเลขโทรศัพท์ไม่ถูกต้อง'),
    body('primaryBranch')
      .notEmpty()
      .withMessage('กรุณาระบุสาขาหลัก')
      .custom(isValidObjectId)
      .withMessage('รหัสสาขาหลักไม่ถูกต้อง'),
    body('position')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('ตำแหน่งต้องไม่เกิน 100 ตัวอักษร'),
    body('department')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('แผนกต้องไม่เกิน 100 ตัวอักษร'),
    body('salary')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('เงินเดือนต้องเป็นจำนวนเงินที่ถูกต้อง'),
    body('birthDate')
      .optional()
      .custom(isValidThaiDate)
      .withMessage('วันเกิดไม่ถูกต้อง'),
    body('startDate')
      .optional()
      .custom(isValidThaiDate)
      .withMessage('วันเริ่มงานไม่ถูกต้อง')
  ]
};

// Validation rules for zone/branch operations
const zoneValidation = {
  create: [
    body('name')
      .notEmpty()
      .withMessage('ชื่อสาขาไม่สามารถว่างได้')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('ชื่อสาขาต้องมีความยาว 2-100 ตัวอักษร'),
    body('branch_code')
      .notEmpty()
      .withMessage('รหัสสาขาไม่สามารถว่างได้')
      .trim()
      .matches(/^[A-Z0-9]{2,10}$/)
      .withMessage('รหัสสาขาต้องเป็นตัวอักษรภาษาอังกฤษหรือตัวเลข 2-10 ตัว'),
    body('center.latitude')
      .isFloat({ min: -90, max: 90 })
      .withMessage('ละติจูดต้องอยู่ระหว่าง -90 ถึง 90'),
    body('center.longitude')
      .isFloat({ min: -180, max: 180 })
      .withMessage('ลองจิจูดต้องอยู่ระหว่าง -180 ถึง 180'),
    body('radius')
      .isFloat({ min: 1, max: 5000 })
      .withMessage('รัศมีต้องอยู่ระหว่าง 1-5000 เมตร'),
    body('address')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('ที่อยู่ต้องไม่เกิน 500 ตัวอักษร')
  ]
};

// Error handling middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'ข้อมูลไม่ถูกต้อง',
      errors: errors.array().map(err => ({
        field: err.param || err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

// Sanitization middleware for HR data
const sanitizeHRData = (req, res, next) => {
  // Sanitize string fields
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    return str.trim()
      .replace(/[<>]/g, '') // Remove basic HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, ''); // Remove event handlers
  };

  // Recursively sanitize object
  const sanitizeObject = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;

    const sanitized = Array.isArray(obj) ? [] : {};

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];

        if (typeof value === 'string') {
          sanitized[key] = sanitizeString(value);
        } else if (typeof value === 'object' && value !== null) {
          sanitized[key] = sanitizeObject(value);
        } else {
          sanitized[key] = value;
        }
      }
    }

    return sanitized;
  };

  // Sanitize request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
};

// Permission validation middleware
const requireHRPermission = (permission) => {
  return (req, res, next) => {
    const userRole = req.user.role;
    const userPermissions = req.user.permissions || [];

    const hasPermission =
      ['admin', 'superadmin', 'Super Admin', 'HR', 'hr'].includes(userRole) ||
      userPermissions.includes(permission) ||
      userPermissions.includes('hr:all');

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'คุณไม่มีสิทธิ์ในการดำเนินการนี้',
        required: permission
      });
    }

    next();
  };
};

// Check if user can access specific branch
const validateBranchAccess = async (req, res, next) => {
  try {
    const { branchId } = req.query;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Admins and HR can access all branches
    if (['admin', 'superadmin', 'Super Admin', 'HR', 'hr'].includes(userRole)) {
      return next();
    }

    // If no specific branch requested, allow
    if (!branchId) {
      return next();
    }

    // Check if user has access to this branch
    const employee = await Employee.findOne({ userId: userId, deleted_at: null })
      .populate('accessibleBranches checkinBranches hrZones');

    if (!employee) {
      return res.status(403).json({
        success: false,
        message: 'ไม่พบข้อมูลการเข้าถึงสาขา'
      });
    }

    const hasAccess =
      employee.primaryBranch && employee.primaryBranch.toString() === branchId ||
      employee.accessibleBranches.some(branch => branch._id.toString() === branchId) ||
      employee.checkinBranches.some(branch => branch._id.toString() === branchId) ||
      employee.hrZones.some(zone => zone._id.toString() === branchId);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'คุณไม่มีสิทธิ์เข้าถึงสาขานี้'
      });
    }

    next();
  } catch (error) {
    console.error('Error validating branch access:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์การเข้าถึงสาขา'
    });
  }
};

module.exports = {
  hrRateLimit,
  attendanceValidation,
  workScheduleValidation,
  overtimeValidation,
  employeeValidation,
  zoneValidation,
  handleValidationErrors,
  sanitizeHRData,
  requireHRPermission,
  validateBranchAccess,
  isValidObjectId,
  isValidThaiTime,
  isValidThaiDate
};