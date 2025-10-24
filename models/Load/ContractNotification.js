// models/ContractNotification.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const contractNotificationSchema = new Schema({
  contract_id: {
    type: Schema.Types.ObjectId,
    ref: 'Contract', // เชื่อมกับโมเดล Contract
    required: true
  },
  notification_type: {
    type: String,
    default: ''
  },
  message: {
    type: String,
    default: ''
  },
  is_read: {
    type: Boolean,
    default: false
  }
}, {
  collection: 'tb_contracts_notifications', // ชื่อตาราง(คอลเล็กชัน) ตรงกับ Laravel
  timestamps: false // หรือ true ถ้าต้องการ createdAt, updatedAt
});

module.exports = mongoose.model('ContractNotification', contractNotificationSchema);
