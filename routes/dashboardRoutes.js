// routes/dashboardRoutes.js
const express = require('express');
const router  = express.Router();
const authJWT = require('../middlewares/authJWT');
const hasPermission = require('../middlewares/permission'); // เพิ่ม import สำหรับตรวจสอบสิทธิ์
const dashboardController = require('../controllers/dashboardController');

// สถิติหลัก
router.get(
  '/stats',
  authJWT,
  hasPermission('dashboard:read'),
  dashboardController.getStats
);

// รายงานสรุปต่างๆ
router.get(
  '/summary',
  authJWT,
  hasPermission('dashboard:read'),
  dashboardController.getSummary
);
router.get(
  '/trends',
  authJWT,
  hasPermission('dashboard:read'),
  dashboardController.getTrends
);
router.get(
  '/status-distribution',
  authJWT,
  hasPermission('dashboard:read'),
  dashboardController.getStatusDistribution
);
router.get(
  '/proportions',
  authJWT,
  hasPermission('dashboard:read'),
  dashboardController.getProportions
);
router.get(
  '/recent-loans',
  authJWT,
  hasPermission('dashboard:read'),
  dashboardController.getRecentLoans
);

module.exports = router;
