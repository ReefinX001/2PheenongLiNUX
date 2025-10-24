// routes/Acc/chartOfAccounts.js
const express = require('express');
const router = express.Router();
const chartOfAccountController = require('../../controllers/Acc/chartOfAccountController');
const multer = require('multer');

// Multer setup for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Validation middleware
const validateAccount = (req, res, next) => {
  const { code, name, category } = req.body;
  const errors = [];

  if (!code) errors.push('รหัสบัญชีเป็นข้อมูลที่จำเป็น');
  if (!name) errors.push('ชื่อบัญชีเป็นข้อมูลที่จำเป็น');
  if (!category) errors.push('หมวดหมู่เป็นข้อมูลที่จำเป็น');

  const validCategories = ['Asset', 'Liabilities', 'Equity', 'Income', 'Expense'];
  if (category && !validCategories.includes(category)) {
    errors.push('หมวดหมู่ไม่ถูกต้อง');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'ข้อมูลไม่ครบถ้วน',
      errors
    });
  }

  next();
};



// Routes - GET ไม่ต้อง auth, แต่ POST/PUT/DELETE ต้อง auth
router.get('/', chartOfAccountController.getAll.bind(chartOfAccountController));
router.get('/:id', chartOfAccountController.getById.bind(chartOfAccountController));

// Routes ที่ต้อง auth
router.post('/', validateAccount, chartOfAccountController.create.bind(chartOfAccountController));
router.put('/:id', chartOfAccountController.update.bind(chartOfAccountController));
router.delete('/:id', chartOfAccountController.delete.bind(chartOfAccountController));
router.get('/export', chartOfAccountController.exportExcel.bind(chartOfAccountController));
router.post('/import',  upload.single('file'), chartOfAccountController.importExcel.bind(chartOfAccountController));

module.exports = router;
