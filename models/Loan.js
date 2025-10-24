/**
 * Loan Model
 * Main loan contract model with proper relationships
 * @version 1.0.0
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const loanSchema = new Schema({
  // Contract Information
  contractNumber: {
    type: String,
    required: true,
    unique: true
    // Compound index with deleted_at defined below
  },

  // Customer Information
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
    // Compound index with status and deleted_at defined below
  },
  customerName: {
    type: String,
    required: true
  },
  customerPhone: {
    type: String,
    required: true
  },
  customerAddress: String,
  customerIdCard: String,

  // Branch Information
  branchId: {
    type: Schema.Types.ObjectId,
    ref: 'Branch'
  },
  branch_code: {
    type: String,
    required: true
    // Compound index with status and deleted_at defined below
  },

  // Financial Details
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  principalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  interestAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  downPayment: {
    type: Number,
    default: 0,
    min: 0
  },
  financeAmount: {
    type: Number,
    required: true,
    min: 0
  },

  // Payment Structure
  monthlyPayment: {
    type: Number,
    required: true,
    min: 0
  },
  interestRate: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  installmentMonths: {
    type: Number,
    required: true,
    min: 1
  },

  // Payment Tracking
  paidAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  paidPeriods: {
    type: Number,
    default: 0,
    min: 0
  },
  remainingBalance: {
    type: Number,
    required: true,
    min: 0
  },
  remainingPeriods: {
    type: Number,
    required: true,
    min: 0
  },

  // Dates
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  nextPaymentDate: {
    type: Date,
    required: true,
    index: true
  },
  lastPaymentDate: Date,

  // Status Management
  status: {
    type: String,
    enum: ['pending', 'active', 'ongoing', 'completed', 'overdue', 'cancelled', 'defaulted'],
    default: 'pending',
    index: true
  },

  // Approval Workflow
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'under_review'],
    default: 'pending',
    index: true
  },
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  rejectedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectedAt: Date,
  rejectionReason: String,
  rejectionNotes: String,

  // Risk Assessment
  riskScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  riskCategory: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },

  // Overdue Management
  overdueAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  overduePeriods: {
    type: Number,
    default: 0,
    min: 0
  },
  overdueDays: {
    type: Number,
    default: 0,
    min: 0
  },
  penaltyAmount: {
    type: Number,
    default: 0,
    min: 0
  },

  // Collateral Information
  collateral: [{
    type: {
      type: String,
      enum: ['property', 'vehicle', 'equipment', 'deposit', 'guarantee'],
      required: true
    },
    description: String,
    estimatedValue: {
      type: Number,
      min: 0
    },
    condition: String,
    location: String,
    registrationNumber: String,
    documents: [String]
  }],

  // Guarantor Information
  guarantors: [{
    name: {
      type: String,
      required: true
    },
    idCard: String,
    phone: String,
    address: String,
    relationship: String,
    // อาชีพ - รองรับระบบใหม่และเก่า
    occupation: {
      category: {
        type: String,
        enum: [
          'ข้าราชการ',
          'พนักงานรัฐวิสาหกิจ',
          'พนักงานบริษัท',
          'ธุรกิจส่วนตัว',
          'เกษตรกร',
          'รับจ้างทั่วไป',
          'อื่นๆ',
          '' // Allow empty
        ],
        default: ''
      },
      subcategory: { type: String, default: '' },
      workplace: { type: String, default: '' },
      position: { type: String, default: '' },
      monthlyIncome: { type: Number, min: 0, default: 0 },
      // สำหรับเก็บข้อมูลเดิม (backward compatibility)
      legacyOccupationText: { type: String, default: '' },
      // ข้อมูลเพิ่มเติมสำหรับอาชีพ "อื่นๆ"
      otherOccupationDetail: { type: String, default: '' }
    },
    income: Number
  }],

  // Documents
  attachments: [{
    fileName: String,
    originalName: String,
    mimeType: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    documentType: {
      type: String,
      enum: ['contract', 'id_card', 'income_proof', 'collateral_doc', 'guarantee_doc', 'other']
    }
  }],

  // Tax and Legal
  taxStatus: {
    type: String,
    enum: ['pending', 'paid', 'overdue'],
    default: 'pending'
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  taxPaymentDate: Date,
  taxPaidBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },

  // Stock Management
  stockStatus: {
    type: String,
    enum: ['pending', 'reserved', 'delivered', 'returned'],
    default: 'pending'
  },
  stockReservedAt: Date,
  stockReservedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },

  // Delivery Information
  deliveryStatus: {
    type: String,
    enum: ['pending', 'scheduled', 'delivered', 'failed'],
    default: 'pending'
  },
  deliveredAt: Date,
  deliveredBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  deliveryAddress: String,
  deliveryNotes: String,

  // Items/Products
  items: [{
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product'
    },
    name: String,
    description: String,
    quantity: {
      type: Number,
      default: 1,
      min: 1
    },
    unitPrice: {
      type: Number,
      min: 0
    },
    totalPrice: {
      type: Number,
      min: 0
    },
    serialNumbers: [String],
    warrantyPeriod: Number
  }],

  // Payment Schedule
  paymentSchedule: [{
    periodNumber: Number,
    dueDate: Date,
    principalAmount: Number,
    interestAmount: Number,
    totalAmount: Number,
    status: {
      type: String,
      enum: ['pending', 'paid', 'overdue', 'waived'],
      default: 'pending'
    },
    paidDate: Date,
    paidAmount: Number,
    penaltyAmount: Number
  }],

  // Notes and Comments
  notes: String,
  internalNotes: String,

  // Audit Fields
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },

  // Soft Delete
  deleted_at: {
    type: Date,
    default: null,
    index: true
  }
}, {
  timestamps: true,
  collection: 'loans'
});

// Indexes for performance
loanSchema.index({ contractNumber: 1, deleted_at: 1 });
loanSchema.index({ customerId: 1, status: 1, deleted_at: 1 });
loanSchema.index({ branch_code: 1, status: 1, deleted_at: 1 });
loanSchema.index({ nextPaymentDate: 1, status: 1, deleted_at: 1 });
loanSchema.index({ approvalStatus: 1, createdAt: -1 });
loanSchema.index({ 'items.productId': 1 });

// Virtual for remaining balance calculation
loanSchema.virtual('calculatedRemainingBalance').get(function() {
  return Math.max(0, this.totalAmount - this.paidAmount);
});

// Virtual for payment progress percentage
loanSchema.virtual('paymentProgress').get(function() {
  if (this.totalAmount === 0) return 0;
  return (this.paidAmount / this.totalAmount * 100).toFixed(2);
});

// Virtual for overdue status check
loanSchema.virtual('isOverdue').get(function() {
  if (!this.nextPaymentDate || this.status === 'completed') return false;
  return new Date() > this.nextPaymentDate && this.remainingBalance > 0;
});

// Virtual populate for payments
loanSchema.virtual('paymentLogs', {
  ref: 'ContractPaymentLog',
  localField: '_id',
  foreignField: 'contractId'
});

// Virtual populate for adjustments
loanSchema.virtual('adjustments', {
  ref: 'ContractAdjustment',
  localField: '_id',
  foreignField: 'contractId'
});

// Virtual populate for notifications
loanSchema.virtual('notifications', {
  ref: 'ContractNotification',
  localField: '_id',
  foreignField: 'contractId'
});

// Methods
loanSchema.methods.softDelete = function(userId) {
  this.deleted_at = new Date();
  this.updatedBy = userId;
  return this.save();
};

loanSchema.methods.restore = function(userId) {
  this.deleted_at = null;
  this.updatedBy = userId;
  return this.save();
};

loanSchema.methods.updateRemainingBalance = function() {
  this.remainingBalance = Math.max(0, this.totalAmount - this.paidAmount);
  this.remainingPeriods = Math.max(0, this.installmentMonths - this.paidPeriods);
  return this;
};

loanSchema.methods.addPayment = function(amount, userId) {
  this.paidAmount += amount;
  this.lastPaymentDate = new Date();
  this.updatedBy = userId;

  // Update remaining balance
  this.updateRemainingBalance();

  // Update status
  if (this.remainingBalance <= 0) {
    this.status = 'completed';
  } else if (this.isOverdue) {
    this.status = 'overdue';
  } else if (this.paidAmount > 0) {
    this.status = 'ongoing';
  }

  return this;
};

loanSchema.methods.calculateNextPaymentDate = function() {
  if (!this.startDate) return null;

  const nextDate = new Date(this.startDate);
  nextDate.setMonth(nextDate.getMonth() + this.paidPeriods + 1);

  return nextDate;
};

// Static methods
loanSchema.statics.findActive = function() {
  return this.find({
    deleted_at: null,
    status: { $in: ['active', 'ongoing'] }
  });
};

loanSchema.statics.findOverdue = function() {
  return this.find({
    deleted_at: null,
    nextPaymentDate: { $lt: new Date() },
    remainingBalance: { $gt: 0 },
    status: { $ne: 'completed' }
  });
};

loanSchema.statics.findByCustomer = function(customerId) {
  return this.find({
    customerId: customerId,
    deleted_at: null
  }).sort({ createdAt: -1 });
};

loanSchema.statics.findByBranch = function(branchCode) {
  return this.find({
    branch_code: branchCode,
    deleted_at: null
  }).sort({ createdAt: -1 });
};

// Middleware
loanSchema.pre('save', function(next) {
  // Auto-calculate remaining balance before save
  if (this.isModified('paidAmount') || this.isModified('totalAmount')) {
    this.updateRemainingBalance();
  }

  // Auto-calculate next payment date
  if (this.isModified('paidPeriods') || this.isModified('startDate')) {
    this.nextPaymentDate = this.calculateNextPaymentDate();
  }

  next();
});

loanSchema.pre(/^find/, function(next) {
  // Exclude soft deleted records by default
  if (!this.getQuery().deleted_at) {
    this.where({ deleted_at: null });
  }
  next();
});

// Ensure virtuals are included in JSON output
loanSchema.set('toJSON', { virtuals: true });
loanSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Loan', loanSchema);