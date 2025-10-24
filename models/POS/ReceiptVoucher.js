const mongoose = require('mongoose');

const receiptVoucherSchema = new mongoose.Schema({
  documentNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  paymentDate: {
    type: Date,
    required: true
  },
  // บัญชีที่รับเงิน (Dr.)
  debitAccount: {
    code: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    }
  },
  // บัญชีที่เกี่ยวข้อง (Cr.)
  creditAccount: {
    code: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    }
  },
  receivedFrom: {
    type: String,
    required: true
  },
  receiptType: {
    type: String,
    enum: ['cash_sale', 'installment', 'installment_down_payment', 'service', 'deposit', 'other'],
    default: 'cash_sale'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'transfer', 'cheque', 'credit_card', 'e_wallet'],
    default: 'cash'
  },
  bankAccount: {
    bankName: String,
    accountNumber: String,
    accountName: String
  },
  chequeInfo: {
    chequeNumber: String,
    chequeDate: Date,
    bankName: String
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  notes: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['draft', 'completed', 'cancelled'],
    default: 'completed'
  },
  details: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReceiptVoucherDetail'
  }],
  journalEntries: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JournalEntry'
  }],
  // ข้อมูลการอ้างอิง
  reference: {
    invoiceNumber: String,
    installmentContract: String,
    serviceOrder: String,
    quotationNumber: String
  },
  // ข้อมูลการสร้างและแก้ไข
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  },
  // ข้อมูลลูกค้า
  customer: {
    customerId: String,
    name: String,
    address: String,
    taxId: String,
    phone: String
  },
  // เพิ่มฟิลด์ที่ขาดใน schema
  customerType: {
    type: String,
    enum: ['individual', 'corporate'],
    default: 'individual'
  },
  customerInfo: {
    type: mongoose.Schema.Types.Mixed // Can store individual or corporate structure
  },
  items: [{ // This seems to duplicate 'details', consider if this is intended or if 'details' should be structured like this
    name: String, // Or product name/ID
    description: String, // Specific detail for this line item
    amount: Number, // Total amount for this line item (qty * unitPrice)
    quantity: Number,
    unitPrice: Number
  }],
  printCount: {
    type: Number,
    default: 0
  },
  lastPrintedAt: Date,
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancelledAt: Date,
  cancelReason: String
}, {
  timestamps: true
});

// Indexes
// Note: documentNumber index is automatically created by 'unique: true'
receiptVoucherSchema.index({ paymentDate: -1 });
receiptVoucherSchema.index({ 'debitAccount.code': 1 });
receiptVoucherSchema.index({ 'creditAccount.code': 1 });
receiptVoucherSchema.index({ 'customer.customerId': 1 });
receiptVoucherSchema.index({ status: 1 });

// Virtual for formatted amount
receiptVoucherSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB'
  }).format(this.totalAmount);
});

// Methods
receiptVoucherSchema.methods.cancel = async function() {
  this.status = 'cancelled';
  // สร้างรายการ reverse journal entries
  await this.createReverseEntries();
  return this.save();
};

receiptVoucherSchema.methods.createReverseEntries = async function() {
  const JournalEntry = mongoose.model('JournalEntry');
  const originalEntries = await JournalEntry.find({
    documentType: 'RV',
    documentId: this._id
  });

  const reverseEntries = [];
  for (const entry of originalEntries) {
    const reverseEntry = new JournalEntry({
      documentType: 'RV',
      documentId: this._id,
      documentNumber: this.documentNumber + '-REV',
      transactionDate: new Date(),
      accountCode: entry.accountCode,
      accountName: entry.accountName,
      debit: entry.credit, // สลับ debit/credit
      credit: entry.debit,
      description: `ยกเลิก: ${entry.description}`,
      isReversed: true,
      reversedFrom: entry._id,
      createdBy: this.updatedBy
    });
    reverseEntries.push(reverseEntry);
  }

  return JournalEntry.insertMany(reverseEntries);
};

// Statics
receiptVoucherSchema.statics.generateDocumentNumber = async function() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');

  const lastReceipt = await this.findOne({
    documentNumber: new RegExp(`^RV${year}${month}`)
  }).sort('-documentNumber');

  let sequence = 1;
  if (lastReceipt) {
    const lastSequence = parseInt(lastReceipt.documentNumber.slice(-4));
    sequence = lastSequence + 1;
  }

  return `RV${year}${month}${String(sequence).padStart(4, '0')}`;
};

module.exports = mongoose.models.ReceiptVoucher || mongoose.model('ReceiptVoucher', receiptVoucherSchema);
