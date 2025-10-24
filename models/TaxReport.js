const mongoose = require('mongoose');

const taxReportSchema = new mongoose.Schema({
  contractNo: {
    type: String,
    required: true,
    index: true
  },
  contractId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InstallmentOrder'
  },
  taxPeriod: {
    type: String,
    required: true // Format: YYYY-MM
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
  customerName: {
    type: String,
    required: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  taxIdNumber: {
    type: String
  },
  contractValue: {
    type: Number,
    required: true,
    min: 0
  },
  vatRate: {
    type: Number,
    default: 0.07 // 7% VAT
  },
  taxableAmount: {
    type: Number,
    required: true,
    min: 0
  },
  taxAmount: {
    type: Number,
    required: true,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  taxType: {
    type: String,
    enum: ['output', 'input'],
    default: 'output'
  },
  taxInvoiceNo: {
    type: String
  },
  taxInvoiceDate: {
    type: Date
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'overdue'],
    default: 'pending'
  },
  paymentDate: {
    type: Date
  },
  paymentReference: {
    type: String
  },
  paymentAmount: {
    type: Number,
    min: 0
  },
  dueDate: {
    type: Date
  },
  filingStatus: {
    type: String,
    enum: ['not_filed', 'filed', 'revised'],
    default: 'not_filed'
  },
  filingDate: {
    type: Date
  },
  filingReference: {
    type: String
  },
  notes: {
    type: String
  },
  attachments: [{
    filename: String,
    path: String,
    type: {
      type: String,
      enum: ['invoice', 'receipt', 'filing_document', 'other']
    },
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Compound index for unique tax reports per contract per period
taxReportSchema.index({ contractNo: 1, taxPeriod: 1 }, { unique: true });
taxReportSchema.index({ paymentStatus: 1 });
taxReportSchema.index({ filingStatus: 1 });
taxReportSchema.index({ dueDate: 1 });
taxReportSchema.index({ year: 1, month: 1 });

// Pre-save validation
taxReportSchema.pre('save', function(next) {
  // Ensure all amounts are non-negative
  this.contractValue = Math.max(0, this.contractValue || 0);
  this.taxableAmount = Math.max(0, this.taxableAmount || 0);
  this.taxAmount = Math.max(0, this.taxAmount || 0);
  this.totalAmount = Math.max(0, this.totalAmount || 0);
  this.paymentAmount = Math.max(0, this.paymentAmount || 0);

  // Calculate tax amount if not provided
  if (!this.taxAmount && this.taxableAmount) {
    this.taxAmount = Math.round(this.taxableAmount * this.vatRate * 100) / 100;
  }

  // Calculate total amount
  if (this.taxType === 'output') {
    this.totalAmount = this.taxableAmount + this.taxAmount;
  } else {
    this.totalAmount = this.taxableAmount;
  }

  // Set tax period
  this.taxPeriod = `${this.year}-${String(this.month).padStart(2, '0')}`;

  // Update payment status based on dates
  if (this.paymentDate) {
    this.paymentStatus = 'paid';
  } else if (this.dueDate && new Date() > this.dueDate) {
    this.paymentStatus = 'overdue';
  }

  next();
});

// Virtual for overdue days
taxReportSchema.virtual('overdueDays').get(function() {
  if (this.paymentStatus !== 'overdue' || !this.dueDate) return 0;
  const days = Math.floor((new Date() - this.dueDate) / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
});

// Method to mark as paid
taxReportSchema.methods.markAsPaid = function(paymentInfo) {
  this.paymentStatus = 'paid';
  this.paymentDate = paymentInfo.date || new Date();
  this.paymentReference = paymentInfo.reference;
  this.paymentAmount = Math.max(0, paymentInfo.amount || this.taxAmount);
  return this.save();
};

// Method to file tax
taxReportSchema.methods.markAsFiled = function(filingInfo) {
  this.filingStatus = 'filed';
  this.filingDate = filingInfo.date || new Date();
  this.filingReference = filingInfo.reference;
  return this.save();
};

// Static method to get tax summary
taxReportSchema.statics.getTaxSummary = async function(year, month, branch) {
  const match = {
    year,
    month
  };

  if (branch) {
    match.branch = branch;
  }

  const result = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$taxType',
        totalTaxableAmount: { $sum: '$taxableAmount' },
        totalTaxAmount: { $sum: '$taxAmount' },
        totalAmount: { $sum: '$totalAmount' },
        paidAmount: {
          $sum: {
            $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$paymentAmount', 0]
          }
        },
        pendingAmount: {
          $sum: {
            $cond: [{ $eq: ['$paymentStatus', 'pending'] }, '$taxAmount', 0]
          }
        },
        overdueAmount: {
          $sum: {
            $cond: [{ $eq: ['$paymentStatus', 'overdue'] }, '$taxAmount', 0]
          }
        },
        count: { $sum: 1 },
        paidCount: {
          $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] }
        },
        filedCount: {
          $sum: { $cond: [{ $eq: ['$filingStatus', 'filed'] }, 1, 0] }
        }
      }
    }
  ]);

  // Ensure all amounts are non-negative
  return result.map(item => ({
    ...item,
    totalTaxableAmount: Math.max(0, item.totalTaxableAmount || 0),
    totalTaxAmount: Math.max(0, item.totalTaxAmount || 0),
    totalAmount: Math.max(0, item.totalAmount || 0),
    paidAmount: Math.max(0, item.paidAmount || 0),
    pendingAmount: Math.max(0, item.pendingAmount || 0),
    overdueAmount: Math.max(0, item.overdueAmount || 0)
  }));
};

// Static method to generate tax report for a period
taxReportSchema.statics.generatePeriodReport = async function(year, month, branch) {
  const InstallmentOrder = mongoose.model('InstallmentOrder');
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const query = {
    createdAt: { $gte: startDate, $lte: endDate }
  };

  if (branch) {
    query.branch = branch;
  }

  const contracts = await InstallmentOrder.find(query).populate('customer');
  const reports = [];

  for (const contract of contracts) {
    const taxableAmount = Math.max(0, contract.totalAmount / 1.07); // Remove VAT
    const taxAmount = Math.max(0, contract.totalAmount - taxableAmount);

    const report = {
      contractNo: contract.contractNo,
      contractId: contract._id,
      year,
      month,
      customerName: contract.customerName || contract.customer?.name || 'Unknown',
      customerId: contract.customer?._id,
      taxIdNumber: contract.customer?.taxId,
      contractValue: Math.max(0, contract.totalAmount || 0),
      taxableAmount,
      taxAmount,
      totalAmount: Math.max(0, contract.totalAmount || 0),
      branch: contract.branch,
      dueDate: new Date(year, month, 7) // 7th of next month
    };

    reports.push(report);
  }

  return reports;
};

const TaxReport = mongoose.model('TaxReport', taxReportSchema);

module.exports = TaxReport;