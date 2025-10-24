// models/Sale.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * ตัวอย่าง Sale Model
 * - รองรับการขายสด (cash) และขายดาวน์ (installment)
 */
const saleSchema = new Schema(
  {
    product_id: {
      type: Schema.Types.ObjectId,
      ref: 'Product',  // อ้างอิงจาก models/Product.js
      required: true
    },
    saleType: {
      type: String,
      enum: ['cash', 'installment'],
      default: 'cash'
    },
    customerName: {
      type: String,
      default: ''
    },

    // กรณีขายสด
    totalPrice: {
      type: Number,
      default: 0
    },

    // กรณีขายดาวน์
    downPayment: {
      type: Number,
      default: 0
    },
    monthlyPayment: {
      type: Number,
      default: 0
    },
    months: {
      type: Number,
      default: 0
    },
    // ผ่อนหมดหรือยัง
    isPaidOff: {
      type: Boolean,
      default: false
    },

    // Soft Delete
    deleted_at: { type: Date, default: null }
  },
  {
    collection: 'tb_orders',  // หรือชื่อ collection ตามต้องการ
    timestamps: true
  }
);

// ฟังก์ชัน softDelete (ถ้าต้องการ)
saleSchema.methods.softDelete = function() {
  this.deleted_at = new Date();
  return this.save();
};

// ตัวอย่าง Virtual
// หากต้องการเชื่อมกับ InstallmentPayment (กรณีผ่อนชำระรายงวด)
saleSchema.virtual('payments', {
  ref: 'InstallmentPayment',   // ถ้าคุณสร้าง models/InstallmentPayment.js
  localField: '_id',
  foreignField: 'sale_id'
});

saleSchema.set('toObject', { virtuals: true });
saleSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Sale', saleSchema);
