// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../../controllers/system/authController');
const authJWT = require('../../middlewares/authJWT');
const rateLimit = require('express-rate-limit');

// Rate limiter specifically for password changes
const passwordChangeLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Allow 5 password change attempts per 15 minutes
  message: {
    success: false,
    message: 'มีความพยายามเปลี่ยนรหัสผ่านมากเกินไป กรุณารอ 15 นาทีแล้วลองใหม่'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for localhost during development
    const trusted = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];
    return trusted.includes(req.ip);
  }
});

// Change password endpoint
router.post('/change-password', passwordChangeLimit, authController.changePassword);

// Logout endpoint
router.post('/logout', authJWT, authController.logout);

module.exports = router;
