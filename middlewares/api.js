// File: middlewares/api.js
const express = require('express');
const rateLimit = require('express-rate-limit');

// สร้าง rate limiter สำหรับ API - เพิ่มความยืดหยุ่นสำหรับ zone API
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 นาที
  max: 100,            // เพิ่มเป็น 100 requests ต่อนาที
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // ข้าม rate limiting สำหรับ endpoint สำคัญบางตัว
  skip: (req) => {
    // ข้าม rate limiting สำหรับ zone API เพื่อการใช้งาน attendance
    return req.path.includes('/zone') || req.path.includes('/attendance');
  }
});

// ส่งออกเป็น Array ของ Middleware ที่ต้องใช้
module.exports = [
  express.json(),
  express.urlencoded({ extended: true }),
  apiLimiter
];
