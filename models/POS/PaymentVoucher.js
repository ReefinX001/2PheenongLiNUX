// models/POS/PaymentVoucher.js
const mongoose = require('mongoose');

const PaymentVoucherSchema = new mongoose.Schema({
  // เลขที่เอกสาร
  voucherNumber: {
    type: String,
    unique: true,
    sparse: true
  },

  // วันที่
  date: {
    type: Date,
    required: true,
    default: Date.now
  },

  // ประเภทการจ่าย
  paymentType: {
    type: String,
    enum: ['purchase', 'expense', 'salary', 'utility', 'rent', 'other'],
    required: true,
    default: 'expense'
  },

  // ผู้รับเงิน
  payee: {
    type: String,
    required: true,
    trim: true
  },

  // รายการสินค้า/บริการ
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BranchStock'
    },
    productName: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1
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
    description: {
      type: String,
      trim: true
    }
  }],

  // ยอดรวมก่อนภาษี
  subtotal: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },

  // ส่วนลด
  discount: {
    type: Number,
    min: 0,
    default: 0
  },

  // ประเภทส่วนลด
  discountType: {
    type: String,
    enum: ['percent', 'amount'],
    default: 'amount'
  },

  // ภาษีมูลค่าเพิ่ม
  vatAmount: {
    type: Number,
    min: 0,
    default: 0
  },

  // อัตราภาษี
  vatRate: {
    type: Number,
    min: 0,
    max: 100,
    default: 7
  },

  // ประเภทภาษี
  taxType: {
    type: String,
    enum: ['no_tax', 'exclude_tax', 'include_tax'],
    default: 'exclude_tax'
  },

  // ยอดรวมสุทธิ
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },

  // วิธีการชำระเงิน
  paymentMethod: {
    type: String,
    enum: ['cash', 'transfer', 'cheque', 'credit_card', 'other'],
    required: true,
    default: 'cash'
  },

  // รายละเอียดการชำระเงิน
  paymentDetails: {
    bankName: String,
    accountNumber: String,
    chequeNumber: String,
    transferRef: String,
    cardNumber: String
  },

  // หมายเหตุ
  notes: {
    type: String,
    trim: true
  },

  // สถานะ
  status: {
    type: String,
    enum: ['draft', 'pending', 'approved', 'paid', 'cancelled'],
    default: 'draft'
  },

  // ไฟล์แนบ
  attachments: [{
    fileName: String,
    originalName: String,
    filePath: String,
    fileSize: Number,
    mimeType: String,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],

  // สาขา
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
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

  // ข้อมูลการอนุมัติ
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  approvedAt: {
    type: Date
  },

  // ข้อมูลการจ่ายเงิน
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  paidAt: {
    type: Date
  }

}, {
  timestamps: true
});

// Index for better performance
PaymentVoucherSchema.index({ voucherNumber: 1 });
PaymentVoucherSchema.index({ date: -1 });
PaymentVoucherSchema.index({ paymentType: 1 });
PaymentVoucherSchema.index({ status: 1 });
PaymentVoucherSchema.index({ branch: 1 });
PaymentVoucherSchema.index({ createdBy: 1 });

// Virtual for formatted voucher number
PaymentVoucherSchema.virtual('formattedVoucherNumber').get(function() {
  return this.voucherNumber || `PV-${this._id.toString().substr(-6).toUpperCase()}`;
});

// Pre-save middleware to generate voucher number
PaymentVoucherSchema.pre('save', async function(next) {
  if (this.isNew && !this.voucherNumber) {
    try {
      // Generate voucher number in format PV-YYYYMMDD-XXX
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const dateStr = `${year}${month}${day}`;

      // Count documents created today
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      const count = await this.constructor.countDocuments({
        createdAt: { $gte: startOfDay, $lt: endOfDay }
      });

      const sequence = String(count + 1).padStart(3, '0');
      this.voucherNumber = `PV-${dateStr}-${sequence}`;
    } catch (error) {
      return next(error);
    }
  }

  // Calculate totals
  if (this.items && this.items.length > 0) {
    this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
  }

  // Calculate discount amount
  let discountAmount = 0;
  if (this.discount > 0) {
    if (this.discountType === 'percent') {
      discountAmount = (this.subtotal * this.discount) / 100;
    } else {
      discountAmount = this.discount;
    }
  }

  // Calculate VAT
  const afterDiscount = this.subtotal - discountAmount;
  if (this.taxType === 'exclude_tax') {
    this.vatAmount = (afterDiscount * this.vatRate) / 100;
    this.totalAmount = afterDiscount + this.vatAmount;
  } else if (this.taxType === 'include_tax') {
    this.vatAmount = afterDiscount - (afterDiscount / (1 + this.vatRate / 100));
    this.totalAmount = afterDiscount;
  } else {
    this.vatAmount = 0;
    this.totalAmount = afterDiscount;
  }

  next();
});

// Method to approve voucher
PaymentVoucherSchema.methods.approve = function(userId) {
  this.status = 'approved';
  this.approvedBy = userId;
  this.approvedAt = new Date();
  return this.save();
};

// Method to mark as paid
PaymentVoucherSchema.methods.markAsPaid = function(userId) {
  this.status = 'paid';
  this.paidBy = userId;
  this.paidAt = new Date();
  return this.save();
};

// Method to cancel voucher
PaymentVoucherSchema.methods.cancel = function() {
  this.status = 'cancelled';
  return this.save();
};

module.exports = mongoose.model('PaymentVoucher', PaymentVoucherSchema);
