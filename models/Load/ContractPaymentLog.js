// models/ContractPaymentLog.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const contractPaymentLogSchema = new Schema({
  contract_id: {
    type: Schema.Types.ObjectId,
    ref: 'Contract', // ชื่อโมเดล Contract (Contract.js => mongoose.model('Contract', ...))
    required: true
  },
  installment_id: {
    type: Schema.Types.ObjectId,
    ref: 'Installment', // หรือชื่อโมเดล Installment.js => mongoose.model('Installment', ...)
    required: true
  },
  payment_date: {
    type: Date,
    default: Date.now
  },
  amount: {
    type: Number,
    default: 0
  },
  payment_method: {
    type: String,
    default: ''
  },
  receipt_path: {
    type: String,
    default: ''
  },
  penalty_paid: {
    type: Number,
    default: 0
  }
}, {
  collection: 'tb_contracts_payment_logs', // ชื่อตาราง/คอลเลกชัน ให้ตรงกับ Laravel
  timestamps: false // หากต้องการ createdAt, updatedAt อัตโนมัติให้ตั้งเป็น true
});

module.exports = mongoose.model('ContractPaymentLog', contractPaymentLogSchema);
