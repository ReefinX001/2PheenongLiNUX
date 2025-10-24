/**
 * Installment Model - Main model for installment system
 * @version 1.0.0
 */

const mongoose = require('mongoose');

const installmentSchema = new mongoose.Schema({
  contractNumber: {
    type: String,
    required: true,
    unique: true,
    index: { unique: true, background: true } // Enhanced index with background creation
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  customerName: {
    type: String,
    required: true
  },
  customerPhone: {
    type: String,
    required: true
  },
  customerAddress: {
    type: String,
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  productName: {
    type: String,
    required: true
  },
  productPrice: {
    type: Number,
    required: true,
    min: 0
  },
  downPayment: {
    type: Number,
    required: true,
    min: 0
  },
  financeAmount: {
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
  totalInterest: {
    type: Number,
    required: true,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  installmentMonths: {
    type: Number,
    required: true,
    min: 1
  },
  monthlyPayment: {
    type: Number,
    required: true,
    min: 0
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'cancelled', 'overdue', 'default'],
    default: 'pending'
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvalDate: Date,
  approvalNotes: String,
  paymentHistory: [{
    paymentDate: Date,
    paymentAmount: Number,
    principalAmount: Number,
    interestAmount: Number,
    remainingBalance: Number,
    paymentMethod: String,
    receiptNumber: String,
    notes: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  overdueCharges: {
    type: Number,
    default: 0
  },
  totalPaidAmount: {
    type: Number,
    default: 0
  },
  remainingBalance: {
    type: Number,
    default: 0
  },
  lastPaymentDate: Date,
  nextPaymentDate: Date,
  overdueCount: {
    type: Number,
    default: 0
  },
  branchCode: {
    type: String,
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  guarantor: {
    name: String,
    phone: String,
    idCard: String,
    address: String,
    relationship: String
  },
  notes: String,
  documents: [{
    type: String,
    name: String,
    url: String,
    uploadDate: Date
  }],
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for better query performance
installmentSchema.index({ status: 1, branchCode: 1 });
installmentSchema.index({ customerId: 1 });
installmentSchema.index({ startDate: 1, endDate: 1 });
installmentSchema.index({ nextPaymentDate: 1 });

// Virtual for checking if overdue
installmentSchema.virtual('isOverdue').get(function() {
  if (this.status === 'completed' || this.status === 'cancelled') return false;
  return this.nextPaymentDate && new Date() > this.nextPaymentDate;
});

// Method to calculate remaining installments
installmentSchema.methods.getRemainingInstallments = function() {
  const paidInstallments = this.paymentHistory.length;
  return this.installmentMonths - paidInstallments;
};

// Method to calculate total paid principal
installmentSchema.methods.getTotalPaidPrincipal = function() {
  return this.paymentHistory.reduce((sum, payment) => {
    return sum + (payment.principalAmount || 0);
  }, 0);
};

// Method to calculate total paid interest
installmentSchema.methods.getTotalPaidInterest = function() {
  return this.paymentHistory.reduce((sum, payment) => {
    return sum + (payment.interestAmount || 0);
  }, 0);
};

// Pre-save middleware to calculate remaining balance - optimized for performance
installmentSchema.pre('save', function(next) {
  // Only perform calculations if payment-related fields are modified
  if (this.isModified('paymentHistory') || this.isModified('totalAmount')) {
    // Use cached values if available and valid
    if (!this.paymentHistory || this.paymentHistory.length === 0) {
      this.totalPaidAmount = 0;
    } else {
      // Optimized calculation using for loop instead of reduce for better performance
      let totalPaid = 0;
      for (let i = 0; i < this.paymentHistory.length; i++) {
        if (this.paymentHistory[i].paymentAmount && typeof this.paymentHistory[i].paymentAmount === 'number') {
          totalPaid += this.paymentHistory[i].paymentAmount;
        }
      }
      this.totalPaidAmount = totalPaid;
    }

    this.remainingBalance = (this.totalAmount || 0) - this.totalPaidAmount;

    // Update status based on remaining balance
    if (this.remainingBalance <= 0 && this.status === 'active') {
      this.status = 'completed';
    }
  }
  next();
});

// Add compound indexes for better query performance
installmentSchema.index({ branchCode: 1, createdAt: -1 }); // For branch-specific queries
installmentSchema.index({ status: 1, createdAt: -1 }); // For status-based queries
installmentSchema.index({ contractNumber: 1 }, { background: true }); // Contract number regex queries
installmentSchema.index({ customerId: 1, status: 1 }); // Customer-specific queries

const Installment = mongoose.model('Installment', installmentSchema);

module.exports = Installment;