// models/OrderLog.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const orderLogSchema = new Schema({
  order_id: {
    type: Schema.Types.ObjectId,
    ref: 'Order', // โมเดล Order.js
    required: true
  },
  action: { type: String, default: '' },
  performed_by: {
    type: Schema.Types.ObjectId,
    ref: 'User', // โมเดล User.js ถ้ามี
    default: null
  },
  performed_at: { type: Date, default: Date.now },
  description: { type: String, default: '' }
}, {
  collection: 'tb_orders_logs',
  timestamps: false
});

module.exports = mongoose.model('OrderLog', orderLogSchema);
