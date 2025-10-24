const mongoose = require('mongoose');

const autoApprovalSettingsSchema = new mongoose.Schema({
  // ใช้ singleton pattern - จะมีเพียง 1 document
  _id: {
    type: String,
    default: 'auto_approval_settings'
  },

  // การตั้งค่าหลัก
  enabled: {
    type: Boolean,
    default: false
  },

  // เงื่อนไขการอนุมัติอัตโนมัติ
  conditions: {
    // อนุมัติทั้งหมดหรือเฉพาะเงื่อนไข
    approveAll: {
      type: Boolean,
      default: true
    },

    // อนุมัติเฉพาะช่วงเวลา
    timeBasedApproval: {
      enabled: {
        type: Boolean,
        default: false
      },
      startTime: {
        type: String, // HH:mm format
        default: '08:00'
      },
      endTime: {
        type: String, // HH:mm format
        default: '18:00'
      },
      timezone: {
        type: String,
        default: 'Asia/Bangkok'
      }
    },

    // อนุมัติเฉพาะบาง roles
    roleBasedApproval: {
      enabled: {
        type: Boolean,
        default: false
      },
      allowedRoles: [{
        type: String
      }]
    },

    // จำกัดจำนวนการอนุมัติต่อวัน
    dailyLimit: {
      enabled: {
        type: Boolean,
        default: false
      },
      maxApprovals: {
        type: Number,
        default: 50
      }
    }
  },

  // สถิติ
  stats: {
    totalAutoApprovals: {
      type: Number,
      default: 0
    },
    lastAutoApproval: Date,
    dailyCount: {
      type: Number,
      default: 0
    },
    lastResetDate: {
      type: Date,
      default: Date.now
    }
  },

  // ผู้แก้ไขล่าสุด
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastModifiedAt: {
    type: Date,
    default: Date.now
  },

  // หมายเหตุ
  approvalNote: {
    type: String,
    default: 'อนุมัติอัตโนมัติโดยระบบ'
  }
}, {
  timestamps: true
});

// Static methods
autoApprovalSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findById('auto_approval_settings');

  if (!settings) {
    // สร้าง settings ใหม่หากไม่มี
    settings = new this();
    await settings.save();
  }

  return settings;
};

autoApprovalSettingsSchema.statics.isAutoApprovalEnabled = async function() {
  const settings = await this.getSettings();
  return settings.enabled;
};

autoApprovalSettingsSchema.statics.shouldAutoApprove = async function(loginRequest) {
  const settings = await this.getSettings();

  if (!settings.enabled) {
    return false;
  }

  const conditions = settings.conditions;

  // ตรวจสอบ daily limit
  if (conditions.dailyLimit.enabled) {
    const today = new Date().toDateString();
    const lastReset = new Date(settings.stats.lastResetDate).toDateString();

    if (today !== lastReset) {
      // รีเซ็ต daily count
      settings.stats.dailyCount = 0;
      settings.stats.lastResetDate = new Date();
      await settings.save();
    }

    if (settings.stats.dailyCount >= conditions.dailyLimit.maxApprovals) {
      console.log('Auto-approval: Daily limit reached');
      return false;
    }
  }

  // ตรวจสอบเวลา
  if (conditions.timeBasedApproval.enabled) {
    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: conditions.timeBasedApproval.timezone
    });

    const startTime = conditions.timeBasedApproval.startTime;
    const endTime = conditions.timeBasedApproval.endTime;

    if (currentTime < startTime || currentTime > endTime) {
      console.log('Auto-approval: Outside allowed time range');
      return false;
    }
  }

  // ตรวจสอบ role (ต้องดึงข้อมูล user)
  if (conditions.roleBasedApproval.enabled && conditions.roleBasedApproval.allowedRoles.length > 0) {
    // จะต้องดึงข้อมูล user และ role ในส่วนที่เรียกใช้
    // return { needsRoleCheck: true, allowedRoles: conditions.roleBasedApproval.allowedRoles };
  }

  return true;
};

// Instance methods
autoApprovalSettingsSchema.methods.incrementStats = async function() {
  this.stats.totalAutoApprovals += 1;
  this.stats.dailyCount += 1;
  this.stats.lastAutoApproval = new Date();
  return this.save();
};

module.exports = mongoose.models.AutoApprovalSettings || mongoose.model('AutoApprovalSettings', autoApprovalSettingsSchema);
