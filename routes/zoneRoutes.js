const express = require('express');
const router  = express.Router();
const {
  getAll,
  getOne,
  create,
  update,
  remove
} = require('../controllers/zoneController');
const authJWT       = require('../middlewares/authJWT');
const hasPermission = require('../middlewares/permission');

// Enhanced permission check for Super Admin (Fixed)
const checkZoneAccess = (req, res, next) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({
      error: 'Authentication required'
    });
  }

  // Handle both string and object role formats
  const userRole = typeof user.role === 'object' ? user.role.name : user.role;
  const userPermissions = user.role && Array.isArray(user.role.permissions)
    ? user.role.permissions
    : (Array.isArray(user.permissions) ? user.permissions : []);

  console.log(`🔍 Zone access check - Role: ${userRole}, Permissions:`, userPermissions);

  const allowedRoles = ['Super Admin', 'Admin', 'HR', 'ผู้จัดการร้าน', 'CEO'];

  // 1. Check by role name
  if (allowedRoles.includes(userRole)) {
    console.log(`✅ Zone access granted by role: ${userRole}`);
    return next();
  }

  // 2. Check by permissions (wildcard or specific)
  if (userPermissions.includes('*') || userPermissions.includes('view_zones')) {
    console.log(`✅ Zone access granted by permission: ${userPermissions.join(', ')}`);
    return next();
  }

  console.log(`❌ Zone access denied - Role: ${userRole}, Permissions: ${userPermissions.join(', ')}`);

  return res.status(403).json({
    error: `Forbidden: Role '${JSON.stringify({
      _id: user.role._id || 'unknown',
      name: userRole,
      permissions: userPermissions
    }, null, 2)}' does not have zone access permissions.`
  });
};

// ดู zones ที่ user มีสิทธิ์ checkin (based on checkinBranches) - ต้องอยู่ก่อน /:id
router.get('/my-zones', authJWT, async (req, res) => {
  try {
    const Zone = require('../models/HR/zoneModel');
    const User = require('../models/User/User');

    const user = await User.findById(req.user._id).select('checkinBranches');

    if (!user || !user.checkinBranches || user.checkinBranches.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Find zones where branchId matches user's checkinBranches
    const zones = await Zone.find({
      branchId: { $in: user.checkinBranches },
      isActive: true,
      deleted_at: null
    })
    .populate('branchId', 'name branch_code')
    .lean();

    res.json({ success: true, data: zones });
  } catch (err) {
    console.error('Get my zones error:', err);
    res.status(500).json({ success: false, error: 'ไม่สามารถดึงข้อมูล zones ได้' });
  }
});

// ดูรายการพื้นที่เช็คอิน
router.get('/', authJWT, checkZoneAccess, getAll);

// ดูพื้นที่เดี่ยว
router.get('/:id', authJWT, checkZoneAccess, getOne);

// สร้างพื้นที่ใหม่
router.post('/', authJWT, checkZoneAccess, create);

// แก้ไขพื้นที่
router.patch('/:id', authJWT, checkZoneAccess, update);

// ลบพื้นที่
router.delete('/:id', authJWT, checkZoneAccess, remove);

module.exports = router;
