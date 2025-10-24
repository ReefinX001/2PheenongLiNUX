/**
 * models/Points/PointTransaction.js - โมเดลประวัติการทำรายการแต้ม
 */

const mongoose = require('mongoose');

const pointTransactionSchema = new mongoose.Schema({
  // ข้อมูลรายการ
  transactionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // สมาชิก
  member: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true,
    index: true
  },

  // ประเภทรายการ
  type: {
    type: String,
    enum: ['earn', 'redeem', 'expire', 'adjustment', 'bonus', 'referral'],
    required: true,
    index: true
  },

  // จำนวนแต้ม (บวกสำหรับได้รับ, ลบสำหรับใช้)
  points: {
    type: Number,
    required: true
  },

  // ยอดแต้มหลังทำรายการ
  balanceAfter: {
    type: Number,
    required: true,
    min: 0
  },

  // เหตุผล/รายละเอียด
  reason: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },

  // ข้อมูลการซื้อ (ถ้าเกี่ยวข้อง)
  purchase: {
    orderId: { type: mongoose.Schema.Types.ObjectId },
    orderType: {
      type: String,
      enum: ['CashSale', 'InstallmentOrder', 'Accessories']
    },
    orderNumber: String,
    amount: { type: Number, default: 0 },
    items: [{
      name: String,
      quantity: Number,
      price: Number
    }]
  },

  // ข้อมูลการแนะนำ (สำหรับแต้มแนะนำเพื่อน)
  referral: {
    referredMember: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member'
    },
    referrerMember: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member'
    },
    isFirstPurchase: { type: Boolean, default: false }
  },

  // วันหมดอายุ (สำหรับแต้มที่มีอายุ)
  expiresAt: {
    type: Date,
    index: { expireAfterSeconds: 0 }
  },

  // สาขาที่ทำรายการ
  branch: {
    code: { type: String, required: true },
    name: { type: String, required: true }
  },

  // พนักงานที่ทำรายการ
  staff: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true }
  },

  // สถานะ
  status: {
    type: String,
    enum: ['completed', 'pending', 'cancelled', 'expired'],
    default: 'completed',
    index: true
  },

  // ข้อมูลเพิ่มเติม
  metadata: {
    ip: String,
    userAgent: String,
    source: { type: String, default: 'pos' }, // pos, web, mobile, admin
    campaign: String
  },

  // ข้อมูลระบบ
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

// Compound indexes
pointTransactionSchema.index({ member: 1, createdAt: -1 });
pointTransactionSchema.index({ type: 1, createdAt: -1 });
pointTransactionSchema.index({ 'branch.code': 1, createdAt: -1 });
pointTransactionSchema.index({ status: 1, expiresAt: 1 });

// Pre-save middleware
pointTransactionSchema.pre('save', function(next) {
  this.updatedAt = new Date();

  // สร้าง transaction ID ถ้ายังไม่มี
  if (!this.transactionId) {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    this.transactionId = `PT${date}${random}`;
  }

  // ตั้งค่าวันหมดอายุสำหรับแต้มที่ได้รับ (1 ปี)
  if (this.type === 'earn' && !this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  }

  next();
});

// Virtual สำหรับการแสดงผล
pointTransactionSchema.virtual('displayType').get(function() {
  const types = {
    earn: 'ได้รับแต้ม',
    redeem: 'ใช้แต้ม',
    expire: 'แต้มหมดอายุ',
    adjustment: 'ปรับปรุงแต้ม',
    bonus: 'แต้มโบนัส',
    referral: 'แต้มแนะนำเพื่อน'
  };
  return types[this.type] || this.type;
});

pointTransactionSchema.virtual('isExpiringSoon').get(function() {
  if (!this.expiresAt) return false;
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  return this.expiresAt <= thirtyDaysFromNow;
});

// Static methods
pointTransactionSchema.statics.getExpiringPoints = function(daysFromNow = 30) {
  const expiryDate = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
  return this.find({
    type: 'earn',
    status: 'completed',
    expiresAt: { $lte: expiryDate },
    points: { $gt: 0 }
  }).populate('member');
};

pointTransactionSchema.statics.getMemberTransactions = function(memberId, limit = 50) {
  return this.find({ member: memberId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('member', 'memberCode personalInfo');
};

pointTransactionSchema.statics.getBranchTransactions = function(branchCode, startDate, endDate) {
  const query = { 'branch.code': branchCode };

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .populate('member', 'memberCode personalInfo');
};

// Methods
pointTransactionSchema.methods.cancel = function() {
  if (this.status !== 'completed') {
    throw new Error('ไม่สามารถยกเลิกรายการนี้ได้');
  }

  this.status = 'cancelled';
  this.updatedAt = new Date();

  // ต้องปรับปรุงยอดแต้มของสมาชิกด้วย
  return this.save();
};

// Export
module.exports = mongoose.model('PointTransaction', pointTransactionSchema);
