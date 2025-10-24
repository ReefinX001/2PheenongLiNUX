// controllers/onlineUsersController.js
const User = require('../../models/User/User');

/**
 * GET /api/users/online
 * ดึงรายชื่อผู้ใช้ที่กำลังออนไลน์
 */
exports.getOnlineUsers = async (req, res) => {
  try {
    const onlineUsers = await User.find({
      isOnline: true,
      isBlocked: false
    })
    .populate('employee', 'name email imageUrl position department')
    .populate('role', 'name')
    .select('username isOnline lastSeen lastLogin sessions')
    .lean();

    // Format data for frontend
    const formattedUsers = onlineUsers.map(user => {
      const activeSessions = user.sessions.filter(s => s.isActive);
      const latestSession = activeSessions[activeSessions.length - 1];

      return {
        _id: user._id,
        username: user.username,
        name: user.employee?.name || user.username,
        email: user.employee?.email || '',
        photoUrl: user.employee?.imageUrl || null,
        role: user.role?.name || '',
        position: user.employee?.position || '',
        department: user.employee?.department || '',
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        lastLogin: user.lastLogin,
        sessionInfo: latestSession ? {
          sessionId: latestSession.sessionId,
          device: latestSession.device,
          ip: latestSession.ip,
          loginTime: latestSession.loginTime,
          lastActivity: latestSession.lastActivity
        } : null,
        totalSessions: activeSessions.length
      };
    });

    return res.json({
      success: true,
      count: formattedUsers.length,
      data: formattedUsers
    });
  } catch (err) {
    console.error('getOnlineUsers error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch online users'
    });
  }
};

/**
 * GET /api/users/blocked
 * ดึงรายชื่อผู้ใช้ที่ถูกบล็อก
 */
exports.getBlockedUsers = async (req, res) => {
  try {
    const blockedUsers = await User.find({ isBlocked: true }).limit(100).lean()
      .populate('employee', 'name email imageUrl')
      .populate('role', 'name')
      .populate('blockedBy', 'username employee')
      .select('username isBlocked blockedAt blockedBy blockReason')
      .lean();

    const formattedUsers = blockedUsers.map(user => ({
      _id: user._id,
      username: user.username,
      name: user.employee?.name || user.username,
      email: user.employee?.email || '',
      photoUrl: user.employee?.imageUrl || null,
      role: user.role?.name || '',
      blockedAt: user.blockedAt,
      blockReason: user.blockReason,
      blockedBy: user.blockedBy ? {
        username: user.blockedBy.username,
        name: user.blockedBy.employee?.name || user.blockedBy.username
      } : null
    }));

    return res.json({
      success: true,
      count: formattedUsers.length,
      data: formattedUsers
    });
  } catch (err) {
    console.error('getBlockedUsers error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch blocked users'
    });
  }
};

/**
 * POST /api/users/heartbeat
 * อัพเดท activity status ของ user
 */
exports.updateHeartbeat = async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.body;

    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // อัพเดท last activity
    await user.setOnlineStatus(true, sessionId);

    // Emit to socket.io if available
    const io = req.app.get('io');
    if (io) {
      io.emit('userActivityUpdate', {
        userId: user._id,
        isOnline: true,
        lastSeen: user.lastSeen
      });
    }

    return res.json({
      success: true,
      message: 'Heartbeat updated'
    });
  } catch (err) {
    console.error('updateHeartbeat error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to update heartbeat'
    });
  }
};

/**
 * POST /api/users/:id/kick
 * เตะผู้ใช้ออกจากระบบ (Admin only)
 */
exports.kickUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user.id;

    // Check if requester is admin
    const admin = await User.findById(adminId).lean().populate('role');
    if (admin.role.name !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Permission denied'
      });
    }

    const targetUser = await User.findById(id).lean();
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Set user offline and clear sessions
    targetUser.isOnline = false;
    targetUser.sessions = [];
    await targetUser.save();

    // Emit kick event via socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('userKicked', {
        userId: targetUser._id,
        kickedBy: admin.username,
        reason: reason || 'Force logout by admin'
      });
    }

    // Log the action
    // console.log(`User ${targetUser.username} kicked by ${admin.username}`);

    return res.json({
      success: true,
      message: 'User kicked successfully'
    });
  } catch (err) {
    console.error('kickUser error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to kick user'
    });
  }
};

/**
 * POST /api/users/:id/block
 * บล็อกผู้ใช้ (Admin only)
 */
exports.blockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user.id;

    // Check if requester is admin
    const admin = await User.findById(adminId).lean().populate('role');
    if (admin.role.name !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Permission denied'
      });
    }

    const targetUser = await User.findById(id).lean();
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Block user
    targetUser.isBlocked = true;
    targetUser.blockedAt = new Date();
    targetUser.blockedBy = adminId;
    targetUser.blockReason = reason || 'No reason provided';
    targetUser.isOnline = false;
    targetUser.sessions = [];
    await targetUser.save();

    // Emit block event
    const io = req.app.get('io');
    if (io) {
      io.emit('userBlocked', {
        userId: targetUser._id,
        blockedBy: admin.username,
        reason: targetUser.blockReason
      });
    }

    return res.json({
      success: true,
      message: 'User blocked successfully'
    });
  } catch (err) {
    console.error('blockUser error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to block user'
    });
  }
};

/**
 * POST /api/users/:id/unblock
 * ปลดบล็อกผู้ใช้ (Admin only)
 */
exports.unblockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    // Check if requester is admin
    const admin = await User.findById(adminId).lean().populate('role');
    if (admin.role.name !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Permission denied'
      });
    }

    const targetUser = await User.findById(id).lean();
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Unblock user
    targetUser.isBlocked = false;
    targetUser.blockedAt = null;
    targetUser.blockedBy = null;
    targetUser.blockReason = null;
    await targetUser.save();

    // Emit unblock event
    const io = req.app.get('io');
    if (io) {
      io.emit('userUnblocked', {
        userId: targetUser._id,
        unblockedBy: admin.username
      });
    }

    return res.json({
      success: true,
      message: 'User unblocked successfully'
    });
  } catch (err) {
    console.error('unblockUser error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to unblock user'
    });
  }
};

/**
 * GET /api/users/:id/sessions
 * ดูรายละเอียด sessions ของ user (Admin only)
 */
exports.getUserSessions = async (req, res) => {
  try {
    const { id } = req.params;
    const requesterId = req.user.id;

    // Allow user to see their own sessions or admin to see all
    const requester = await User.findById(requesterId).lean().populate('role');
    if (requesterId !== id && requester.role.name !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Permission denied'
      });
    }

    const user = await User.findById(id).lean()
      .select('username sessions')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    return res.json({
      success: true,
      data: {
        username: user.username,
        sessions: user.sessions.map(s => ({
          sessionId: s.sessionId,
          device: s.device,
          ip: s.ip,
          loginTime: s.loginTime,
          lastActivity: s.lastActivity,
          isActive: s.isActive
        }))
      }
    });
  } catch (err) {
    console.error('getUserSessions error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch user sessions'
    });
  }
};

/**
 * DELETE /api/users/sessions/:sessionId
 * ลบ session (terminate session)
 */
exports.terminateSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    await user.removeSession(sessionId);

    // Emit session terminated event
    const io = req.app.get('io');
    if (io) {
      io.emit('sessionTerminated', {
        userId: user._id,
        sessionId
      });
    }

    return res.json({
      success: true,
      message: 'Session terminated successfully'
    });
  } catch (err) {
    console.error('terminateSession error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to terminate session'
    });
  }
};
