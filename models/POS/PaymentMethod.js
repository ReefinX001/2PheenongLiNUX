// models/PaymentMethod.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const paymentMethodSchema = new Schema({
  name: { type: String, default: '' },
  description: { type: String, default: '' },
  transaction_fee: { type: Number, default: 0 },
  currency_supported: {
    type: [String], // เก็บ array ของ string
    default: []
  },
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  collection: 'tb_payment_methods',
  timestamps: false
});

module.exports = mongoose.model('PaymentMethod', paymentMethodSchema);
