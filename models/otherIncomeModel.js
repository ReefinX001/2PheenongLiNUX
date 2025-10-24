// models/otherIncomeModel.js
const mongoose = require('mongoose');

const otherIncomeSchema = new mongoose.Schema({
  documentNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  category: {
    type: String,
    required: true,
    enum: [
      'ดอกเบี้ยรับ',
      'เงินปันผล',
      'กำไรจากการขายสินทรัพย์',
      'รายได้ค่าเช่า',
      'รายได้ค่าบริการ',
      'รายได้อื่นๆ'
    ]
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  vatType: {
    type: String,
    required: true,
    enum: ['non_vat', 'include_vat', 'exclude_vat'],
    default: 'non_vat'
  },
  vatRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  vatAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['เงินสด', 'โอนเงิน', 'เช็ค', 'บัตรเครดิต', 'อื่นๆ']
  },
  accountCode: {
    type: String,
    required: false,
    ref: 'ChartOfAccounts'
  },
  taxType: {
    type: String,
    enum: ['none', 'pnd1', 'pnd3', 'pnd53', 'pnd54'],
    default: 'none'
  },
  withholdingTaxRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  withholdingTaxAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  netAmount: {
    type: Number,
    min: 0
  },
  referenceNumber: {
    type: String,
    trim: true
  },
  customerName: {
    type: String,
    trim: true
  },
  customerTaxId: {
    type: String,
    trim: true
  },
  customerAddress: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  attachments: [{
    fileName: String,
    filePath: String,
    fileSize: Number,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['draft', 'confirmed', 'cancelled'],
    default: 'confirmed'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  },
  fiscalYear: {
    type: Number,
    required: true,
    default: function() {
      return new Date().getFullYear();
    }
  },
  accountingPeriod: {
    type: Number,
    required: true,
    min: 1,
    max: 12,
    default: function() {
      return new Date().getMonth() + 1;
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
otherIncomeSchema.index({ documentNumber: 1 });
otherIncomeSchema.index({ date: -1 });
otherIncomeSchema.index({ category: 1 });
otherIncomeSchema.index({ accountCode: 1 });
otherIncomeSchema.index({ status: 1 });
otherIncomeSchema.index({ createdBy: 1 });
otherIncomeSchema.index({ branch: 1 });
otherIncomeSchema.index({ fiscalYear: 1, accountingPeriod: 1 });

// Virtual for formatted date
otherIncomeSchema.virtual('formattedDate').get(function() {
  return this.date ? this.date.toLocaleDateString('th-TH') : '';
});

// Pre-save middleware to calculate totals
otherIncomeSchema.pre('save', function(next) {
  // Calculate VAT if needed
  if (this.vatType === 'exclude_vat') {
    this.vatAmount = this.amount * (this.vatRate / 100);
    this.totalAmount = this.amount + this.vatAmount;
  } else if (this.vatType === 'include_vat') {
    this.vatAmount = this.amount - (this.amount / (1 + (this.vatRate / 100)));
    this.totalAmount = this.amount;
  } else {
    this.vatAmount = 0;
    this.totalAmount = this.amount;
  }

  // Calculate withholding tax if applicable
  if (this.taxType !== 'none' && this.withholdingTaxRate > 0) {
    this.withholdingTaxAmount = this.amount * (this.withholdingTaxRate / 100);
    this.netAmount = this.totalAmount - this.withholdingTaxAmount;
  } else {
    this.withholdingTaxAmount = 0;
    this.netAmount = this.totalAmount;
  }

  // Set fiscal year and period from date
  const date = new Date(this.date);
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  // Thai fiscal year (Oct 1 - Sep 30)
  if (month >= 10) {
    this.fiscalYear = year + 1;
    this.accountingPeriod = month - 9;
  } else {
    this.fiscalYear = year;
    this.accountingPeriod = month + 3;
  }

  next();
});

// Method to generate document number
otherIncomeSchema.statics.generateDocumentNumber = async function() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  const prefix = `INC-${year}${month}${day}-`;

  // Find the last document number for today
  const lastDoc = await this.findOne({
    documentNumber: new RegExp(`^${prefix}`)
  }).sort({ documentNumber: -1 });

  let sequence = 1;
  if (lastDoc) {
    const lastSequence = parseInt(lastDoc.documentNumber.split('-').pop());
    sequence = lastSequence + 1;
  }

  return `${prefix}${String(sequence).padStart(3, '0')}`;
};

module.exports = mongoose.model('OtherIncome', otherIncomeSchema);