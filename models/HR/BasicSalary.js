// models/HR/BasicSalary.js
const mongoose = require('mongoose');

// สำหรับจัดการข้อมูลเงินเดือนพื้นฐานตามที่ผู้ใช้ร้องขอ
const BasicSalarySchema = new mongoose.Schema({
  // อ้างอิงพนักงาน (User)
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // อ้างอิงพนักงาน (Employee)
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },

  // รหัสพนักงาน
  employeeId: {
    type: String,
    required: true,
    index: true
  },

  // ชื่อพนักงาน
  employeeName: {
    type: String,
    required: true
  },

  // แผนก
  department: {
    type: String,
    required: true,
    index: true
  },

  // ธนาคาร
  bankName: {
    type: String,
    required: true
  },

  // เลขบัญชี
  accountNumber: {
    type: String,
    required: true
  },

  // เงินเดือนพื้นฐาน
  basicSalary: {
    type: Number,
    required: true,
    min: 0
  },

  // วันที่เข้ามาทำงาน
  startDate: {
    type: Date,
    required: true
  },

  // สถานะ
  status: {
    type: String,
    enum: ['active', 'inactive', 'terminated'],
    default: 'active'
  },

  // หมายเหตุ
  notes: {
    type: String,
    default: ''
  },

  // ข้อมูลการสร้างและแก้ไข
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes สำหรับการค้นหาที่เร็วขึ้น
BasicSalarySchema.index({ user: 1 }, { unique: true }); // แต่ละ user มีข้อมูลพื้นฐานได้แค่ 1 รายการ
BasicSalarySchema.index({ employeeId: 1 });
BasicSalarySchema.index({ department: 1 });
BasicSalarySchema.index({ status: 1 });
BasicSalarySchema.index({ createdAt: -1 });

// Static method สำหรับตรวจสอบว่าพนักงานมีข้อมูลพื้นฐานแล้วหรือไม่
BasicSalarySchema.statics.hasBasicSalary = async function(userId) {
  const basicSalary = await this.findOne({
    user: userId,
    status: { $ne: 'terminated' }
  });
  return !!basicSalary;
};

// Static method สำหรับดึงข้อมูลพื้นฐานของพนักงาน
BasicSalarySchema.statics.getBasicSalaryByUser = async function(userId) {
  return await this.findOne({
    user: userId,
    status: { $ne: 'terminated' }
  }).populate('user', 'username email firstName lastName');
};

// Static method สำหรับดึงข้อมูลสรุปตามแผนก
BasicSalarySchema.statics.getSummaryByDepartment = async function() {
  return await this.aggregate([
    { $match: { status: 'active' } },
    {
      $group: {
        _id: '$department',
        count: { $sum: 1 },
        totalBasicSalary: { $sum: '$basicSalary' },
        avgBasicSalary: { $avg: '$basicSalary' }
      }
    },
    { $sort: { totalBasicSalary: -1 } }
  ]);
};

module.exports = mongoose.model('BasicSalary', BasicSalarySchema);