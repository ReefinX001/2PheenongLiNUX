// models/CreditFollowUp.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const CreditFollowUpSchema = new Schema({
  installmentOrder: { type: Schema.Types.ObjectId, ref: 'InstallmentOrder' },
  customerName:     { type: String, required: true },
  planType:         { type: String, enum: ['plan1','plan2','plan3','manual'], required: true },
  downPayment:      { type: Number, default: 0 },
  creditAmount:     { type: Number, default: 0 },
  payoffAmount:     { type: Number, default: 0 },
  createdAt:        { type: Date, default: Date.now }
});

module.exports = mongoose.model('CreditFollowUp', CreditFollowUpSchema);
