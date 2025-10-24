/**
 * models/Stock/PurchaseDebitNote.js - Model สำหรับใบเพิ่มหนี้การซื้อ
 */

const mongoose = require('mongoose');

const purchaseDebitNoteSchema = new mongoose.Schema({
  debitNoteNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },

  // Reference to Purchase Order
  purchaseOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseOrder',
    required: true
  },

  // Reference to Supplier
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },

  // Amount and financial details
  totalAmount: {
    type: Number,
    required: true,
    min: 0.01
  },

  // Debit note details
  reason: {
    type: String,
    required: true,
    enum: [
      'ADDITIONAL_PRODUCT',
      'PRICE_INCREASE',
      'SHIPPING_COST',
      'HANDLING_FEE',
      'STORAGE_FEE',
      'INSURANCE_FEE',
      'CUSTOMS_DUTY',
      'LATE_DELIVERY_PENALTY',
      'QUALITY_PREMIUM',
      'URGENT_ORDER_FEE',
      'MODIFICATION_COST',
      'ADJUSTMENT',
      'ERROR_CORRECTION',
      'OTHER'
    ]
  },

  reasonText: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },

  notes: {
    type: String,
    trim: true,
    maxlength: 2000
  },

  // Status management
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },

  // Issue date
  issueDate: {
    type: Date,
    default: Date.now
  },

  // Approval tracking
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  approvedAt: {
    type: Date
  },

  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  rejectedAt: {
    type: Date
  },

  rejectionReason: {
    type: String,
    trim: true
  },

  // Audit trail
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
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
purchaseDebitNoteSchema.index({ debitNoteNumber: 1 });
purchaseDebitNoteSchema.index({ supplier: 1, status: 1 });
purchaseDebitNoteSchema.index({ purchaseOrder: 1 });
purchaseDebitNoteSchema.index({ status: 1, createdAt: -1 });
purchaseDebitNoteSchema.index({ issueDate: -1 });

// Virtual for formatted amount
purchaseDebitNoteSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB'
  }).format(this.totalAmount);
});

// Virtual for reason display in Thai
purchaseDebitNoteSchema.virtual('reasonDisplay').get(function() {
  const reasonMap = {
    'ADDITIONAL_PRODUCT': 'สินค้าเพิ่มเติม',
    'PRICE_INCREASE': 'ปรับราคาเพิ่ม',
    'SHIPPING_COST': 'ค่าขนส่งเพิ่มเติม',
    'HANDLING_FEE': 'ค่าจัดการ',
    'STORAGE_FEE': 'ค่าเก็บรักษา',
    'INSURANCE_FEE': 'ค่าประกันภัย',
    'CUSTOMS_DUTY': 'ค่าภาษีศุลกากร',
    'LATE_DELIVERY_PENALTY': 'ค่าปรับส่งของล่าช้า',
    'QUALITY_PREMIUM': 'ค่าพิเศษคุณภาพ',
    'URGENT_ORDER_FEE': 'ค่าสั่งด่วน',
    'MODIFICATION_COST': 'ค่าดัดแปลง/ปรับปรุง',
    'ADJUSTMENT': 'ปรับปรุงยอด',
    'ERROR_CORRECTION': 'แก้ไขข้อผิดพลาด',
    'OTHER': 'อื่นๆ'
  };
  return reasonMap[this.reason] || this.reason;
});

// Pre-save middleware
purchaseDebitNoteSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedBy = this._updateUser || this.createdBy;
  }
  next();
});

// Static methods
purchaseDebitNoteSchema.statics.findByPO = function(purchaseOrderId) {
  return this.find({ purchaseOrder: purchaseOrderId })
    .populate('supplier', 'name code')
    .populate('purchaseOrder', 'poNumber docDate totalAmount')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });
};

purchaseDebitNoteSchema.statics.getStatsByStatus = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' }
      }
    }
  ]);
};

module.exports = mongoose.model('PurchaseDebitNote', purchaseDebitNoteSchema);

