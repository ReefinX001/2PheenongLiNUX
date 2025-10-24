/**
 * Enhanced Input Validation Middleware for Thai Accounting Stock Management
 *
 * This module provides comprehensive validation functionality for stock management operations
 * in the Thai Accounting System. It includes data type validation, range checking, pattern
 * matching, sanitization, and business logic validation with Thai language error messages.
 *
 * Features:
 * - Comprehensive data type validation with type coercion
 * - Range validation for quantities and prices (0-999,999 for quantity, 0-9,999,999 for price/cost)
 * - Thai language error messages for all validation scenarios
 * - Input sanitization and XSS protection using sanitize-html
 * - Business logic validation (price vs cost comparison)
 * - IMEI validation with Luhn algorithm checksum verification
 * - Barcode pattern validation (8-50 alphanumeric characters)
 * - Dangerous pattern detection for security
 * - String length validation with configurable min/max limits
 * - ObjectId validation for MongoDB references
 *
 * @module stockValidation
 * @version 1.0.0
 * @author Thai Accounting System Development Team
 * @since 1.0.0
 *
 * @requires mongoose - For ObjectId validation
 * @requires validator - For additional string validation utilities
 * @requires sanitize-html - For XSS protection and input sanitization
 *
 * @example
 * // Usage in Express route
 * const { validateStockData } = require('../middlewares/stockValidation');
 *
 * router.post('/api/stock', validateStockData, (req, res) => {
 *   // req.sanitizedData contains validated and sanitized input
 *   // req.validationWarnings contains non-critical warnings
 *   const { branch_code, quantity } = req.sanitizedData;
 *   // ... process validated data
 * });
 *
 * @example
 * // Manual validation
 * const { StockValidator } = require('../middlewares/stockValidation');
 *
 * const result = StockValidator.validateNumber(price, 'price', { min: 0, max: 9999999 });
 * if (!result.isValid) {
 *   console.log('Validation errors:', result.errors);
 * }
 */

const mongoose = require('mongoose');
const validator = require('validator');
const sanitizeHtml = require('sanitize-html');

/**
 * Thai validation error messages
 */
const THAI_VALIDATION_MESSAGES = {
  // Required field messages
  REQUIRED_FIELD: (field) => `กรุณากรอก${getThaiFieldName(field)}`,
  REQUIRED_BRANCH_CODE: 'กรุณาระบุรหัสสาขา',
  REQUIRED_PRODUCT_ID: 'กรุณาระบุรหัสสินค้า',
  REQUIRED_QUANTITY: 'กรุณาระบุจำนวน',
  REQUIRED_PRICE: 'กรุณาระบุราคา',
  REQUIRED_COST: 'กรุณาระบุต้นทุน',
  REQUIRED_SUPPLIER: 'กรุณาระบุผู้จำหน่าย',

  // Data type messages
  INVALID_NUMBER: (field) => `${getThaiFieldName(field)}ต้องเป็นตัวเลข`,
  INVALID_POSITIVE_NUMBER: (field) => `${getThaiFieldName(field)}ต้องเป็นตัวเลขที่มากกว่า 0`,
  INVALID_INTEGER: (field) => `${getThaiFieldName(field)}ต้องเป็นจำนวนเต็ม`,
  INVALID_STRING: (field) => `${getThaiFieldName(field)}ต้องเป็นข้อความ`,
  INVALID_OBJECT_ID: (field) => `${getThaiFieldName(field)}มีรูปแบบไม่ถูกต้อง`,

  // Range validation messages
  QUANTITY_TOO_SMALL: 'จำนวนต้องมากกว่าหรือเท่ากับ 0',
  QUANTITY_TOO_LARGE: 'จำนวนไม่สามารถเกิน 999,999 ชิ้น',
  PRICE_TOO_SMALL: 'ราคาต้องมากกว่า 0 บาท',
  PRICE_TOO_LARGE: 'ราคาไม่สามารถเกิน 9,999,999 บาท',
  COST_TOO_SMALL: 'ต้นทุนต้องมากกว่าหรือเท่ากับ 0 บาท',
  COST_TOO_LARGE: 'ต้นทุนไม่สามารถเกิน 9,999,999 บาท',

  // String length messages
  STRING_TOO_SHORT: (field, min) => `${getThaiFieldName(field)}ต้องมีอย่างน้อย ${min} ตัวอักษร`,
  STRING_TOO_LONG: (field, max) => `${getThaiFieldName(field)}ต้องไม่เกิน ${max} ตัวอักษร`,

  // Format validation messages
  INVALID_IMEI: 'หมายเลข IMEI ไม่ถูกต้อง (ต้องเป็นตัวเลข 15 หลัก)',
  INVALID_BARCODE: 'บาร์โค้ดไม่ถูกต้อง',
  INVALID_EMAIL: 'รูปแบบอีเมลไม่ถูกต้อง',
  INVALID_DATE: 'รูปแบบวันที่ไม่ถูกต้อง',

  // Business logic messages
  DUPLICATE_IMEI: 'หมายเลข IMEI นี้มีอยู่แล้วในระบบ',
  INSUFFICIENT_STOCK: 'จำนวนสต็อกไม่เพียงพอ',
  INVALID_TRANSFER_SAME_BRANCH: 'ไม่สามารถโอนสต็อกภายในสาขาเดียวกันได้',
  PRICE_LOWER_THAN_COST: 'ราคาขายต้องมากกว่าต้นทุน',

  // Security messages
  DANGEROUS_CHARACTERS: 'พบอักขระที่ไม่อนุญาตในข้อมูล',
  POTENTIAL_XSS: 'พบรูปแบบข้อมูลที่อาจเป็นอันตราย',
  INVALID_JSON: 'รูปแบบข้อมูล JSON ไม่ถูกต้อง'
};

