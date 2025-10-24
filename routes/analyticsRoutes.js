// backend/routes/analyticsRoutes.js
const express      = require('express');
const router       = express.Router();
const analyticsCtrl= require('../controllers/analyticsController');
const authJWT      = require('../middlewares/authJWT');
const hasPermission = require('../middlewares/permission');

router.get(
  '/views',
  authJWT,
  hasPermission('analytics:read'),
  analyticsCtrl.getViews
);

module.exports = router;
