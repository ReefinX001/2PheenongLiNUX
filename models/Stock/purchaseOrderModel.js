// models/Stock/purchaseOrderModel.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

// โครงสร้างรายการสินค้าใน 1 ใบสั่งซื้อ
const itemSchema = new Schema({
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    default: null
  },
  productImageId: {
    type: Schema.Types.ObjectId,
    ref: 'ProductImage',
    default: null
  },
  image: { type: String, default: '' },
  poNumber: { type: String, default: '' },
  barcode:  { type: String, default: '' },

  imei:     { type: String, default: '' },
  category: { type: String, default: '' },
  name:     { type: String, default: '' },
  brand:    { type: String, default: '' },
  status:   { type: String, default: 'active' },
  qty:      { type: Number, default: 1 },
  cost:     { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  taxRate:  { type: Number, default: 0 },
  wh:       { type: String, default: 'ยังไม่ระบุ' },
  taxType: {
    type: String,
    enum: ['แยกภาษี','รวมภาษี','ไม่มีภาษี'],
    default: 'แยกภาษี'
  },
  stockType: {
    type: String,
    enum: ['imei', 'quantity'],
    default: 'imei'
  },
  netAmount: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  totalItemAmount: { type: Number, default: 0 },
  // ข้อมูลผู้แก้ไขล่าสุด
  lastEditedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  lastEditedByName: {
    type: String,
    default: ''
  },
  lastEditedAt: {
    type: Date,
    default: null
  }
});

// โครงสร้างประวัติการเปลี่ยนสถานะ (history)
const historySchema = new Schema({
  oldStatus: { type: String, default: '' },
  newStatus: { type: String, default: '' },
  changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  changedByName: { type: String, default: '' }, // เพิ่มชื่อผู้เปลี่ยนสถานะ
  changedAt: { type: Date, default: Date.now },
  note:      { type: String, default: '' }
});

const purchaseOrderSchema = new Schema(
  {
    // เลขที่ PO
    poNumber: { type: String, required: true },
    // Document number ที่จะถูกสร้างอัตโนมัติหลังจากอนุมัติ
    documentNumber: { type: String, default: '' },

    // อ้างอิง Branch
    branch: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      required: false,
    },
    branch_code: {
      type: String,
      required: true,
    },

    // อ้างอิง Supplier
    supplier: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },

    // ถ้าต้องการอ้างอิง Customer
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
    },

    // กลุ่มจัดประเภท
    categoryGroup: {
      type: Schema.Types.ObjectId,
      ref: 'CategoryGroup',
      default: null,
      validate: {
        validator: function(v) {
          return v === null || mongoose.Types.ObjectId.isValid(v);
        },
        message: props => `${props.value} is not a valid ObjectId for categoryGroup.`
      }
    },

    // หมายเหตุ
    notes: { type: String, default: '' },

    // รายการสินค้า
    items: [itemSchema],

    // ราคารวม
    totalAmount: { type: Number, default: 0 },

    // =====  ผู้สร้าง (User)=====
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    createdByName: {
      type: String,
      default: ''
    },

    // ===== ผู้อนุมัติ (User) - เพิ่มใหม่ =====
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    approvedByName: {
      type: String,
      default: ''
    },
    approvedAt: {
      type: Date,
      default: null
    },
    approvedSignature: {    // เก็บ base64 image ของลายเซ็นผู้อนุมัติ
      type: String,
      default: ''
    },

    // ===== ผู้ปฏิเสธ (User) - เพิ่มใหม่ =====
    rejectedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    rejectedByName: {
      type: String,
      default: ''
    },
    rejectedAt: {
      type: Date,
      default: null
    },

    // ===== สถานะของ PO =====
    status: {
      type: String,
      default: 'Pending' // เปลี่ยนเป็น Pending เป็นค่าเริ่มต้น
    },

    // ===== วันที่เอกสาร =====
    docDate: {
      type: Date,
      default: Date.now
    },

    // ===== ฟิลด์ history =====
    history: [historySchema],

    // วันที่สร้างเอกสาร
    createdAt: { type: Date, default: Date.now },

    // ===== ฟิลด์สำหรับตัดสต็อก =====
    isStockDeducted: { type: Boolean, default: false },
    stockDeductedAt: { type: Date, default: null }
  },
  {
    collection: 'tb_purchase_orders',
  }
);

// Pre-save hook เพื่อคำนวณยอดแต่ละรายการสินค้า
purchaseOrderSchema.pre('save', function(next) {
  let orderTotal = 0;
  this.items.forEach(item => {
    const base = ((item.cost || 0) - (item.discount || 0)) * (item.qty || 1);
    let net = 0, tax = 0;

    if (item.taxType === 'ไม่มีภาษี') {
      net = base;
      tax = 0;
    } else if (item.taxType === 'แยกภาษี') {
      net = base;
      tax = base * ((item.taxRate || 0) / 100);
    } else if (item.taxType === 'รวมภาษี') {
      const rate = item.taxRate || 7;
      net = base / (1 + rate / 100);
      tax = base - net;
    }

    item.netAmount = net;
    item.taxAmount = tax;
    item.totalItemAmount = net + tax;
    orderTotal += item.totalItemAmount;
  });
  this.totalAmount = orderTotal;
  next();
});

// Auto-populate
purchaseOrderSchema.pre(/^find/, function(next) {
  this.populate('categoryGroup', 'name unitName');
  this.populate('supplier', 'name taxId address phone');
  this.populate('branch', 'name address');
  this.populate('createdBy', 'name email');
  this.populate('approvedBy', 'name email');
  this.populate('rejectedBy', 'name email');
  next();
});

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
