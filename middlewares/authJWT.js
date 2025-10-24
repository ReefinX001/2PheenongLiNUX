// File: middlewares/authJWT.js
const jwt = require('jsonwebtoken');
const User = require('../models/User/User');
const SECRET = process.env.JWT_SECRET || 'YOUR_SECRET_KEY';

// Token validation is handled by jwt.verify which includes expiration checking

module.exports = async (req, res, next) => {
  try {
    // 1) อ่านค่า Authorization header
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader) {
      console.log('⚠️ No authorization header provided');
      return res.status(401).json({
        success: false,
        error: 'No token provided',
        code: 'MISSING_TOKEN'
      });
    }

    // 2) ต้องเป็นรูปแบบ "Bearer <token>"
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      console.log('⚠️ Invalid token format:', authHeader);
      return res.status(401).json({
        success: false,
        error: 'Token format is invalid. It should be "Bearer <token>"',
        code: 'INVALID_TOKEN_FORMAT'
      });
    }

    const token = parts[1];

    // Test mode - allow specific test tokens in development
    if (process.env.NODE_ENV === 'development' && token === 'test_token_12345') {
      req.user = {
        _id: 'test_user_123',
        username: 'test_user',
        name: 'Test User',
        role: { name: 'admin', permissions: ['*'] },
        employee: {
          name: 'Test User',
          email: 'test@example.com',
          position: 'Admin',
          department: 'IT'
        },
        isBlocked: false
      };
      console.log('✅ Test token authenticated successfully (authJWT)');
      return next();
    }

    // 3) ใช้ jwt.verify เพื่อตรวจสอบความถูกต้อง
    const decoded = await new Promise((resolve, reject) => {
      jwt.verify(token, SECRET, (err, decoded) => {
        if (err) {
          // Only log errors in development
          if (process.env.NODE_ENV === 'development') {
            console.error('[authJWT] Token verification error:', err.message);
          }
          reject(err);
        } else {
          resolve(decoded);
        }
      });
    });

    // 4) ดึงข้อมูล User จาก database พร้อมอัปเดต online status
    const user = await User.findById(decoded.userId)
      .populate('employee', 'name email imageUrl position department')
      .populate('role', 'name permissions')
      .select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    // 5) ตรวจสอบว่า user ไม่ถูก block
    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        error: 'User account is blocked'
      });
    }

    // 6) อัปเดต lastSeen และ online status (ไม่ใช้ await เพื่อไม่ให้ช้า)
    User.findByIdAndUpdate(user._id, {
      lastSeen: new Date(),
      isOnline: true
    }).exec();

    // 7) ใส่ข้อมูลผู้ใช้เต็มรูปแบบลงใน req.user
    req.user = user;

    // ผ่านแล้ว ไปยัง middleware หรือ route ถัดไป
    next();

  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
};
