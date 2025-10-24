// routes/userRoutes.js
const express = require('express');
const router  = express.Router();
const rateLimit      = require('express-rate-limit');

const {
  createUser,
  loginUser,
  logoutUser,
  getLoggedInUser,
  getAllUsers,
  getUsersByBranch,
  getUsersByCheckinBranches,
  getUserById,
  updateUser,
  deleteUser,
  forceDeleteUser,
  checkQRLoginStatus,
  confirmQRLogin,
  getOnlineUsers,
  getBlockedUsers,
  // heartbeatUser, // ❌ ลบออก - ไม่มีแล้ว
  kickUser,
  createLoginRequest,
  checkLoginRequestStatus,
  approveLoginRequest,
  getLoginRequests,
  getLoginRequestHistory,  // ✅ เพิ่ม
  loginWithApprovedToken,
  blockUser,
  unblockUser,
  getUserSessions,
  // terminateSession // ❌ ลบออก - ไม่มีแล้ว
  getCurrentSession,    // ✅ เพิ่ม
  getLoginHistory,       // ✅ เพิ่ม
  // ✅ เพิ่ม Auto-Approval functions
  getAutoApprovalSettings,
  updateAutoApprovalSettings,
  toggleAutoApproval,
  runAutoApproval
} = require('../controllers/userController');

const authJWT       = require('../middlewares/authJWT');
const hasPermission = require('../middlewares/permission');
const {
  validateRegister,
  validateLogin,
  validateUpdate
} = require('../middlewares/validateUser');

// ── Rate Limiter for login routes ───────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 นาที
  max: 15, // เพิ่มจาก 5 เป็น 15 ครั้ง - เหมาะสมกว่า
  message: {
    success: false,
    error: 'มีความพยายามเข้าสู่ระบบมากเกินไป กรุณารอ 15 นาทีแล้วลองใหม่',
    retryAfter: 15 * 60, // seconds
    remainingTime: '15 นาที'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // ข้ามการ rate limit สำหรับ localhost และ trusted IPs
    const trusted = [
      '127.0.0.1',
      '::1',
      '::ffff:127.0.0.1',
      'localhost'
    ];
    return trusted.includes(req.ip) ||
           trusted.includes(req.connection.remoteAddress) ||
           process.env.NODE_ENV === 'development';
  },
  // onLimitReached ถูกลบออกใน express-rate-limit v7
  // ใช้ handler แทน
  handler: (req, res) => {
    console.log(`🚨 Login rate limit reached for IP: ${req.ip} at ${new Date().toISOString()}`);
    console.log(`User-Agent: ${req.get('User-Agent')}`);
    console.log(`Request URL: ${req.originalUrl}`);
    res.status(429).json({
      success: false,
      error: 'มีความพยายามเข้าสู่ระบบมากเกินไป กรุณารอ 15 นาทีแล้วลองใหม่',
      retryAfter: 15 * 60,
      remainingTime: '15 นาที'
    });
  }
});

// ── Public Routes ───────────────────────────────────────────────────
router.post(
  '/register',
  validateRegister,
  createUser
);

// เข้าสู่ระบบ (public)
router.post(
  '/login',
  loginLimiter,
  validateLogin,
  loginUser
);

// สร้างคำขออนุมัติเข้าสู่ระบบ (public - สำหรับกรณี checkout แล้ว)
router.post(
  '/login-request',
  loginLimiter,
  createLoginRequest
);

// ตรวจสอบสถานะคำขออนุมัติ (public)
router.get(
  '/login-request/:requestId/status',
  checkLoginRequestStatus
);

// เข้าสู่ระบบด้วย approved token (public)
router.post(
  '/login-approved',
  loginWithApprovedToken
);

// ตรวจสอบสถานะ QR login (public - เว็บเรียกมาเช็ค)
router.post(
  '/qr-login-status',
  checkQRLoginStatus
);

// ── Protected Routes ────────────────────────────────────────────────
router.use(authJWT);

// === User Profile ===
router.get(
  '/me',
  getLoggedInUser
);

// ✅ เพิ่ม alias '/profile' สำหรับ compatibility
router.get(
  '/profile',
  getLoggedInUser
);

