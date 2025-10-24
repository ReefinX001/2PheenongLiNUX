const mongoose = require('mongoose');

const leaveAllocationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  year: {
    type: Number,
    required: true,
    default: () => new Date().getFullYear()
  },
  allocation: {
    annual: { type: Number, default: 10, min: 0 },    // ลาพักร้อน
    sick: { type: Number, default: 30, min: 0 },      // ลาป่วย
    personal: { type: Number, default: 3, min: 0 },   // ลากิจ
    special: { type: Number, default: 5, min: 0 }     // ลาพิเศษ
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true
});

// สร้าง compound index สำหรับ user + year (ป้องกันการซ้ำ)
leaveAllocationSchema.index({ user: 1, year: 1 }, { unique: true });

// Virtual field สำหรับคำนวณวันลารวม
leaveAllocationSchema.virtual('totalDays').get(function() {
  return this.allocation.annual + this.allocation.sick +
         this.allocation.personal + this.allocation.special;
});

// Method สำหรับอัปเดตการกำหนดวันลา
leaveAllocationSchema.methods.updateAllocation = function(newAllocation, updatedBy) {
  this.allocation = { ...this.allocation, ...newAllocation };
  this.updatedBy = updatedBy;
  return this.save();
};

// Static method สำหรับหาการกำหนดวันลาของผู้ใช้ในปีปัจจุบัน
leaveAllocationSchema.statics.findByUserAndYear = function(userId, year) {
  return this.findOne({ user: userId, year: year || new Date().getFullYear() })
    .populate('user', 'username email employee')
    .populate('user.employee', 'name department photoUrl');
};

// Static method สำหรับสร้างการกำหนดวันลาเริ่มต้น
leaveAllocationSchema.statics.createDefault = function(userId, year, createdBy) {
  return this.create({
    user: userId,
    year: year || new Date().getFullYear(),
    allocation: {
      annual: 10,
      sick: 30,
      personal: 3,
      special: 5
    },
    createdBy,
    updatedBy: createdBy
  });
};

module.exports = mongoose.model('LeaveAllocation', leaveAllocationSchema);