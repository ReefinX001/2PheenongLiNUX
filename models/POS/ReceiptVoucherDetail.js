const mongoose = require('mongoose');

const receiptVoucherDetailSchema = new mongoose.Schema({
  receiptVoucher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReceiptVoucher',
    required: true
  },
  description: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  accountCode: {
    type: String
  },
  accountName: {
    type: String
  },
  vatType: {
    type: String,
    enum: ['none', 'include', 'exclude'],
    default: 'none'
  },
  vatRate: {
    type: Number,
    default: 0
  },
  vatAmount: {
    type: Number,
    default: 0
  },
  netAmount: {
    type: Number,
    required: true
  },
  reference: {
    productCode: String,
    serviceCode: String,
    unit: String,
    quantity: Number,
    unitPrice: Number
  },
  remark: String
});

// Index
receiptVoucherDetailSchema.index({ receiptVoucher: 1 });

// Calculate net amount before save
receiptVoucherDetailSchema.pre('save', function(next) {
  if (this.vatType === 'include') {
    this.vatAmount = this.amount * (this.vatRate / (100 + this.vatRate));
    this.netAmount = this.amount - this.vatAmount;
  } else if (this.vatType === 'exclude') {
    this.vatAmount = this.amount * (this.vatRate / 100);
    this.netAmount = this.amount;
  } else {
    this.vatAmount = 0;
    this.netAmount = this.amount;
  }
  next();
});

module.exports = mongoose.model('ReceiptVoucherDetail', receiptVoucherDetailSchema);
