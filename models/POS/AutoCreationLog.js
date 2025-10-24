// models/POS/AutoCreationLog.js
const mongoose = require('mongoose');

const autoCreationLogSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['receipt_voucher_auto_creation'],
    required: true
  },
  branchCode: {
    type: String,
    required: true
  },
  successful: {
    type: Number,
    default: 0
  },
  failed: {
    type: Number,
    default: 0
  },
  totalProcessed: {
    type: Number,
    default: 0
  },
  summary: {
    posTransactions: { type: Number, default: 0 },
    installmentOrders: { type: Number, default: 0 },
    processed: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 }
  },
  details: [{
    sourceType: String, // 'pos', 'installment'
    sourceId: String,
    status: String, // 'success', 'failed', 'skipped'
    documentNumber: String,
    amount: Number,
    error: String
  }],
  triggeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  triggeredAt: {
    type: Date,
    default: Date.now
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number // in milliseconds
  },
  status: {
    type: String,
    enum: ['running', 'completed', 'failed', 'cancelled'],
    default: 'running'
  }
}, {
  timestamps: true
});

// Indexes for performance
autoCreationLogSchema.index({ branchCode: 1, triggeredAt: -1 });
autoCreationLogSchema.index({ type: 1, status: 1 });
autoCreationLogSchema.index({ 'details.sourceId': 1 });

// Virtual for calculating duration
autoCreationLogSchema.virtual('durationFormatted').get(function() {
  if (!this.duration) return 'ไม่ระบุ';

  const seconds = Math.floor(this.duration / 1000);
  if (seconds < 60) return `${seconds} วินาที`;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes} นาที ${remainingSeconds} วินาที`;
});

// Instance method to complete the log
autoCreationLogSchema.methods.complete = function(status = 'completed') {
  this.endTime = new Date();
  this.duration = this.endTime - this.startTime;
  this.status = status;
  return this.save();
};

// Static method to get recent logs
autoCreationLogSchema.statics.getRecentLogs = function(branchCode, limit = 10) {
  return this.find({ branchCode })
    .sort({ triggeredAt: -1 })
    .limit(limit)
    .populate('triggeredBy', 'name username')
    .lean();
};

// Static method to get daily stats
autoCreationLogSchema.statics.getDailyStats = function(branchCode, date = new Date()) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return this.aggregate([
    {
      $match: {
        branchCode: branchCode,
        triggeredAt: { $gte: startOfDay, $lte: endOfDay },
        status: 'completed'
      }
    },
    {
      $group: {
        _id: null,
        totalRuns: { $sum: 1 },
        totalSuccessful: { $sum: '$successful' },
        totalFailed: { $sum: '$failed' },
        totalProcessed: { $sum: '$totalProcessed' },
        averageDuration: { $avg: '$duration' },
        totalDuration: { $sum: '$duration' }
      }
    }
  ]);
};

module.exports = mongoose.model('AutoCreationLog', autoCreationLogSchema);
