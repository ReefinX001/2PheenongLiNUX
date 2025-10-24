// routes/otherIncomeRoutes.js
const express = require('express');
const router = express.Router();
const otherIncomeController = require('../controllers/otherIncomeController');
const authMiddleware = require('../middlewares/authMiddleware');
const { body, validationResult } = require('express-validator');

// Validation middleware
const validateIncome = [
  body('date').isISO8601().withMessage('วันที่ไม่ถูกต้อง'),
  body('category').notEmpty().withMessage('กรุณาเลือกหมวดหมู่'),
  body('description').notEmpty().trim().withMessage('กรุณากรอกรายละเอียด'),
  body('amount').isFloat({ min: 0 }).withMessage('จำนวนเงินต้องมากกว่า 0'),
  body('vatType').isIn(['non_vat', 'include_vat', 'exclude_vat']).withMessage('ประเภท VAT ไม่ถูกต้อง'),
  body('paymentMethod').notEmpty().withMessage('กรุณาเลือกวิธีชำระเงิน'),
  body('accountCode').optional(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    next();
  }
];

// Apply auth middleware to all routes
router.use(authMiddleware);

// Routes
router.get('/', otherIncomeController.getAllOtherIncome);
router.get('/categories', otherIncomeController.getCategories);
router.get('/summary/by-category', otherIncomeController.getSummaryByCategory);
router.get('/export', otherIncomeController.exportToExcel);
router.get('/:id', otherIncomeController.getOtherIncomeById);
router.post('/', validateIncome, otherIncomeController.createOtherIncome);
router.put('/:id', validateIncome, otherIncomeController.updateOtherIncome);
router.patch('/:id', otherIncomeController.updateOtherIncome);
router.delete('/:id', otherIncomeController.deleteOtherIncome);

module.exports = router;