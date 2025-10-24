const mongoose = require('mongoose');

const zoneSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  branch_code: {
    type: String,
    unique: true,
    required: true,
    trim: true,
    uppercase: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  center: {
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180
    }
  },
  radius: {
    type: Number,
    required: true,
    min: 1,    // หน่วยเมตร
    max: 5000  // จำกัดไม่เกิน 5 กม.
  },
  address: {
    type: String,
    trim: true,
    default: ''
  },
  contactInfo: {
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    manager: {
      type: String,
      trim: true,
      default: ''
    }
  },
  workingHours: {
    monday: {
      start: { type: String, default: '08:00' },
      end: { type: String, default: '17:00' },
      isWorkingDay: { type: Boolean, default: true }
    },
    tuesday: {
      start: { type: String, default: '08:00' },
      end: { type: String, default: '17:00' },
      isWorkingDay: { type: Boolean, default: true }
    },
    wednesday: {
      start: { type: String, default: '08:00' },
      end: { type: String, default: '17:00' },
      isWorkingDay: { type: Boolean, default: true }
    },
    thursday: {
      start: { type: String, default: '08:00' },
      end: { type: String, default: '17:00' },
      isWorkingDay: { type: Boolean, default: true }
    },
    friday: {
      start: { type: String, default: '08:00' },
      end: { type: String, default: '17:00' },
      isWorkingDay: { type: Boolean, default: true }
    },
    saturday: {
      start: { type: String, default: '08:00' },
      end: { type: String, default: '12:00' },
      isWorkingDay: { type: Boolean, default: false }
    },
    sunday: {
      start: { type: String, default: '08:00' },
      end: { type: String, default: '12:00' },
      isWorkingDay: { type: Boolean, default: false }
    }
  },
  timezone: {
    type: String,
    default: 'Asia/Bangkok'
  },
  settings: {
    allowOutsideAreaCheckin: { type: Boolean, default: false },
    requireApprovalForOutsideCheckin: { type: Boolean, default: true },
    maxCheckinDistance: { type: Number, default: 100 }, // เมตร
    allowOvertimeRequests: { type: Boolean, default: true },
    maxOvertimeHoursPerDay: { type: Number, default: 4 },
    maxOvertimeHoursPerWeek: { type: Number, default: 20 }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isMainBranch: {
    type: Boolean,
    default: false
  },
  // Reference to the actual Branch from Branch collection
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  parentBranch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Zone',
    default: null
  },
  employees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  }],
  managers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  deleted_at: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for performance
zoneSchema.index({ branch_code: 1, deleted_at: 1 });
zoneSchema.index({ isActive: 1, deleted_at: 1 });
zoneSchema.index({ parentBranch: 1, deleted_at: 1 });
zoneSchema.index({ 'center.latitude': 1, 'center.longitude': 1 });

// Virtual for full display name
zoneSchema.virtual('displayName').get(function() {
  return `${this.branch_code} - ${this.name}`;
});

// Method to check if a point is within the zone
zoneSchema.methods.isPointWithin = function(latitude, longitude) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = this.center.latitude * Math.PI/180;
  const φ2 = latitude * Math.PI/180;
  const Δφ = (latitude - this.center.latitude) * Math.PI/180;
  const Δλ = (longitude - this.center.longitude) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  const distance = R * c; // Distance in meters
  return distance <= this.radius;
};

// Method to calculate distance from point
zoneSchema.methods.distanceFrom = function(latitude, longitude) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = this.center.latitude * Math.PI/180;
  const φ2 = latitude * Math.PI/180;
  const Δφ = (latitude - this.center.latitude) * Math.PI/180;
  const Δλ = (longitude - this.center.longitude) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
};

// Soft delete method
zoneSchema.methods.softDelete = function() {
  this.deleted_at = new Date();
  this.isActive = false;
  return this.save();
};

// Static method to find active zones
zoneSchema.statics.findActive = function() {
  return this.find({ isActive: true, deleted_at: null }).sort({ name: 1 });
};

// Static method to find zones by employee access
zoneSchema.statics.findByEmployeeAccess = function(userId) {
  return this.find({
    $or: [
      { employees: userId },
      { managers: userId }
    ],
    isActive: true,
    deleted_at: null
  }).sort({ name: 1 });
};

// Enable virtuals in JSON output
zoneSchema.set('toJSON', { virtuals: true });
zoneSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Zone', zoneSchema);
