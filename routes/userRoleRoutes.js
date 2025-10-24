// routes/userRoleRoutes.js
const express = require('express');
const router = express.Router();

const authJWT = require('../middlewares/authJWT');
const hasPermission = require('../middlewares/permission');
const ctrl = require('../controllers/userRoleController');
const {
  validateRole
} = require('../middlewares/validateRole');

// เปิดใช้งาน JWT authentication สำหรับทุก route
router.use(authJWT);

// GET /api/user-role/stats - ดึงสถิติบทบาท (ต้องมีสิทธิ์ view_roles)
router.get(
  '/stats',
  hasPermission('view_roles'),
  ctrl.getRoleStats
);

// POST /api/user-role/seed - Seed ข้อมูลบทบาทเริ่มต้น (ต้องมีสิทธิ์ manage_roles)
router.post(
  '/seed',
  hasPermission('manage_roles'),
  ctrl.seedDefaultRoles
);

// POST /api/user-role/sync-users - Sync ข้อมูลผู้ใช้งานทั้งหมดกับบทบาท (ต้องมีสิทธิ์ manage_roles)
router.post(
  '/sync-users',
  hasPermission('manage_roles'),
  ctrl.syncAllUsersWithRoles
);

// POST /api/user-role - สร้าง Role ใหม่ (ต้องมีสิทธิ์ manage_roles)
router.post(
  '/',
  hasPermission('manage_roles'),
  validateRole,
  ctrl.createRole
);

// GET /api/user-role - ดึงรายการ Role ทั้งหมด (ต้องมีสิทธิ์ view_roles)
router.get(
  '/',
  hasPermission('view_roles'),
  ctrl.getAllRoles
);

// GET /api/user-role/:id/users - ดึงรายชื่อผู้ใช้งานที่ใช้บทบาทนี้ (ต้องมีสิทธิ์ view_roles)
router.get(
  '/:id/users',
  hasPermission('view_roles'),
  ctrl.getUsersByRole
);

// GET /api/user-role/:id - ดึงข้อมูล Role ตาม ID (ต้องมีสิทธิ์ view_roles)
router.get(
  '/:id',
  hasPermission('view_roles'),
  ctrl.getRoleById
);

// PATCH /api/user-role/:id - อัปเดตข้อมูล Role (ต้องมีสิทธิ์ manage_roles)
router.patch(
  '/:id',
  hasPermission('manage_roles'),
  validateRole,
  ctrl.updateRole
);

// DELETE /api/user-role/:id - ลบ Role (Soft Delete) (ต้องมีสิทธิ์ manage_roles)
router.delete(
  '/:id',
  hasPermission('manage_roles'),
  ctrl.deleteRole
);

module.exports = router;
