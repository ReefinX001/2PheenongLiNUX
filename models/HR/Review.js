// models/Review.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const ReviewSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',       // อ้างอิงไปยังโมเดล User ของคุณ
    required: true
  },
  cycle: {
    type: String,      // เช่น "Q1-2025", "Annual-2025"
    required: true
  },
  score: {
    type: Number,      // คะแนนเฉลี่ย
    required: true,
    min: 0,
    max: 5
  },
  comments: {
    type: String,      // ข้อความแสดงความคิดเห็นเพิ่มเติม
    default: ''
  },
  status: {
    type: String,      // เช่น "ผ่าน", "รอพิจารณา", "ไม่ผ่าน"
    default: 'รอพิจารณา'
  }
}, {
  timestamps: true     // สร้าง createdAt, updatedAt ให้อัตโนมัติ
});

module.exports = mongoose.model('Review', ReviewSchema);
