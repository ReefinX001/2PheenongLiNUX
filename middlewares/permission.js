
// File: middlewares/permission.js (Enhanced)
module.exports = function hasPermission(requiredPermission) {
  return (req, res, next) => {
    const user = req.user;

    if (!user) {
      console.log('🚫 No user in request');
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    const userRole = user.role;
    const userPermissions = Array.isArray(user.permissions) ? user.permissions : [];

    // Handle both string and object role formats
    const roleName = typeof userRole === 'object' ? userRole.name : userRole;
    const rolePermissions = typeof userRole === 'object' && Array.isArray(userRole.permissions)
      ? userRole.permissions
      : [];

    console.log(`🔍 Permission check: ${requiredPermission}`);
    console.log(`👤 User role: ${roleName}`);
    console.log(`🔑 User permissions:`, userPermissions);
    console.log(`🔑 Role permissions:`, rolePermissions);

    // 1. Super Admin bypass - Super Admin ควรเข้าได้ทุกอย่าง
    if (roleName === 'Super Admin' || roleName === 'superadmin' || roleName === 'admin') {
      console.log(`✅ Admin access granted for role: ${roleName}`);
      return next();
    }

    // 2. Wildcard permission check - ถ้ามี '*' แสดงว่ามีสิทธิ์ทุกอย่าง
    if (userPermissions.includes('*') || rolePermissions.includes('*')) {
      console.log(`✅ Wildcard permission (*) granted`);
      return next();
    }

    // 3. Specific permission check
    if (userPermissions.includes(requiredPermission) || rolePermissions.includes(requiredPermission)) {
      console.log(`✅ Specific permission (${requiredPermission}) granted`);
      return next();
    }

    // 4. Permission not found
    console.log(`❌ Permission denied for ${requiredPermission}`);
    console.log(`   Required: ${requiredPermission}`);
    console.log(`   User has: ${userPermissions.join(', ')}`);
    console.log(`   Role: ${userRole}`);

    return res.status(403).json({
      error: `Forbidden: Role '${JSON.stringify({
        _id: user.roleId || 'unknown',
        name: userRole,
        permissions: userPermissions
      }, null, 2)}' does not have zone access permissions.`
    });
  };
};
