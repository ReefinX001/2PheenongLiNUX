/**
 * BadDebtCriteria Model
 * โมเดลสำหรับเก็บเกณฑ์การตั้งค่าหนี้สูญ
 * @version 1.0.0
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BadDebtCriteriaSchema = new Schema({
  // ค่าเผื่อหนี้สงสัยจะสูญ (%)
  allowance: {
    type: Number,
    default: 5.00,
    min: 0,
    max: 100,
    required: true,
    description: 'เปอร์เซ็นต์ของยอดหนี้คงค้างทั้งหมดที่คาดว่าจะเก็บเงินไม่ได้'
  },

  // หนี้สงสัยจะสูญ (%)
  doubtful: {
    type: Number,
    default: 2.00,
    min: 0,
    max: 100,
    required: true,
    description: 'เปอร์เซ็นต์ของหนี้ที่ค้างชำระเกินกำหนดและมีความไม่แน่นอนสูง'
  },

  // หนี้สูญ (%)
  badDebt: {
    type: Number,
    default: 1.00,
    min: 0,
    max: 100,
    required: true,
    description: 'เปอร์เซ็นต์ของหนี้ที่จะไม่ได้รับชำระคืนแน่นอน'
  },

  // ค่าใช้จ่ายในการยึดคืนสินค้า (บาทต่อสัญญา)
  repossession: {
    type: Number,
    default: 500,
    min: 0,
    required: true,
    description: 'ค่าใช้จ่ายโดยประมาณในการติดตามและยึดคืนสินค้า'
  },

  // คำอธิบายและนโยบายเพิ่มเติม
  policyNotes: {
    type: String,
    default: 'เกณฑ์การพิจารณาหนี้สงสัยจะสูญ:\n1. ค่าเผื่อหนี้สงสัยจะสูญ: ลูกหนี้ที่มีอายุหนี้ 60-90 วัน\n2. หนี้สงสัยจะสูญ: ลูกหนี้ที่มีอายุหนี้ 90-180 วัน\n3. หนี้สูญ: ลูกหนี้ที่มีอายุหนี้เกิน 180 วัน หรือไม่สามารถติดต่อได้ หรือเสียชีวิตโดยไม่มีผู้รับผิดชอบหนี้',
    maxlength: 5000
  },

  // ข้อมูลการอัพเดท
  updatedBy: {
    type: String,
    default: 'SYSTEM'
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'bad_debt_criteria'
});

// Indexes
BadDebtCriteriaSchema.index({ createdAt: -1 });
BadDebtCriteriaSchema.index({ updatedAt: -1 });

// Methods
BadDebtCriteriaSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

// Statics
BadDebtCriteriaSchema.statics.getCurrent = async function() {
  let criteria = await this.findOne().sort({ createdAt: -1 });

  if (!criteria) {
    // Create default criteria if none exists
    criteria = await this.create({
      allowance: 5.00,
      doubtful: 2.00,
      badDebt: 1.00,
      repossession: 500,
      policyNotes: 'เกณฑ์การพิจารณาหนี้สงสัยจะสูญ:\n1. ค่าเผื่อหนี้สงสัยจะสูญ: ลูกหนี้ที่มีอายุหนี้ 60-90 วัน\n2. หนี้สงสัยจะสูญ: ลูกหนี้ที่มีอายุหนี้ 90-180 วัน\n3. หนี้สูญ: ลูกหนี้ที่มีอายุหนี้เกิน 180 วัน'
    });
  }

  return criteria;
};

// Calculate debt status based on aging days
BadDebtCriteriaSchema.statics.calculateDebtStatus = function(agingDays) {
  if (agingDays > 180) {
    return {
      status: 'baddebt',
      statusText: 'หนี้สูญ',
      allowanceRate: 1.00
    };
  } else if (agingDays > 90) {
    return {
      status: 'doubtful',
      statusText: 'หนี้สงสัยจะสูญ',
      allowanceRate: 0.50
    };
  } else if (agingDays > 60) {
    return {
      status: 'allowance',
      statusText: 'ค่าเผื่อหนี้สงสัยจะสูญ',
      allowanceRate: 0.20
    };
  } else {
    return {
      status: 'active',
      statusText: 'ปกติ',
      allowanceRate: 0
    };
  }
};

module.exports = mongoose.model('BadDebtCriteria', BadDebtCriteriaSchema);