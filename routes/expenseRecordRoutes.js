// routes/expenseRecordRoutes.js
const express = require('express');
const router = express.Router();
const expenseRecordController = require('../controllers/expenseRecordController');

// Middleware สำหรับตรวจสอบ authentication (ถ้ามี)
const authMiddleware = (req, res, next) => {
  // ตรวจสอบ token หรือ session
  // ถ้าไม่มี authentication system ให้ comment บรรทัดนี้
  // const token = req.headers.authorization?.replace('Bearer ', '');
  // if (!token) {
  //   return res.status(401).json({ success: false, error: 'ไม่ได้รับอนุญาต' });
  // }
  next();
};

// ใช้ middleware สำหรับทุก route
router.use(authMiddleware);

// POST /api/expense-records - สร้างรายการค่าใช้จ่ายใหม่
router.post('/', expenseRecordController.createExpenseRecord);

// GET /api/expense-records - ดึงรายการค่าใช้จ่ายทั้งหมด (พร้อม pagination และ filter)
router.get('/', expenseRecordController.getAllExpenseRecords);

// GET /api/expense-records/report - ดึงรายงานค่าใช้จ่าย
router.get('/report', expenseRecordController.getExpenseReport);

// GET /api/expense-records/:id - ดึงรายการค่าใช้จ่ายตาม ID
router.get('/:id', expenseRecordController.getExpenseRecordById);

// PUT /api/expense-records/:id - อัปเดตรายการค่าใช้จ่าย
router.put('/:id', expenseRecordController.updateExpenseRecord);

// DELETE /api/expense-records/:id - ลบรายการค่าใช้จ่าย
router.delete('/:id', expenseRecordController.deleteExpenseRecord);

// PATCH /api/expense-records/:id/approve - อนุมัติรายการค่าใช้จ่าย
router.patch('/:id/approve', expenseRecordController.approveExpenseRecord);

// PATCH /api/expense-records/:id/reject - ปฏิเสธรายการค่าใช้จ่าย
router.patch('/:id/reject', expenseRecordController.rejectExpenseRecord);

module.exports = router;
