const mongoose = require('mongoose');
const { Schema } = mongoose;

const productHistorySchema = new Schema(
  {
    // อ้างอิงไปที่สินค้า (Product) ที่เกิดเหตุการณ์
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },

    // ประเภทของการกระทำ เช่น สร้าง, แก้ไข, ลบ
    operation: {
      type: String,
      enum: ['created', 'updated', 'deleted'],
      required: true,
    },

    // ข้อมูล snapshot ของสินค้าในขณะนั้น (อาจเก็บเป็น object ของข้อมูลทั้งหมด)
    snapshot: {
      type: Schema.Types.Mixed,
      required: true,
    },

    // ระบุผู้ที่ทำการเปลี่ยนแปลง (อ้างอิงไปที่ User ถ้ามี)
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // ระบุ Supplier ที่เกี่ยวข้อง
    supplier: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },

    // ฟิลด์ categoryGroup ที่อ้างอิงไปยังโมเดล CategoryGroup
    categoryGroup: {
      type: Schema.Types.ObjectId,
      ref: 'CategoryGroup',
      default: null,
      validate: {
        validator: function (v) {
          return v === null || mongoose.Types.ObjectId.isValid(v);
        },
        message: props => `${props.value} is not a valid ObjectId for categoryGroup.`,
      },
    },

    // ฟิลด์ taxType ที่จะถูกดึงจาก models/Product.js หากไม่มีค่า
    // โดยเพิ่ม ref: 'purchaseOrderModel' เพื่อให้ตรงกับการอ้างอิงใน models/Product.js
    taxType: {
      type: String,
      enum: ['ไม่มีภาษี', 'แยกภาษี', 'รวมภาษี'],
      default: 'แยกภาษี',
      ref: 'purchaseOrderModel'
    },
  },
  { timestamps: true } // auto-manage createdAt และ updatedAt
);

// Pre-save hook: หาก taxType ยังไม่ได้ถูกตั้งค่าในประวัติสินค้า ให้ดึงจากโมเดล Product
productHistorySchema.pre('save', async function(next) {
  if (!this.taxType) {
    try {
      const Product = require('./Product');
      const prod = await Product.findById(this.product).lean();
      if (prod && prod.taxType) {
        this.taxType = prod.taxType;
      }
    } catch (err) {
      return next(err);
    }
  }
  next();
});

// Pre hook: อัตโนมัติ populate ฟิลด์ categoryGroup จากเอกสาร CategoryGroup โดยดึงเฉพาะ field name
productHistorySchema.pre(/^find/, function(next) {
  this.populate({
    path: 'categoryGroup',
    select: 'name'
  });
  next();
});

module.exports = mongoose.model('ProductHistory', productHistorySchema);
