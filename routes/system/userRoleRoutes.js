// routes/userRoleRoutes.js
const express = require('express');
const router  = express.Router();

const authJWT               = require('../../middlewares/authJWT');
const hasPermission = require('../../middlewares/permission');
const ctrl                  = require('../../controllers/userRoleController');
const {
  validateRole,
  validateAllowedPage,
  validateAllowedBranch
} = require('../../middlewares/validateRole');

router.use(authJWT);

// สร้าง Role (ต้องมีสิทธิ์ manage_roles)
router.post(
  '/',
  hasPermission('manage_roles'),
  validateRole,
  ctrl.createRole
);

// ดู list Role (ต้องมีสิทธิ์ view_roles)
router.get(
  '/',
  hasPermission('view_roles'),
  ctrl.getAllRoles
);

// ดู Role ทีละตัว (ต้องมีสิทธิ์ view_roles)
router.get(
  '/:id',
  hasPermission('view_roles'),
  ctrl.getRoleById
);

// อัปเดตชื่อ/description/allowedPages/allowedBranches (ต้องมีสิทธิ์ manage_roles)
router.patch(
  '/:id',
  hasPermission('manage_roles'),
  validateRole,
  ctrl.updateRole
);

// Soft delete (ต้องมีสิทธิ์ manage_roles)
router.delete(
  '/:id',
  hasPermission('manage_roles'),
  ctrl.deleteRole
);

// Force delete (ต้องมีสิทธิ์ manage_roles)
router.delete(
  '/:id/force',
  hasPermission('manage_roles'),
  ctrl.forceDeleteRole
);

// อัปเดต allowedPages (ต้องมีสิทธิ์ manage_roles)
router.patch(
  '/:id/pages',
  hasPermission('manage_roles'),
  validateAllowedPage,
  ctrl.updateAllowedPages
);

// อัปเดต allowedBranches (ต้องมีสิทธิ์ manage_roles)
router.patch(
  '/:id/branches',
  hasPermission('manage_roles'),
  validateAllowedBranch,
  ctrl.updateAllowedBranches
);

module.exports = router;
