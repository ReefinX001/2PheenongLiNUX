/**
 * models/Points/PointsSettings.js - โมเดลการตั้งค่าระบบสะสมแต้ม
 */

const mongoose = require('mongoose');

const pointsSettingsSchema = new mongoose.Schema({
  // ข้อมูลพื้นฐาน
  settingsId: {
    type: String,
    required: true,
    unique: true,
    default: 'default'
  },

  // การให้แต้ม
  earning: {
    // แต้มจากการซื้อสินค้า
    cashSale: {
      enabled: { type: Boolean, default: true },
      rate: { type: Number, default: 0 }, // แต้ม per บาท (0 = ไม่ให้แต้มจากการซื้อสด)
      minAmount: { type: Number, default: 0 }
    },

    installmentSale: {
      enabled: { type: Boolean, default: true },
      rate: { type: Number, default: 0 }, // แต้ม per บาท (0 = ไม่ให้แต้มจากการซื้อผ่อน)
      minAmount: { type: Number, default: 0 }
    },

    accessories: {
      enabled: { type: Boolean, default: true },
      rate: { type: Number, default: 0.05 }, // 1 แต้ม ต่อ 20 บาท
      minAmount: { type: Number, default: 100 }
    },

    // แต้มพิเศษ
    boxSet: {
      enabled: { type: Boolean, default: true },
      points: { type: Number, default: 100 }
    },

    // แต้มแนะนำเพื่อน
    referral: {
      enabled: { type: Boolean, default: true },
      referrerPoints: { type: Number, default: 1000 }, // แต้มสำหรับผู้แนะนำ
      referredPoints: { type: Number, default: 100 },  // แต้มสำหรับผู้ถูกแนะนำ
      maxReferralsPerMonth: { type: Number, default: 10 }
    },

    // แต้มโบนัส
    birthday: {
      enabled: { type: Boolean, default: true },
      points: { type: Number, default: 500 }
    },

    firstPurchase: {
      enabled: { type: Boolean, default: true },
      points: { type: Number, default: 200 }
    }
  },

  // การใช้แต้ม
  redemption: {
    enabled: { type: Boolean, default: true },
    rate: { type: Number, default: 1 }, // 1 แต้ม = 1 บาท
    minPoints: { type: Number, default: 100 },
    maxPercentOfTotal: { type: Number, default: 50 }, // ใช้ได้สูงสุด 50% ของยอดรวม
    minPurchaseAmount: { type: Number, default: 1000 }, // ยอดขั้นต่ำที่สามารถใช้แต้มได้

    // ข้อจำกัดการใช้แต้ม
    restrictions: {
      installmentSale: { type: Boolean, default: false }, // ห้ามใช้แต้มกับการซื้อผ่อน
      promotionItems: { type: Boolean, default: false }   // ห้ามใช้แต้มกับสินค้าโปรโมชั่น
    }
  },

  // อายุของแต้ม
  expiry: {
    enabled: { type: Boolean, default: true },
    months: { type: Number, default: 12 }, // แต้มหมดอายุใน 12 เดือน
    notifyDaysBefore: { type: Number, default: 30 } // แจ้งเตือนก่อนหมดอายุ 30 วัน
  },

  // ระดับสมาชิก
  memberLevels: {
    member: {
      name: { type: String, default: 'Member' },
      minPoints: { type: Number, default: 0 },
      benefits: {
        pointMultiplier: { type: Number, default: 1.0 },
        specialDiscounts: { type: Boolean, default: false },
        prioritySupport: { type: Boolean, default: false }
      }
    },

    diamond: {
      name: { type: String, default: 'Diamond' },
      minPoints: { type: Number, default: 5000 },
      benefits: {
        pointMultiplier: { type: Number, default: 1.2 },
        specialDiscounts: { type: Boolean, default: true },
        prioritySupport: { type: Boolean, default: true }
      }
    },

    vip: {
      name: { type: String, default: 'VIP' },
      minPoints: { type: Number, default: 10000 },
      benefits: {
        pointMultiplier: { type: Number, default: 1.5 },
        specialDiscounts: { type: Boolean, default: true },
        prioritySupport: { type: Boolean, default: true }
      }
    }
  },

  // การแจ้งเตือน
  notifications: {
    sms: {
      enabled: { type: Boolean, default: true },
      templates: {
        welcome: String,
        pointsEarned: String,
        pointsRedeemed: String,
        pointsExpiring: String
      }
    },

    email: {
      enabled: { type: Boolean, default: false },
      templates: {
        welcome: String,
        monthlyStatement: String,
        pointsExpiring: String
      }
    }
  },

  // การรายงาน
  reporting: {
    autoExport: { type: Boolean, default: false },
    exportSchedule: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'monthly'
    },
    recipients: [String]
  },

  // ข้อมูลระบบ
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

// Pre-save middleware
pointsSettingsSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static methods
pointsSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne({ settingsId: 'default' });

  if (!settings) {
    // สร้างการตั้งค่าเริ่มต้น
    settings = new this({
      settingsId: 'default',
      updatedBy: new mongoose.Types.ObjectId() // จะต้องแก้ไขให้ใช้ user ID จริง
    });
    await settings.save();
  }

  return settings;
};

pointsSettingsSchema.statics.updateSettings = async function(updates, updatedBy) {
  return this.findOneAndUpdate(
    { settingsId: 'default' },
    { ...updates, updatedBy, updatedAt: new Date() },
    { new: true, upsert: true }
  );
};

// Methods
pointsSettingsSchema.methods.calculateEarnedPoints = function(purchaseType, amount, hasBoxSet = false) {
  let points = 0;

  // คำนวณแต้มจากประเภทการซื้อ
  switch (purchaseType) {
    case 'cash':
      if (this.earning.cashSale.enabled && amount >= this.earning.cashSale.minAmount) {
        points += amount * this.earning.cashSale.rate;
      }
      break;

    case 'installment':
      if (this.earning.installmentSale.enabled && amount >= this.earning.installmentSale.minAmount) {
        points += amount * this.earning.installmentSale.rate;
      }
      break;

    case 'accessories':
      if (this.earning.accessories.enabled && amount >= this.earning.accessories.minAmount) {
        points += amount * this.earning.accessories.rate;
      }
      break;
  }

  // เพิ่มแต้ม Box Set
  if (hasBoxSet && this.earning.boxSet.enabled) {
    points += this.earning.boxSet.points;
  }

  return Math.floor(points);
};

pointsSettingsSchema.methods.calculateRedemptionValue = function(points) {
  return points * this.redemption.rate;
};

pointsSettingsSchema.methods.getMaxRedeemablePoints = function(purchaseAmount) {
  if (purchaseAmount < this.redemption.minPurchaseAmount) {
    return 0;
  }

  const maxValue = purchaseAmount * (this.redemption.maxPercentOfTotal / 100);
  return Math.floor(maxValue / this.redemption.rate);
};

pointsSettingsSchema.methods.getMemberLevel = function(totalPoints) {
  if (totalPoints >= this.memberLevels.vip.minPoints) {
    return 'vip';
  } else if (totalPoints >= this.memberLevels.diamond.minPoints) {
    return 'diamond';
  }
  return 'member';
};

// Export
module.exports = mongoose.model('PointsSettings', pointsSettingsSchema);
