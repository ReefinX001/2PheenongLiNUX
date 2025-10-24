/**
 * Validation Middleware - Server-side input validation
 * ระบบตรวจสอบข้อมูลฝั่งเซิร์ฟเวอร์
 */

const { body, param, query, validationResult } = require('express-validator');

// Custom validation error formatter
const formatValidationErrors = (errors) => {
  const formatted = {};
  errors.forEach(error => {
    if (!formatted[error.path]) {
      formatted[error.path] = [];
    }
    formatted[error.path].push({
      msg: error.msg,
      value: error.value,
      location: error.location
    });
  });
  return formatted;
};

// Validation result handler middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'ข้อมูลไม่ถูกต้อง',
      code: 'VALIDATION_ERROR',
      errors: formatValidationErrors(errors.array())
    });
  }
  next();
};

// Deposit Receipt Validation Rules
const depositReceiptValidation = {
  create: [
    // Customer validation
    body('customer.name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('ชื่อลูกค้าต้องมีความยาว 2-100 ตัวอักษร')
      .matches(/^[\u0E00-\u0E7Fa-zA-Z\s\-\.]+$/)
      .withMessage('ชื่อลูกค้าต้องเป็นตัวอักษรไทย อังกฤษ เท่านั้น'),

    body('customer.phone')
      .optional({ nullable: true })
      .matches(/^(\+66|0)[0-9]{8,9}$/)
      .withMessage('หมายเลขโทรศัพท์ไม่ถูกต้อง'),

    body('customer.address')
      .optional({ nullable: true })
      .isLength({ max: 500 })
      .withMessage('ที่อยู่ต้องมีความยาวไม่เกิน 500 ตัวอักษร'),

    // Product validation
    body('product.name')
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('ชื่อสินค้าต้องมีความยาว 1-200 ตัวอักษร'),

    body('product.price')
      .isFloat({ min: 0.01, max: 10000000 })
      .withMessage('ราคาสินค้าต้องมีค่าระหว่าง 0.01 - 10,000,000 บาท'),

    // Payment validation - support both 'payment' and 'amounts' structures
    body('payment.depositAmount')
      .optional()
      .isFloat({ min: 1, max: 10000000 })
      .withMessage('จำนวนเงินมัดจำต้องมีค่าระหว่าง 1 - 10,000,000 บาท'),

    body('payment.totalAmount')
      .optional()
      .isFloat({ min: 1, max: 10000000 })
      .withMessage('จำนวนเงินรวมต้องมีค่าระหว่าง 1 - 10,000,000 บาท'),

    body('amounts.depositAmount')
      .optional()
      .isFloat({ min: 1, max: 10000000 })
      .withMessage('จำนวนเงินมัดจำต้องมีค่าระหว่าง 1 - 10,000,000 บาท'),

    body('amounts.totalAmount')
      .optional()
      .isFloat({ min: 1, max: 10000000 })
      .withMessage('จำนวนเงินรวมต้องมีค่าระหว่าง 1 - 10,000,000 บาท'),

    // Branch and staff validation
    body('branchCode')
      .trim()
      .isLength({ min: 2, max: 20 })
      .matches(/^[a-zA-Z0-9\-_]+$/)
      .withMessage('รหัสสาขาไม่ถูกต้อง'),

    body('staffId')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('รหัสพนักงานไม่ถูกต้อง'),

    body('salespersonId')
      .optional({ nullable: true })
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('รหัสพนักงานขายไม่ถูกต้อง'),

    // Type validations
    body('depositType')
      .isIn(['preorder', 'online'])
      .withMessage('ประเภทการมัดจำไม่ถูกต้อง'),

    body('saleType')
      .isIn(['cash', 'installment'])
      .withMessage('ประเภทการขายไม่ถูกต้อง'),

    body('paymentMethod')
      .isIn(['cash', 'transfer', 'card', 'qr'])
      .withMessage('วิธีการชำระเงินไม่ถูกต้อง'),

    body('documentChoice')
      .isIn(['receipt', 'tax_invoice', 'both'])
      .withMessage('เลือกประเภทเอกสารไม่ถูกต้อง'),

    // Date validation
    body('depositDate')
      .isISO8601()
      .toDate()
      .withMessage('วันที่มัดจำไม่ถูกต้อง'),

    body('depositTime')
      .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('เวลาไม่ถูกต้อง'),

    // Custom validation for deposit vs total amount - support both structures
    body().custom((value, { req }) => {
      const body = req.body;
      let depositAmount, totalAmount;

      // Check which structure is being used
      if (body.payment && (body.payment.hasOwnProperty('depositAmount') || body.payment.hasOwnProperty('totalAmount'))) {
        depositAmount = parseFloat(body.payment.depositAmount);
        totalAmount = parseFloat(body.payment.totalAmount);
      } else if (body.amounts && (body.amounts.hasOwnProperty('depositAmount') || body.amounts.hasOwnProperty('totalAmount'))) {
        depositAmount = parseFloat(body.amounts.depositAmount);
        totalAmount = parseFloat(body.amounts.totalAmount);
      } else {
        throw new Error('จำเป็นต้องระบุจำนวนเงินมัดจำและจำนวนเงินรวม');
      }

      // Check if values are valid numbers and depositAmount is less than totalAmount
      if (!isNaN(depositAmount) && !isNaN(totalAmount) && depositAmount >= totalAmount) {
        throw new Error('จำนวนเงินมัดจำต้องน้อยกว่าจำนวนเงินรวม');
      }

      return true;
    }),

    handleValidationErrors
  ],

  update: [
    param('id')
      .custom((value) => {
        // Accept both numeric and MongoDB ObjectId formats
        if (/^\d+$/.test(value) || /^[0-9a-fA-F]{24}$/.test(value)) {
          return true;
        }
        throw new Error('ID ใบรับเงินมัดจำไม่ถูกต้อง');
      }),

    // Allow partial updates - same validations as create but optional
    body('customer.name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('ชื่อลูกค้าต้องมีความยาว 2-100 ตัวอักษร'),

    body('customer.phone')
      .optional({ nullable: true })
      .matches(/^(\+66|0)[0-9]{8,9}$/)
      .withMessage('หมายเลขโทรศัพท์ไม่ถูกต้อง'),

    body('product.price')
      .optional()
      .isFloat({ min: 0.01, max: 10000000 })
      .withMessage('ราคาสินค้าต้องมีค่าระหว่าง 0.01 - 10,000,000 บาท'),

    body('payment.depositAmount')
      .optional()
      .isFloat({ min: 1, max: 10000000 })
      .withMessage('จำนวนเงินมัดจำต้องมีค่าระหว่าง 1 - 10,000,000 บาท'),

    handleValidationErrors
  ],

  get: [
    param('id')
      .custom((value) => {
        // Accept both numeric and MongoDB ObjectId formats
        if (/^\d+$/.test(value) || /^[0-9a-fA-F]{24}$/.test(value)) {
          return true;
        }
        throw new Error('ID ใบรับเงินมัดจำไม่ถูกต้อง');
      }),

    handleValidationErrors
  ],

  list: [
    query('branchCode')
      .optional()
      .trim()
      .isLength({ min: 2, max: 20 })
      .matches(/^[a-zA-Z0-9\-_]+$/)
      .withMessage('รหัสสาขาไม่ถูกต้อง'),

    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit ต้องเป็นตัวเลข 1-100'),

    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset ต้องเป็นตัวเลข 0 ขึ้นไป'),

    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('วันที่เริ่มต้นไม่ถูกต้อง'),

    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('วันที่สิ้นสุดไม่ถูกต้อง'),

    handleValidationErrors
  ]
};

// Branch validation
const branchValidation = {
  list: [
    query('active')
      .optional()
      .isBoolean()
      .withMessage('สถานะสาขาต้องเป็น boolean'),

    handleValidationErrors
  ]
};

// User validation
const userValidation = {
  list: [
    query('branch')
      .optional()
      .trim()
      .isLength({ min: 2, max: 20 })
      .matches(/^[a-zA-Z0-9\-_]+$/)
      .withMessage('รหัสสาขาไม่ถูกต้อง'),

    query('role')
      .optional()
      .isIn(['admin', 'manager', 'cashier', 'salesperson'])
      .withMessage('บทบาทไม่ถูกต้อง'),

    handleValidationErrors
  ]
};

// Stock validation
const stockValidation = {
  list: [
    query('branch_code')
      .trim()
      .isLength({ min: 2, max: 20 })
      .matches(/^[a-zA-Z0-9\-_]+$/)
      .withMessage('รหัสสาขาไม่ถูกต้อง'),

    query('include_unverified')
      .optional()
      .isIn(['0', '1', 'true', 'false'])
      .withMessage('include_unverified ต้องเป็น 0, 1, true, หรือ false'),

    query('search')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('คำค้นหาต้องมีความยาว 1-100 ตัวอักษร'),

    handleValidationErrors
  ]
};

// General sanitization middleware
const sanitizeInput = (req, res, next) => {
  // Remove potentially dangerous characters
  const sanitizeValue = (value) => {
    if (typeof value === 'string') {
      return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+\s*=\s*"[^"]*"/gi, '') // Remove event handlers
        .trim();
    }
    return value;
  };

  const sanitizeObject = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      } else {
        obj[key] = sanitizeValue(obj[key]);
      }
    }
  };

  // Sanitize request body, params, and query
  if (req.body) sanitizeObject(req.body);
  if (req.params) sanitizeObject(req.params);
  if (req.query) sanitizeObject(req.query);

  next();
};

module.exports = {
  depositReceiptValidation,
  branchValidation,
  userValidation,
  stockValidation,
  sanitizeInput,
  handleValidationErrors
};