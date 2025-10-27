const mongoose = require('mongoose');

// Tax Invoice Schema
const taxInvoiceSchema = new mongoose.Schema({
  // Document Information
  taxInvoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  documentType: {
    type: String,
    default: 'TAX_INVOICE'
  },
  receiptType: {
    type: String,
    enum: ['down_payment_tax_invoice', 'installment_tax_invoice', 'full_payment_tax_invoice'],
    default: 'down_payment_tax_invoice'
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

  // Customer Information
  customer: {
    name: {
      type: String,
      required: true,
      default: 'ลูกค้าทั่วไป'
    },
    fullName: {
      type: String,
      default: function() {
        return `${this.prefix || ''} ${this.first_name || ''} ${this.last_name || ''}`.trim();
      }
    },
    prefix: String,
    first_name: String,
    last_name: String,
    taxId: String,
    tax_id: String,
    phone: String,
    phone_number: String,
    email: String,
    address: {
      type: String,
      default: 'ไม่ระบุที่อยู่'
    },
    age: String
  },

  // Items
  items: [{
    product: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true,
      default: 'สินค้า'
    },
    brand: String,
    imei: String,
    quantity: {
      type: Number,
      default: 1,
      min: 1
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0
    },
    description: String,
    // สำหรับการคำนวณภาษี
    hasVat: {
      type: Boolean,
      default: true
    },
    vatRate: {
      type: Number,
      default: 7
    }
  }],

  // Financial Summary
  summary: {
    subtotal: {
      type: Number,
      default: 0,
      min: 0
    },
    docFee: {
      type: Number,
      default: 0,
      min: 0
    },
    beforeTax: {
      type: Number,
      default: 0,
      min: 0
    },
    vatAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    totalWithTax: {
      type: Number,
      default: 0,
      min: 0
    },
    netTotal: {
      type: Number,
      default: 0,
      min: 0
    },
    total: {
      type: Number,
      default: 0,
      min: 0
    }
  },

  // Tax Calculation
  calculation: {
    subtotal: Number,
    documentFee: Number,
    beforeTax: Number,
    vatRate: {
      type: Number,
      default: 7
    },
    vatAmount: Number,
    totalAmount: Number,
    taxType: {
      type: String,
      enum: ['inclusive', 'exclusive', 'none'],
      default: 'inclusive'
    }
  },

  // VAT Detection Status
  hasVatItems: {
    type: Boolean,
    default: true // Tax Invoice should always have VAT
  },
  vatDetectionMethod: {
    type: String,
    enum: ['taxType', 'has_vat', 'vat_rate', 'mixed'],
    default: 'taxType'
  },

  // Payment Information
  downPaymentAmount: {
    type: Number,
    default: 0,
    min: 0,
    validate: {
      validator: function(v) {
        return v >= 0;
      },
      message: 'Down payment amount must be non-negative'
    }
  },
  paymentMethod: {
    type: String,
    default: 'cash',
    enum: ['cash', 'transfer', 'credit_card', 'other']
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['paid', 'pending', 'cancelled'],
    default: 'paid'
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

  // VAT Settings
  vatInclusive: {
    type: Boolean,
    default: true
  },
  vatRate: {
    type: Number,
    default: 7
  },

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

// Pre-save middleware สำหรับตรวจสอบและคำนวณข้อมูล
taxInvoiceSchema.pre('save', function(next) {
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
    return next(new Error('Tax Invoice must have at least one item'));
  }

  // คำนวณยอดรวม
  let subtotal = 0;
  this.items.forEach(item => {
    if (!item.totalPrice && item.unitPrice && item.quantity) {
      item.totalPrice = item.unitPrice * item.quantity;
    }
    subtotal += item.totalPrice || 0;
  });

  // อัพเดท summary
  this.summary.subtotal = subtotal;
  this.summary.beforeTax = subtotal + (this.summary.docFee || 0);

  // คำนวณ VAT ตาม taxType
  if (this.calculation.taxType === 'inclusive') {
    // VAT รวมในราคา - ราคาเฉพาะสินค้า = ราคารวม / 1.07
    const priceExcludingVat = Math.round((this.summary.beforeTax / 1.07) * 100) / 100;
    this.summary.vatAmount = Math.round((this.summary.beforeTax - priceExcludingVat) * 100) / 100;
    this.summary.totalWithTax = this.summary.beforeTax; // ราคารวม VAT แล้ว
  } else if (this.calculation.taxType === 'exclusive') {
    // VAT แยกนอกราคา - ต้องบวก VAT เข้าไป
    this.summary.vatAmount = Math.round(this.summary.beforeTax * 0.07 * 100) / 100;
    this.summary.totalWithTax = this.summary.beforeTax + this.summary.vatAmount;
  } else {
    // ไม่มี VAT
    this.summary.vatAmount = 0;
    this.summary.totalWithTax = this.summary.beforeTax;
  }

  // ตรวจสอบให้แน่ใจว่า total มี VAT รวมอยู่แล้ว
  this.summary.netTotal = this.summary.totalWithTax;
  this.summary.total = this.summary.totalWithTax;

  // อัพเดท calculation
  this.calculation.subtotal = this.summary.subtotal;
  this.calculation.beforeTax = this.summary.beforeTax;
  this.calculation.vatAmount = this.summary.vatAmount;
  this.calculation.totalAmount = this.summary.totalWithTax;

  next();
});

// Indexes
taxInvoiceSchema.index({ taxInvoiceNumber: 1 });
taxInvoiceSchema.index({ contractNo: 1 });
taxInvoiceSchema.index({ 'customer.taxId': 1 });
taxInvoiceSchema.index({ createdAt: -1 });
taxInvoiceSchema.index({ branchCode: 1 });

// Instance methods
taxInvoiceSchema.methods.calculateVAT = function() {
  const beforeTax = this.summary.beforeTax || 0;

  if (this.calculation.taxType === 'inclusive') {
    // VAT รวมในราคา - คำนวณ VAT ที่รวมอยู่
    const priceExcludingVat = Math.round((beforeTax / 1.07) * 100) / 100;
    return Math.round((beforeTax - priceExcludingVat) * 100) / 100;
  } else if (this.calculation.taxType === 'exclusive') {
    // VAT แยกนอกราคา - คำนวณ VAT ที่ต้องเพิ่ม
    return Math.round(beforeTax * 0.07 * 100) / 100;
  }

  return 0;
};

taxInvoiceSchema.methods.validateCustomerData = function() {
  if (!this.customer.name || this.customer.name.trim() === '') {
    throw new Error('Customer name is required for Tax Invoice');
  }

  if (!this.items || this.items.length === 0) {
    throw new Error('At least one item is required for Tax Invoice');
  }

  return true;
};

taxInvoiceSchema.methods.getFormattedTotal = function() {
  return this.summary.totalWithTax?.toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) || '0.00';
};

// Static methods
taxInvoiceSchema.statics.findByDocumentNumber = function(docNumber) {
  return this.findOne({ taxInvoiceNumber: docNumber });
};

taxInvoiceSchema.statics.findByCustomerTaxId = function(taxId) {
  return this.find({
    $or: [
      { 'customer.taxId': taxId },
      { 'customer.tax_id': taxId }
    ]
  });
};

module.exports = mongoose.models.TaxInvoice || mongoose.model('TaxInvoice', taxInvoiceSchema);
