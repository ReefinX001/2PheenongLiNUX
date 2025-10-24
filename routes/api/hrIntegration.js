// routes/api/hrIntegration.js
// This file ensures all HR-related API endpoints are properly integrated
const express = require('express');
const router = express.Router();

// Import HR route modules
const attendanceRoutes = require('../hr/attendanceRoutes');
const workScheduleRoutes = require('../hr/workScheduleRoutes');
const overtimeRoutes = require('../hr/overtimeRoutes');

// Import zone and user routes for branch management
const zoneRoutes = require('../system/zoneRoutes');
const userRoutes = require('../system/userRoutes');

// Mount HR routes with proper API prefixes
router.use('/hr/attendance', attendanceRoutes);
router.use('/hr/work-schedules', workScheduleRoutes);
router.use('/hr/overtime', overtimeRoutes);

// Zone management (branches)
router.use('/zone', zoneRoutes);

// User management for employee data
router.use('/users', userRoutes);

module.exports = router;