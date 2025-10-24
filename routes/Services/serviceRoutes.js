// routes/serviceRoutes.js
const express = require('express');
const ServiceController = require('../../controllers/Services/serviceController');
const authJWTMiddleware = require('../../middlewares/authJWT');

const router = express.Router();

// ใช้ middleware สำหรับ authentication
router.use(authJWTMiddleware);

// ค้นหาสิทธิ์การใช้บริการ
router.get('/eligibility', ServiceController.checkServiceEligibility);

// บันทึกการใช้บริการ
router.post('/usage', ServiceController.recordServiceUsage);

// ดูประวัติการใช้บริการ
router.get('/history', ServiceController.getServiceHistory);

module.exports = router;

// ใน app.js หรือ server.js เพิ่ม
// app.use('/api/services', require('./routes/serviceRoutes'));
