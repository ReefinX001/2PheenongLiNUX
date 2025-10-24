// File: routes/salaryRoutes.js
const express = require('express');
const router = express.Router();
const salaryController = require('../controllers/salaryController');

// Middlewares สำหรับตรวจสอบ JWT / permission
const authJWT = require('../middlewares/authJWT');
const hasPermission = require('../middlewares/permission');

// GET /api/salaries
router.get('/',
  authJWT,
  hasPermission('view_salaries'),  // สมมติให้ต้องมี permission นี้
  salaryController.getAllSalaries
);

module.exports = router;
