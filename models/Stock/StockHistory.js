// models/StockHistory.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const stockHistorySchema = new Schema({
  product_id: {
    type: Schema.Types.ObjectId,
    ref: 'Product', // โมเดล Product.js
    required: true
  },
  branch_code: {
    type: Schema.Types.ObjectId,
    ref: 'Branch',
    default: null
  },
  change_type: { type: String, default: 'in' }, // in, out
  quantity: { type: Number, default: 0 },
  cost_price: { type: Number, default: 0 },
  reason: { type: String, default: '' },
  updated_by: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reference_id: { type: String, default: '' }
}, {
  collection: 'tb_pi_stock_history',
  timestamps: false
});

// ความสัมพันธ์ belongsTo(Product::class, 'product_id') => product_id: { ref: 'Product' }
module.exports = mongoose.model('StockHistory', stockHistorySchema);
