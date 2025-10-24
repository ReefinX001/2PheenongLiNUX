/**
 * models/Points/Member.js - โมเดลสมาชิกระบบสะสมแต้ม
 */

const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  // ข้อมูลพื้นฐาน
  memberId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  memberCode: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // ข้อมูลส่วนตัว
  personalInfo: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: { type: String, required: true, index: true },
    email: { type: String, default: '' },
    birthDate: { type: Date },
    idCard: { type: String, default: '' },
    address: {
      street: String,
      district: String,
      province: String,
      postalCode: String
    }
  },

  // สถานะสมาชิก
  memberLevel: {
    type: String,
    enum: ['Member', 'Diamond', 'VIP'],
    default: 'Member'
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'inactive'],
    default: 'active'
  },

  // แต้มสะสม
  points: {
    current: { type: Number, default: 0, min: 0 },
    lifetime: { type: Number, default: 0, min: 0 },
    used: { type: Number, default: 0, min: 0 }
  },

  // ข้อมูลการแนะนำ
  referral: {
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      default: null
    },
    referredByPhone: { type: String, default: '' },
    referredCount: { type: Number, default: 0 },
    referralCode: { type: String, unique: true, sparse: true }
  },

  // สาขาที่สมัครสมาชิก
  branch: {
    code: { type: String, required: true },
    name: { type: String, required: true }
  },

  // ข้อมูลการซื้อ
  purchaseHistory: {
    totalPurchases: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    lastPurchaseDate: { type: Date },
    firstPurchaseDate: { type: Date }
  },

  // การตั้งค่าการแจ้งเตือน
  preferences: {
    smsNotification: { type: Boolean, default: true },
    emailNotification: { type: Boolean, default: false },
    promotionNotification: { type: Boolean, default: true }
  },

  // ข้อมูลระบบ
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastActiveAt: { type: Date, default: Date.now }
});

// Indexes
memberSchema.index({ 'personalInfo.phone': 1 });
memberSchema.index({ 'personalInfo.firstName': 'text', 'personalInfo.lastName': 'text' });
memberSchema.index({ memberLevel: 1, status: 1 });
memberSchema.index({ 'branch.code': 1 });
memberSchema.index({ createdAt: -1 });

// Virtual สำหรับชื่อเต็ม
memberSchema.virtual('fullName').get(function() {
  return `${this.personalInfo.firstName} ${this.personalInfo.lastName}`.trim();
});

// Virtual สำหรับสถานะแต้ม
memberSchema.virtual('pointsStatus').get(function() {
  if (this.points.current >= 10000) return 'VIP';
  if (this.points.current >= 5000) return 'Diamond';
  return 'Member';
});

// Pre-save middleware
memberSchema.pre('save', function(next) {
  this.updatedAt = new Date();

  // สร้าง referral code ถ้ายังไม่มี
  if (!this.referral.referralCode) {
    this.referral.referralCode = this.memberCode;
  }

  next();
});

// Methods
memberSchema.methods.addPoints = function(points, reason, transactionId) {
  this.points.current += points;
  this.points.lifetime += points;
  this.lastActiveAt = new Date();

  // สร้างประวัติการได้แต้ม
  return this.constructor.model('PointTransaction').create({
    member: this._id,
    type: 'earn',
    points: points,
    reason: reason,
    transactionId: transactionId,
    balanceAfter: this.points.current
  });
};

memberSchema.methods.usePoints = function(points, reason, transactionId) {
  if (this.points.current < points) {
    throw new Error('แต้มไม่เพียงพอ');
  }

  this.points.current -= points;
  this.points.used += points;
  this.lastActiveAt = new Date();

  // สร้างประวัติการใช้แต้ม
  return this.constructor.model('PointTransaction').create({
    member: this._id,
    type: 'redeem',
    points: -points,
    reason: reason,
    transactionId: transactionId,
    balanceAfter: this.points.current
  });
};

memberSchema.methods.canUsePoints = function(points) {
  return this.points.current >= points && this.status === 'active';
};

// Static methods
memberSchema.statics.findByPhone = function(phone) {
  return this.findOne({ 'personalInfo.phone': phone, status: 'active' });
};

memberSchema.statics.findByMemberCode = function(code) {
  return this.findOne({ memberCode: code, status: 'active' });
};

memberSchema.statics.generateMemberCode = async function(branchCode) {
  const prefix = branchCode || '000';
  const count = await this.countDocuments({});
  const sequence = String(count + 1).padStart(6, '0');
  return `${prefix}${sequence}`;
};

// Export
module.exports = mongoose.models.Member || mongoose.model('Member', memberSchema);
