const mongoose = require('mongoose');

const leavePolicySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    default: 'นโยบายการลาบริษัท'
  },
  year: {
    type: Number,
    required: true,
    default: () => new Date().getFullYear()
  },
  policy: {
    annual: {
      days: { type: Number, default: 10, min: 0 },      // ลาพักร้อน (วัน/ปี)
      description: { type: String, default: 'ลาพักร้อน' }
    },
    sick: {
      days: { type: Number, default: 30, min: 0 },      // ลาป่วย (วัน/ปี)
      description: { type: String, default: 'ลาป่วย' }
    },
    personal: {
      days: { type: Number, default: 3, min: 0 },       // ลากิจ (วัน/ปี)
      description: { type: String, default: 'ลากิจ' }
    },
    special: {
      days: { type: Number, default: 5, min: 0 },       // ลาพิเศษ (วัน/ปี)
      description: { type: String, default: 'ลาพิเศษ' }
    },
    maternity: {
      days: { type: Number, default: 98, min: 0 },      // ลาคลอด (วัน/ปี)
      description: { type: String, default: 'ลาคลอด' }
    },
    paternity: {
      days: { type: Number, default: 15, min: 0 },      // ลาบิดา (วัน/ปี)
      description: { type: String, default: 'ลาบิดา' }
    }
  },
  rules: {
    carryForward: {
      enabled: { type: Boolean, default: true },        // อนุญาตยกวันลาไปปีถัดไป
      maxDays: { type: Number, default: 5 },            // จำนวนวันสูงสุดที่ยกไปได้
      types: [{ type: String, enum: ['annual', 'sick', 'personal', 'special'] }] // ประเภทที่อนุญาต
    },
    advanceLeave: {
      enabled: { type: Boolean, default: false },       // อนุญาตลาล่วงหน้า
      maxDays: { type: Number, default: 5 }            // จำนวนวันสูงสุดที่ลาล่วงหน้าได้
    },
    minimumNotice: {
      enabled: { type: Boolean, default: true },        // กำหนดการแจ้งล่วงหน้า
      days: { type: Number, default: 1 },              // จำนวนวันที่ต้องแจ้งล่วงหน้า
      excludeTypes: [{ type: String }]                  // ประเภทที่ยกเว้น (เช่น ลาป่วย)
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  effectiveDate: {
    type: Date,
    default: () => new Date()
  },
  expiryDate: {
    type: Date,
    default: () => {
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      nextYear.setMonth(11, 31); // 31 ธันวาคม
      return nextYear;
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  version: {
    type: String,
    default: '1.0'
  },
  notes: {
    type: String,
    maxlength: 1000
  }
}, {
  timestamps: true
});

// Index สำหรับการค้นหา
leavePolicySchema.index({ year: -1, isActive: 1 });
leavePolicySchema.index({ effectiveDate: 1, expiryDate: 1 });

// Virtual field สำหรับคำนวณวันลารวม
leavePolicySchema.virtual('totalDays').get(function() {
  const policy = this.policy;
  return (policy.annual?.days || 0) + (policy.sick?.days || 0) +
         (policy.personal?.days || 0) + (policy.special?.days || 0) +
         (policy.maternity?.days || 0) + (policy.paternity?.days || 0);
});

// Static method สำหรับหานโยบายที่ใช้งานอยู่
leavePolicySchema.statics.getCurrentPolicy = function(year) {
  const targetYear = year || new Date().getFullYear();
  const now = new Date();

  return this.findOne({
    year: targetYear,
    isActive: true,
    effectiveDate: { $lte: now },
    expiryDate: { $gte: now }
  }).populate('createdBy', 'username employee.name')
    .populate('updatedBy', 'username employee.name');
};

// Static method สำหรับสร้างนโยบายเริ่มต้น
leavePolicySchema.statics.createDefault = function(year, createdBy, customPolicy = {}) {
  const defaultYear = year || new Date().getFullYear();

  // Default policy values - these can be overridden by customPolicy parameter
  const defaultValues = {
    annual: { days: 6, description: 'ลาพักร้อนประจำปี' },
    sick: { days: 30, description: 'ลาป่วยตามใบรับรองแพทย์' },
    personal: { days: 3, description: 'ลากิจส่วนตัว' },
    special: { days: 5, description: 'ลาพิเศษ เช่น งานแต่ง อุปสมบท' },
    maternity: { days: 98, description: 'ลาคลอดบุตร' },
    paternity: { days: 15, description: 'ลาคลอดบุตรสำหรับบิดา' }
  };

  // Merge default values with custom policy
  const policyValues = { ...defaultValues, ...customPolicy };

  return this.create({
    name: `นโยบายการลาประจำปี ${defaultYear}`,
    year: defaultYear,
    policy: policyValues,
    rules: {
      carryForward: {
        enabled: true,
        maxDays: 5,
        types: ['annual']
      },
      advanceLeave: {
        enabled: false,
        maxDays: 5
      },
      minimumNotice: {
        enabled: true,
        days: 1,
        excludeTypes: ['sick']
      }
    },
    isActive: true,
    effectiveDate: new Date(defaultYear, 0, 1), // 1 มกราคม
    expiryDate: new Date(defaultYear, 11, 31), // 31 ธันวาคม
    createdBy,
    updatedBy: createdBy
  });
};

// Method สำหรับตรวจสอบว่าสามารถใช้วันลาได้หรือไม่
leavePolicySchema.methods.canTakeLeave = function(leaveType, requestedDays, currentUsed) {
  const typePolicy = this.policy[leaveType];
  if (!typePolicy) return { allowed: false, reason: 'ประเภทการลาไม่ถูกต้อง' };

  const remaining = typePolicy.days - (currentUsed || 0);
  if (requestedDays > remaining) {
    return {
      allowed: false,
      reason: `วันลาไม่เพียงพอ (เหลือ ${remaining} วัน)`,
      remaining
    };
  }

  return { allowed: true, remaining: remaining - requestedDays };
};

// Method สำหรับดึงข้อมูลนโยบายในรูปแบบที่อ่านง่าย
leavePolicySchema.methods.getSummary = function() {
  return {
    name: this.name,
    year: this.year,
    totalDays: this.totalDays,
    policy: {
      annual: `${this.policy.annual.days} วัน`,
      sick: `${this.policy.sick.days} วัน`,
      personal: `${this.policy.personal.days} วัน`,
      special: `${this.policy.special.days} วัน`,
      maternity: `${this.policy.maternity.days} วัน`,
      paternity: `${this.policy.paternity.days} วัน`
    },
    effectivePeriod: `${this.effectiveDate.toLocaleDateString('th-TH')} - ${this.expiryDate.toLocaleDateString('th-TH')}`
  };
};

module.exports = mongoose.model('LeavePolicy', leavePolicySchema);