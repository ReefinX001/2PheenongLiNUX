const mongoose = require('mongoose');

const PayoffApprovalSchema = new mongoose.Schema({
  contractNo: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  orderId: {
    type: String,
    required: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  customerName: {
    type: String,
    required: true
  },
  items: [{
    productId: String,
    name: String,
    qty: Number,
    price: Number,
    productType: {
      type: String,
      enum: ['product', 'boxset'],
      default: 'product'
    },
    boxsetType: {
      type: String,
      enum: ['normal', 'special', 'payoff'],
      default: null
    }
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  branchCode: {
    type: String,
    required: true
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending_approval', 'approved', 'rejected'],
    default: 'pending_approval'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  rejectedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    default: null
  },
  notes: {
    type: String,
    default: ''
  },
  hasBoxset: {
    type: Boolean,
    default: false
  },
  stockChecked: {
    type: Boolean,
    default: false
  },
  stockCheckResult: {
    type: Object,
    default: null
  }
}, {
  timestamps: true
});

// Index สำหรับการค้นหา
PayoffApprovalSchema.index({ status: 1, branchCode: 1 });
PayoffApprovalSchema.index({ requestedAt: -1 });

module.exports = mongoose.model('PayoffApproval', PayoffApprovalSchema);
