// models/StockUnit.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const stockUnitSchema = new Schema({
  variant_id: {
    type: Schema.Types.ObjectId,
    ref: 'ProductVariant', // โมเดล ProductVariant.js
    required: true
  },
  imei: { type: String, default: '' },
  branch_code: {
    type: Schema.Types.ObjectId,
    ref: 'Branch', // โมเดล Branch.js
    default: null
  },
  status: { type: String, default: 'in_stock' }, // หรือค่าเริ่มต้น
  received_date: { type: Date, default: null },
  cost_price: { type: Number, default: 0 },

  // หากใช้ timestamps auto => กำหนด timestamps: true แทนสร้างเอง
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },

  // SoftDelete ถ้าต้องการเก็บวันลบ
  deleted_at: { type: Date, default: null },
}, {
  collection: 'tb_pi_stock_units',
  timestamps: false // ถ้าต้องการ auto createdAt, updatedAt => true
});

/**
 * ถ้าต้องการ softDelete => เมธอด:
 * stockUnitSchema.methods.softDelete = function() {
 *   this.deleted_at = new Date();
 *   return this.save();
 * }
 */

module.exports = mongoose.model('StockUnit', stockUnitSchema);
