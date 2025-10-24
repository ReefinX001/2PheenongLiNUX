// models/BillingCorrection.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const billingCorrectionSchema = new Schema({
  invoice_id: {
    type: Schema.Types.ObjectId,
    ref: 'BillingInvoice', // ชื่อโมเดล BillingInvoice
    required: true,
  },
  field_name: {
    type: String,
    required: true,
  },
  old_value: {
    type: String,
    default: '',
  },
  new_value: {
    type: String,
    default: '',
  },
  corrected_by: {
    type: Schema.Types.ObjectId,
    ref: 'User', // ชื่อโมเดล User
    required: true,
  },
  corrected_at: {
    type: Date,
    default: Date.now, // หรือจะรับค่าจาก client ก็ได้
  },
}, {
  collection: 'tb_billing_corrections', // ชื่อตาราง(คอลเลกชัน) เหมือนใน Laravel
  timestamps: false, // ถ้าคุณไม่ต้องการ createdAt, updatedAt อัตโนมัติ
});

// ส่งออกโมเดลชื่อ BillingCorrection
module.exports = mongoose.model('BillingCorrection', billingCorrectionSchema);
