const mongoose = require('mongoose');

// Purchase Tax Invoice Schema (ใบกำกับภาษีซื้อ)
const purchaseTaxInvoiceSchema = new mongoose.Schema({
  // Document Information
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  voucherNumber: {
    type: String, // ใบสำคัญจ่าย
    index: true
  },
  documentType: {
    type: String,
    enum: ['full_vat', 'zero_vat', 'exempt_vat', 'no_vat'],
    default: 'full_vat'
  },
  issueDate: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  dueDate: {
    type: Date
  },

  // Supplier Information (ผู้ขายสินค้า/บริการ)
  supplier: {
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      index: true
    },
    name: {
      type: String,
      required: true
    },
    taxId: {
      type: String,
      required: true,
      index: true
    },
    branchCode: String,
    address: String,
    phone: String,
    email: String
  },

  // Purchase Information
  purchaseOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseOrder'
  },
  purchaseOrderNumber: String,

  // Items (รายการสินค้า/บริการ)
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    name: {
      type: String,
      required: true
    },
    description: String,
    quantity: {
      type: Number,
      required: true,
      min: 0
    },
    unit: {
      type: String,
      default: 'ชิ้น'
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    // Tax Information
    taxType: {
      type: String,
      enum: ['vat', 'zero_vat', 'exempt', 'no_vat'],
      default: 'vat'
    },
    vatRate: {
      type: Number,
      default: 7 // %
    },
    vatAmount: {
      type: Number,
      default: 0
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    }
  }],

  // Financial Summary
  summary: {
    subtotal: {
      type: Number,
      required: true,
      default: 0
    },
    discount: {
      type: Number,
      default: 0
    },
    subtotalAfterDiscount: {
      type: Number,
      required: true,
      default: 0
    },
    // VAT Breakdown
    vatableAmount: {
      type: Number,
      default: 0
    },
    vatAmount: {
      type: Number,
      default: 0
    },
    zeroVatAmount: {
      type: Number,
      default: 0
    },
    exemptAmount: {
      type: Number,
      default: 0
    },
    noVatAmount: {
      type: Number,
      default: 0
    },
    // Grand Total
    totalAmount: {
      type: Number,
      required: true,
      default: 0
    }
  },

  // Payment Information
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'partially_paid', 'paid', 'overdue'],
    default: 'unpaid',
    index: true
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'check', 'credit_card', 'other'],
    default: 'bank_transfer'
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  remainingAmount: {
    type: Number,
    default: 0
  },
  paymentDate: Date,

  // Withholding Tax (ภาษีหัก ณ ที่จ่าย)
  withholdingTax: {
    applicable: {
      type: Boolean,
      default: false
    },
    rate: {
      type: Number,
      default: 0 // %
    },
    amount: {
      type: Number,
      default: 0
    },
    certificateNumber: String
  },

  // Branch Information
  branch: {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch'
    },
    branchCode: String,
    branchName: String
  },

  // Additional Information
  notes: String,
  internalNotes: String,
  attachments: [{
    filename: String,
    url: String,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],

  // Status
  status: {
    type: String,
    enum: ['draft', 'pending', 'approved', 'cancelled', 'void'],
    default: 'pending',
    index: true
  },
  cancelReason: String,

  // Audit Trail
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date

}, {
  timestamps: true
});

// Indexes for better query performance
purchaseTaxInvoiceSchema.index({ issueDate: -1 });
purchaseTaxInvoiceSchema.index({ 'supplier.taxId': 1 });
purchaseTaxInvoiceSchema.index({ paymentStatus: 1, issueDate: -1 });
purchaseTaxInvoiceSchema.index({ status: 1, issueDate: -1 });

// Calculate summary before saving
purchaseTaxInvoiceSchema.pre('save', function(next) {
  // Calculate items totals
  let subtotal = 0;
  let discount = 0;
  let vatableAmount = 0;
  let vatAmount = 0;
  let zeroVatAmount = 0;
  let exemptAmount = 0;
  let noVatAmount = 0;

  this.items.forEach(item => {
    subtotal += item.subtotal;
    discount += item.discount || 0;

    switch(item.taxType) {
      case 'vat':
        vatableAmount += item.subtotal;
        vatAmount += item.vatAmount || 0;
        break;
      case 'zero_vat':
        zeroVatAmount += item.totalAmount;
        break;
      case 'exempt':
        exemptAmount += item.totalAmount;
        break;
      case 'no_vat':
        noVatAmount += item.totalAmount;
        break;
    }
  });

  const subtotalAfterDiscount = subtotal - discount;
  const totalAmount = subtotalAfterDiscount + vatAmount;

  // Update summary
  this.summary = {
    subtotal,
    discount,
    subtotalAfterDiscount,
    vatableAmount,
    vatAmount,
    zeroVatAmount,
    exemptAmount,
    noVatAmount,
    totalAmount
  };

  // Update remaining amount
  this.remainingAmount = totalAmount - (this.paidAmount || 0);

  // Update payment status based on amounts
  if (this.paidAmount === 0) {
    this.paymentStatus = 'unpaid';
  } else if (this.paidAmount >= totalAmount) {
    this.paymentStatus = 'paid';
  } else {
    this.paymentStatus = 'partially_paid';
  }

  // Check for overdue
  if (this.dueDate && this.dueDate < new Date() && this.paymentStatus !== 'paid') {
    this.paymentStatus = 'overdue';
  }

  next();
});

// Virtual for formatted invoice number
purchaseTaxInvoiceSchema.virtual('formattedInvoiceNumber').get(function() {
  return `PTI-${this.invoiceNumber}`;
});

// Instance method to calculate aging
purchaseTaxInvoiceSchema.methods.calculateAging = function() {
  if (this.paymentStatus === 'paid') return 0;

  const today = new Date();
  const issueDate = new Date(this.issueDate);
  const diffTime = Math.abs(today - issueDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
};

// Static method to generate next invoice number
purchaseTaxInvoiceSchema.statics.generateInvoiceNumber = async function() {
  const currentYear = new Date().getFullYear();
  const prefix = `PTI${currentYear}`;

  const lastInvoice = await this.findOne({
    invoiceNumber: new RegExp(`^${prefix}`)
  }).sort({ invoiceNumber: -1 });

  if (!lastInvoice) {
    return `${prefix}0001`;
  }

  const lastNumber = parseInt(lastInvoice.invoiceNumber.replace(prefix, ''));
  const nextNumber = (lastNumber + 1).toString().padStart(4, '0');

  return `${prefix}${nextNumber}`;
};

// Set toJSON to include virtuals
purchaseTaxInvoiceSchema.set('toJSON', { virtuals: true });
purchaseTaxInvoiceSchema.set('toObject', { virtuals: true });

const PurchaseTaxInvoice = mongoose.model('PurchaseTaxInvoice', purchaseTaxInvoiceSchema);

module.exports = PurchaseTaxInvoice;