/**
 * Thai field name mapping
 */
function getThaiFieldName(field) {
  const fieldNames = {
    'branch_code': 'รหัสสาขา',
    'product_id': 'รหัสสินค้า',
    'quantity': 'จำนวน',
    'price': 'ราคา',
    'cost': 'ต้นทุน',
    'name': 'ชื่อ',
    'brand': 'ยี่ห้อ',
    'model': 'รุ่น',
    'imei': 'หมายเลข IMEI',
    'barcode': 'บาร์โค้ด',
    'supplier': 'ผู้จำหน่าย',
    'po_number': 'เลขที่ใบสั่งซื้อ',
    'invoice_number': 'เลขที่ใบกำกับภาษี',
    'updated_by': 'ผู้แก้ไข',
    'transfer_from': 'สาขาต้นทาง',
    'transfer_to': 'สาขาปลายทาง',
    'reason': 'เหตุผล',
    'notes': 'หมายเหตุ'
  };

  return fieldNames[field] || field;
}

/**
 * Validation result builder
 */
class ValidationResult {
  constructor() {
    this.isValid = true;
    this.errors = [];
    this.warnings = [];
    this.sanitizedData = {};
  }

  addError(field, message) {
    this.isValid = false;
    this.errors.push({ field, message });
  }

  addWarning(field, message) {
    this.warnings.push({ field, message });
  }

  setSanitizedValue(field, value) {
    this.sanitizedData[field] = value;
  }

  getResult() {
    return {
      isValid: this.isValid,
      errors: this.errors,
      warnings: this.warnings,
      sanitizedData: this.sanitizedData
    };
  }
}

/**
 * Core validation functions
 */
class StockValidator {

  /**
   * Validate required fields
   */
  static validateRequired(data, requiredFields) {
    const result = new ValidationResult();

    requiredFields.forEach(field => {
      const value = data[field];

      if (value === undefined || value === null || value === '') {
        result.addError(field, THAI_VALIDATION_MESSAGES.REQUIRED_FIELD(field));
      } else {
        result.setSanitizedValue(field, value);
      }
    });

    return result.getResult();
  }

