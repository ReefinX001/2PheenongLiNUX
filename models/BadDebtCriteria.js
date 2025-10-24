const mongoose = require('mongoose');

const BadDebtCriteriaSchema = new mongoose.Schema({
  allowance: {
    type: Number,
    default: 5.0,
    min: 0,
    max: 100,
    required: true
  },
  doubtful: {
    type: Number,
    default: 2.0,
    min: 0,
    max: 100,
    required: true
  },
  badDebt: {
    type: Number,
    default: 1.0,
    min: 0,
    max: 100,
    required: true
  },
  repossession: {
    type: Number,
    default: 500,
    min: 0,
    required: true
  },
  policyNotes: {
    type: String,
    default: 'เกณฑ์การพิจารณาหนี้สงสัยจะสูญ:\n1. ค่าเผื่อหนี้สงสัยจะสูญ: ลูกหนี้ที่มีอายุหนี้ 60-90 วัน\n2. หนี้สงสัยจะสูญ: ลูกหนี้ที่มีอายุหนี้ 90-180 วัน\n3. หนี้สูญ: ลูกหนี้ที่มีอายุหนี้เกิน 180 วัน หรือไม่สามารถติดต่อได้ หรือเสียชีวิตโดยไม่มีผู้รับผิดชอบหนี้'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index สำหรับการค้นหาเกณฑ์ล่าสุด
BadDebtCriteriaSchema.index({ createdAt: -1 });

// Method สำหรับดึงเกณฑ์ปัจจุบัน
BadDebtCriteriaSchema.statics.getCurrentCriteria = async function() {
  let criteria = await this.findOne().sort({ createdAt: -1 }).lean();

  if (!criteria) {
    // สร้างเกณฑ์เริ่มต้น
    criteria = await this.create({
      allowance: 5.0,
      doubtful: 2.0,
      badDebt: 1.0,
      repossession: 500,
      policyNotes: 'เกณฑ์การพิจารณาหนี้สงสัยจะสูญ:\n1. ค่าเผื่อหนี้สงสัยจะสูญ: ลูกหนี้ที่มีอายุหนี้ 60-90 วัน\n2. หนี้สงสัยจะสูญ: ลูกหนี้ที่มีอายุหนี้ 90-180 วัน\n3. หนี้สูญ: ลูกหนี้ที่มีอายุหนี้เกิน 180 วัน หรือไม่สามารถติดต่อได้ หรือเสียชีวิตโดยไม่มีผู้รับผิดชอบหนี้'
    });
  }

  return criteria;
};

// Method สำหรับคำนวณค่าเผื่อหนี้สูญ
BadDebtCriteriaSchema.statics.calculateAllowance = function(agingDays, remainingAmount, criteria = null) {
  if (!criteria) {
    // ใช้ค่าเริ่มต้น
    criteria = {
      allowance: 5.0,
      doubtful: 2.0,
      badDebt: 1.0
    };
  }

  if (remainingAmount <= 0) {
    return { status: 'completed', allowanceAmount: 0 };
  }

  if (agingDays <= 30) {
    return { status: 'active', allowanceAmount: 0 };
  } else if (agingDays <= 90) {
    return {
      status: 'allowance',
      allowanceAmount: remainingAmount * (criteria.allowance / 100)
    };
  } else if (agingDays <= 180) {
    return {
      status: 'doubtful',
      allowanceAmount: remainingAmount * (criteria.doubtful / 100)
    };
  } else {
    return {
      status: 'baddebt',
      allowanceAmount: remainingAmount * (criteria.badDebt / 100)
    };
  }
};

module.exports = mongoose.models.BadDebtCriteria || mongoose.model('BadDebtCriteria', BadDebtCriteriaSchema);