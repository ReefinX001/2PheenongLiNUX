// models/ExpenseRecord.js
const mongoose = require('mongoose');

const expenseRecordSchema = new mongoose.Schema({
  // รหัสรายการ
  recordId: {
    type: String,
    unique: true,
    required: true,
    default: function() {
      return 'EXP' + Date.now();
    }
  },

  // วันที่บันทึก
  recordDate: {
    type: Date,
    required: true,
    default: Date.now
  },

  // ประเภทค่าใช้จ่าย
  expenseType: {
    type: String,
    required: true,
    enum: [
      'ค่าใช้จ่ายทั่วไป',
      'ค่าใช้จ่ายการตลาด',
      'ค่าใช้จ่ายการขาย',
      'ค่าใช้จ่ายการบริหาร',
      'ค่าใช้จ่ายการผลิต',
      'ค่าใช้จ่ายการขนส่ง',
      'ค่าใช้จ่ายการบำรุงรักษา',
      'ค่าใช้จ่ายการฝึกอบรม',
      'ค่าใช้จ่ายการวิจัย',
      'ค่าใช้จ่ายอื่นๆ',
      'ค่าจ้าง',
      'ค่าเช่า',
      'ค่าสาธารณูปโภค',
      'อื่นๆ'
    ]
  },

  // รายละเอียด
  description: {
    type: String,
    required: true,
    maxlength: 500
  },

  // จำนวนเงิน
  amount: {
    type: Number,
    required: true,
    min: 0
  },

  // วิธีการชำระเงิน
  paymentMethod: {
    type: String,
    enum: ['เงินสด', 'โอนเงิน', 'เช็ค', 'บัตร'],
    default: 'เงินสด'
  },

  // หมายเลขอ้างอิง (เช็ค, โอนเงิน)
  referenceNumber: {
    type: String,
    maxlength: 100
  },

  // ผู้รับเงิน/ผู้ขาย
  payee: {
    type: String,
    required: true,
    maxlength: 200
  },

  // หมวดหมู่บัญชี
  accountCategory: {
    type: String,
    enum: [
      'ค่าใช้จ่ายในการดำเนินงาน',
      'ค่าใช้จ่ายในการขาย',
      'ค่าใช้จ่ายในการบริหาร',
      'ค่าใช้จ่ายอื่นๆ',
      'อื่นๆ'
    ],
    default: 'ค่าใช้จ่ายในการดำเนินงาน'
  },

  // สถานะ
  status: {
    type: String,
    enum: ['รออนุมัติ', 'อนุมัติแล้ว', 'ถูกปฏิเสธ', 'ยกเลิก'],
    default: 'รออนุมัติ'
  },

  // ไฟล์แนบ (ใบเสร็จ, ใบกำกับภาษี)
  attachments: [{
    fileName: String,
    fileUrl: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // หมายเหตุ
  notes: {
    type: String,
    maxlength: 1000
  },

  // ผู้สร้าง
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // ผู้อนุมัติ
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // วันที่อนุมัติ
  approvedDate: {
    type: Date
  },

  // แผนก
  department: {
    type: String,
    maxlength: 100
  },

  // โครงการ/งาน
  project: {
    type: String,
    maxlength: 200
  },

  // ภาษีมูลค่าเพิ่ม
  vat: {
    type: Number,
    default: 0,
    min: 0
  },

  // ภาษีหัก ณ ที่จ่าย
  withHoldingTax: {
    type: Number,
    default: 0,
    min: 0
  },

  // จำนวนเงินสุทธิ (รวมภาษี-หักภาษี)
  netAmount: {
    type: Number,
    required: true,
    min: 0
  },

  // Tags สำหรับค้นหา
  tags: [String],

  // ข้อมูลการแก้ไขล่าสุด
  lastModified: {
    date: {
      type: Date
    },
    by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }
}, {
  timestamps: true,
  versionKey: false
});

// Indexes for better query performance
expenseRecordSchema.index({ recordDate: -1 });
expenseRecordSchema.index({ expenseType: 1 });
expenseRecordSchema.index({ status: 1 });
expenseRecordSchema.index({ createdBy: 1 });
expenseRecordSchema.index({ recordId: 1 });

// Virtual for total amount including VAT
expenseRecordSchema.virtual('totalAmount').get(function() {
  return this.amount + this.vat;
});

// Pre-save middleware to calculate net amount
expenseRecordSchema.pre('save', function(next) {
  if (this.isModified('amount') || this.isModified('vat') || this.isModified('withHoldingTax')) {
    this.netAmount = this.amount + this.vat - this.withHoldingTax;
  }
  next();
});

// Method to approve expense
expenseRecordSchema.methods.approve = function(userId) {
  this.status = 'อนุมัติแล้ว';
  this.approvedBy = userId;
  this.approvedDate = new Date();
  return this.save();
};

// Method to reject expense
expenseRecordSchema.methods.reject = function(userId) {
  this.status = 'ถูกปฏิเสธ';
  this.approvedBy = userId;
  this.approvedDate = new Date();
  return this.save();
};

// Static method to get expense summary by type
expenseRecordSchema.statics.getSummaryByType = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        recordDate: { $gte: startDate, $lte: endDate },
        status: 'อนุมัติแล้ว'
      }
    },
    {
      $group: {
        _id: '$expenseType',
        totalAmount: { $sum: '$netAmount' },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { totalAmount: -1 }
    }
  ]);
};

// Static method to get monthly expense summary
expenseRecordSchema.statics.getMonthlySummary = function(year) {
  return this.aggregate([
    {
      $match: {
        recordDate: {
          $gte: new Date(year, 0, 1),
          $lte: new Date(year, 11, 31)
        },
        status: 'อนุมัติแล้ว'
      }
    },
    {
      $group: {
        _id: { $month: '$recordDate' },
        totalAmount: { $sum: '$netAmount' },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);
};

module.exports = mongoose.model('ExpenseRecord', expenseRecordSchema);