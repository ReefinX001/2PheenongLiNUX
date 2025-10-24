const express = require('express');
const router  = express.Router();
const ctrl = require('../../controllers/Acc/expenseController');
// CRUD
router.post   ('/',      ctrl.createExpense);
router.get    ('/',      ctrl.getAllExpenses);
router.get    ('/:id',   ctrl.getExpenseById);
router.put    ('/:id',   ctrl.updateExpense);
router.delete ('/:id',   ctrl.deleteExpense);

module.exports = router;
