const mongoose = require('mongoose');

// Receipt Schema
const receiptSchema = new mongoose.Schema({
  // Document Information
  receiptNumber: {
    type: String,
    required: true,
    unique: true
  },
  documentType: {
    type: String,
    default: 'RECEIPT'
  },
  receiptType: {
    type: String,
    enum: ['down_payment_receipt', 'installment_receipt', 'full_payment_receipt', 'tax_invoice'],
    default: 'down_payment_receipt'
  },
  saleType: {
    type: String,
    enum: ['cash', 'installment'],
    default: 'cash'
  },
  issueDate: {
    type: Date,
    default: Date.now
  },

  // Contract Information
  contractNo: String,
  quotationNumber: String,
  invoiceNumber: String,
  taxInvoiceNumber: String,

  // Customer Information
  customer: {
    name: String,
    fullName: String,
    prefix: String,
    first_name: String,
    last_name: String,
    taxId: String,
    tax_id: String,
    phone: String,
    phone_number: String,
    email: String,
    address: String,
    age: String
  },

  // Items
  items: [{
    product: String,
    name: String,
    brand: String,
    imei: String,
    quantity: {
      type: Number,
      default: 1
    },
    unitPrice: Number,
    totalPrice: Number,
    description: String
  }],

  // Financial Information
  downPaymentAmount: Number,
  totalAmount: Number,
  documentFee: Number,
  vatAmount: Number,
  netTotal: Number,

  // VAT Detection Status
  hasVatItems: {
    type: Boolean,
    default: false
  },
  vatDetectionMethod: {
    type: String,
    enum: ['taxType', 'has_vat', 'vat_rate', 'none', 'mixed'],
    default: 'none'
  },
  taxType: {
    type: String,
    enum: ['inclusive', 'exclusive', 'none'],
    default: 'none'
  },

  // Payment Information
  paymentMethod: {
    type: String,
    default: 'cash'
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },

  // Company Information
  company: {
    name: {
      type: String,
      default: 'บริษัท 2 พี่น้อง โมบาย จำกัด'
    },
    address: {
      type: String,
      default: '148/91 หมู่ที่ 6 ตำบลรูสะมิแล อำเภอปัตตานี จังหวัดปัตตานี 94000'
    },
    taxId: {
      type: String,
      default: '0945566000616'
    },
    phone: {
      type: String,
      default: '09-2427-0769'
    }
  },

  // Branch Information
  branch: {
    name: String,
    code: String,
    address: String
  },
  branchCode: String,

  // Employee Information
  employeeName: String,

  // Additional Fields
  idempotencyKey: {
    type: String,
    index: true,
    unique: true,
    sparse: true
  },
  notes: String,
  signature: String,

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Pre-save middleware สำหรับคำนวณยอดเงินให้ตรงกับ Tax Invoice
receiptSchema.pre('save', function(next) {
  // ตรวจสอบข้อมูลลูกค้า
  if (!this.customer.name || this.customer.name.trim() === '') {
    if (this.customer.first_name && this.customer.last_name) {
      this.customer.name = `${this.customer.prefix || ''} ${this.customer.first_name} ${this.customer.last_name}`.trim();
    } else {
      this.customer.name = 'ลูกค้าทั่วไป';
    }
  }

  // ตรวจสอบรายการสินค้า
  if (!this.items || this.items.length === 0) {
    return next(new Error('Receipt must have at least one item'));
  }

  // คำนวณยอดรวม
  let itemsSubtotal = 0;
  this.items.forEach(item => {
    if (!item.totalPrice && item.unitPrice && item.quantity) {
      item.totalPrice = item.unitPrice * item.quantity;
    }
    itemsSubtotal += item.totalPrice || 0;
  });

  // กำหนดฐานสำหรับคำนวณ: ถ้าเป็นใบเสร็จเงินดาวน์ ให้ใช้อย่างเคร่งครัดจาก downPaymentAmount
  // มิฉะนั้น ใช้ยอดรวมจากรายการสินค้า
  const baseSubtotal = (this.receiptType === 'down_payment_receipt' && typeof this.downPaymentAmount === 'number' && this.downPaymentAmount > 0)
    ? this.downPaymentAmount
    : itemsSubtotal;

  // 🔧 FIX: ใบเสร็จรับเงินต้องแสดงยอดเท่ากับใบกำกับภาษี
  // คำนวณยอดก่อนภาษี (รวมค่าเอกสาร)
  const beforeTax = baseSubtotal + (this.documentFee || 0);

  // คำนวณ VAT ตาม taxType (เหมือนใบกำกับภาษี)
  let vatAmount = 0;
  let totalWithTax = beforeTax;

  if (this.taxType === 'inclusive') {
    // VAT รวมในราคา
    vatAmount = Math.round((beforeTax - (beforeTax / 1.07)) * 100) / 100;
    totalWithTax = beforeTax;
  } else if (this.taxType === 'exclusive') {
    // VAT แยกนอกราคา
    vatAmount = Math.round(beforeTax * 0.07 * 100) / 100;
    totalWithTax = beforeTax + vatAmount;
  } else {
    // ไม่มี VAT
    vatAmount = 0;
    totalWithTax = beforeTax;
  }

  // 🔧 FIX: ใบเสร็จแสดงยอดรวมเท่ากับใบกำกับภาษี แต่ไม่แสดง VAT แยก
  this.totalAmount = totalWithTax; // ยอดรวมทั้งหมดเท่ากับใบกำกับภาษี
  this.vatAmount = 0; // ใบเสร็จไม่แสดง VAT แยก
  this.netTotal = totalWithTax;

  console.log('📋 Receipt calculation (Fixed):', {
    itemsSubtotal,
    baseSubtotal,
    documentFee: this.documentFee || 0,
    beforeTax,
    calculatedVatAmount: vatAmount,
    receiptVatAmount: this.vatAmount, // = 0 (ไม่แสดง)
    totalAmount: this.totalAmount, // = totalWithTax
    taxType: this.taxType,
    note: 'ใบเสร็จแสดงยอดรวมเท่ากับใบกำกับภาษี แต่ไม่แสดง VAT แยก'
  });

  next();
});

// Indexes
receiptSchema.index({ receiptNumber: 1 });
receiptSchema.index({ contractNo: 1 });
receiptSchema.index({ taxInvoiceNumber: 1 });
receiptSchema.index({ 'customer.taxId': 1 });
receiptSchema.index({ createdAt: -1 });
receiptSchema.index({ branchCode: 1 });

module.exports = mongoose.models.Receipt || mongoose.model('Receipt', receiptSchema);
