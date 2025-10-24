// models/Installment/InstallmentType.js

const mongoose = require('mongoose');

const installmentTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: ['pay-as-you-go', 'pay-in-full'],
    unique: true
  },
  displayName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  deleted_at: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// ให้ข้อมูลเริ่มต้นมี 2 ประเภท
installmentTypeSchema.statics.initializeTypes = async function() {
  const types = [
    {
      name: 'pay-as-you-go',
      displayName: 'ผ่อนไปใช้ไป',
      description: 'ลูกค้าได้รับสินค้าทันที และทยอยผ่อนชำระตามระยะเวลาที่กำหนด'
    },
    {
      name: 'pay-in-full',
      displayName: 'ผ่อนหมดรับของ',
      description: 'ลูกค้าต้องชำระเงินครบตามจำนวนที่ตกลงก่อน จึงจะได้รับสินค้า'
    }
  ];

  for (const type of types) {
    await this.findOneAndUpdate(
      { name: type.name },
      type,
      { upsert: true, new: true }
    );
  }

  console.log('Installment types initialized');
};

const InstallmentType = mongoose.model('InstallmentType', installmentTypeSchema);

module.exports = InstallmentType;