  /**
   * Validate and sanitize string fields
   */
  static validateString(value, field, options = {}) {
    const result = new ValidationResult();
    const { minLength = 0, maxLength = 1000, allowEmpty = false, trim = true } = options;

    if (value === undefined || value === null) {
      if (!allowEmpty) {
        result.addError(field, THAI_VALIDATION_MESSAGES.REQUIRED_FIELD(field));
      }
      return result.getResult();
    }

    if (typeof value !== 'string') {
      result.addError(field, THAI_VALIDATION_MESSAGES.INVALID_STRING(field));
      return result.getResult();
    }

    // Sanitize and trim
    let sanitized = sanitizeHtml(value, {
      allowedTags: [],
      allowedAttributes: {}
    });

    if (trim) {
      sanitized = sanitized.trim();
    }

    // Check for dangerous patterns
    if (this.containsDangerousPatterns(sanitized)) {
      result.addError(field, THAI_VALIDATION_MESSAGES.DANGEROUS_CHARACTERS);
      return result.getResult();
    }

    // Length validation
    if (sanitized.length < minLength) {
      result.addError(field, THAI_VALIDATION_MESSAGES.STRING_TOO_SHORT(field, minLength));
    }

    if (sanitized.length > maxLength) {
      result.addError(field, THAI_VALIDATION_MESSAGES.STRING_TOO_LONG(field, maxLength));
    }

    result.setSanitizedValue(field, sanitized);
    return result.getResult();
  }

  /**
   * Validate numeric fields
   */
  static validateNumber(value, field, options = {}) {
    const result = new ValidationResult();
    const { min = 0, max = Number.MAX_SAFE_INTEGER, integer = false, positive = false } = options;

    if (value === undefined || value === null) {
      result.addError(field, THAI_VALIDATION_MESSAGES.REQUIRED_FIELD(field));
      return result.getResult();
    }

    // Convert to number
    const numValue = Number(value);

    if (isNaN(numValue)) {
      result.addError(field, THAI_VALIDATION_MESSAGES.INVALID_NUMBER(field));
      return result.getResult();
    }

    // Integer validation
    if (integer && !Number.isInteger(numValue)) {
      result.addError(field, THAI_VALIDATION_MESSAGES.INVALID_INTEGER(field));
      return result.getResult();
    }

    // Positive validation
    if (positive && numValue <= 0) {
      result.addError(field, THAI_VALIDATION_MESSAGES.INVALID_POSITIVE_NUMBER(field));
      return result.getResult();
    }

    // Range validation
    if (numValue < min) {
      if (field === 'quantity') {
        result.addError(field, THAI_VALIDATION_MESSAGES.QUANTITY_TOO_SMALL);
      } else if (field === 'price') {
        result.addError(field, THAI_VALIDATION_MESSAGES.PRICE_TOO_SMALL);
      } else if (field === 'cost') {
        result.addError(field, THAI_VALIDATION_MESSAGES.COST_TOO_SMALL);
      } else {
        result.addError(field, `${getThaiFieldName(field)}ต้องมากกว่าหรือเท่ากับ ${min}`);
      }
    }

    if (numValue > max) {
      if (field === 'quantity') {
        result.addError(field, THAI_VALIDATION_MESSAGES.QUANTITY_TOO_LARGE);
      } else if (field === 'price') {
        result.addError(field, THAI_VALIDATION_MESSAGES.PRICE_TOO_LARGE);
      } else if (field === 'cost') {
        result.addError(field, THAI_VALIDATION_MESSAGES.COST_TOO_LARGE);
      } else {
        result.addError(field, `${getThaiFieldName(field)}ต้องไม่เกิน ${max}`);
      }
    }

    result.setSanitizedValue(field, numValue);
    return result.getResult();
  }

  /**
   * Validate ObjectId fields
   */
  static validateObjectId(value, field) {
    const result = new ValidationResult();

    if (value === undefined || value === null) {
      result.addError(field, THAI_VALIDATION_MESSAGES.REQUIRED_FIELD(field));
      return result.getResult();
    }

    if (!mongoose.isValidObjectId(value)) {
      result.addError(field, THAI_VALIDATION_MESSAGES.INVALID_OBJECT_ID(field));
      return result.getResult();
    }

    result.setSanitizedValue(field, value);
    return result.getResult();
  }

