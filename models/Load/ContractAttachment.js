// models/ContractAttachment.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const contractAttachmentSchema = new Schema({
  contract_id: {
    type: Schema.Types.ObjectId,
    ref: 'Contract', // เชื่อมกับโมเดล Contract
    required: true
  },
  file_path: {
    type: String,
    default: ''
  },
  file_type: {
    type: String,
    default: ''
  },
  uploaded_at: {
    type: Date,
    default: Date.now // หรือคุณอาจตั้งเป็น null แล้วใส่เอง
  }
}, {
  collection: 'tb_contracts_attachments', // ชื่อตาราง(คอลเล็กชัน) ให้ตรงกับ Laravel
  timestamps: false // หากต้องการ createdAt, updatedAt อัตโนมัติ ให้ตั้งเป็น true
});

module.exports = mongoose.model('ContractAttachment', contractAttachmentSchema);
