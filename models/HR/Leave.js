const mongoose = require('mongoose');
const { Schema } = mongoose;

const LeaveSchema = new Schema({
  // ผู้ที่ขอลา (เชื่อมกับ User)
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // ประเภทการลา (เช่น ลาป่วย, ลากิจ, พักร้อน ฯลฯ)
  leaveType: {
    type: String,
    default: 'annual', // ตัวอย่าง: annual, sick, personal, etc.
  },
  // วันที่เริ่มลา
  startDate: {
    type: Date,
    required: true,
  },
  // วันที่สิ้นสุดการลา
  endDate: {
    type: Date,
    required: true,
  },
  // เหตุผลการลา
  reason: {
    type: String,
    default: '',
  },
  // สถานะการลา (pending, approved, rejected)
  status: {
    type: String,
    default: 'pending',
  },
  // ข้อมูลการอนุมัติ
  approvedBy: {
    type: String,
  },
  approvedAt: {
    type: Date,
  },
  // ข้อมูลการปฏิเสธ
  rejectedBy: {
    type: String,
  },
  rejectedAt: {
    type: Date,
  },
  rejectReason: {
    type: String,
  }
}, {
  timestamps: true, // สร้าง createdAt, updatedAt ให้อัตโนมัติ
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual field for duration (จำนวนวันลา)
LeaveSchema.virtual('duration').get(function() {
  if (this.startDate && this.endDate) {
    const diffTime = this.endDate - this.startDate;
    // +1 เพื่อรวมวันเริ่มต้นและวันสิ้นสุด
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }
  return 0;
});

module.exports = mongoose.model('Leave', LeaveSchema);
