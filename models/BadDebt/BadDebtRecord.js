// models/BadDebt/BadDebtRecord.js
// Bad Debt Record model for tracking customer debt issues

const mongoose = require('mongoose');
const { Schema } = mongoose;

const badDebtRecordSchema = new Schema({
  // Customer identification
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    required: false
  },
  customerPhone: {
    type: String,
    required: true,
    trim: true
  },
  customerTaxId: {
    type: String,
    required: false,
    trim: true
  },
  customerName: {
    type: String,
    required: true,
    trim: true
  },

  // Debt information
  debtAmount: {
    type: Number,
    required: true,
    min: 0
  },
  originalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  remainingAmount: {
    type: Number,
    required: true,
    min: 0
  },

  // Contract/Order reference
  contractNo: {
    type: String,
    required: false,
    trim: true
  },
  installmentOrderId: {
    type: Schema.Types.ObjectId,
    ref: 'InstallmentOrder',
    required: false
  },

  // Debt status and classification
  debtType: {
    type: String,
    enum: ['installment', 'loan', 'other'],
    default: 'installment'
  },
  debtStatus: {
    type: String,
    enum: ['active', 'settled', 'written_off', 'in_collection'],
    default: 'active'
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },

  // Important dates
  dueDate: {
    type: Date,
    required: true
  },
  overdueDate: {
    type: Date,
    required: false
  },
  lastPaymentDate: {
    type: Date,
    required: false
  },
  createdDate: {
    type: Date,
    default: Date.now
  },

  // Collection and follow-up information
  collectionAttempts: [{
    date: { type: Date, default: Date.now },
    method: {
      type: String,
      enum: ['phone', 'email', 'visit', 'letter', 'sms'],
      default: 'phone'
    },
    result: {
      type: String,
      enum: ['contacted', 'no_answer', 'promised_payment', 'refused', 'wrong_number'],
      default: 'contacted'
    },
    notes: { type: String, default: '' },
    contactedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false
    }
  }],

  // Notes and remarks
  remarks: {
    type: String,
    default: ''
  },
  internalNotes: {
    type: String,
    default: ''
  },

  // Legal action information
  legalAction: {
    isInitiated: { type: Boolean, default: false },
    initiatedDate: { type: Date, required: false },
    actionType: { type: String, default: '' },
    lawyer: { type: String, default: '' },
    courtCase: { type: String, default: '' },
    status: { type: String, default: '' }
  },

  // Financial information
  interestRate: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  penaltyAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  totalAmountDue: {
    type: Number,
    min: 0,
    default: 0
  },

  // System fields
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  }
}, {
  timestamps: true
});

// Calculate days overdue
badDebtRecordSchema.virtual('daysOverdue').get(function() {
  if (!this.dueDate) return 0;
  const today = new Date();
  const diffTime = today - this.dueDate;
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
});

// Calculate aging category
badDebtRecordSchema.virtual('agingCategory').get(function() {
  const days = this.daysOverdue;
  if (days <= 30) return '0-30 days';
  if (days <= 60) return '31-60 days';
  if (days <= 90) return '61-90 days';
  if (days <= 180) return '91-180 days';
  return '180+ days';
});

// Update total amount due including penalties
badDebtRecordSchema.pre('save', function(next) {
  this.totalAmountDue = this.remainingAmount + this.penaltyAmount;
  next();
});

// Ensure virtual fields are serialized
badDebtRecordSchema.set('toJSON', { virtuals: true });
badDebtRecordSchema.set('toObject', { virtuals: true });

// Indexes for better performance
badDebtRecordSchema.index({ customerPhone: 1 });
badDebtRecordSchema.index({ customerTaxId: 1 });
badDebtRecordSchema.index({ customerId: 1 });
badDebtRecordSchema.index({ debtStatus: 1 });
badDebtRecordSchema.index({ dueDate: 1 });
badDebtRecordSchema.index({ createdAt: -1 });
badDebtRecordSchema.index({ severity: 1, debtStatus: 1 });

module.exports = mongoose.model('BadDebtRecord', badDebtRecordSchema);
