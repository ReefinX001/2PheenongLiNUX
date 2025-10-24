/**
 * InvoiceReceipt Model - รายการใบแจ้งหนี้และใบเสร็จ
 * จัดการข้อมูลเลขที่เอกสารใบแจ้งหนี้และใบเสร็จรับเงิน
 */

const mongoose = require('mongoose');

const invoiceReceiptSchema = new mongoose.Schema({
  // เลขที่เอกสาร
  documentNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // ประเภทเอกสาร
  documentType: {
    type: String,
    required: true,
    enum: ['invoice', 'receipt', 'tax-invoice', 'quotation', 'delivery'],
    index: true
  },

  // อ้างอิงสัญญาผ่อนชำระ
  contractId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InstallmentOrder',
    required: true,
    index: true
  },

  // หมายเลขสัญญา
  contractNumber: {
    type: String,
    required: true,
    index: true
  },

  // จำนวนเงิน
  amount: {
    type: Number,
    required: true,
    min: 0
  },

  // สาขาที่ออกเอกสาร
  branchCode: {
    type: String,
    required: true,
    index: true
  },

  // ผู้สร้างเอกสาร
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // ข้อมูลลูกค้า
  customer: {
    name: String,
    phone: String,
    address: String
  },

  // สถานะเอกสาร
  status: {
    type: String,
    enum: ['draft', 'issued', 'cancelled'],
    default: 'issued',
    index: true
  },

  // หมายเหตุ
  notes: String,

  // วันที่ออกเอกสาร
  issuedDate: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  collection: 'invoicereceipts'
});

// Indexes สำหรับการค้นหา
invoiceReceiptSchema.index({ documentType: 1, branchCode: 1 });
invoiceReceiptSchema.index({ contractId: 1, documentType: 1 });
invoiceReceiptSchema.index({ createdAt: -1 });

// Methods
invoiceReceiptSchema.methods.getDisplayNumber = function() {
  return this.documentNumber;
};

// Statics
invoiceReceiptSchema.statics.findByContract = function(contractId) {
  return this.find({ contractId });
};

invoiceReceiptSchema.statics.findByType = function(documentType) {
  return this.find({ documentType });
};

invoiceReceiptSchema.statics.getLatestByType = function(documentType, branchCode) {
  return this.findOne({
    documentType,
    branchCode
  }).sort({ createdAt: -1 });
};

const InvoiceReceipt = mongoose.model('InvoiceReceipt', invoiceReceiptSchema);

module.exports = InvoiceReceipt;
