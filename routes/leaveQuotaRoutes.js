// routes/leaveQuotaRoutes.js
const express = require('express');
const router = express.Router();
const { getAll, create, update, remove } = require('../controllers/leaveQuotaController');
const authJWT = require('../middlewares/authJWT');
const hasPermission = require('../middlewares/permission');

router.post(
  '/',
  authJWT,
  hasPermission('create_leave_quotas'),
  create
);

router.get(
  '/',
  authJWT,
  hasPermission('view_leave_quotas'),
  getAll
);

router.patch(
  '/:id',
  authJWT,
  hasPermission('edit_leave_quotas'),
  update
);

router.delete(
  '/:id',
  authJWT,
  hasPermission('delete_leave_quotas'),
  remove
);

module.exports = router;
