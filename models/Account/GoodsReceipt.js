// models/Account/GoodsReceipt.js
const mongoose = require('mongoose');

const GoodsReceiptItemSchema = new mongoose.Schema({
  // Product reference
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productCode: {
    type: String,
    required: true
  },
  productName: {
    type: String,
    required: true
  },
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
  total: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

const GoodsReceiptSchema = new mongoose.Schema({
  // Document Number (GR-YYYYMMDD-XXX)
  documentNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },

  // Document Date
  documentDate: {
    type: Date,
    required: true,
    default: Date.now
  },

  // Receive Date (actual date goods received)
  receiveDate: {
    type: Date,
    required: true,
    default: Date.now
  },

  // Supplier reference
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },
  supplierName: {
    type: String,
    required: true
  },
  supplierTaxId: String,
  supplierAddress: String,
  supplierPhone: String,
  supplierEmail: String,
  supplierContact: String,

  // Purchase Order reference (optional)
  poReference: {
    type: String,
    trim: true
  },
  purchaseOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseOrder'
  },

  // Items
  items: [GoodsReceiptItemSchema],

  // Totals
  subtotal: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },

  // Discount
  discountAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  discountType: {
    type: String,
    enum: ['amount', 'percent'],
    default: 'amount'
  },

  // After discount
  afterDiscount: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },

  // VAT
  vatType: {
    type: String,
    enum: ['none', 'excluded', 'included'],
    default: 'excluded'
  },
  vatAmount: {
    type: Number,
    default: 0,
    min: 0
  },

  // Grand Total
  grandTotal: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },

  // Status
  status: {
    type: String,
    enum: ['draft', 'completed', 'cancelled'],
    default: 'draft'
  },

  // Notes
  notes: {
    type: String,
    trim: true
  },

  // Attachments
  attachments: [{
    fileName: String,
    originalName: String,
    filePath: String,
    fileSize: Number,
    mimeType: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // User tracking
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Branch
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  }

}, {
  timestamps: true,
  collection: 'goods_receipts'
});

// Indexes for performance
GoodsReceiptSchema.index({ documentNumber: 1 });
GoodsReceiptSchema.index({ documentDate: -1 });
GoodsReceiptSchema.index({ supplierId: 1 });
GoodsReceiptSchema.index({ status: 1 });
GoodsReceiptSchema.index({ poReference: 1 });

// Virtual for formatted document date
GoodsReceiptSchema.virtual('formattedDocumentDate').get(function() {
  if (!this.documentDate) return '';
  const d = new Date(this.documentDate);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
});

// Virtual for formatted receive date
GoodsReceiptSchema.virtual('formattedReceiveDate').get(function() {
  if (!this.receiveDate) return '';
  const d = new Date(this.receiveDate);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
});

// Pre-save hook to calculate totals
GoodsReceiptSchema.pre('save', function(next) {
  // Calculate subtotal from items
  this.subtotal = this.items.reduce((sum, item) => sum + (item.total || 0), 0);

  // Calculate discount
  let discount = 0;
  if (this.discountType === 'percent') {
    discount = this.subtotal * (this.discountAmount / 100);
  } else {
    discount = this.discountAmount || 0;
  }

  // After discount
  this.afterDiscount = this.subtotal - discount;

  // Calculate VAT
  if (this.vatType === 'excluded') {
    this.vatAmount = this.afterDiscount * 0.07;
    this.grandTotal = this.afterDiscount + this.vatAmount;
  } else if (this.vatType === 'included') {
    this.vatAmount = this.afterDiscount - (this.afterDiscount / 1.07);
    this.grandTotal = this.afterDiscount;
  } else {
    this.vatAmount = 0;
    this.grandTotal = this.afterDiscount;
  }

  next();
});

// Static method to generate document number
GoodsReceiptSchema.statics.generateDocumentNumber = async function(date) {
  const d = date || new Date();
  const year = String(d.getFullYear()).slice(-2);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  // Find the last document number for this date
  const pattern = new RegExp(`^GR-${dateStr}-\\d{3}$`);
  const lastDoc = await this.findOne({
    documentNumber: { $regex: pattern }
  }).sort({ documentNumber: -1 });

  let runningNumber = 1;
  if (lastDoc && lastDoc.documentNumber) {
    const match = lastDoc.documentNumber.match(/GR-\d{6}-(\d{3})/);
    if (match) {
      runningNumber = parseInt(match[1]) + 1;
    }
  }

  const docNumber = `GR-${dateStr}-${String(runningNumber).padStart(3, '0')}`;
  return docNumber;
};

// Static method to get summary statistics
GoodsReceiptSchema.statics.getSummary = async function(filter = {}) {
  const summary = await this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$grandTotal' }
      }
    }
  ]);

  return summary;
};

const GoodsReceipt = mongoose.model('GoodsReceipt', GoodsReceiptSchema);

module.exports = GoodsReceipt;
