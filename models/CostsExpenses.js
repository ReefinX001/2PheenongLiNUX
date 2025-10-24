const mongoose = require('mongoose');

const costsExpensesSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  type: {
    type: String,
    required: true,
    enum: [
      'downpayment',
      'financial',
      'installment_start',
      'installment_end',
      'tax',
      'debt_collection',
      'debt_recovery',
      'legal_fee',
      'administrative',
      'contract_processing',
      'bad_debt_provision',
      'collection_agency',
      'asset_recovery'
    ]
  },
  description: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: function(value) {
        return value >= 0;
      },
      message: 'Amount must be a positive number'
    }
  },
  note: {
    type: String
  },
  attachments: [{
    filename: String,
    path: String,
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
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'paid'],
    default: 'pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedDate: {
    type: Date
  },
  // Contract and debt management integration fields
  relatedContract: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InstallmentOrder'
  },
  contractNo: {
    type: String
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  debtCollectionStage: {
    type: String,
    enum: ['early_reminder', 'formal_notice', 'legal_action', 'recovery_process', 'write_off']
  },
  collectionAgency: {
    name: String,
    fee: Number,
    percentage: Number
  },
  legalProceedingDetails: {
    court: String,
    caseNumber: String,
    lawyer: String,
    expectedRecovery: Number
  },
  assetRecoveryDetails: {
    assetType: String,
    estimatedValue: Number,
    recoveryDate: Date
  },
  // Additional expense tracking for Thai accounting
  documentNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  taxInvoiceNumber: {
    type: String
  },
  dueDate: {
    type: Date
  },
  supplierName: {
    type: String
  },
  vatRate: {
    type: Number,
    default: 0
  },
  vatAmount: {
    type: Number,
    default: 0
  },
  isDeductible: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for performance
costsExpensesSchema.index({ date: -1 });
costsExpensesSchema.index({ type: 1 });
costsExpensesSchema.index({ status: 1 });
costsExpensesSchema.index({ branch: 1 });
costsExpensesSchema.index({ relatedContract: 1 });
costsExpensesSchema.index({ contractNo: 1 });
costsExpensesSchema.index({ customerId: 1 });
costsExpensesSchema.index({ debtCollectionStage: 1 });
costsExpensesSchema.index({ documentNumber: 1 });

// Virtual for formatted amount
costsExpensesSchema.virtual('formattedAmount').get(function() {
  return Math.max(0, this.amount || 0);
});

// Pre-save validation
costsExpensesSchema.pre('save', function(next) {
  // Ensure amount is never negative
  this.amount = Math.max(0, this.amount || 0);
  next();
});

// Method to approve expense
costsExpensesSchema.methods.approve = function(userId) {
  this.status = 'approved';
  this.approvedBy = userId;
  this.approvedDate = new Date();
  return this.save();
};

// Static method to get expenses by type
costsExpensesSchema.statics.getByType = function(type, startDate, endDate) {
  const query = { type };
  if (startDate && endDate) {
    query.date = { $gte: startDate, $lte: endDate };
  }
  return this.find(query).sort({ date: -1 });
};

// Static method to get total expenses
costsExpensesSchema.statics.getTotalExpenses = async function(startDate, endDate, branch) {
  const match = {};
  if (startDate && endDate) {
    match.date = { $gte: startDate, $lte: endDate };
  }
  if (branch) {
    match.branch = branch;
  }

  const result = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);

  return result.map(item => ({
    type: item._id,
    total: Math.max(0, item.total || 0),
    count: item.count
  }));
};

// Static method to get contract-related expenses
costsExpensesSchema.statics.getContractExpenses = function(contractId) {
  return this.find({ relatedContract: contractId }).sort({ date: -1 });
};

// Static method to get debt collection costs by stage
costsExpensesSchema.statics.getDebtCollectionCosts = function(stage, startDate, endDate) {
  const query = {
    type: { $in: ['debt_collection', 'debt_recovery', 'legal_fee', 'collection_agency'] }
  };

  if (stage) {
    query.debtCollectionStage = stage;
  }

  if (startDate && endDate) {
    query.date = { $gte: startDate, $lte: endDate };
  }

  return this.find(query).sort({ date: -1 });
};

// Static method to get debt collection summary
costsExpensesSchema.statics.getDebtCollectionSummary = async function(contractId) {
  const match = { relatedContract: contractId };

  const summary = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$debtCollectionStage',
        totalCost: { $sum: '$amount' },
        count: { $sum: 1 },
        latestDate: { $max: '$date' }
      }
    },
    {
      $sort: { latestDate: -1 }
    }
  ]);

  return summary.map(item => ({
    stage: item._id,
    totalCost: Math.max(0, item.totalCost || 0),
    count: item.count,
    latestDate: item.latestDate
  }));
};

// Method to create debt collection expense
costsExpensesSchema.statics.createDebtCollectionExpense = async function(data) {
  const {
    contractId,
    contractNo,
    customerId,
    stage,
    type,
    amount,
    description,
    note,
    createdBy,
    collectionAgency,
    legalDetails,
    assetRecovery
  } = data;

  const expense = new this({
    type: type || 'debt_collection',
    description,
    amount: Math.max(0, parseFloat(amount) || 0),
    date: new Date(),
    note,
    relatedContract: contractId,
    contractNo,
    customerId,
    debtCollectionStage: stage,
    collectionAgency,
    legalProceedingDetails: legalDetails,
    assetRecoveryDetails: assetRecovery,
    status: 'approved',
    createdBy,
    documentNumber: `DC-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
  });

  return expense.save();
};

const CostsExpenses = mongoose.model('CostsExpenses', costsExpensesSchema);

module.exports = CostsExpenses;