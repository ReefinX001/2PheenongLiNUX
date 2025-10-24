// Refresh Token Model
const mongoose = require('mongoose');
const crypto = require('crypto');

const refreshTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  deviceInfo: {
    userAgent: String,
    ip: String,
    deviceId: String,
    platform: String,
    browser: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  revokedAt: {
    type: Date,
    default: null
  },
  revokedReason: {
    type: String,
    enum: ['logout', 'security', 'expired', 'replaced', 'admin'],
    default: null
  },
  replacedByToken: {
    type: String,
    default: null
  },
  lastUsedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
    // TTL index defined separately below
  }
}, {
  timestamps: true
});

// Indexes for performance and cleanup
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
refreshTokenSchema.index({ userId: 1, isActive: 1 });
refreshTokenSchema.index({ createdAt: 1 });

// Instance methods
refreshTokenSchema.methods.revoke = async function(reason = 'logout') {
  this.isActive = false;
  this.revokedAt = new Date();
  this.revokedReason = reason;
  return await this.save();
};

refreshTokenSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

refreshTokenSchema.methods.updateLastUsed = async function() {
  this.lastUsedAt = new Date();
  return await this.save();
};

// Static methods
refreshTokenSchema.statics.generateToken = function() {
  return crypto.randomBytes(40).toString('hex');
};

refreshTokenSchema.statics.createToken = async function(userId, deviceInfo, expiresIn = 7) {
  const token = this.generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresIn);

  const refreshToken = await this.create({
    token,
    userId,
    deviceInfo,
    expiresAt
  });

  return refreshToken;
};

refreshTokenSchema.statics.findValidToken = async function(token) {
  const refreshToken = await this.findOne({
    token,
    isActive: true
  });

  if (!refreshToken) return null;
  if (refreshToken.isExpired()) {
    await refreshToken.revoke('expired');
    return null;
  }

  return refreshToken;
};

refreshTokenSchema.statics.revokeUserTokens = async function(userId, reason = 'logout') {
  return await this.updateMany(
    { userId, isActive: true },
    {
      isActive: false,
      revokedAt: new Date(),
      revokedReason: reason
    }
  );
};

refreshTokenSchema.statics.revokeDeviceTokens = async function(userId, deviceId, reason = 'security') {
  return await this.updateMany(
    { userId, 'deviceInfo.deviceId': deviceId, isActive: true },
    {
      isActive: false,
      revokedAt: new Date(),
      revokedReason: reason
    }
  );
};

refreshTokenSchema.statics.cleanupExpired = async function() {
  const expiredDate = new Date();
  expiredDate.setDate(expiredDate.getDate() - 30); // Keep for 30 days after expiry

  return await this.deleteMany({
    expiresAt: { $lt: expiredDate }
  });
};

refreshTokenSchema.statics.rotateToken = async function(oldToken, deviceInfo) {
  const existingToken = await this.findValidToken(oldToken);
  if (!existingToken) return null;

  // Revoke old token
  existingToken.isActive = false;
  existingToken.revokedAt = new Date();
  existingToken.revokedReason = 'replaced';

  // Create new token
  const newToken = await this.createToken(existingToken.userId, deviceInfo);

  // Link tokens
  existingToken.replacedByToken = newToken.token;
  await existingToken.save();

  return newToken;
};

// Detect token reuse attack
refreshTokenSchema.statics.detectReuse = async function(token) {
  const usedToken = await this.findOne({
    token,
    isActive: false,
    revokedReason: 'replaced'
  });

  if (usedToken) {
    // Token reuse detected - revoke entire token family
    console.error('⚠️ SECURITY: Refresh token reuse detected!', {
      userId: usedToken.userId,
      token: token.substring(0, 10) + '...'
    });

    // Revoke all user tokens for security
    await this.revokeUserTokens(usedToken.userId, 'security');
    return true;
  }

  return false;
};

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);