  /**
   * Validate IMEI
   */
  static validateIMEI(value, field) {
    const result = new ValidationResult();

    if (!value) {
      // IMEI is optional in some cases
      return result.getResult();
    }

    if (typeof value !== 'string') {
      result.addError(field, THAI_VALIDATION_MESSAGES.INVALID_STRING(field));
      return result.getResult();
    }

    const sanitized = value.replace(/\D/g, ''); // Remove non-digits

    if (sanitized.length !== 15) {
      result.addError(field, THAI_VALIDATION_MESSAGES.INVALID_IMEI);
      return result.getResult();
    }

    // Basic IMEI checksum validation (Luhn algorithm)
    if (!this.isValidIMEI(sanitized)) {
      result.addError(field, THAI_VALIDATION_MESSAGES.INVALID_IMEI);
      return result.getResult();
    }

    result.setSanitizedValue(field, sanitized);
    return result.getResult();
  }

  /**
   * Validate barcode
   */
  static validateBarcode(value, field) {
    const result = new ValidationResult();

    if (!value) {
      // Barcode is optional
      return result.getResult();
    }

    if (typeof value !== 'string') {
      result.addError(field, THAI_VALIDATION_MESSAGES.INVALID_STRING(field));
      return result.getResult();
    }

    const sanitized = value.trim();

    // Basic barcode validation (alphanumeric, 8-50 characters)
    if (!/^[A-Za-z0-9\-_]{8,50}$/.test(sanitized)) {
      result.addError(field, THAI_VALIDATION_MESSAGES.INVALID_BARCODE);
      return result.getResult();
    }

    result.setSanitizedValue(field, sanitized);
    return result.getResult();
  }

  /**
   * Check for dangerous patterns in strings
   */
  static containsDangerousPatterns(str) {
    const dangerousPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /data:text\/html/gi,
      /vbscript:/gi,
      /eval\s*\(/gi,
      /expression\s*\(/gi
    ];

    return dangerousPatterns.some(pattern => pattern.test(str));
  }

  /**
   * IMEI checksum validation using Luhn algorithm
   */
  static isValidIMEI(imei) {
    let sum = 0;
    let shouldDouble = false;

    // Start from rightmost digit (excluding check digit)
    for (let i = imei.length - 2; i >= 0; i--) {
      let digit = parseInt(imei[i]);

      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) {
          digit = digit % 10 + 1;
        }
      }

      sum += digit;
      shouldDouble = !shouldDouble;
    }

    const checkDigit = parseInt(imei[imei.length - 1]);
    const calculatedCheckDigit = (10 - (sum % 10)) % 10;

    return checkDigit === calculatedCheckDigit;
  }

  /**
   * Business logic validation
   */
  static validateBusinessLogic(data, type) {
    const result = new ValidationResult();

    switch (type) {
      case 'stock_transfer':
        if (data.transfer_from === data.transfer_to) {
          result.addError('transfer_to', THAI_VALIDATION_MESSAGES.INVALID_TRANSFER_SAME_BRANCH);
        }
        break;

      case 'stock_create':
        if (data.price && data.cost && data.price < data.cost) {
          result.addWarning('price', THAI_VALIDATION_MESSAGES.PRICE_LOWER_THAN_COST);
        }
        break;
    }

    return result.getResult();
  }
}

/**
 * Middleware for validating stock creation/update
 */
