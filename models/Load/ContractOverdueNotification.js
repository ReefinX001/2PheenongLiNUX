// models/ContractOverdueNotification.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const contractOverdueNotificationSchema = new Schema({
  contract_id: {
    type: Schema.Types.ObjectId,
    ref: 'Contract', // เชื่อมกับโมเดล Contract
    required: true
  },
  installment_id: {
    type: Schema.Types.ObjectId,
    ref: 'Installment',
    // หรือ ContractInstallment ถ้าคุณใช้โมเดลนั้น
    required: true
  },
  notification_date: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    default: ''
  },
  message: {
    type: String,
    default: ''
  }
}, {
  collection: 'tb_contracts_overdue_notifications',
  timestamps: false // หรือ true ตามต้องการ
});

module.exports = mongoose.model('ContractOverdueNotification', contractOverdueNotificationSchema);
