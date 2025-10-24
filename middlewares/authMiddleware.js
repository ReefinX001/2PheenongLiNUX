// File: middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'YOUR_SECRET_KEY';

// Proper JWT authentication middleware
module.exports = function authMiddleware(req, res, next) {
  // Read token from Authorization header
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized - no token found'
    });
  }

  // Check if token format is "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      success: false,
      error: 'Token format is invalid. It should be "Bearer <token>"'
    });
  }

  const token = parts[1];

  // Verify JWT token
  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) {
      console.error('[authMiddleware] Token verification error:', err.message);
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Store user info in request object
    req.user = decoded;
    next();
  });
};