// ❌ ลบ heartbeat route ออก (ไม่จำเป็นแล้ว)
// router.post(
//   '/heartbeat',
//   heartbeatUser
// );

// ✅ เพิ่ม routes ใหม่
router.get(
  '/current-session',
  getCurrentSession
);

router.get(
  '/login-history',
  getLoginHistory
);

// Logout
router.post(
  '/logout',
  logoutUser
);

// === QR Login ===
router.post(
  '/qr-login-confirm',
  confirmQRLogin
);

// === Login Requests Management (Admin/HR) ===
router.get(
  '/login-requests',
  hasPermission('users:read'),
  getLoginRequests
);

// ดึงประวัติคำขอ login (admin/HR)
router.get(
  '/login-requests/history',
  hasPermission('users:read'),
  getLoginRequestHistory
);

// อนุมัติ/ปฏิเสธคำขอเข้าสู่ระบบ (admin/HR)
router.post(
  '/login-request/:requestId/approve',
  hasPermission('users:update'),
  approveLoginRequest
);

// === Auto-Approval Settings (Admin/HR) ===
// ดึงการตั้งค่าอนุมัติอัตโนมัติ
router.get(
  '/auto-approval/settings',
  hasPermission('users:read'),
  getAutoApprovalSettings
);

// อัปเดตการตั้งค่าอนุมัติอัตโนมัติ
router.patch(
  '/auto-approval/settings',
  hasPermission('users:update'),
  updateAutoApprovalSettings
);

// เปิด/ปิดอนุมัติอัตโนมัติ (toggle)
router.post(
  '/auto-approval/toggle',
  hasPermission('users:update'),
  toggleAutoApproval
);

// รันอนุมัติอัตโนมัติแบบ manual
router.post(
  '/auto-approval/run',
  hasPermission('users:update'),
  runAutoApproval
);

// === User Management (Admin) ===
router.get(
  '/',
  getAllUsers  // Remove permission requirement for payroll system compatibility
);

// GET /api/users/by-branch/:branchId - ดึงผู้ใช้ที่มีสิทธิ์เข้าถึงสาขาเฉพาะ
router.get(
  '/by-branch/:branchId',
  authJWT,
  getUsersByBranch
);

// GET /api/users/by-checkinBranches/:branchId - ดึงผู้ใช้ที่มี checkinBranches สำหรับสาขาเฉพาะ
router.get(
  '/by-checkinBranches/:branchId',
  authJWT,
  getUsersByCheckinBranches
);

// ── เพิ่ม: ดูรายชื่อผู้ใช้ออนไลน์
router.get(
  '/online',
  hasPermission('users:read'),
  getOnlineUsers
);

// ── เพิ่ม: ดูรายชื่อผู้ใช้ที่ถูกบล็อก
router.get(
  '/blocked',
  hasPermission('users:read'),
  getBlockedUsers
);

// === User CRUD (Admin) ===
router.get(
  '/:id',
  hasPermission('users:read'),
  getUserById
);

// ต้องมีสิทธิ์อัปเดต users
router.patch(
  '/:id',
  hasPermission('users:update'),
  validateUpdate,
  updateUser
);

// ต้องมีสิทธิ์ลบ users (soft delete)
router.delete(
  '/:id',
  hasPermission('users:delete'),
  deleteUser
);

// ต้องมีสิทธิ์ลบ users (force delete)
router.delete(
  '/:id/force',
  hasPermission('users:delete'),
  forceDeleteUser
);

// เตะออก (admin only)
router.post(
  '/:id/kick',
  hasPermission('users:delete'),
  kickUser
);

// ====== ปรับปรุงดู Sessions ให้ส่งข้อมูลครบถ้วน ======
router.get(
  '/:id/sessions',
  hasPermission('users:read'),
  getUserSessions
);

// บล็อกผู้ใช้
router.post(
  '/:id/block',
  hasPermission('users:update'),
  blockUser
);

// ปลดบล็อกผู้ใช้
router.post(
  '/:id/unblock',
  hasPermission('users:update'),
  unblockUser
);

// ❌ ลบ terminate session route ออก (ไม่จำเป็นเพราะใช้ single session)
// router.post(
//   '/sessions/:sessionId/terminate',
//   hasPermission('users:delete'),
//   terminateSession
// );

module.exports = router;
