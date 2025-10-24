// routes/incomeRoutes.js
const express = require('express');
const router = express.Router();
const incomeController = require('../controllers/incomeController');

// POST /api/income => เพิ่มรายรับ
router.post('/', incomeController.createIncome);

// GET /api/income => ดูรายรับทั้งหมด (option เสริม)
router.get('/', incomeController.getAllIncomes);

module.exports = router;
