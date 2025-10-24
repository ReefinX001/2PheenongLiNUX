// routes/hr/attendanceRoutes.js
const express = require('express');
const router = express.Router();
const attendanceController = require('../../controllers/hr/attendanceController');
const authJWT = require('../../middlewares/authJWT');
const {
  hrRateLimit,
  attendanceValidation,
  handleValidationErrors,
  sanitizeHRData,
  validateBranchAccess
} = require('../../middlewares/hrValidation');

// Apply authentication and security middleware
router.use(authJWT);
router.use(sanitizeHRData);
router.use(hrRateLimit);

// Attendance routes with proper validation and security
router.get('/', validateBranchAccess, attendanceController.getAttendance);
router.get('/today', attendanceController.getTodayAttendance);
router.get('/current-session', attendanceController.getCurrentSession);
router.get('/accessible-branches', attendanceController.getAccessibleBranches);
router.get('/statistics', attendanceController.getAttendanceStatistics);

// Check in/out with validation
router.post('/checkin',
  attendanceValidation.checkin,
  handleValidationErrors,
  attendanceController.checkIn
);

router.post('/checkout',
  attendanceValidation.checkout,
  handleValidationErrors,
  attendanceController.checkOut
);

// HR management routes
router.post('/:id/approve',
  handleValidationErrors,
  attendanceController.approveAttendance
);

router.post('/:id/reject',
  handleValidationErrors,
  attendanceController.rejectAttendance
);

module.exports = router;