// models/POS/BranchStock.js
const mongoose = require('mongoose');
const { Schema } = mongoose;
const PurchaseOrder = require('../Stock/purchaseOrderModel'); // import PO model

const branchStockSchema = new Schema(
  {
    branch: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      required: false,
    },
    branch_code: {
      type: String,
      required: true,
    },
    productModel: {
      type: String,
      enum: ['Product', 'ProductImage'],
      default: 'Product',
    },
    product_id: {
      type: Schema.Types.ObjectId,
      refPath: 'productModel',
      default: null,
    },
    poNumber: { type: String, default: '' },
    invoiceNumber: { type: String, default: '' },
    documentNumber: { type: String, default: '' },
    barcode: { type: String, default: '' },

    imei: { type: String, default: '' },
    name: { type: String, default: '' },
    price: { type: Number, default: 0 },
    cost: { type: Number, default: 0 },
    brand: { type: String, default: '' },
    model: { type: String, default: '' }, // ← เพิ่มตรงนี้
    description: { type: String, default: '' },
    purchasePrice: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    image: { type: String, default: '' },
    supplier: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      default: null,
    },
    categoryGroup: {
      type: Schema.Types.ObjectId,
      ref: 'CategoryGroup',
      default: null,
      validate: {
        validator: v => v === null || mongoose.Types.ObjectId.isValid(v),
        message: props => `${props.value} is not a valid ObjectId for categoryGroup.`,
      },
    },
    unit: { type: String, default: '' },
    downAmount: { type: Number, default: 0 },
    downInstallmentCount: { type: Number, default: 0 },
    downInstallment: { type: Number, default: 0 },
    creditThreshold: { type: Number, default: 0 },
    payUseInstallmentCount: { type: Number, default: 0 },
    payUseInstallment: { type: Number, default: 0 },
    pricePayOff: { type: Number, default: 0 },
    docFee: { type: Number, default: 0 },
    purchaseType: {
      type: [String],
      enum: ['cash', 'installment'],
      default: ['installment'],
      required: true,
    },
    stock_value: { type: Number, default: 0 },    // ← ปรับ default เป็น 0
    pending:     { type: Boolean, default: true },// ← เพิ่มฟิลด์ pending
    verified:    { type: Boolean, default: false },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    last_updated: { type: Date, default: Date.now },
    taxType: {
      type: String,
      enum: ['ไม่มีภาษี', 'แยกภาษี', 'รวมภาษี'],
      default: 'แยกภาษี',
    },
    taxRate: { type: Number, default: 0 },
    // เพิ่มฟิลด์ stockType เพื่อระบุประเภทการจัดการ Stock
    stockType: {
      type: String,
      enum: ['imei', 'quantity'],
      default: 'imei'
    },
    // เพิ่มฟิลด์ productType สำหรับการจำแนกประเภทสินค้า
    productType: {
      type: String,
      enum: ['mobile', 'accessory', 'boxset', 'gift'],
      default: 'mobile'
    },
    // เพิ่มฟิลด์สำหรับ boxset
    boxsetType: {
      type: String,
      enum: ['normal', 'special', 'payoff']
    },
    boxsetProducts: [{
      type: Schema.Types.ObjectId,
      ref: 'ProductImage'
    }],
    payoffDiscount: {
      type: Number,
      default: 0
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
    },

    // 🔥 เพิ่มฟิลด์สำหรับ Quick Sale
    type: {
      type: String,
      enum: ['quick_sale', 'normal', 'urgent', 'backdated'],
      default: 'normal'
    },
    urgentSale: {
      type: Boolean,
      default: false
    },
    requiresPONumber: {
      type: Boolean,
      default: false
    },
    quickSaleDate: {
      type: Date,
      default: null
    },
    // เพิ่มฟิลด์สำหรับติดตามสถานะ PO
    poCreatedInSystem: {
      type: Boolean,
      default: false
    },
    poSystemId: {
      type: String,
      default: null
    },
  },
  { timestamps: true }
);

// เพิ่ม indexes สำหรับการ sync ที่มีประสิทธิภาพ
branchStockSchema.index({ name: 1 }); // สำหรับการ sync ด้วย name matching
branchStockSchema.index({ branch_code: 1 }); // สำหรับการค้นหาตาม branch
branchStockSchema.index({ category_name: 1 }); // สำหรับการค้นหาตาม category
branchStockSchema.index({ productType: 1 }); // สำหรับการค้นหาตาม product type

