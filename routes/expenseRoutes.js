// routes/expenseRoutes.js
const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');

// POST /api/expenses => เพิ่มรายจ่าย
router.post('/', expenseController.createExpense);

// GET /api/expenses => ดูรายจ่ายทั้งหมด
router.get('/', expenseController.getAllExpenses);

// DELETE /api/expenses/:id => ลบรายจ่าย
router.delete('/:id', expenseController.deleteExpense);

module.exports = router;
