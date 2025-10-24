const express = require('express');
const router = express.Router();
const {
  getAll,
  getOne,
  create,
  update,
  remove
} = require('../controllers/zoneController');
const authJWT = require('../middlewares/authJWT');
const hasPermission = require('../middlewares/permission');

// Enhanced zone routes with better error handling and debugging
// Helper middleware to log requests for debugging
const debugMiddleware = (req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`🔍 Zone API Request: ${req.method} ${req.originalUrl}`);
    console.log('Headers:', {
      authorization: req.headers.authorization ? 'Bearer ***' : 'Missing',
      'content-type': req.headers['content-type']
    });
    if (req.user) {
      console.log('User:', {
        id: req.user.id,
        username: req.user.username,
        permissions: req.user.permissions
      });
    }
  }
  next();
};

// Enhanced permission middleware with better error messages
const enhancedPermissionCheck = (requiredPermission) => {
  return (req, res, next) => {
    const userPermissions = req.user && Array.isArray(req.user.permissions)
      ? req.user.permissions
      : [];

    const hasPermission = userPermissions.includes(requiredPermission) || userPermissions.includes('*');

    if (hasPermission) {
      return next();
    } else {
      // Provide more detailed error information
      console.error('Permission denied:', {
        requiredPermission,
        userPermissions,
        userId: req.user?.id,
        username: req.user?.username
      });

      return res.status(403).json({
        success: false,
        error: `Forbidden: Missing required permission (${requiredPermission}).`,
        details: {
          required: requiredPermission,
          user: req.user?.username,
          availablePermissions: userPermissions
        }
      });
    }
  };
};

// Apply debug middleware to all routes
router.use(debugMiddleware);

// ดูรายการพื้นที่เช็คอิน - Enhanced with fallback
router.get('/', authJWT, enhancedPermissionCheck('view_zones'), async (req, res, next) => {
  try {
    // Log successful permission check
    console.log('✅ Zone list access granted for user:', req.user?.username);
    await getAll(req, res);
  } catch (error) {
    console.error('❌ Zone list error:', error);
    next(error);
  }
});

// ดูพื้นที่เดี่ยว
router.get('/:id', authJWT, enhancedPermissionCheck('view_zones'), async (req, res, next) => {
  try {
    console.log('✅ Zone detail access granted for user:', req.user?.username);
    await getOne(req, res);
  } catch (error) {
    console.error('❌ Zone detail error:', error);
    next(error);
  }
});

// สร้างพื้นที่ใหม่
router.post('/', authJWT, enhancedPermissionCheck('create_zones'), async (req, res, next) => {
  try {
    await create(req, res);
  } catch (error) {
    console.error('❌ Zone create error:', error);
    next(error);
  }
});

// แก้ไขพื้นที่
router.patch('/:id', authJWT, enhancedPermissionCheck('edit_zones'), async (req, res, next) => {
  try {
    await update(req, res);
  } catch (error) {
    console.error('❌ Zone update error:', error);
    next(error);
  }
});

// ลบพื้นที่
router.delete('/:id', authJWT, enhancedPermissionCheck('delete_zones'), async (req, res, next) => {
  try {
    await remove(req, res);
  } catch (error) {
    console.error('❌ Zone delete error:', error);
    next(error);
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Zone API Error:', error);

  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
      details: error.message
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expired',
      details: error.message
    });
  }

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

module.exports = router;