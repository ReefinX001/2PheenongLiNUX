// models/BillingInvoice.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const billingInvoiceSchema = new Schema({
  // ฟิลด์ต่าง ๆ ของ invoice เช่น
  invoice_number: { type: String, required: true },
  total_amount: { type: Number, default: 0 },
  // ฯลฯ
}, {
  collection: 'tb_billing_invoices',
  timestamps: true,
});

module.exports = mongoose.model('BillingInvoice', billingInvoiceSchema);
