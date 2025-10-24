// middlewares/refreshToken.js
const jwt = require('jsonwebtoken');
const User = require('../models/User/User');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'YOUR_SECRET_KEY';
const REFRESH_SECRET = process.env.REFRESH_SECRET || crypto.randomBytes(64).toString('hex');
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';

// สร้าง access token
function generateAccessToken(user) {
  return jwt.sign(
    {
      userId: user._id,
      username: user.username,
      role: user.role?.name,
      permissions: user.role?.permissions || []
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

// สร้าง refresh token
function generateRefreshToken(user) {
  return jwt.sign(
    {
      userId: user._id,
      username: user.username,
      tokenVersion: user.tokenVersion || 0
    },
    REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

// Verify refresh token
async function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, REFRESH_SECRET);

    // ตรวจสอบ user และ token version
    const user = await User.findById(decoded.userId)
      .populate('role', 'name permissions')
      .select('+tokenVersion');

    if (!user) {
      throw new Error('User not found');
    }

    // ตรวจสอบ token version (ป้องกันการใช้ token เก่า)
    if (decoded.tokenVersion !== (user.tokenVersion || 0)) {
      throw new Error('Token version mismatch');
    }

    return user;
  } catch (error) {
    throw error;
  }
}

// Refresh token endpoint
async function refreshTokenHandler(req, res) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token required',
        code: 'NO_REFRESH_TOKEN'
      });
    }

    // ตรวจสอบ refresh token
    const user = await verifyRefreshToken(refreshToken);

    // ตรวจสอบว่าผู้ใช้ถูกบล็อกหรือไม่
    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        error: 'Account blocked',
        code: 'ACCOUNT_BLOCKED'
      });
    }

    // สร้าง tokens ใหม่
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // อัพเดท last activity
    user.lastSeen = new Date();
    await user.save();

    return res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: ACCESS_TOKEN_EXPIRY
      }
    });

  } catch (error) {
    console.error('Refresh token error:', error);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Refresh token expired',
        code: 'REFRESH_TOKEN_EXPIRED'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Token refresh failed',
      code: 'REFRESH_FAILED'
    });
  }
}

// Revoke all tokens (logout from all devices)
async function revokeAllTokens(userId) {
  try {
    const user = await User.findById(userId);
    if (user) {
      // เพิ่ม token version เพื่อทำให้ refresh token เก่าทั้งหมดใช้ไม่ได้
      user.tokenVersion = (user.tokenVersion || 0) + 1;
      await user.save();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Revoke tokens error:', error);
    return false;
  }
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  refreshTokenHandler,
  revokeAllTokens,
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY
};