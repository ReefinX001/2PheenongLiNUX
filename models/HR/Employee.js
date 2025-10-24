// models/HR/Employee.js
const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema(
  {
    employeeId: { type: String, unique: true, required: true },  // รหัสแบบ EMP001

    // Basic Information
    name: { type: String, required: true, trim: true },
    email: { type: String, unique: true, required: true, lowercase: true, trim: true },
    citizenId: { type: String, unique: true, required: true, sparse: true, trim: true },
    birthDate: { type: Date, default: null },
    phone: { type: String, unique: true, required: true, sparse: true, trim: true },
    address: { type: String, default: '', trim: true },

    // Work Information
    position: { type: String, default: '', trim: true },
    department: { type: String, default: '', trim: true },
    level: {
      type: String,
      enum: ['intern', 'junior', 'senior', 'lead', 'manager', 'director'],
      default: 'junior'
    },
    employmentType: {
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'temporary', 'intern'],
      default: 'full-time'
    },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    probationEndDate: { type: Date, default: null },

    // Salary Information
    salary: { type: Number, default: 0, min: 0 },
    salaryType: {
      type: String,
      enum: ['monthly', 'daily', 'hourly'],
      default: 'monthly'
    },
    hourlyRate: { type: Number, default: 0, min: 0 },
    overtimeRate: { type: Number, default: 1.5, min: 1 }, // มัลติไพลเออร์

    // Branch and Zone Access
    primaryBranch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Zone',
      required: true
    },
    accessibleBranches: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Zone'
    }],
    hrZones: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Zone'
    }],
    checkinBranches: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Zone'
    }],

    // User Account Link
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    // Contact Information
    emergencyContact: {
      name: { type: String, default: '', trim: true },
      relation: { type: String, default: '', trim: true },
      phone: { type: String, default: '', trim: true },
      address: { type: String, default: '', trim: true }
    },

    // Documents and Images
    profileImage: { type: String, default: null },
    idCardImage: { type: String, default: null },
    contractDocument: { type: String, default: null },
    resumeDocument: { type: String, default: null },

    // Work Schedule
    defaultWorkSchedule: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkSchedule',
      default: null
    },
    workingDays: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }],

    // Status and Permissions
    status: {
      type: String,
      enum: ['active', 'inactive', 'terminated', 'on-leave', 'suspended'],
      default: 'active'
    },
    isManager: { type: Boolean, default: false },
    canApproveLeave: { type: Boolean, default: false },
    canApproveOvertime: { type: Boolean, default: false },

    // Banking Information
    bankAccount: {
      bankName: { type: String, default: '', trim: true },
      accountNumber: { type: String, default: '', trim: true },
      accountName: { type: String, default: '', trim: true }
    },

    // Tax Information
    taxId: { type: String, default: '', trim: true },
    socialSecurityNumber: { type: String, default: '', trim: true },

    // Performance and Notes
    performanceRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    notes: { type: String, default: '', trim: true },

    // Audit Fields
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    deleted_at: { type: Date, default: null }
  },
  {
    collection: 'employees',
    timestamps: true
  }
);

// Indexes for performance
EmployeeSchema.index({ employeeId: 1, deleted_at: 1 });
EmployeeSchema.index({ email: 1, deleted_at: 1 });
EmployeeSchema.index({ citizenId: 1, deleted_at: 1 });
EmployeeSchema.index({ phone: 1, deleted_at: 1 });
EmployeeSchema.index({ primaryBranch: 1, status: 1, deleted_at: 1 });
EmployeeSchema.index({ status: 1, deleted_at: 1 });
EmployeeSchema.index({ department: 1, status: 1, deleted_at: 1 });
EmployeeSchema.index({ userId: 1, deleted_at: 1 });

// Virtual for full name display
EmployeeSchema.virtual('displayName').get(function() {
  return `${this.employeeId} - ${this.name}`;
});

// Virtual for employment duration
EmployeeSchema.virtual('employmentDuration').get(function() {
  if (!this.startDate) return null;
  const endDate = this.endDate || new Date();
  const diffTime = Math.abs(endDate - this.startDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for age
EmployeeSchema.virtual('age').get(function() {
  if (!this.birthDate) return null;
  const today = new Date();
  const birthDate = new Date(this.birthDate);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Virtual for status display
EmployeeSchema.virtual('statusDisplay').get(function() {
  const statusMap = {
    active: 'ปฏิบัติงาน',
    inactive: 'ไม่ปฏิบัติงาน',
    terminated: 'เลิกจ้าง',
    'on-leave': 'ลาพัก',
    suspended: 'พักงาน'
  };
  return statusMap[this.status] || this.status;
});

// Instance methods
EmployeeSchema.methods.softDelete = function() {
  this.deleted_at = new Date();
  this.status = 'terminated';
  return this.save();
};

EmployeeSchema.methods.activate = function() {
  this.status = 'active';
  this.deleted_at = null;
  return this.save();
};

EmployeeSchema.methods.terminate = function(terminationDate = new Date()) {
  this.status = 'terminated';
  this.endDate = terminationDate;
  return this.save();
};

EmployeeSchema.methods.suspend = function() {
  this.status = 'suspended';
  return this.save();
};

EmployeeSchema.methods.addBranchAccess = function(branchId) {
  if (!this.accessibleBranches.includes(branchId)) {
    this.accessibleBranches.push(branchId);
  }
  return this.save();
};

EmployeeSchema.methods.removeBranchAccess = function(branchId) {
  this.accessibleBranches = this.accessibleBranches.filter(
    branch => !branch.equals(branchId)
  );
  return this.save();
};

// Static methods
EmployeeSchema.statics.findActive = function() {
  return this.find({ status: 'active', deleted_at: null })
    .populate('primaryBranch accessibleBranches userId defaultWorkSchedule')
    .sort({ employeeId: 1 });
};

EmployeeSchema.statics.findByBranch = function(branchId) {
  return this.find({
    $or: [
      { primaryBranch: branchId },
      { accessibleBranches: branchId }
    ],
    status: 'active',
    deleted_at: null
  }).populate('primaryBranch userId').sort({ employeeId: 1 });
};

EmployeeSchema.statics.findByDepartment = function(department) {
  return this.find({
    department,
    status: 'active',
    deleted_at: null
  }).populate('primaryBranch userId').sort({ employeeId: 1 });
};

EmployeeSchema.statics.findManagers = function() {
  return this.find({
    isManager: true,
    status: 'active',
    deleted_at: null
  }).populate('primaryBranch userId').sort({ employeeId: 1 });
};

// Pre-save middleware
EmployeeSchema.pre('save', function(next) {
  // Auto-generate employee ID if not provided
  if (this.isNew && !this.employeeId) {
    // This should be handled by the application layer
    // to ensure proper sequence numbering
  }

  // Ensure primary branch is in accessible branches
  if (this.primaryBranch && !this.accessibleBranches.includes(this.primaryBranch)) {
    this.accessibleBranches.push(this.primaryBranch);
  }

  next();
});

// Enable virtuals in JSON output
EmployeeSchema.set('toJSON', { virtuals: true });
EmployeeSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Employee', EmployeeSchema);
