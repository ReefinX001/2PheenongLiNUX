// models/HR/WorkSchedule.js
const mongoose = require('mongoose');

const WorkScheduleSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    branchId: {
      type: String,
      required: true
    },
    scheduleType: {
      type: String,
      enum: ['regular', 'shift', 'flexible', 'remote'],
      default: 'regular'
    },
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      default: ''
    },
    workDays: [{
      day: {
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        required: true
      },
      startTime: {
        type: String,
        required: true
      },
      endTime: {
        type: String,
        required: true
      },
      breakTime: {
        start: String,
        end: String,
        duration: { type: Number, default: 60 } // minutes
      }
    }],
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'draft', 'expired'],
      default: 'active'
    },
    isTemplate: {
      type: Boolean,
      default: false
    },
    templateName: {
      type: String,
      default: ''
    },
    overtimeAllowed: {
      type: Boolean,
      default: true
    },
    maxOvertimeHours: {
      type: Number,
      default: 4
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    approvalDate: {
      type: Date,
      default: null
    },
    deleted_at: {
      type: Date,
      default: null
    }
  },
  {
    collection: 'work_schedules',
    timestamps: true
  }
);

// Indexes for performance
WorkScheduleSchema.index({ employeeId: 1, status: 1, deleted_at: 1 });
WorkScheduleSchema.index({ branchId: 1, status: 1, deleted_at: 1 });
WorkScheduleSchema.index({ isTemplate: 1, deleted_at: 1 });
WorkScheduleSchema.index({ startDate: 1, endDate: 1, deleted_at: 1 });

// Soft delete method
WorkScheduleSchema.methods.softDelete = function () {
  this.deleted_at = new Date();
  this.status = 'inactive';
  return this.save();
};

// Virtual for calculating total weekly hours
WorkScheduleSchema.virtual('totalWeeklyHours').get(function() {
  return this.workDays.reduce((total, day) => {
    const start = new Date(`2000-01-01 ${day.startTime}`);
    const end = new Date(`2000-01-01 ${day.endTime}`);
    const diff = (end - start) / (1000 * 60 * 60); // hours
    const breakHours = day.breakTime ? (day.breakTime.duration / 60) : 1; // default 1 hour break
    return total + Math.max(0, diff - breakHours);
  }, 0);
});

module.exports = mongoose.model('WorkSchedule', WorkScheduleSchema);