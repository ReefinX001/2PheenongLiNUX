// routes/hr/monthlyPayrollRoutes.js
const express = require('express');
const router = express.Router();
const monthlyPayrollController = require('../../controllers/hr/monthlyPayrollController');
const auth = require('../../middlewares/authJWT');

console.log('🛠️ Loading monthly payroll routes...');

// Debug middleware
router.use((req, res, next) => {
  console.log(`📍 Monthly Payroll Route: ${req.method} ${req.path}`);
  console.log('📍 Query:', req.query);
  console.log('📍 Body:', req.body);
  next();
});

// Routes for monthly payroll management (no auth for testing)
router.get('/', monthlyPayrollController.getMonthlyPayrolls);
router.get('/summary', monthlyPayrollController.getPayrollSummary);
router.get('/:employeeId', monthlyPayrollController.getMonthlyPayrollByEmployee);
router.post('/', monthlyPayrollController.createMonthlyPayroll);
router.put('/:id', monthlyPayrollController.updateMonthlyPayroll);
router.delete('/:id', monthlyPayrollController.deleteMonthlyPayroll);

console.log('✅ Monthly payroll routes loaded');

module.exports = router;
