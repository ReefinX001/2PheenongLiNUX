// models/PaymentLog.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const paymentLogSchema = new Schema({
  transaction_id: {
    type: Schema.Types.ObjectId,
    ref: 'PaymentTransaction', // โมเดล PaymentTransaction.js
    required: true
  },
  action: { type: String, default: '' },
  performed_by: {
    type: Schema.Types.ObjectId,
    ref: 'User', // โมเดล User.js
    default: null
  },
  performed_at: { type: Date, default: Date.now },
  ip_address: { type: String, default: '' },
  remarks: { type: String, default: '' }
}, {
  collection: 'tb_payment_logs',
  timestamps: false
});

module.exports = mongoose.model('PaymentLog', paymentLogSchema);
