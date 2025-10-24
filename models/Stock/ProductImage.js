// models/ProductImage.js
const mongoose     = require('mongoose');
const BranchStock  = require('../POS/BranchStock');

const productImageSchema = new mongoose.Schema(
  {
    name:               { type: String, required: true, trim: true },
    image:              { type: String },  // ไม่ required สำหรับ boxset
    brand:              { type: String, default: '', trim: true },
    price:              { type: Number, default: 0 },
    downAmount:         { type: Number, default: 0 },
    downInstallmentCount:{ type: Number, default: 0 },
    downInstallment:    { type: Number, default: 0 },
    creditThreshold:    { type: Number, default: 0 },
    payUseInstallmentCount:{ type: Number, default: 0 },
    payUseInstallment:  { type: Number, default: 0 },
    pricePayOff:        { type: Number, default: 0 },
    docFee:             { type: Number, default: 0 },
    purchaseType: {
      type: [String],
      enum: ['cash', 'installment', 'payoff-boxset'],  // เพิ่ม 'payoff-boxset'
      default: ['cash', 'installment'],
      required: true
    },
    // เพิ่มฟิลด์สำหรับ boxset
    productType: {
  type: String,
  enum: ['mobile', 'accessory', 'boxset', 'gift'],  // เพิ่ม 'gift'
  default: 'mobile',
  required: true
},
    boxsetType: {
      type: String,
      enum: ['normal', 'special', 'payoff'],  // เพิ่ม 'payoff'
      required: function() {
        return this.productType === 'boxset';
      }
    },
    boxsetProducts: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductImage'
    }],
    // เพิ่ม field สำหรับส่วนลด payoff
    payoffDiscount: {
      type: Number,
      default: 0
    },
    // เพิ่มฟิลด์สำหรับประเภทการจัดการ Stock
    stockType: {
      type: String,
      enum: ['imei', 'quantity'],
      default: 'imei',
      required: true
    },
    // เพิ่มฟิลด์สำหรับการจัดหมวดหมู่สินค้า
    category_name: {
      type: String,
      default: '',
      trim: true
    },
    category_group: {
      type: String,
      default: '',
      trim: true
    },
    // เพิ่มฟิลด์สำหรับสเปคมือถือ
    mobileSpecs: {
      model: { type: String, default: '' },
      os: { type: String, default: '' },
      screenSize: { type: String, default: '' },
      screenType: { type: String, default: '' },
      resolution: { type: String, default: '' },
      processor: { type: String, default: '' },
      ram: { type: String, default: '' },
      storage: { type: String, default: '' },
      mainCamera: { type: String, default: '' },
      frontCamera: { type: String, default: '' },
      battery: { type: String, default: '' },
      charging: { type: String, default: '' },
      connectivity: { type: String, default: '' },
      colors: { type: String, default: '' },
      warranty: { type: String, default: '' },
      features: { type: String, default: '' }
    }
  },
  { timestamps: true }
);

// เพิ่ม indexes สำหรับการ sync ที่มีประสิทธิภาพ
productImageSchema.index({ name: 1 }); // สำหรับการ sync ด้วย name matching
productImageSchema.index({ category_name: 1 }); // สำหรับการค้นหาตาม category
productImageSchema.index({ productType: 1 }); // สำหรับการค้นหาตาม product type

// Validation: ถ้าเป็น mobile หรือ accessory ต้องมี image
productImageSchema.pre('save', function(next) {
  if ((this.productType === 'mobile' || this.productType === 'accessory' || this.productType === 'gift') && !this.image) {
    return next(new Error('Mobile, accessory and gift products must have an image'));
  }
  next();
});

// Virtual populate สำหรับดึงข้อมูลสินค้าใน boxset
productImageSchema.virtual('products', {
  ref: 'ProductImage',
  localField: 'boxsetProducts',
  foreignField: '_id'
});

// helper: sync one ProductImage → BranchStock
async function syncBranchStockForProductImage(doc) {
  if (!doc?.name) return;
  try {
    const updateData = {
      price:                  doc.price,
      downAmount:             doc.downAmount,
      downInstallmentCount:   doc.downInstallmentCount,
      downInstallment:        doc.downInstallment,
      creditThreshold:        doc.creditThreshold,
      payUseInstallmentCount: doc.payUseInstallmentCount,
      payUseInstallment:      doc.payUseInstallment,
      pricePayOff:            doc.pricePayOff,
      docFee:                 doc.docFee,
      purchaseType:           doc.purchaseType,
      productType:            doc.productType,
      stockType:              doc.stockType,
      category_name:          doc.category_name || '',
      category_group:         doc.category_group || '',
      mobileSpecs:            doc.mobileSpecs || {}
    };

    // เพิ่ม image เฉพาะเมื่อมีค่า
    if (doc.image) {
      updateData.image = doc.image;
    }

// เพิ่ม boxset fields ถ้าเป็น boxset
if (doc.productType === 'boxset') {
  updateData.boxsetType = doc.boxsetType;
  updateData.boxsetProducts = doc.boxsetProducts;

  // เพิ่ม payoffDiscount ถ้ามี
  if (doc.boxsetType === 'payoff' && doc.payoffDiscount) {
    updateData.payoffDiscount = doc.payoffDiscount;
  }
}

    await BranchStock.updateMany(
      { name: doc.name },
      { $set: updateData }
    );
  } catch (err) {
    console.error('⚠️ Sync BranchStock (ProductImage) failed:', err);
  }
}

// บังคับให้ findOneAndUpdate คืน doc ใหม่ (หลังอัปเดต)
productImageSchema.pre('findOneAndUpdate', function(next) {
  this.setOptions({ new: true, runValidators: true });
  next();
});

// Sync หลัง .save()
productImageSchema.post('save', async function(doc) {
  await syncBranchStockForProductImage(doc.toObject());
});

// Sync หลัง findOneAndUpdate(), updateOne(), updateMany()
productImageSchema.post(['findOneAndUpdate','updateOne','updateMany'], async function() {
  // ดึง filter และ doc ที่อัปเดตแล้ว
  const filter = this.getQuery();
  const docs = await this.model.find(filter).lean();
  for (const d of docs) {
    await syncBranchStockForProductImage(d);
  }
});

// เพิ่ม method สำหรับดึงข้อมูล boxset พร้อมสินค้าข้างใน
productImageSchema.statics.getBoxsetWithProducts = async function(boxsetId) {
  return this.findById(boxsetId).populate('boxsetProducts');
};

module.exports = mongoose.model('ProductImage', productImageSchema);
