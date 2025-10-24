// models/ContractAdjustment.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const contractAdjustmentSchema = new Schema({
  contract_id: {
    type: Schema.Types.ObjectId,
    ref: 'Contract', // ชื่อโมเดล Contract ใน Mongoose
    required: true
  },
  adjustment_type: {
    type: String,
    required: true
  },
  old_value: {
    type: String,
    default: ''
  },
  new_value: {
    type: String,
    default: ''
  },
  reason: {
    type: String,
    default: ''
  },
  adjusted_by: {
    type: Schema.Types.ObjectId,
    ref: 'User', // ชื่อโมเดล User ใน Mongoose
    default: null
  },
  adjusted_at: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'tb_contracts_adjustments', // ชื่อตาราง(คอลเลกชัน) เหมือนใน Laravel
  timestamps: false // หรือ true หากต้องการให้มี createdAt, updatedAt อัตโนมัติ
});

module.exports = mongoose.model('ContractAdjustment', contractAdjustmentSchema);
