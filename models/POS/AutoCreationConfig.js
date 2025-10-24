// models/POS/AutoCreationConfig.js
const mongoose = require('mongoose');

const autoCreationConfigSchema = new mongoose.Schema({
  branchId: {
    type: String,
    required: true,
    index: true
  },
  enabled: {
    type: Boolean,
    default: true
  },
  types: {
    cashSale: {
      type: Boolean,
      default: true
    },
    installment: {
      type: Boolean,
      default: true
    },
    service: {
      type: Boolean,
      default: true
    },
    deposit: {
      type: Boolean,
      default: false
    }
  },
  timing: {
    type: String,
    enum: ['immediate', 'endOfDay', 'scheduled'],
    default: 'immediate'
  },
  scheduledTime: {
    type: String, // Format: "HH:mm"
    default: '18:00'
  },
  accountMapping: {
    cashSale: {
      debit: {
        code: { type: String, default: '11101' },
        name: { type: String, default: 'เงินสด' }
      },
      credit: {
        code: { type: String, default: '44101' },
        name: { type: String, default: 'รายได้จากการขาย' }
      }
    },
    installment: {
      debit: {
        code: { type: String, default: '11301' },
        name: { type: String, default: 'ลูกหนี้การค้า' }
      },
      credit: {
        code: { type: String, default: '44101' },
        name: { type: String, default: 'รายได้จากการขาย' }
      }
    },
    service: {
      debit: {
        code: { type: String, default: '11101' },
        name: { type: String, default: 'เงินสด' }
      },
      credit: {
        code: { type: String, default: '44102' },
        name: { type: String, default: 'รายได้จากการให้บริการ' }
      }
    },
    deposit: {
      debit: {
        code: { type: String, default: '11101' },
        name: { type: String, default: 'เงินสด' }
      },
      credit: {
        code: { type: String, default: '21103' },
        name: { type: String, default: 'รายได้รับล่วงหน้า' }
      }
    }
  },
  notifications: {
    success: {
      type: Boolean,
      default: true
    },
    error: {
      type: Boolean,
      default: true
    },
    summary: {
      type: Boolean,
      default: false
    },
    email: {
      enabled: { type: Boolean, default: false },
      recipients: [String]
    }
  },
  batchSettings: {
    maxItemsPerBatch: {
      type: Number,
      default: 100,
      min: 1,
      max: 1000
    },
    delayBetweenItems: {
      type: Number,
      default: 500, // milliseconds
      min: 0,
      max: 5000
    },
    retryAttempts: {
      type: Number,
      default: 3,
      min: 0,
      max: 5
    }
  },
  lastRun: {
    type: Date
  },
  nextScheduledRun: {
    type: Date
  },
  statistics: {
    totalCreated: {
      type: Number,
      default: 0
    },
    totalSuccess: {
      type: Number,
      default: 0
    },
    totalFailed: {
      type: Number,
      default: 0
    },
    lastSuccess: {
      type: Date
    },
    lastError: {
      message: String,
      date: Date
    }
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
  timestamps: true,
  collection: 'auto_creation_configs'
});

// Indexes
autoCreationConfigSchema.index({ branchId: 1 }, { unique: true });
autoCreationConfigSchema.index({ enabled: 1, timing: 1 });

// Methods
autoCreationConfigSchema.methods.updateStatistics = function(result) {
  if (result.success) {
    this.statistics.totalCreated++;
    this.statistics.totalSuccess++;
    this.statistics.lastSuccess = new Date();
  } else {
    this.statistics.totalFailed++;
    this.statistics.lastError = {
      message: result.error || 'Unknown error',
      date: new Date()
    };
  }
  this.lastRun = new Date();
  return this.save();
};

// Calculate next scheduled run
autoCreationConfigSchema.methods.calculateNextRun = function() {
  if (this.timing !== 'scheduled') return null;

  const now = new Date();
  const [hours, minutes] = this.scheduledTime.split(':').map(Number);

  const next = new Date();
  next.setHours(hours, minutes, 0, 0);

  // If scheduled time has passed today, set for tomorrow
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  this.nextScheduledRun = next;
  return next;
};

// Pre-save middleware
autoCreationConfigSchema.pre('save', function(next) {
  if (this.timing === 'scheduled' && !this.nextScheduledRun) {
    this.calculateNextRun();
  }
  next();
});

const AutoCreationConfig = mongoose.model('AutoCreationConfig', autoCreationConfigSchema);

module.exports = AutoCreationConfig;
