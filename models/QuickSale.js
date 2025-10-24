// models/QuickSale.js
const mongoose = require('mongoose');

const quickSaleSchema = new mongoose.Schema({
  // ข้อมูลพื้นฐานของสินค้า
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },

  brand: {
    type: String,
    required: true,
    trim: true,
    index: true
  },

  imei: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },

  cost: {
    type: Number,
    required: true,
    min: 0
  },

  price: {
    type: Number,
    min: 0
  },

  category: {
    type: String,
    default: 'มือถือ',
    enum: ['มือถือ', 'อุปกรณ์เสริม', 'ของแถม', 'อื่นๆ']
  },

  description: {
    type: String,
    trim: true
  },

  // ข้อมูลสาขา
  branchCode: {
    type: String,
    default: 'PATTANI',
    index: true
  },

  branchName: {
    type: String,
    default: 'สาขาปัตตานี'
  },

  // ข้อมูลการขาย
  urgent: {
    type: Boolean,
    default: true
  },

  status: {
    type: String,
    enum: ['pending_po', 'po_created', 'completed', 'cancelled'],
    default: 'pending_po',
    index: true
  },

  // ข้อมูล PO
  poCreated: {
    type: Boolean,
    default: false,
    index: true
  },

  poNumber: {
    type: String,
    index: true
  },

  poDate: {
    type: Date
  },

  poStatus: {
    type: String,
    enum: ['draft', 'pending', 'approved', 'completed', 'cancelled']
  },

  // ข้อมูลผู้จำหน่าย
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier'
  },

  supplierName: {
    type: String
  },

  // ข้อมูลการคำนวณต้นทุน
  unitCost: {
    type: Number,
    min: 0
  },

  unitDiscount: {
    type: Number,
    min: 0,
    default: 0
  },

  taxRate: {
    type: Number,
    min: 0,
    max: 100,
    default: 7
  },

  taxType: {
    type: String,
    enum: ['แยกภาษี', 'รวมภาษี', 'ไม่มีภาษี'],
    default: 'แยกภาษี'
  },

  preVatAmount: {
    type: Number,
    min: 0,
    default: 0
  },

  vatAmount: {
    type: Number,
    min: 0,
    default: 0
  },

  totalAmount: {
    type: Number,
    min: 0,
    default: 0
  },

  // ข้อมูลผู้ใช้
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  addedByName: {
    type: String
  },

  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  approvedAt: {
    type: Date
  },

  // ข้อมูลเพิ่มเติม
  notes: {
    type: String,
    trim: true
  },

  tags: [{
    type: String,
    trim: true
  }],

  // ข้อมูลระบบ
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },

  metadata: {
    source: {
      type: String,
      default: 'quick_sale'
    },

    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'urgent'
    },

    salesChannel: {
      type: String,
      default: 'walk_in'
    }
  }

}, {
  timestamps: true,
  collection: 'quicksales'
});

// Export model
module.exports = mongoose.model('QuickSale', quickSaleSchema);