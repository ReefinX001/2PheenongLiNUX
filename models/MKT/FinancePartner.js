// models/MKT/FinancePartner.js
const mongoose = require('mongoose');

const financePartnerSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'กรุณาระบุรหัส Finance Partner'],
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: [10, 'รหัสต้องไม่เกิน 10 ตัวอักษร']
  },
  name: {
    type: String,
    required: [true, 'กรุณาระบุชื่อ Finance Partner'],
    trim: true,
    maxlength: [100, 'ชื่อต้องไม่เกิน 100 ตัวอักษร']
  },
  nameEn: {
    type: String,
    trim: true,
    maxlength: [100, 'ชื่อภาษาอังกฤษต้องไม่เกิน 100 ตัวอักษร']
  },
  type: {
    type: String,
    enum: {
      values: ['bank', 'financial_institution', 'leasing', 'credit_card', 'other'],
      message: 'ประเภท Finance Partner ไม่ถูกต้อง'
    },
    required: [true, 'กรุณาระบุประเภท Finance Partner']
  },
  // ข้อมูลติดต่อ
  contact: {
    address: {
      type: String,
      maxlength: [500, 'ที่อยู่ต้องไม่เกิน 500 ตัวอักษร']
    },
    phone: {
      type: String,
      match: [/^[0-9\-\+\(\)\s]{8,15}$/, 'รูปแบบหมายเลขโทรศัพท์ไม่ถูกต้อง']
    },
    email: {
      type: String,
      match: [/^\S+@\S+\.\S+$/, 'รูปแบบอีเมลไม่ถูกต้อง']
    },
    website: {
      type: String,
      match: [/^https?:\/\//, 'รูปแบบเว็บไซต์ไม่ถูกต้อง']
    }
  },
  // ข้อมูลการทำงาน
  services: [{
    type: String,
    enum: ['installment', 'personal_loan', 'business_loan', 'credit_card', 'leasing', 'hire_purchase']
  }],
  // อัตราดอกเบิ้ย
  interestRates: [{
    serviceType: {
      type: String,
      enum: ['installment', 'personal_loan', 'business_loan', 'credit_card', 'leasing', 'hire_purchase']
    },
    minRate: {
      type: Number,
      min: [0, 'อัตราดอกเบิ้ยต่ำสุดต้องไม่ติดลบ'],
      max: [100, 'อัตราดอกเบิ้ยต่ำสุดต้องไม่เกิน 100%']
    },
    maxRate: {
      type: Number,
      min: [0, 'อัตราดอกเบิ้ยสูงสุดต้องไม่ติดลบ'],
      max: [100, 'อัตราดอกเบิ้ยสูงสุดต้องไม่เกิน 100%']
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  // เงื่อนไขการอนุมัติ
  approvalCriteria: {
    minIncome: {
      type: Number,
      min: [0, 'รายได้ขั้นต่ำต้องไม่ติดลบ']
    },
    minAge: {
      type: Number,
      min: [18, 'อายุขั้นต่ำต้องไม่น้อยกว่า 18 ปี'],
      max: [100, 'อายุขั้นต่ำต้องไม่เกิน 100 ปี']
    },
    maxAge: {
      type: Number,
      min: [18, 'อายุสูงสุดต้องไม่น้อยกว่า 18 ปี'],
      max: [100, 'อายุสูงสุดต้องไม่เกิน 100 ปี']
    },
    requiredDocuments: [{
      type: String,
      enum: ['id_card', 'income_certificate', 'work_certificate', 'bank_statement', 'house_registration', 'other']
    }],
    processingTime: {
      min: { type: Number, min: 1 }, // วัน
      max: { type: Number, min: 1 }
    }
  },
  // การตั้งค่าระบบ
  apiConfig: {
    baseUrl: String,
    apiKey: String,
    isActive: {
      type: Boolean,
      default: true
    },
    lastSync: Date
  },
  // ข้อมูลสถิติ
  stats: {
    totalApplications: {
      type: Number,
      default: 0,
      min: [0, 'จำนวนใบสมัครต้องไม่ติดลบ']
    },
    approvedApplications: {
      type: Number,
      default: 0,
      min: [0, 'จำนวนการอนุมัติต้องไม่ติดลบ']
    },
    rejectedApplications: {
      type: Number,
      default: 0,
      min: [0, 'จำนวนการปฏิเสธต้องไม่ติดลบ']
    },
    averageApprovalTime: {
      type: Number,
      default: 0,
      min: [0, 'เวลาอนุมัติเฉลี่ยต้องไม่ติดลบ']
    }
  },
  // สถานะการใช้งาน
  isActive: {
    type: Boolean,
    default: true
  },
  // สาขาที่ใช้ได้ (ถ้าไม่ระบุ = ทุกสาขา)
  applicableBranches: [{
    type: String // branch_code
  }],
  // หมายเหตุ
  notes: {
    type: String,
    maxlength: [1000, 'หมายเหตุต้องไม่เกิน 1000 ตัวอักษร']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index สำหรับการค้นหา
financePartnerSchema.index({ code: 1 });
financePartnerSchema.index({ name: 1 });
financePartnerSchema.index({ type: 1 });
financePartnerSchema.index({ isActive: 1 });
financePartnerSchema.index({ applicableBranches: 1 });
financePartnerSchema.index({ 'services': 1 });

// Virtual สำหรับอัตราการอนุมัติ
financePartnerSchema.virtual('approvalRate').get(function() {
  if (this.stats.totalApplications === 0) return 0;
  return ((this.stats.approvedApplications / this.stats.totalApplications) * 100).toFixed(2);
});

// Virtual สำหรับสถานะการทำงาน
financePartnerSchema.virtual('status').get(function() {
  if (!this.isActive) return 'inactive';
  if (!this.apiConfig || !this.apiConfig.isActive) return 'api_disabled';
  return 'active';
});

// Static method สำหรับหา Finance Partners ที่ใช้ได้
financePartnerSchema.statics.findActivePartners = async function(filters = {}) {
  const query = { isActive: true };

  // Branch filter
  if (filters.branchCode) {
    query.$or = [
      { applicableBranches: { $size: 0 } }, // ทุกสาขา
      { applicableBranches: filters.branchCode }
    ];
  }

  // Service filter
  if (filters.serviceType) {
    query.services = filters.serviceType;
  }

  // Type filter
  if (filters.type) {
    query.type = filters.type;
  }

  return this.find(query).sort({ name: 1 });
};

// Method สำหรับอัพเดทสถิติ
financePartnerSchema.methods.updateStats = function(action, approvalTime = null) {
  switch (action) {
    case 'application':
      this.stats.totalApplications += 1;
      break;
    case 'approve':
      this.stats.approvedApplications += 1;
      if (approvalTime) {
        const total = this.stats.averageApprovalTime * (this.stats.approvedApplications - 1) + approvalTime;
        this.stats.averageApprovalTime = total / this.stats.approvedApplications;
      }
      break;
    case 'reject':
      this.stats.rejectedApplications += 1;
      break;
  }
  return this.save();
};

// Middleware to validate interest rates
financePartnerSchema.pre('save', function(next) {
  // ตรวจสอบว่า maxRate >= minRate
  for (let rate of this.interestRates) {
    if (rate.maxRate && rate.minRate && rate.maxRate < rate.minRate) {
      next(new Error('อัตราดอกเบิ้ยสูงสุดต้องมากกว่าหรือเท่ากับอัตราต่ำสุด'));
      return;
    }
  }

  // ตรวจสอบว่า maxAge >= minAge
  if (this.approvalCriteria.maxAge && this.approvalCriteria.minAge &&
      this.approvalCriteria.maxAge < this.approvalCriteria.minAge) {
    next(new Error('อายุสูงสุดต้องมากกว่าหรือเท่ากับอายุต่ำสุด'));
    return;
  }

  next();
});

module.exports = mongoose.models.FinancePartner || mongoose.model('FinancePartner', financePartnerSchema);