const validateStockData = (req, res, next) => {
  try {
    const allErrors = [];
    const allWarnings = [];
    const sanitizedData = {};

    // Required fields validation
    const requiredFields = ['branch_code'];
    if (req.method === 'POST') {
      requiredFields.push('name', 'brand', 'model');
    }

    const requiredResult = StockValidator.validateRequired(req.body, requiredFields);
    if (!requiredResult.isValid) {
      allErrors.push(...requiredResult.errors);
    }
    Object.assign(sanitizedData, requiredResult.sanitizedData);

    // String fields validation
    const stringFields = [
      { field: 'name', options: { minLength: 1, maxLength: 200 } },
      { field: 'brand', options: { minLength: 1, maxLength: 100 } },
      { field: 'model', options: { minLength: 1, maxLength: 100 } },
      { field: 'po_number', options: { allowEmpty: true, maxLength: 50 } },
      { field: 'invoice_number', options: { allowEmpty: true, maxLength: 50 } },
      { field: 'supplier', options: { allowEmpty: true, maxLength: 200 } },
      { field: 'notes', options: { allowEmpty: true, maxLength: 1000 } }
    ];

    stringFields.forEach(({ field, options }) => {
      if (req.body[field] !== undefined) {
        const result = StockValidator.validateString(req.body[field], field, options);
        if (!result.isValid) {
          allErrors.push(...result.errors);
        }
        allWarnings.push(...result.warnings);
        Object.assign(sanitizedData, result.sanitizedData);
      }
    });

    // Numeric fields validation
    const numericFields = [
      { field: 'quantity', options: { min: 0, max: 999999, integer: true } },
      { field: 'price', options: { min: 0, max: 9999999 } },
      { field: 'cost', options: { min: 0, max: 9999999 } }
    ];

    numericFields.forEach(({ field, options }) => {
      if (req.body[field] !== undefined) {
        const result = StockValidator.validateNumber(req.body[field], field, options);
        if (!result.isValid) {
          allErrors.push(...result.errors);
        }
        allWarnings.push(...result.warnings);
        Object.assign(sanitizedData, result.sanitizedData);
      }
    });

    // IMEI validation
    if (req.body.imei !== undefined) {
      const imeiResult = StockValidator.validateIMEI(req.body.imei, 'imei');
      if (!imeiResult.isValid) {
        allErrors.push(...imeiResult.errors);
      }
      Object.assign(sanitizedData, imeiResult.sanitizedData);
    }

    // Barcode validation
    if (req.body.barcode !== undefined) {
      const barcodeResult = StockValidator.validateBarcode(req.body.barcode, 'barcode');
      if (!barcodeResult.isValid) {
        allErrors.push(...barcodeResult.errors);
      }
      Object.assign(sanitizedData, barcodeResult.sanitizedData);
    }

    // Business logic validation
    const businessResult = StockValidator.validateBusinessLogic(req.body, 'stock_create');
    allWarnings.push(...businessResult.warnings);

    // If there are errors, return them
    if (allErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบและแก้ไข',
        validation_errors: allErrors,
        warnings: allWarnings
      });
    }

    // Attach sanitized data to request
    req.sanitizedData = sanitizedData;
    req.validationWarnings = allWarnings;

    next();
  } catch (error) {
    console.error('Validation middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูล',
      details: error.message
    });
  }
};

/**
 * Middleware for validating stock transfer
 */
const validateStockTransfer = (req, res, next) => {
  try {
    const allErrors = [];
    const sanitizedData = {};

    // Required fields
    const requiredFields = ['transfer_from', 'transfer_to', 'product_id', 'quantity'];
    const requiredResult = StockValidator.validateRequired(req.body, requiredFields);
    if (!requiredResult.isValid) {
      allErrors.push(...requiredResult.errors);
    }
    Object.assign(sanitizedData, requiredResult.sanitizedData);

    // Validate transfer branches
    if (req.body.transfer_from && req.body.transfer_to) {
      if (req.body.transfer_from === req.body.transfer_to) {
        allErrors.push({
          field: 'transfer_to',
          message: THAI_VALIDATION_MESSAGES.INVALID_TRANSFER_SAME_BRANCH
        });
      }
    }

    // Validate quantity
    if (req.body.quantity !== undefined) {
      const quantityResult = StockValidator.validateNumber(
        req.body.quantity,
        'quantity',
        { min: 1, max: 999999, integer: true, positive: true }
      );
      if (!quantityResult.isValid) {
        allErrors.push(...quantityResult.errors);
      }
      Object.assign(sanitizedData, quantityResult.sanitizedData);
    }

    // Validate reason (optional)
    if (req.body.reason !== undefined) {
      const reasonResult = StockValidator.validateString(
        req.body.reason,
        'reason',
        { allowEmpty: true, maxLength: 500 }
      );
      if (!reasonResult.isValid) {
        allErrors.push(...reasonResult.errors);
      }
      Object.assign(sanitizedData, reasonResult.sanitizedData);
    }

    if (allErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'ข้อมูลการโอนย้ายไม่ถูกต้อง',
        validation_errors: allErrors
      });
    }

    req.sanitizedData = sanitizedData;
    next();
  } catch (error) {
    console.error('Transfer validation error:', error);
    return res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูลการโอนย้าย'
    });
  }
};

module.exports = {
  validateStockData,
  validateStockTransfer,
  StockValidator,
  THAI_VALIDATION_MESSAGES
};