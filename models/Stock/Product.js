// File: models/Stock/Product.js
const mongoose = require('mongoose');
const { Schema } = mongoose;
const ProductImage = require('./ProductImage');
const PurchaseOrder = require('./purchaseOrderModel');


const productSchema = new Schema(
  {
    poNumber: {
      type: String,
      default: ''
    },
    invoiceNumber: {
      type: String,
      default: ''
    },
    // ฟิลด์ documentNumber สำหรับเก็บเลขเอกสาร (Document number)
    documentNumber: {
      type: String,
      default: ''
    },
    barcode: {
      type: String,
      default: '',
    },

    imei: {
      type: String,
      default: '',
    },
    name: {
      type: String,
      required: true,
    },
    cost: {
      type: Number,
      default: 0,
    },
    brand: {
      type: String,
      default: '',
    },
    // capacity และ color ถูกลบออกแล้ว
    // taxType: เก็บประเภทภาษี (ไม่มีภาษี/แยกภาษี/รวมภาษี)
    taxType: {
      type: String,
      enum: ['ไม่มีภาษี', 'แยกภาษี', 'รวมภาษี'],
      default: 'แยกภาษี',
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    category: {
      type: String,
      default: '',
    },
    supplier: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true
    },
    // อ้างอิง Branch
    branch: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      required: false,
    },
    // เก็บ branch_code ด้วย
    branch_code: {
      type: String,
      required: true,
    },
    // รูปภาพสินค้า (path)
    image: {
      type: String,
      default: '',
    },
    // สำหรับ soft delete
    deleted_at: {
      type: Date,
      default: null,
    },
    // เติม categoryGroup (อ้างอิง CategoryGroup)
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
    taxRate: {
      type: Number,
      default: 0
    },
  },
  { timestamps: true }
);


// ===========================
//  Hook: ก่อนบันทึก (pre-save)
// ===========================
productSchema.pre('save', async function (next) {
  try {
    // ---------- 1) ถ้ายังไม่มี image ให้ไปหาใน ProductImage ตาม name ----------
    if (!this.image) {
      const foundImg = await ProductImage.findOne({ name: this.name });
      if (foundImg) {
        this.image = foundImg.image;
      }
    }

    // --- ดึง taxType + taxRate จาก PO.items (match ด้วย imei หรือ fallback เป็นตัวแรก) ---
    if (this.poNumber) {
      const po = await PurchaseOrder.findOne({ poNumber: this.poNumber }).lean();
      if (po?.items?.length) {
        const matched = po.items.find(i => i.imei === this.imei) || po.items[0];
        if (matched.taxType && ['ไม่มีภาษี','แยกภาษี','รวมภาษี'].includes(matched.taxType)) {
          this.taxType = matched.taxType;
        }
        if (typeof matched.taxRate === 'number') {
          this.taxRate = matched.taxRate;
        }
      }
    }



    next();
  } catch (err) {
    next(err);
  }
});

// ===========================
//  Hook: ก่อน query (pre-find) ให้ populate categoryGroup อัตโนมัติ
// ===========================
productSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'categoryGroup',
    select: 'name unitName'
  });
  next();
});

// ===========================
//  เมธอด Soft Delete
// ===========================
productSchema.methods.softDelete = async function () {
  this.deleted_at = new Date();
  await this.save();
};

module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);
