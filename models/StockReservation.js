/**
 * models/StockReservation.js - โมเดลสำหรับจองสต็อกสินค้าจากมัดจำ
 */

const mongoose = require('mongoose');

const stockReservationSchema = new mongoose.Schema({
  // ข้อมูลการจอง
  reservationId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // ข้อมูลใบรับเงินมัดจำ
  depositReceiptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DepositReceipt',
    required: true,
    index: true
  },
  depositReceiptNumber: {
    type: String,
    required: true,
    index: true
  },

  // ข้อมูลสินค้า
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BranchStock',
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  productImei: {
    type: String,
    required: true,
    index: true
  },
  productBrand: String,
  productModel: String,
  productPrice: {
    type: Number,
    required: true,
    min: 0
  },

  // ข้อมูลสาขา
  branchCode: {
    type: String,
    required: true,
    index: true
  },
  branchName: String,

  // ข้อมูลลูกค้า
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  customerName: {
    type: String,
    required: true
  },
  customerPhone: String,
  customerTaxId: String,

  // ข้อมูลการจอง
  reservationType: {
    type: String,
    enum: ['deposit', 'preorder', 'installment'],
    default: 'deposit'
  },
  reservedAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },

  // ข้อมูลการมัดจำ
  depositAmount: {
    type: Number,
    required: true,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  remainingAmount: {
    type: Number,
    required: true,
    min: 0
  },

  // สถานะการจอง
  status: {
    type: String,
    enum: ['active', 'used', 'expired', 'cancelled'],
    default: 'active',
    index: true
  },

  // ข้อมูลการใช้งาน
  usedAt: Date,
  usedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  usedByName: String,
  usedInTransaction: String, // เลขที่ transaction ที่ใช้

  // ข้อมูลการยกเลิก
  cancelledAt: Date,
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancelledByName: String,
  cancellationReason: String,

  // ข้อมูลระบบ
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdByName: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },

  // หมายเหตุ
  notes: String,

  // ข้อมูลเพิ่มเติม
  metadata: {
    saleType: String, // 'cash' หรือ 'installment'
    expectedDeliveryDate: Date,
    priority: {
      type: Number,
      default: 1,
      min: 1,
      max: 5
    }
  }
});

// Indexes
stockReservationSchema.index({ branchCode: 1, status: 1 });
stockReservationSchema.index({ productImei: 1, status: 1 });
stockReservationSchema.index({ depositReceiptId: 1 });
stockReservationSchema.index({ createdAt: -1 });

// TTL Index for automatic cleanup of expired reservations (also serves as index for queries by expiresAt)
stockReservationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Pre-save middleware
stockReservationSchema.pre('save', function(next) {
  this.updatedAt = new Date();

  // สร้าง reservationId ถ้ายังไม่มี
  if (!this.reservationId) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomStr = Math.random().toString(36).substr(2, 6).toUpperCase();
    this.reservationId = `RSV-${dateStr}-${randomStr}`;
  }

  next();
});

// Static methods
stockReservationSchema.statics.createFromDepositReceipt = async function(depositReceipt, expirationHours = 72) {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expirationHours);

  const reservation = new this({
    depositReceiptId: depositReceipt._id,
    depositReceiptNumber: depositReceipt.receiptNumber || depositReceipt.documentNumber,
    productId: depositReceipt.product.id,
    productName: depositReceipt.product.name,
    productImei: depositReceipt.product.imei,
    productBrand: depositReceipt.product.brand,
    productModel: depositReceipt.product.model,
    productPrice: depositReceipt.product.price,
    branchCode: depositReceipt.branchCode,
    branchName: depositReceipt.branch?.name,
    customerName: depositReceipt.customer.name,
    customerPhone: depositReceipt.customer.phone,
    customerTaxId: depositReceipt.customer.taxId,
    reservationType: depositReceipt.depositType === 'preorder' ? 'preorder' : 'deposit',
    depositAmount: depositReceipt.amounts.depositAmount,
    totalAmount: depositReceipt.amounts.totalAmount,
    remainingAmount: depositReceipt.amounts.remainingAmount,
    expiresAt: expiresAt,
    createdBy: depositReceipt.salesperson.id,
    createdByName: depositReceipt.salesperson.name,
    metadata: {
      saleType: depositReceipt.saleType,
      expectedDeliveryDate: depositReceipt.expectedDeliveryDate
    }
  });

  return reservation.save();
};

stockReservationSchema.statics.findActiveByImei = function(imei, branchCode) {
  return this.findOne({
    productImei: imei,
    branchCode: branchCode,
    status: 'active',
    expiresAt: { $gt: new Date() }
  });
};

stockReservationSchema.statics.findByDepositReceipt = function(depositReceiptId) {
  return this.find({
    depositReceiptId: depositReceiptId
  }).sort({ createdAt: -1 });
};

// Methods
stockReservationSchema.methods.use = function(userId, userName, transactionId) {
  this.status = 'used';
  this.usedAt = new Date();
  this.usedBy = userId;
  this.usedByName = userName;
  this.usedInTransaction = transactionId;
  return this.save();
};

stockReservationSchema.methods.cancel = function(userId, userName, reason) {
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  this.cancelledBy = userId;
  this.cancelledByName = userName;
  this.cancellationReason = reason;
  return this.save();
};

stockReservationSchema.methods.extend = function(additionalHours) {
  const newExpiresAt = new Date(this.expiresAt);
  newExpiresAt.setHours(newExpiresAt.getHours() + additionalHours);
  this.expiresAt = newExpiresAt;
  return this.save();
};

// Virtual for time remaining
stockReservationSchema.virtual('timeRemaining').get(function() {
  const now = new Date();
  const remaining = this.expiresAt - now;
  return Math.max(0, remaining);
});

stockReservationSchema.virtual('isExpired').get(function() {
  return new Date() > this.expiresAt && this.status === 'active';
});

stockReservationSchema.virtual('statusDisplay').get(function() {
  switch (this.status) {
    case 'active':
      return this.isExpired ? 'หมดอายุ' : 'จองอยู่';
    case 'used':
      return 'ใช้แล้ว';
    case 'expired':
      return 'หมดอายุ';
    case 'cancelled':
      return 'ยกเลิก';
    default:
      return this.status;
  }
});

module.exports = mongoose.models.StockReservation || mongoose.model('StockReservation', stockReservationSchema);
