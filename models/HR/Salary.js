// File: models/Salary.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const SalarySchema = new Schema({
  // อ้างอิงพนักงาน (User)
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // จำนวนเงินเดือน
  amount: {
    type: Number,
    required: true
  },
  // งวดของเงินเดือน เช่น เดือนนี้
  month: {
    type: String, // เช่น "2025-03" หรือ "March 2025"
    required: true
  },
  // สถานะการจ่าย (paid, pending, etc.)
  status: {
    type: String,
    default: 'pending'
  },
  // ข้อมูลเพิ่มเติม เช่น โบนัส, หักภาษี, ฯลฯ
  note: {
    type: String,
    default: ''
  }
}, {
  timestamps: true // สร้าง createdAt, updatedAt ให้
});

module.exports = mongoose.model('Salary', SalarySchema);
