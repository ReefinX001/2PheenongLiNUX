// models/Account/Asset.js
const mongoose = require('mongoose');

const AssetSchema = new mongoose.Schema({
  // เลขที่เอกสาร (เช่น AP-680821-001)
  documentNumber: {
    type: String,
    unique: true,
    sparse: true // Allow null values but ensure uniqueness when set
  },

  // เลขที่สินทรัพย์ (Auto-generated)
  assetNumber: {
    type: String,
    unique: true,
    sparse: true // Allow null values but ensure uniqueness when set
  },

  // ชื่อสินทรัพย์
  name: {
    type: String,
    required: true,
    trim: true
  },

  // ประเภทสินทรัพย์ (อาจเป็น ObjectID ของ Chart of Account หรือ string เดิม)
  category: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    default: 'equipment'
  },

  // วันที่ซื้อ
  purchaseDate: {
    type: Date,
    required: true,
    default: Date.now
  },

  // จำนวน
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },

  // ราคาต่อหน่วย
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },

  // ส่วนลด
  discountValue: {
    type: Number,
    default: 0,
    min: 0
  },

  // ประเภทส่วนลด (percent หรือ amount)
  discountType: {
    type: String,
    enum: ['percent', 'amount'],
    default: 'percent'
  },

  // จำนวนเงินส่วนลด
  discountAmount: {
    type: Number,
    default: 0,
    min: 0
  },

  // ราคารวม (หลังหักส่วนลด)
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },

  // จำนวน VAT
  vatAmount: {
    type: Number,
    default: 0,
    min: 0
  },

  // ราคารวมสุดท้าย (รวม VAT)
  finalTotal: {
    type: Number,
    default: 0,
    min: 0
  },

  // ประเภทภาษี
  taxType: {
    type: String,
    enum: ['no_tax', 'exclude_tax', 'include_tax'],
    default: 'exclude_tax'
  },

  // อัตรา VAT
  vatRate: {
    type: Number,
    default: 7,
    min: 0,
    max: 100
  },

  // ผู้จำหน่าย
  supplier: {
    type: String,
    required: true,
    trim: true
  },

  // เอกสารอ้างอิง
  referenceDoc: {
    type: String,
    trim: true
  },

  // ค่าเสื่อมสะสม
  accumulatedDepreciation: {
    type: Number,
    default: 0,
    min: 0
  },

  // มูลค่าทางบัญชี (totalPrice - accumulatedDepreciation)
  bookValue: {
    type: Number,
    default: function() {
      return this.totalPrice - this.accumulatedDepreciation;
    }
  },

  // สถานะ
  status: {
    type: String,
    enum: ['active', 'inactive', 'disposed', 'sold'],
    default: 'active'
  },

  // วิธีการชำระเงิน (อาจเป็น ObjectID ของ Chart of Account หรือ string เดิม)
  paymentMethod: {
    type: mongoose.Schema.Types.Mixed,
    default: 'cash_on_hand'
  },

  // วันที่ชำระเงิน
  paymentDate: {
    type: Date
  },

  // เงื่อนไขการชำระเงิน
  paymentTerms: {
    type: String,
    enum: ['cash', 'credit_7', 'credit_15', 'credit_30', 'credit_45', 'credit_60'],
    default: 'cash'
  },

  // หมายเหตุ
  notes: {
    type: String,
    trim: true
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

  // ข้อมูลการสร้างและแก้ไข
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // สาขา
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  }
}, {
  timestamps: true
});

// Index for better performance
AssetSchema.index({ assetNumber: 1 });
AssetSchema.index({ category: 1 });
AssetSchema.index({ status: 1 });
AssetSchema.index({ purchaseDate: -1 });
AssetSchema.index({ supplier: 1 });

// Virtual for status display in Thai
AssetSchema.virtual('statusDisplay').get(function() {
  const statusMap = {
    'active': 'ใช้งาน',
    'inactive': 'ไม่ใช้งาน',
    'disposed': 'ชำรุด/จำหน่าย',
    'sold': 'ขายแล้ว'
  };
  return statusMap[this.status] || this.status;
});

// Virtual for category display in Thai
AssetSchema.virtual('categoryDisplay').get(function() {
  const categoryMap = {
    'equipment': 'คอมพิวเตอร์และอุปกรณ์อิเล็กทรอนิกส์',
    'furniture': 'เครื่องตกแต่งสำนักงาน',
    'vehicle': 'ยานพาหนะ',
    'building': 'อาคารและสิ่งปลูกสร้าง',
    'software': 'ซอฟต์แวร์',
    'machinery': 'เครื่องจักร'
  };
  return categoryMap[this.category] || this.category;
});

// Pre-save middleware to generate asset number
AssetSchema.pre('save', async function(next) {
  if (this.isNew && !this.assetNumber) {
    try {
      // Generate asset number in format FA-XXXXXXXXX
      const count = await this.constructor.countDocuments();
      this.assetNumber = `FA-${String(count + 1).padStart(9, '0')}`;
    } catch (error) {
      return next(error);
    }
  }

  // Recalculate book value
  this.bookValue = this.totalPrice - this.accumulatedDepreciation;

  next();
});

// Method to calculate depreciation (straight-line method)
AssetSchema.methods.calculateDepreciation = function(years = 5) {
  const annualDepreciation = this.totalPrice / years;
  const monthsOwned = Math.floor((Date.now() - this.purchaseDate) / (1000 * 60 * 60 * 24 * 30.44));
  const monthlyDepreciation = annualDepreciation / 12;

  return Math.min(monthlyDepreciation * monthsOwned, this.totalPrice);
};

// Static method to get assets summary
AssetSchema.statics.getSummary = async function() {
  const summary = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalValue: { $sum: '$totalPrice' },
        totalBookValue: { $sum: '$bookValue' }
      }
    }
  ]);

  return summary;
};

module.exports = mongoose.model('Asset', AssetSchema);
