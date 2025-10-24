// models/BillingLog.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

// สร้าง Schema สำหรับ BillingLog
const billingLogSchema = new Schema({
  invoice_id: {
    type: Schema.Types.ObjectId,
    ref: 'Invoice',  // ชื่อโมเดล Invoice
    required: true
  },
  action: {
    type: String,
    required: true
  },
  performed_by: {
    type: Schema.Types.ObjectId,
    ref: 'User',    // ชื่อโมเดล User
    required: true
  },
  performed_at: {
    type: Date,
    default: Date.now // หรือจะรับค่าจาก client, หรือเก็บ auto
  },
  description: {
    type: String,
    default: ''
  }
}, {
  collection: 'tb_billing_logs',  // ชื่อ collection ตาม Laravel table
  timestamps: false              // ถ้าไม่ต้องการ createdAt, updatedAt auto
});

// ส่งออกโมเดลชื่อ "BillingLog"
module.exports = mongoose.model('BillingLog', billingLogSchema);
