// models/HR/PerformanceReview.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const PerformanceReviewSchema = new Schema({
  employee: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  cycle: {
    type: String,
    required: true,
    enum: ['Q1-2025', 'Q2-2025', 'Q3-2025', 'Q4-2025', 'Annual-2025'],
    index: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  status: {
    type: String,
    required: true,
    enum: ['รอพิจารณา', 'ผ่าน', 'ไม่ผ่าน'],
    default: 'รอพิจารณา',
    index: true
  },
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 5,
    default: 0
  },
  comments: {
    type: String,
    default: '',
    maxlength: 2000
  },
  evaluations: {
    type: Schema.Types.Mixed, // JSON object to store nested category/item scores
    default: {},
    validate: {
      validator: function(value) {
        // Validate that evaluations is an object
        return typeof value === 'object' && value !== null;
      },
      message: 'Evaluations must be a valid object'
    }
  },
  // Additional tracking fields
  reviewedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual to populate employee data
PerformanceReviewSchema.virtual('employeeData', {
  ref: 'User',
  localField: 'employee',
  foreignField: '_id',
  justOne: true,
  populate: {
    path: 'employee',
    select: 'name position department email phone imageUrl'
  }
});

// Compound index for unique review per employee per cycle
PerformanceReviewSchema.index({ employee: 1, cycle: 1 }, { unique: true });

// Index for querying by date range
PerformanceReviewSchema.index({ date: -1 });

// Pre-save middleware to calculate average score from evaluations
PerformanceReviewSchema.pre('save', function(next) {
  if (this.evaluations && typeof this.evaluations === 'object') {
    let totalScore = 0;
    let itemCount = 0;

    // Calculate average from all evaluation scores
    for (const category in this.evaluations) {
      for (const item in this.evaluations[category]) {
        const score = this.evaluations[category][item];
        if (typeof score === 'number' && score >= 1 && score <= 5) {
          totalScore += score;
          itemCount++;
        }
      }
    }

    if (itemCount > 0) {
      this.score = Math.round((totalScore / itemCount) * 10) / 10; // Round to 1 decimal place
    }
  }
  next();
});

// Static method to get reviews by cycle
PerformanceReviewSchema.statics.getByCycle = function(cycle) {
  return this.find({ cycle, isActive: true })
    .populate('employee', 'name position department email phone imageUrl')
    .populate('reviewedBy', 'username')
    .populate('approvedBy', 'username')
    .sort('-date');
};

// Static method to get employee's review history
PerformanceReviewSchema.statics.getEmployeeHistory = function(employeeId) {
  return this.find({ employee: employeeId, isActive: true })
    .populate('reviewedBy', 'username')
    .populate('approvedBy', 'username')
    .sort('-date');
};

// Instance method to approve review
PerformanceReviewSchema.methods.approve = function(approvedByUserId) {
  this.status = 'ผ่าน';
  this.approvedBy = approvedByUserId;
  this.approvedAt = new Date();
  return this.save();
};

// Instance method to reject review
PerformanceReviewSchema.methods.reject = function(reviewedByUserId, comments) {
  this.status = 'ไม่ผ่าน';
  this.reviewedBy = reviewedByUserId;
  if (comments) {
    this.comments = comments;
  }
  return this.save();
};

module.exports = mongoose.model('PerformanceReview', PerformanceReviewSchema);