// middlewares/hasPermission.js

/**
 * Middleware สำหรับตรวจสอบสิทธิ์การเข้าถึง
 * @param {string|Array} requiredPermissions - สิทธิ์ที่ต้องการ
 * @returns {Function} middleware function
 */
const hasPermission = (requiredPermissions) => {
  return (req, res, next) => {
    try {
      // ตรวจสอบว่าผู้ใช้ล็อกอินแล้วหรือไม่
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'ไม่พบข้อมูลผู้ใช้'
        });
      }

      const userRole = req.user.role;
      const userPermissions = req.user.permissions || [];

      // ถ้าเป็น admin ให้ผ่านไปเลย
      if (userRole === 'admin' || userRole === 'superadmin') {
        return next();
      }

      // แปลง requiredPermissions ให้เป็น array
      const permissions = Array.isArray(requiredPermissions)
        ? requiredPermissions
        : [requiredPermissions];

      // ตรวจสอบว่าผู้ใช้มีสิทธิ์ที่ต้องการหรือไม่
      const hasRequiredPermission = permissions.some(permission =>
        userPermissions.includes(permission)
      );

      if (!hasRequiredPermission) {
        return res.status(403).json({
          success: false,
          message: 'คุณไม่มีสิทธิ์ในการเข้าถึงข้อมูลนี้',
          required: permissions,
          userPermissions: userPermissions
        });
      }

      next();
    } catch (error) {
      console.error('hasPermission error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์'
      });
    }
  };
};

module.exports = hasPermission;
