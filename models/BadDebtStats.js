const mongoose = require('mongoose');

const badDebtStatsSchema = new mongoose.Schema({
  period: {
    type: String,
    required: true,
    unique: true // Format: YYYY-MM
  },
  year: {
    type: Number,
    required: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  totalContracts: {
    type: Number,
    default: 0,
    min: 0
  },
  activeContracts: {
    type: Number,
    default: 0,
    min: 0
  },
  overdueContracts: {
    type: Number,
    default: 0,
    min: 0
  },
  badDebtContracts: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  overdueAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  badDebtAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  recoveredAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  writeOffAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  provisionAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  classifications: {
    current: {
      count: { type: Number, default: 0, min: 0 },
      amount: { type: Number, default: 0, min: 0 }
    },
    overdue30: {
      count: { type: Number, default: 0, min: 0 },
      amount: { type: Number, default: 0, min: 0 }
    },
    overdue60: {
      count: { type: Number, default: 0, min: 0 },
      amount: { type: Number, default: 0, min: 0 }
    },
    overdue90: {
      count: { type: Number, default: 0, min: 0 },
      amount: { type: Number, default: 0, min: 0 }
    },
    overdue180: {
      count: { type: Number, default: 0, min: 0 },
      amount: { type: Number, default: 0, min: 0 }
    },
    overdue365: {
      count: { type: Number, default: 0, min: 0 },
      amount: { type: Number, default: 0, min: 0 }
    }
  },
  recoveryActions: [{
    date: Date,
    type: {
      type: String,
      enum: ['phone', 'letter', 'visit', 'legal', 'repossession', 'settlement']
    },
    contractId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InstallmentOrder'
    },
    result: String,
    amountRecovered: {
      type: Number,
      default: 0,
      min: 0
    }
  }],
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  },
  calculatedDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
badDebtStatsSchema.index({ period: 1 });
badDebtStatsSchema.index({ year: 1, month: 1 });
badDebtStatsSchema.index({ branch: 1 });

// Pre-save validation to ensure no negative amounts
badDebtStatsSchema.pre('save', function(next) {
  // Validate all amounts are non-negative
  this.totalAmount = Math.max(0, this.totalAmount || 0);
  this.overdueAmount = Math.max(0, this.overdueAmount || 0);
  this.badDebtAmount = Math.max(0, this.badDebtAmount || 0);
  this.recoveredAmount = Math.max(0, this.recoveredAmount || 0);
  this.writeOffAmount = Math.max(0, this.writeOffAmount || 0);
  this.provisionAmount = Math.max(0, this.provisionAmount || 0);

  // Validate classification amounts
  Object.keys(this.classifications).forEach(key => {
    this.classifications[key].count = Math.max(0, this.classifications[key].count || 0);
    this.classifications[key].amount = Math.max(0, this.classifications[key].amount || 0);
  });

  next();
});

// Virtual for bad debt ratio
badDebtStatsSchema.virtual('badDebtRatio').get(function() {
  if (this.totalAmount === 0) return 0;
  return Math.round((this.badDebtAmount / this.totalAmount) * 10000) / 100; // Percentage with 2 decimals
});

// Virtual for recovery rate
badDebtStatsSchema.virtual('recoveryRate').get(function() {
  if (this.badDebtAmount === 0) return 0;
  return Math.round((this.recoveredAmount / this.badDebtAmount) * 10000) / 100;
});

// Static method to calculate stats for a given period
badDebtStatsSchema.statics.calculateStats = async function(year, month, branch) {
  const InstallmentOrder = mongoose.model('InstallmentOrder');
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const query = {
    createdAt: { $lte: endDate }
  };

  if (branch) {
    query.branch = branch;
  }

  const contracts = await InstallmentOrder.find(query);

  const stats = {
    period: `${year}-${String(month).padStart(2, '0')}`,
    year,
    month,
    totalContracts: 0,
    activeContracts: 0,
    overdueContracts: 0,
    badDebtContracts: 0,
    totalAmount: 0,
    overdueAmount: 0,
    badDebtAmount: 0,
    classifications: {
      current: { count: 0, amount: 0 },
      overdue30: { count: 0, amount: 0 },
      overdue60: { count: 0, amount: 0 },
      overdue90: { count: 0, amount: 0 },
      overdue180: { count: 0, amount: 0 },
      overdue365: { count: 0, amount: 0 }
    }
  };

  contracts.forEach(contract => {
    const amount = Math.max(0, contract.remainingAmount || 0);
    const overdueDays = contract.overdueDays || 0;

    stats.totalContracts++;
    stats.totalAmount += Math.max(0, contract.totalAmount || 0);

    if (contract.status === 'active') {
      stats.activeContracts++;
    }

    if (overdueDays > 0) {
      stats.overdueContracts++;
      stats.overdueAmount += amount;

      if (overdueDays <= 30) {
        stats.classifications.overdue30.count++;
        stats.classifications.overdue30.amount += amount;
      } else if (overdueDays <= 60) {
        stats.classifications.overdue60.count++;
        stats.classifications.overdue60.amount += amount;
      } else if (overdueDays <= 90) {
        stats.classifications.overdue90.count++;
        stats.classifications.overdue90.amount += amount;
      } else if (overdueDays <= 180) {
        stats.classifications.overdue180.count++;
        stats.classifications.overdue180.amount += amount;
      } else if (overdueDays <= 365) {
        stats.classifications.overdue365.count++;
        stats.classifications.overdue365.amount += amount;
      } else {
        stats.badDebtContracts++;
        stats.badDebtAmount += amount;
      }
    } else {
      stats.classifications.current.count++;
      stats.classifications.current.amount += amount;
    }
  });

  return stats;
};

// Static method to get trend data
badDebtStatsSchema.statics.getTrend = async function(months = 12, branch) {
  const query = branch ? { branch } : {};

  return this.find(query)
    .sort({ year: -1, month: -1 })
    .limit(months)
    .select('period totalAmount overdueAmount badDebtAmount recoveredAmount');
};

const BadDebtStats = mongoose.model('BadDebtStats', badDebtStatsSchema);

module.exports = BadDebtStats;