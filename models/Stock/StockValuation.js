// models/StockValuation.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const stockValuationSchema = new Schema({
  branch_code: {
    type: Schema.Types.ObjectId,
    ref: 'Branch', // โมเดล Branch.js
    default: null
  },
  total_quantity: { type: Number, default: 0 },
  total_stock_value: { type: Number, default: 0 },
  updated_by: {
    type: Schema.Types.ObjectId,
    ref: 'User', // โมเดล User.js
    default: null
  },

  // ควรใช้ timestamps อัตโนมัติ แทน updated_at ถ้าสะดวก
  updated_at: { type: Date, default: Date.now },

  debit_account: { type: String, default: '' },
  credit_account: { type: String, default: '' },
  transaction_type: { type: String, default: '' }, // 'in', 'out', 'adjust'

}, {
  collection: 'tb_pi_stock_valuation',
  timestamps: false // ถ้าต้องการให้ Mongoose สร้าง createdAt, updatedAt => true
});

/**
 * ถ้าต้องการ SoftDelete => เพิ่มฟิลด์ deleted_at + เมธอด softDelete()
 */

module.exports = mongoose.model('StockValuation', stockValuationSchema);
