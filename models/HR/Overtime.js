// models/HR/Overtime.js
const mongoose = require('mongoose');

const OvertimeSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Zone',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  endTime: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    validate: {
      validator: function(value) {
        // Validate that endTime is after startTime
        const start = new Date(`2000-01-01 ${this.startTime}`);
        const end = new Date(`2000-01-01 ${value}`);
        return end > start;
      },
      message: 'เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น'
    }
  },
  actualStartTime: {
    type: Date,
    default: null
  },
  actualEndTime: {
    type: Date,
    default: null
  },
  plannedHours: {
    type: Number,
    required: true,
    min: 0.5,
    max: 12
  },
  actualHours: {
    type: Number,
    default: 0,
    min: 0
  },
  reason: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: ''
  },
  workDetails: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: ''
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  rejectedAt: {
    type: Date,
    default: null
  },
  approvalNote: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  overtimeType: {
    type: String,
    enum: ['regular', 'holiday', 'weekend', 'emergency'],
    default: 'regular'
  },
  payRate: {
    type: Number,
    default: 1.5, // 1.5x regular rate
    min: 1,
    max: 3
  },
  totalPay: {
    type: Number,
    default: 0,
    min: 0
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date,
    default: null
  },
  location: {
    latitude: {
      type: Number,
      default: null
    },
    longitude: {
      type: Number,
      default: null
    },
    address: {
      type: String,
      default: '',
      trim: true
    }
  },
  attachments: [{
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  notifications: {
    requestSent: { type: Boolean, default: false },
    approved: { type: Boolean, default: false },
    rejected: { type: Boolean, default: false },
    reminderSent: { type: Boolean, default: false }
  },
  deleted_at: {
    type: Date,
    default: null
  }
}, {
  collection: 'overtimes',
  timestamps: true
});

// Indexes for performance
OvertimeSchema.index({ employee: 1, date: 1, deleted_at: 1 });
OvertimeSchema.index({ user: 1, date: 1, deleted_at: 1 });
OvertimeSchema.index({ branch: 1, date: 1, deleted_at: 1 });
OvertimeSchema.index({ approvalStatus: 1, deleted_at: 1 });
OvertimeSchema.index({ date: 1, approvalStatus: 1, deleted_at: 1 });
OvertimeSchema.index({ requestedBy: 1, approvalStatus: 1, deleted_at: 1 });

// Virtual for calculating duration from planned times
OvertimeSchema.virtual('plannedDuration').get(function() {
  if (this.startTime && this.endTime) {
    const start = new Date(`2000-01-01 ${this.startTime}`);
    const end = new Date(`2000-01-01 ${this.endTime}`);
    return Math.max(0, (end - start) / (1000 * 60 * 60)); // hours
  }
  return 0;
});

// Virtual for calculating actual duration
OvertimeSchema.virtual('actualDuration').get(function() {
  if (this.actualStartTime && this.actualEndTime) {
    return Math.max(0, (this.actualEndTime - this.actualStartTime) / (1000 * 60 * 60)); // hours
  }
  return 0;
});

// Virtual for status display
OvertimeSchema.virtual('statusDisplay').get(function() {
  const statusMap = {
    pending: 'รออนุมัติ',
    approved: 'อนุมัติแล้ว',
    rejected: 'ปฏิเสธ',
    cancelled: 'ยกเลิก'
  };
  return statusMap[this.approvalStatus] || this.approvalStatus;
});

// Virtual for type display
OvertimeSchema.virtual('typeDisplay').get(function() {
  const typeMap = {
    regular: 'ปกติ',
    holiday: 'วันหยุดนักขัตฤกษ์',
    weekend: 'วันหยุดสุดสัปดาห์',
    emergency: 'เร่งด่วน'
  };
  return typeMap[this.overtimeType] || this.overtimeType;
});

// Pre-save middleware to calculate planned hours and total pay
OvertimeSchema.pre('save', function(next) {
  // Calculate planned hours if not set
  if (!this.plannedHours && this.startTime && this.endTime) {
    const start = new Date(`2000-01-01 ${this.startTime}`);
    const end = new Date(`2000-01-01 ${this.endTime}`);
    this.plannedHours = Math.max(0, (end - start) / (1000 * 60 * 60));
  }

  // Calculate actual hours if actual times are set
  if (this.actualStartTime && this.actualEndTime) {
    this.actualHours = Math.max(0, (this.actualEndTime - this.actualStartTime) / (1000 * 60 * 60));
  }

  // Mark as completed if actual end time is set
  if (this.actualEndTime && !this.isCompleted) {
    this.isCompleted = true;
    this.completedAt = new Date();
  }

  next();
});

// Instance methods
OvertimeSchema.methods.approve = function(approverId, note = '') {
  this.approvalStatus = 'approved';
  this.approvedBy = approverId;
  this.approvedAt = new Date();
  this.approvalNote = note;
  this.notifications.approved = false; // Reset to send notification
  return this.save();
};

OvertimeSchema.methods.reject = function(rejectedById, note = '') {
  this.approvalStatus = 'rejected';
  this.rejectedBy = rejectedById;
  this.rejectedAt = new Date();
  this.approvalNote = note;
  this.notifications.rejected = false; // Reset to send notification
  return this.save();
};

OvertimeSchema.methods.cancel = function() {
  this.approvalStatus = 'cancelled';
  return this.save();
};

OvertimeSchema.methods.startWork = function(location = null) {
  this.actualStartTime = new Date();
  if (location) {
    this.location = { ...this.location, ...location };
  }
  return this.save();
};

OvertimeSchema.methods.endWork = function(location = null) {
  this.actualEndTime = new Date();
  this.isCompleted = true;
  this.completedAt = new Date();
  if (location) {
    this.location = { ...this.location, ...location };
  }
  return this.save();
};

OvertimeSchema.methods.softDelete = function() {
  this.deleted_at = new Date();
  return this.save();
};

// Static methods
OvertimeSchema.statics.findByEmployee = function(employeeId, options = {}) {
  const query = { employee: employeeId, deleted_at: null };
  if (options.status) query.approvalStatus = options.status;
  if (options.branch) query.branch = options.branch;
  if (options.dateFrom || options.dateTo) {
    query.date = {};
    if (options.dateFrom) query.date.$gte = new Date(options.dateFrom);
    if (options.dateTo) query.date.$lte = new Date(options.dateTo);
  }
  return this.find(query).populate('employee user branch requestedBy approvedBy rejectedBy').sort({ date: -1 });
};

OvertimeSchema.statics.findPendingApprovals = function(branchId = null) {
  const query = { approvalStatus: 'pending', deleted_at: null };
  if (branchId) query.branch = branchId;
  return this.find(query).populate('employee user branch requestedBy').sort({ requestedAt: 1 });
};

OvertimeSchema.statics.findByDateRange = function(startDate, endDate, options = {}) {
  const query = {
    date: { $gte: new Date(startDate), $lte: new Date(endDate) },
    deleted_at: null
  };
  if (options.branch) query.branch = options.branch;
  if (options.status) query.approvalStatus = options.status;
  if (options.employee) query.employee = options.employee;
  return this.find(query).populate('employee user branch requestedBy approvedBy').sort({ date: -1 });
};

// Enable virtuals in JSON output
OvertimeSchema.set('toJSON', { virtuals: true });
OvertimeSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Overtime', OvertimeSchema);