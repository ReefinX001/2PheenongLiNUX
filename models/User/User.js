// models/User/User.js
const mongoose = require('mongoose');
const bcrypt   = require('bcrypt');

// ✅ เพิ่ม helper function normalizeIP ที่นี่ (ด้านบนก่อน UserSchema)
function normalizeIP(ip) {
  if (!ip) return 'Unknown';
  // Remove IPv6 prefix for IPv4 addresses
  if (ip.substr(0, 7) === '::ffff:') {
    return ip.substr(7);
  }
  // Handle localhost variations
  if (ip === '::1') return '127.0.0.1';
  return ip;
}

const UserSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    unique: true
  },
  username: {
    type: String,
    unique: true,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserRole',
    required: true
  },
  allowedBranches: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    default: []
  }],
  checkinBranches: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    default: []
  }],
  defaultBranches: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    default: []
  }],

  // ✅ currentSession สำหรับ track session ปัจจุบัน
  currentSession: {
    token: { type: String, select: false }, // ซ่อน token ใน query ปกติ
    ip: String,
    device: String,
    userAgent: String,
    loginAt: Date,
    lastActivity: Date
  },

  // Token version สำหรับ invalidate refresh tokens
  tokenVersion: {
    type: Number,
    default: 0,
    select: false // ซ่อนใน query ปกติ
  },

  // ✅ เพิ่ม loginHistory
  loginHistory: [{
    ip: String,
    device: String,
    userAgent: String,
    loginAt: Date,
    logoutAt: Date,
    logoutReason: {
      type: String,
      enum: ['manual', 'new_login', 'new_login_same_device', 'admin_force', 'timeout', 'blocked']
    }
  }],

  // ======= คงไว้สำหรับ track online status =======
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: null
  },
  loginCount: {
    type: Number,
    default: 0
  },

  // สำหรับ block user
  isBlocked: {
    type: Boolean,
    default: false,
    select: false // ซ่อนใน query ปกติ
  },
  blockedAt: Date,
  blockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  blockReason: String
}, {
  collection: 'users',
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform(doc, ret) {
      delete ret.password;
      delete ret.currentSession?.token; // ซ่อน token
      return ret;
    }
  }
});

// สร้าง virtual field ชื่อ photoUrl ให้ไปดึงจาก employee.imageUrl
UserSchema.virtual('photoUrl').get(function() {
  return this.employee?.imageUrl || null;
});

// hash password ก่อน save
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (err) {
    next(err);
  }
});

// ตรวจ password
UserSchema.methods.checkPassword = function(plain) {
  return bcrypt.compare(plain, this.password);
};

// ✅ Method ใหม่: Login และสร้าง session (แก้ไขแล้ว)
UserSchema.methods.createSession = async function(token, ip, device, userAgent) {
  // Normalize IP before saving
  const normalizedIP = normalizeIP(ip);

  // ถ้ามี session เก่าจาก IP อื่น -> บันทึกประวัติ
  if (this.currentSession && this.currentSession.ip && this.currentSession.ip !== normalizedIP) {
    this.loginHistory.push({
      ip: this.currentSession.ip,
      device: this.currentSession.device,
      userAgent: this.currentSession.userAgent,
      loginAt: this.currentSession.loginAt,
      logoutAt: new Date(),
      logoutReason: 'new_login'
    });

    // เก็บประวัติไว้แค่ 20 รายการล่าสุด
    if (this.loginHistory.length > 20) {
      this.loginHistory = this.loginHistory.slice(-20);
    }
  }

  // สร้าง session ใหม่ด้วย normalized IP
  this.currentSession = {
    token,
    ip: normalizedIP,
    device,
    userAgent,
    loginAt: new Date(),
    lastActivity: new Date()
  };

  // Update status
  this.isOnline = true;
  this.lastLogin = new Date();
  this.loginCount = (this.loginCount || 0) + 1;

  return this.save();
};

// ✅ Method ใหม่: Logout
UserSchema.methods.logout = async function(reason = 'manual') {
  if (this.currentSession) {
    // บันทึกประวัติ
    this.loginHistory.push({
      ip: this.currentSession.ip,
      device: this.currentSession.device,
      userAgent: this.currentSession.userAgent,
      loginAt: this.currentSession.loginAt,
      logoutAt: new Date(),
      logoutReason: reason
    });

    // ลบ session
    this.currentSession = undefined;
  }

  // Update status
  this.isOnline = false;
  this.lastSeen = new Date();

  return this.save();
};

// ✅ Method ใหม่: Validate session (แก้ไขให้ normalize IP ด้วย)
UserSchema.methods.validateSession = function(token, ip) {
  if (!this.currentSession) return false;
  if (this.currentSession.token !== token) return false;

  // Normalize IP ก่อนเปรียบเทียบ
  const normalizedIP = normalizeIP(ip);
  if (this.currentSession.ip !== normalizedIP) return false;

  return true;
};

// ✅ Method ใหม่: Update activity
UserSchema.methods.updateActivity = async function() {
  if (this.currentSession) {
    this.currentSession.lastActivity = new Date();
    this.lastSeen = new Date();
    return this.save();
  }
};

// Static method สำหรับดึง online users
UserSchema.statics.getOnlineUsers = function() {
  return this.find({ isOnline: true })
    .populate('employee', 'name email imageUrl position department')
    .populate('role', 'name')
    .select('-password -currentSession.token');
};

// ✅ Static method ใหม่: Force logout user
UserSchema.statics.forceLogout = async function(userId, adminId, reason) {
  const user = await this.findById(userId);
  if (!user) return null;

  user.blockedBy = adminId;
  user.blockReason = reason;

  return user.logout('admin_force');
};

// ✅ Static method: Clean up inactive sessions
UserSchema.statics.cleanupInactiveSessions = async function() {
  const inactiveThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 ชั่วโมง

  const users = await this.find({
    'currentSession.lastActivity': { $lt: inactiveThreshold }
  });

  for (const user of users) {
    await user.logout('timeout');
  }

  return users.length;
};

// Index สำหรับ performance
UserSchema.index({ 'currentSession.token': 1 });
UserSchema.index({ 'currentSession.ip': 1 });
UserSchema.index({ isOnline: 1 });
// Note: username index is automatically created by 'unique: true' in schema

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
