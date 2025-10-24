const mongoose = require('mongoose');

const commissionSettingsSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: { type: String },
  isActive: { type: Boolean, default: true },

  // กฎการคำนวณค่าคอมมิชชั่น
  rules: [{
    ruleType: {
      type: String,
      enum: ['percentage', 'fixed', 'tiered'],
      required: true
    },
    saleType: {
      type: String,
      enum: ['cash', 'installment', 'deposit', 'all'],
      required: true
    },

    // สำหรับ percentage
    percentageRate: { type: Number },

    // สำหรับ fixed
    fixedAmount: { type: Number },

    // สำหรับ tiered (ขั้นบันได)
    tiers: [{
      minAmount: { type: Number },
      maxAmount: { type: Number },
      rate: { type: Number } // เปอร์เซ็นต์
    }],

    // เงื่อนไขเพิ่มเติม
    conditions: {
      minSaleAmount: { type: Number, default: 0 },
      maxSaleAmount: { type: Number },
      productCategories: [{ type: String }],
      excludePromotions: { type: Boolean, default: false }
    },

    priority: { type: Number, default: 0 } // ลำดับความสำคัญในการคำนวณ
  }],

  // การตั้งค่าเป้าหมายและโบนัส
  targets: [{
    period: {
      type: String,
      enum: ['monthly', 'quarterly', 'yearly'],
      required: true
    },
    targetAmount: { type: Number, required: true },
    bonusType: {
      type: String,
      enum: ['percentage', 'fixed']
    },
    bonusValue: { type: Number }, // เปอร์เซ็นต์หรือจำนวนเงิน
    description: { type: String }
  }],

  // การตั้งค่าการจ่ายเงิน
  paymentSettings: {
    frequency: {
      type: String,
      enum: ['monthly', 'bi-weekly', 'weekly'],
      default: 'monthly'
    },
    paymentDay: { type: Number, min: 1, max: 31 }, // วันที่จ่าย
    minimumPayout: { type: Number, default: 0 }, // จำนวนเงินขั้นต่ำที่จะจ่าย
    carryOverUnpaid: { type: Boolean, default: true } // ยกยอดไปเดือนหน้าถ้าไม่ถึงขั้นต่ำ
  },

  // การตั้งค่าการอนุมัติ
  approvalSettings: {
    requireApproval: { type: Boolean, default: true },
    approvers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    autoApproveThreshold: { type: Number } // จำนวนเงินที่อนุมัติอัตโนมัติ
  },

  // พนักงานที่ใช้การตั้งค่านี้
  applicableEmployees: [{
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    customRules: [{ // กฎพิเศษสำหรับพนักงานแต่ละคน
      ruleType: String,
      value: Number,
      description: String
    }]
  }],

  // ข้อมูลการเปลี่ยนแปลง
  history: [{
    modifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    modifiedDate: { type: Date, default: Date.now },
    changes: { type: String },
    previousValues: { type: mongoose.Schema.Types.Mixed }
  }],

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  effectiveDate: { type: Date, default: Date.now },
  expiryDate: { type: Date }
}, {
  timestamps: true
});

// Index สำหรับการค้นหา
commissionSettingsSchema.index({ name: 1 });
commissionSettingsSchema.index({ isActive: 1 });
commissionSettingsSchema.index({ effectiveDate: 1, expiryDate: 1 });

// Method สำหรับคำนวณค่าคอมมิชชั่นตามกฎ
commissionSettingsSchema.methods.calculateCommission = function(saleAmount, saleType, productCategory = null) {
  let commission = 0;

  // หากฎที่เกี่ยวข้อง
  const applicableRules = this.rules.filter(rule =>
    (rule.saleType === saleType || rule.saleType === 'all') &&
    saleAmount >= (rule.conditions.minSaleAmount || 0) &&
    (!rule.conditions.maxSaleAmount || saleAmount <= rule.conditions.maxSaleAmount)
  ).sort((a, b) => b.priority - a.priority);

  if (applicableRules.length === 0) return 0;

  const rule = applicableRules[0]; // ใช้กฎที่มี priority สูงสุด

  switch (rule.ruleType) {
    case 'percentage':
      commission = (saleAmount * rule.percentageRate) / 100;
      break;

    case 'fixed':
      commission = rule.fixedAmount;
      break;

    case 'tiered':
      for (const tier of rule.tiers) {
        if (saleAmount >= tier.minAmount && (!tier.maxAmount || saleAmount <= tier.maxAmount)) {
          commission = (saleAmount * tier.rate) / 100;
          break;
        }
      }
      break;
  }

  return commission;
};

module.exports = mongoose.model('CommissionSettings', commissionSettingsSchema);