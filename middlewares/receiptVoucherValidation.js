// middleware/receiptVoucherValidation.js

const { body, validationResult } = require('express-validator');

const validateReceiptVoucher = [
  // ตรวจสอบวันที่รับเงิน
  body('paymentDate')
    .notEmpty().withMessage('กรุณาระบุวันที่รับเงิน')
    .isISO8601().withMessage('รูปแบบวันที่ไม่ถูกต้อง')
    .custom((value) => {
      const date = new Date(value);
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      // ไม่อนุญาตให้ลงวันที่ในอนาคต
      if (date > today) {
        throw new Error('ไม่สามารถลงวันที่ในอนาคตได้');
      }

      // ไม่อนุญาตให้ลงวันที่ย้อนหลังเกิน 30 วัน (ปรับได้ตามนโยบาย)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      if (date < thirtyDaysAgo) {
        throw new Error('ไม่สามารถลงวันที่ย้อนหลังเกิน 30 วันได้');
      }

      return true;
    }),

  // ตรวจสอบบัญชีเดบิต (บัญชีที่รับเงิน)
  body('debitAccount')
    .notEmpty().withMessage('กรุณาระบุบัญชีเดบิต'),
  body('debitAccount.code')
    .notEmpty().withMessage('กรุณาระบุรหัสบัญชีเดบิต')
    .matches(/^[0-9]{4,}$/).withMessage('รหัสบัญชีต้องเป็นตัวเลขอย่างน้อย 4 หลัก'),
  body('debitAccount.name')
    .notEmpty().withMessage('กรุณาระบุชื่อบัญชีเดบิต'),

  // ตรวจสอบบัญชีเครดิต (บัญชีที่เกี่ยวข้อง)
  body('creditAccount')
    .notEmpty().withMessage('กรุณาระบุบัญชีเครดิต'),
  body('creditAccount.code')
    .notEmpty().withMessage('กรุณาระบุรหัสบัญชีเครดิต')
    .matches(/^[0-9]{4,}$/).withMessage('รหัสบัญชีต้องเป็นตัวเลขอย่างน้อย 4 หลัก'),
  body('creditAccount.name')
    .notEmpty().withMessage('กรุณาระบุชื่อบัญชีเครดิต'),

  // ตรวจสอบผู้จ่ายเงิน
  body('receivedFrom')
    .notEmpty().withMessage('กรุณาระบุผู้จ่ายเงิน')
    .trim()
    .isLength({ min: 3, max: 255 }).withMessage('ชื่อผู้จ่ายเงินต้องมีความยาว 3-255 ตัวอักษร'),

  // ตรวจสอบประเภทใบสำคัญรับเงิน
  body('receiptType')
    .notEmpty().withMessage('กรุณาระบุประเภทใบสำคัญรับเงิน')
    .isIn(['cash_sale', 'installment', 'service', 'deposit', 'other'])
    .withMessage('ประเภทใบสำคัญรับเงินไม่ถูกต้อง'),

  // ตรวจสอบวิธีการชำระเงิน
  body('paymentMethod')
    .notEmpty().withMessage('กรุณาระบุวิธีการชำระเงิน')
    .isIn(['cash', 'transfer', 'cheque', 'credit_card', 'e_wallet'])
    .withMessage('วิธีการชำระเงินไม่ถูกต้อง'),

  // ตรวจสอบข้อมูลธนาคาร (ถ้าเป็นการโอนเงิน)
  body('bankAccount')
    .if(body('paymentMethod').equals('transfer'))
    .notEmpty().withMessage('กรุณาระบุบัญชีธนาคาร'),

  // ตรวจสอบข้อมูลเช็ค (ถ้าเป็นเช็ค)
  body('chequeInfo')
    .if(body('paymentMethod').equals('cheque'))
    .notEmpty().withMessage('กรุณาระบุข้อมูลเช็ค'),
  body('chequeInfo.chequeNumber')
    .if(body('paymentMethod').equals('cheque'))
    .notEmpty().withMessage('กรุณาระบุเลขที่เช็ค'),
  body('chequeInfo.chequeDate')
    .if(body('paymentMethod').equals('cheque'))
    .notEmpty().withMessage('กรุณาระบุวันที่เช็ค')
    .isISO8601().withMessage('รูปแบบวันที่เช็คไม่ถูกต้อง'),
  body('chequeInfo.bankName')
    .if(body('paymentMethod').equals('cheque'))
    .notEmpty().withMessage('กรุณาระบุธนาคารของเช็ค'),

  // ตรวจสอบรายละเอียดรายการ
  body('details')
    .isArray({ min: 1 }).withMessage('ต้องมีรายละเอียดอย่างน้อย 1 รายการ'),
  body('details.*.description')
    .notEmpty().withMessage('กรุณาระบุรายละเอียด')
    .trim()
    .isLength({ min: 3, max: 500 }).withMessage('รายละเอียดต้องมีความยาว 3-500 ตัวอักษร'),
  body('details.*.amount')
    .notEmpty().withMessage('กรุณาระบุจำนวนเงิน')
    .isFloat({ min: 0.01 }).withMessage('จำนวนเงินต้องมากกว่า 0')
    .toFloat(),

  // ตรวจสอบรหัสบัญชีในรายละเอียด (ถ้ามี)
  body('details.*.accountCode')
    .optional()
    .matches(/^[0-9]{4,}$/).withMessage('รหัสบัญชีต้องเป็นตัวเลขอย่างน้อย 4 หลัก'),
  body('details.*.accountName')
    .if(body('details.*.accountCode').exists())
    .notEmpty().withMessage('กรุณาระบุชื่อบัญชี'),

  // ตรวจสอบ VAT (ถ้ามี)
  body('details.*.vatType')
    .optional()
    .isIn(['none', 'include', 'exclude']).withMessage('ประเภท VAT ไม่ถูกต้อง'),
  body('details.*.vatRate')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('อัตรา VAT ต้องอยู่ระหว่าง 0-100')
    .toFloat(),

  // ตรวจสอบข้อมูลลูกค้า (ถ้ามี)
  body('customer')
    .optional(),
  body('customer.customerId')
    .if(body('customer').exists())
    .notEmpty().withMessage('กรุณาระบุรหัสลูกค้า'),
  body('customer.name')
    .if(body('customer').exists())
    .notEmpty().withMessage('กรุณาระบุชื่อลูกค้า'),

  // ตรวจสอบเอกสารอ้างอิง (ถ้ามี)
  body('reference')
    .optional(),
  body('reference.invoiceNumber')
    .optional()
    .trim(),
  body('reference.installmentContract')
    .optional()
    .trim(),

  // ตรวจสอบหมายเหตุ
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('หมายเหตุต้องไม่เกิน 1000 ตัวอักษร'),

  // Middleware สำหรับจัดการ validation errors
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'ข้อมูลไม่ถูกต้อง',
        errors: errors.array().map(error => ({
          field: error.param,
          message: error.msg
        }))
      });
    }
    next();
  }
];

