// models/Attendance.js
const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  checkIn: {
    type: Date,
    required: true
  },
  checkOut: {
    type: Date,
    validate: {
      validator: function(value) {
        // ถ้ามี checkOut ให้ตรวจว่าไม่ก่อน checkIn
        return !value || value >= this.checkIn;
      },
      message: 'เวลาที่เช็คเอาท์ต้องไม่ก่อนเวลาเช็คอิน'
    }
  },
  // ประเภทการกระทำ (checkin = เข้างาน, break_out = ออกพัก, break_in = เข้างาน, checkout = เลิกงาน)
  actionType: {
    type: String,
    enum: ['checkin', 'break_out', 'break_in', 'checkout'],
    required: true
  },
  // เพิ่มประเภทการเช็กอิน
  checkInType: {
    type: String,
    enum: ['normal', 'outside_area', 'other_branch'],
    default: 'normal',
    required: true
  },
  // สถานะการอนุมัติ
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'not_required'],
    default: 'not_required'
  },
  // ผู้อนุมัติ
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // เวลาที่อนุมัติ
  approvedAt: {
    type: Date
  },
  // หมายเหตุการอนุมัติ
  approvalNote: {
    type: String,
    trim: true
  },
  // สำหรับ OT
  isOT: {
    type: Boolean,
    default: false
  },
  location: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    }
  },
  note: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
});

// Index เพื่อค้นหา session ตาม user-branch-checkIn ได้รวดเร็วขึ้น
AttendanceSchema.index({ user: 1, branch: 1, checkIn: 1 });

// Virtual สำหรับคำนวณระยะเวลา (นาที)
AttendanceSchema.virtual('durationMinutes').get(function() {
  if (this.checkOut && this.checkIn) {
    return Math.floor((this.checkOut - this.checkIn) / 60000);
  }
  return null;
});

// เปิดใช้งาน virtual fields ใน toJSON และ toObject
AttendanceSchema.set('toJSON', { virtuals: true });
AttendanceSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
