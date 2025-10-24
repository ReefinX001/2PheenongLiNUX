// models/StockAudit.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const stockAuditSchema = new Schema({
  branch_code: {
    type: Schema.Types.ObjectId,
    ref: 'Branch', // หากมีโมเดล Branch.js
    default: null
  },
  audit_date: { type: Date, default: Date.now },
  total_quantity: { type: Number, default: 0 },
  remarks: { type: String, default: '' }
}, {
  collection: 'tb_pi_stock_audit',
  timestamps: false
});

module.exports = mongoose.model('StockAudit', stockAuditSchema);