// Validation สำหรับการค้นหา
const validateSearch = [
  body('startDate')
    .optional()
    .isISO8601().withMessage('รูปแบบวันที่เริ่มต้นไม่ถูกต้อง'),
  body('endDate')
    .optional()
    .isISO8601().withMessage('รูปแบบวันที่สิ้นสุดไม่ถูกต้อง')
    .custom((value, { req }) => {
      if (req.body.startDate && value) {
        if (new Date(value) < new Date(req.body.startDate)) {
          throw new Error('วันที่สิ้นสุดต้องมากกว่าหรือเท่ากับวันที่เริ่มต้น');
        }
      }
      return true;
    }),
  body('accountCode')
    .optional()
    .matches(/^[0-9]{4,}$/).withMessage('รหัสบัญชีต้องเป็นตัวเลขอย่างน้อย 4 หลัก'),
  body('status')
    .optional()
    .isIn(['draft', 'completed', 'cancelled']).withMessage('สถานะไม่ถูกต้อง'),
  body('receiptType')
    .optional()
    .isIn(['cash_sale', 'installment', 'service', 'deposit', 'other'])
    .withMessage('ประเภทใบสำคัญรับเงินไม่ถูกต้อง'),
  body('paymentMethod')
    .optional()
    .isIn(['cash', 'transfer', 'cheque', 'credit_card', 'e_wallet'])
    .withMessage('วิธีการชำระเงินไม่ถูกต้อง'),
  body('page')
    .optional()
    .isInt({ min: 1 }).withMessage('หน้าต้องเป็นตัวเลขที่มากกว่า 0')
    .toInt(),
  body('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('จำนวนต่อหน้าต้องอยู่ระหว่าง 1-100')
    .toInt(),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'พารามิเตอร์การค้นหาไม่ถูกต้อง',
        errors: errors.array().map(error => ({
          field: error.param,
          message: error.msg
        }))
      });
    }
    next();
  }
];

module.exports = {
  validateReceiptVoucher,
  validateSearch
};
