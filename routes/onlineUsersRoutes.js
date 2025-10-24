// routes/onlineUsersRoutes.js
const express = require('express');
const router = express.Router();

const {
  getOnlineUsers,
  getBlockedUsers,
  updateHeartbeat,
  kickUser,
  blockUser,
  unblockUser,
  getUserSessions,
  terminateSession
} = require('../controllers/onlineUsersController');

const authJWT = require('../middlewares/authJWT');
const hasPermission = require('../middlewares/permission');

// All routes require authentication
router.use(authJWT);

// Get online users - any authenticated user can view
router.get('/online', getOnlineUsers);

// Get blocked users - admin only
router.get('/blocked', hasPermission('users:read'), getBlockedUsers);

// Update heartbeat - for current user
router.post('/heartbeat', updateHeartbeat);

// Admin only routes
router.post('/:id/kick', hasPermission('users:delete'), kickUser);
router.post('/:id/block', hasPermission('users:delete'), blockUser);
router.post('/:id/unblock', hasPermission('users:update'), unblockUser);

// Get user sessions - user can see own, admin can see all
router.get('/:id/sessions', getUserSessions);

// Terminate session - user can terminate own session
router.delete('/sessions/:sessionId', terminateSession);

module.exports = router;