// helper to merge in fields from ProductImage, Product or PurchaseOrder
async function fillFromSources(doc) {
  // 1) ProductImage fields
  if (doc.product_id && doc.productModel === 'ProductImage') {
    const ProductImage = require('../Stock/ProductImage');
    const pi = await ProductImage.findById(doc.product_id).lean();
    if (pi) {
      doc.price                   = pi.price ?? doc.price;
      doc.downAmount              = pi.downAmount ?? doc.downAmount;
      doc.downInstallmentCount    = pi.downInstallmentCount ?? doc.downInstallmentCount;
      doc.downInstallment         = pi.downInstallment ?? doc.downInstallment;
      doc.creditThreshold         = pi.creditThreshold ?? doc.creditThreshold;
      doc.payUseInstallmentCount  = pi.payUseInstallmentCount ?? doc.payUseInstallmentCount;
      doc.payUseInstallment       = pi.payUseInstallment ?? doc.payUseInstallment;
      doc.pricePayOff             = pi.pricePayOff ?? doc.pricePayOff;
      doc.docFee                  = pi.docFee ?? doc.docFee;
      doc.purchaseType            = pi.purchaseType ?? doc.purchaseType;
      doc.image                   = pi.image ?? doc.image;
      doc.productType             = pi.productType ?? doc.productType;
      doc.stockType               = pi.stockType ?? doc.stockType;
      doc.category_name           = pi.category_name ?? doc.category_name;
      doc.category_group          = pi.category_group ?? doc.category_group;
      doc.mobileSpecs             = pi.mobileSpecs ?? doc.mobileSpecs;

      // ฟิลด์สำหรับ boxset
      if (pi.productType === 'boxset') {
        doc.boxsetType = pi.boxsetType ?? doc.boxsetType;
        doc.boxsetProducts = pi.boxsetProducts ?? doc.boxsetProducts;
        if (pi.boxsetType === 'payoff' && pi.payoffDiscount) {
          doc.payoffDiscount = pi.payoffDiscount ?? doc.payoffDiscount;
        }
      }
    }
  }

  // 2) taxType จาก Product หรือ PO
  let t = null;
  if (doc.product_id && doc.productModel === 'Product') {
    const Product = require('../Stock/Product');
    const p = await Product.findById(doc.product_id).lean();
    if (p?.taxType) t = p.taxType;
  }
  // → ให้ดึงจาก po.items แทน po.taxType
  if (!t && doc.poNumber) {
    const po = await require('../Stock/purchaseOrderModel')
                      .findOne({ poNumber: doc.poNumber })
                      .lean();
    if (po?.items?.length) {
      const matched = po.items.find(i => i.imei === doc.imei) || po.items[0];
      if (matched?.taxType) t = matched.taxType;
    }
  }
  if (t && ['ไม่มีภาษี','แยกภาษี','รวมภาษี'].includes(t)) {
    doc.taxType = t;
  }

  // 3) categoryGroup from Product or PO
  if (!doc.categoryGroup) {
    if (doc.product_id && doc.productModel === 'Product') {
      const Product = require('../Stock/Product');
      const p = await Product.findById(doc.product_id).lean();
      if (p?.categoryGroup) doc.categoryGroup = p.categoryGroup;
    }
    if (!doc.categoryGroup && doc.poNumber) {
      const po = await require('../Stock/purchaseOrderModel').findOne({ poNumber: doc.poNumber }).lean();
      if (po?.categoryGroup) doc.categoryGroup = po.categoryGroup;
    }
  }

  // 4) unit from CategoryGroup
  if (doc.categoryGroup && !doc.unit) {
    const CategoryGroup = require('../Stock/CategoryGroup');
    const cg = await CategoryGroup.findById(doc.categoryGroup).lean();
    if (cg?.unitName) doc.unit = cg.unitName;
  }

  // 5) documentNumber from PO
  if (!doc.documentNumber && doc.poNumber) {
    const po = await require('../Stock/purchaseOrderModel').findOne({ poNumber: doc.poNumber }).lean();
    if (po?.documentNumber) doc.documentNumber = po.documentNumber;
  }

  // 6) taxRate จาก PO items (match ด้วย imei หรือ first)
  if ((!doc.taxRate || doc.taxRate === 0) && doc.poNumber) {
    const po = await require('../Stock/purchaseOrderModel')
                      .findOne({ poNumber: doc.poNumber })
                      .lean();
    if (po?.items?.length) {
      const matched = po.items.find(i => i.imei === doc.imei) || po.items[0];
      if (matched?.taxRate != null) {
        doc.taxRate = matched.taxRate;
      }
    }
  }

  // 7) cost จาก PO items (match ด้วย imei, name, brand หรือ first)
  if ((!doc.cost || doc.cost === 0) && doc.poNumber) {
    const po = await require('../Stock/purchaseOrderModel')
                      .findOne({ poNumber: doc.poNumber })
                      .lean();
    if (po?.items?.length) {
      // ลองหา match ด้วย imei ก่อน (ถ้ามี)
      let matched = po.items.find(i => i.imei && doc.imei && i.imei === doc.imei);

      // ถ้าไม่เจอ ลอง match ด้วย name + brand
      if (!matched && doc.name && doc.brand) {
        matched = po.items.find(i =>
          i.name && i.brand &&
          i.name.toLowerCase() === doc.name.toLowerCase() &&
          i.brand.toLowerCase() === doc.brand.toLowerCase()
        );
      }

      // ถ้าไม่เจอ ลอง match ด้วย name อย่างเดียว
      if (!matched && doc.name) {
        matched = po.items.find(i =>
          i.name && i.name.toLowerCase() === doc.name.toLowerCase()
        );
      }

      // ถ้ายังไม่เจอ ใช้ item แรก
      if (!matched) {
        matched = po.items[0];
      }

      if (matched?.cost != null && matched.cost > 0) {
        doc.cost = matched.cost;
      }
    }
  }
}

// pre-save hook
branchStockSchema.pre('save', async function(next) {
  try {
    await fillFromSources(this);
    next();
  } catch (err) {
    next(err);
  }
});

// pre-hooks for findOneAndUpdate / updateOne / updateMany
branchStockSchema.pre(['findOneAndUpdate','updateOne','updateMany'], async function(next) {
  try {
    const upd = this.getUpdate();
    const raw = { ...upd };
    const target = raw.$set || raw;
    const existing = await this.model.findOne(this.getQuery()).lean();
    const merged = { ...existing, ...target };
    await fillFromSources(merged);
    this.setUpdate({ $set: merged });
    next();
  } catch (err) {
    next(err);
  }
});

// pre-find populate categoryGroup (commented out to prevent issues)
// branchStockSchema.pre(/^find/, function(next) {
//   this.populate({ path: 'categoryGroup', select: 'name unitName' });
//   next();
// });

module.exports = mongoose.models.BranchStock || mongoose.model('BranchStock', branchStockSchema);
