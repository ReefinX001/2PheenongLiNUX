const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payrollController');

// POST /api/payroll => เพิ่มเงินเดือน
router.post('/', payrollController.createPayroll);
// GET /api/payroll => ดึงรายการเงินเดือนทั้งหมด
router.get('/', payrollController.getAllPayrolls);

module.exports = router;
