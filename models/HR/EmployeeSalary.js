// models/HR/EmployeeSalary.js
const mongoose = require('mongoose');

const EmployeeSalarySchema = new mongoose.Schema({
  // รหัสพนักงาน
  employeeId: {
    type: String,
    required: true,
    index: true
  },

  // ข้อมูลพื้นฐานพนักงาน
  code: {
    type: String,
    required: true
  },

  name: {
    type: String,
    required: true
  },

  position: {
    type: String,
    required: true
  },

  department: {
    type: String,
    required: true
  },

  // เงินเดือนและค่าตอบแทน
  baseSalary: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },

  // ค่าตอบแทนตำแหน่ง
  positionAllowance: {
    type: Number,
    default: 0,
    min: 0
  },

  // ประเภทค่าออกพื้นที่
  fieldAllowanceType: {
    type: String,
    enum: ['none', 'upper', 'lower'],
    default: 'none'
  },

  // จำนวนวันออกพื้นที่
  fieldAllowanceDays: {
    type: Number,
    default: 0,
    min: 0
  },

  // ค่าออกพื้นที่
  fieldAllowance: {
    type: Number,
    default: 0,
    min: 0
  },

  // จำนวนชั่วโมงโอที
  overtimeHours: {
    type: Number,
    default: 0,
    min: 0
  },

  // อัตราค่าโอทีต่อชั่วโมง
  overtimeRate: {
    type: Number,
    default: 55,
    min: 0
  },

  // ค่าล่วงเวลา
  overtime: {
    type: Number,
    default: 0,
    min: 0
  },

  // ค่าคอมมิชชั่น
  commission: {
    type: Number,
    default: 0,
    min: 0
  },

  // หักประกันสังคม
  socialSecurity: {
    type: Number,
    default: 750,
    min: 0
  },

  // หัก ณ ที่จ่าย
  withholdingTax: {
    type: Number,
    default: 0,
    min: 0
  },

  // เงินเดือนรวม
  totalSalary: {
    type: Number,
    required: true,
    min: 0
  },

  // ข้อมูลธนาคาร
  bankName: {
    type: String,
    default: ''
  },

  accountNumber: {
    type: String,
    default: ''
  },

  // สถานะ
  status: {
    type: String,
    enum: ['active', 'inactive', 'terminated'],
    default: 'active'
  },

  // เดือน/ปี ที่คำนวณเงินเดือน
  salaryPeriod: {
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12
    },
    year: {
      type: Number,
      required: true
    }
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

// Indexes
EmployeeSalarySchema.index({ employeeId: 1, 'salaryPeriod.year': -1, 'salaryPeriod.month': -1 });
EmployeeSalarySchema.index({ department: 1 });
EmployeeSalarySchema.index({ status: 1 });
EmployeeSalarySchema.index({ createdAt: -1 });

// Virtual สำหรับคำนวณเงินเดือนรวม
EmployeeSalarySchema.virtual('calculatedTotalSalary').get(function() {
  const gross = (this.baseSalary || 0) + (this.positionAllowance || 0) + (this.fieldAllowance || 0) + (this.overtime || 0) + (this.commission || 0);
  return gross - (this.socialSecurity || 0) - (this.withholdingTax || 0);
});

// Virtual สำหรับแสดงชื่อประเภทค่าออกพื้นที่
EmployeeSalarySchema.virtual('fieldAllowanceDisplay').get(function() {
  switch (this.fieldAllowanceType) {
    case 'upper':
      return '300 (สาขาบน)';
    case 'lower':
      return '200 (สาขาล่าง)';
    default:
      return '0';
  }
});

// Pre-save middleware เพื่อคำนวณค่าออกพื้นที่และเงินเดือนรวม
EmployeeSalarySchema.pre('save', function(next) {
  // คำนวณค่าออกพื้นที่ตามประเภทและจำนวนวัน
  let ratePerDay = 0;
  switch (this.fieldAllowanceType) {
    case 'upper':
      ratePerDay = 300;
      break;
    case 'lower':
      ratePerDay = 200;
      break;
    default:
      ratePerDay = 0;
  }
  this.fieldAllowance = (this.fieldAllowanceDays || 0) * ratePerDay;

  // คำนวณค่าโอทีจากชั่วโมงและอัตรา
  this.overtime = (this.overtimeHours || 0) * (this.overtimeRate || 55);

  // คำนวณประกันสังคม 5% จากเงินเดือนพื้นฐาน
  this.socialSecurity = Math.round((this.baseSalary || 0) * 0.05);

  // คำนวณหัก ณ ที่จ่าย 3% จากค่าคอม (เฉพาะเมื่อค่าคอม >= 1000 บาท)
  if ((this.commission || 0) >= 1000) {
    this.withholdingTax = Math.round((this.commission || 0) * 0.03);
  } else {
    this.withholdingTax = 0;
  }

  // คำนวณเงินเดือนรวม
  const gross = (this.baseSalary || 0) + (this.positionAllowance || 0) + this.fieldAllowance + this.overtime + (this.commission || 0);
  this.totalSalary = gross - this.socialSecurity - this.withholdingTax;

  next();
});

// Static method สำหรับดึงข้อมูลสรุป
EmployeeSalarySchema.statics.getSummary = async function(period = null) {
  const matchStage = { status: 'active' };

  if (period) {
    matchStage['salaryPeriod.year'] = period.year;
    matchStage['salaryPeriod.month'] = period.month;
  }

  const summary = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalEmployees: { $sum: 1 },
        totalBaseSalary: { $sum: '$baseSalary' },
        totalAllowances: { $sum: { $add: ['$positionAllowance', '$fieldAllowance'] } },
        totalOvertime: { $sum: '$overtime' },
        totalCommission: { $sum: '$commission' },
        totalSocialSecurity: { $sum: '$socialSecurity' },
        totalWithholdingTax: { $sum: '$withholdingTax' },
        totalPayroll: { $sum: '$totalSalary' },
        avgSalary: { $avg: '$totalSalary' }
      }
    }
  ]);

  return summary[0] || {
    totalEmployees: 0,
    totalBaseSalary: 0,
    totalAllowances: 0,
    totalOvertime: 0,
    totalCommission: 0,
    totalSocialSecurity: 0,
    totalWithholdingTax: 0,
    totalPayroll: 0,
    avgSalary: 0
  };
};

// Static method สำหรับดึงข้อมูลตามแผนก
EmployeeSalarySchema.statics.getByDepartment = async function(period = null) {
  const matchStage = { status: 'active' };

  if (period) {
    matchStage['salaryPeriod.year'] = period.year;
    matchStage['salaryPeriod.month'] = period.month;
  }

  return await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$department',
        count: { $sum: 1 },
        totalSalary: { $sum: '$totalSalary' },
        avgSalary: { $avg: '$totalSalary' }
      }
    },
    { $sort: { totalSalary: -1 } }
  ]);
};

module.exports = mongoose.model('EmployeeSalary', EmployeeSalarySchema);
