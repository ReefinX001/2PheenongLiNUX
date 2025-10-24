// models/Order.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const orderSchema = new Schema(
  {
    customer_id: {
      type: Schema.Types.ObjectId,
      ref: 'Customer', // โมเดล Customer.js
      required: true
    },
    order_number: { type: String, default: '' },
    order_date: { type: Date, default: Date.now },
    status: { type: String, default: 'pending' },
    total_amount: { type: Number, default: 0 },
    tax_amount: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    payment_status: { type: String, default: 'unpaid' },

    // Soft Delete => ถ้า deleted_at != null แปลว่าลบ (เชิงตรรกะ)
    deleted_at: { type: Date, default: null },
  },
  {
    collection: 'tb_orders', // ชื่อตารางใน Laravel
    timestamps: true         // สร้าง createdAt, updatedAt อัตโนมัติ
  }
);

/**
 * SoftDelete (คล้าย SoftDeletes ใน Laravel)
 */
orderSchema.methods.softDelete = function () {
  this.deleted_at = new Date();
  return this.save();
};

/**
 * Virtual Relationships
 * (คล้าย hasMany(OrderItem::class, 'order_id'), hasMany(OrderLog::class, 'order_id'),
 *  hasOne(Fulfillment::class, 'order_id'))
 */

// items => hasMany(OrderItem)
orderSchema.virtual('items', {
  ref: 'OrderItem',        // ชื่อโมเดล OrderItem.js
  localField: '_id',
  foreignField: 'order_id'
});

// logs => hasMany(OrderLog)
orderSchema.virtual('logs', {
  ref: 'OrderLog',
  localField: '_id',
  foreignField: 'order_id'
});

// fulfillment => hasOne(Fulfillment)
orderSchema.virtual('fulfillment', {
  ref: 'Fulfillment',
  localField: '_id',
  foreignField: 'order_id',
  justOne: true // บ่งบอกว่าเป็น one-to-one
});

// ส่งค่า Virtual เมื่อแปลงเป็น JSON/Object
orderSchema.set('toObject', { virtuals: true });
orderSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);
