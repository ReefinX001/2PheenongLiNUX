// models/PaymentTransaction.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const paymentTransactionSchema = new Schema({
  order_id: {
    type: Schema.Types.ObjectId,
    ref: 'Order', // โมเดล Order.js
    default: null
  },
  payment_method_id: {
    type: Schema.Types.ObjectId,
    ref: 'PaymentMethod', // โมเดล PaymentMethod.js
    default: null
  },
  amount: { type: Number, default: 0 },
  currency: { type: String, default: 'USD' },
  transaction_date: { type: Date, default: Date.now },
  status: { type: String, default: 'pending' },
  reference_number: { type: String, default: '' },
  fee: { type: Number, default: 0 },
  net_amount: { type: Number, default: 0 },
  remark: { type: String, default: '' }
}, {
  collection: 'tb_payment_transactions',
  timestamps: false // ถ้าต้องการใช้ timestamps => true
});

module.exports = mongoose.model('PaymentTransaction', paymentTransactionSchema);
