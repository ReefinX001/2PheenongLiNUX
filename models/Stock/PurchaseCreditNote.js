/**
 * models/Stock/PurchaseCreditNote.js - Model สำหรับใบลดหนี้การซื้อ
 */

const mongoose = require('mongoose');

const purchaseCreditNoteSchema = new mongoose.Schema({
  creditNoteNumber: {
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

  // Credit note details
  reason: {
    type: String,
    required: true,
    enum: [
      'PRODUCT_RETURN',
      'DEFECTIVE_PRODUCT',
      'PRICE_REDUCTION',
      'QUANTITY_SHORTAGE',
      'QUALITY_ISSUE',
      'DELIVERY_DELAY',
      'WRONG_SPECIFICATION',
      'DISCOUNT_ADJUSTMENT',
      'PROMOTION_CREDIT',
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
purchaseCreditNoteSchema.index({ creditNoteNumber: 1 });
purchaseCreditNoteSchema.index({ supplier: 1, status: 1 });
purchaseCreditNoteSchema.index({ purchaseOrder: 1 });
purchaseCreditNoteSchema.index({ status: 1, createdAt: -1 });
purchaseCreditNoteSchema.index({ issueDate: -1 });

// Virtual for formatted amount
purchaseCreditNoteSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB'
  }).format(this.totalAmount);
});

// Virtual for reason display in Thai
purchaseCreditNoteSchema.virtual('reasonDisplay').get(function() {
  const reasonMap = {
    'PRODUCT_RETURN': 'คืนสินค้า',
    'DEFECTIVE_PRODUCT': 'สินค้าชำรุด/บกพร่อง',
    'PRICE_REDUCTION': 'ลดราคา',
    'QUANTITY_SHORTAGE': 'สินค้าขาดจำนวน',
    'QUALITY_ISSUE': 'ปัญหาคุณภาพ',
    'DELIVERY_DELAY': 'ส่งของล่าช้า',
    'WRONG_SPECIFICATION': 'สเปคไม่ตรงตามสั่ง',
    'DISCOUNT_ADJUSTMENT': 'ปรับส่วนลด',
    'PROMOTION_CREDIT': 'เครดิตจากโปรโมชั่น',
    'ADJUSTMENT': 'ปรับปรุงยอด',
    'ERROR_CORRECTION': 'แก้ไขข้อผิดพลาด',
    'OTHER': 'อื่นๆ'
  };
  return reasonMap[this.reason] || this.reason;
});

// Pre-save middleware
purchaseCreditNoteSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedBy = this._updateUser || this.createdBy;
  }
  next();
});

// Static methods
purchaseCreditNoteSchema.statics.findByPO = function(purchaseOrderId) {
  return this.find({ purchaseOrder: purchaseOrderId })
    .populate('supplier', 'name code')
    .populate('purchaseOrder', 'poNumber docDate totalAmount')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });
};

purchaseCreditNoteSchema.statics.getStatsByStatus = function() {
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

module.exports = mongoose.model('PurchaseCreditNote', purchaseCreditNoteSchema);

