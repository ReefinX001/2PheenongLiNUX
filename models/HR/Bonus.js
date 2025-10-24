// models/HR/Bonus.js
const mongoose = require('mongoose');

const BonusSchema = new mongoose.Schema({
  // Employee reference
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  employeeName: {
    type: String,
    required: true
  },

  // Bonus details
  type: {
    type: String,
    required: true,
    enum: ['performance', 'festival', 'annual', 'sales', 'special', 'other']
  },

  typeName: {
    type: String,
    required: true
  },

  amount: {
    type: Number,
    required: true,
    min: 0
  },

  date: {
    type: Date,
    required: true
  },

  description: {
    type: String,
    required: true
  },

  // Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'paid', 'cancelled'],
    default: 'pending'
  },

  // Period (for reporting)
  period: {
    month: { type: Number, min: 1, max: 12 },
    year: { type: Number }
  },

  // Approval workflow
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  approvedDate: {
    type: Date
  },

  // Payment information
  paidDate: {
    type: Date
  },

  paymentMethod: {
    type: String
  },

  paymentReference: {
    type: String
  },

  // Department for filtering
  department: {
    type: String
  },

  position: {
    type: String
  },

  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes
BonusSchema.index({ employeeId: 1, 'period.year': -1, 'period.month': -1 });
BonusSchema.index({ status: 1 });
BonusSchema.index({ type: 1 });
BonusSchema.index({ date: -1 });
BonusSchema.index({ department: 1 });

// Pre-save middleware to set period and ensure proper typeName
BonusSchema.pre('save', function(next) {
  try {
    // Set period from date
    if (this.date) {
      const date = new Date(this.date);
      this.period = {
        month: date.getMonth() + 1,
        year: date.getFullYear()
      };
    }

    // Ensure typeName is set properly
    if (!this.typeName && this.type) {
      const typeNames = {
        'performance': 'โบนัสผลงาน',
        'festival': 'โบนัสเทศกาล',
        'annual': 'โบนัสประจำปี',
        'sales': 'โบนัสยอดขาย',
        'special': 'โบนัสพิเศษ',
        'other': 'อื่นๆ'
      };
      this.typeName = typeNames[this.type] || this.type || 'ไม่ระบุประเภท';
    }

    // Set default typeName if still undefined
    if (!this.typeName) {
      this.typeName = 'ไม่ระบุประเภท';
    }

    next();
  } catch (error) {
    console.error('❌ Bonus pre-save validation error:', error);
    next(error);
  }
});

// Static method to get bonus summary
BonusSchema.statics.getSummary = async function(filters = {}) {
  const matchStage = {};

  // Handle employeeId with proper resolution
  if (filters.employeeId) {
    let resolvedEmployeeId = filters.employeeId;

    if (typeof filters.employeeId === 'string' && !mongoose.Types.ObjectId.isValid(filters.employeeId)) {
      const Employee = require('./Employee');
      const User = require('../User/User');

      const employee = await Employee.findOne({ employeeId: filters.employeeId });
      if (!employee) {
        throw new Error(`ไม่พบพนักงานที่มีรหัส ${filters.employeeId}`);
      }

      const user = await User.findOne({ employee: employee._id });
      if (!user) {
        throw new Error(`ไม่พบข้อมูลผู้ใช้สำหรับพนักงานรหัส ${filters.employeeId}`);
      }

      resolvedEmployeeId = user._id;
    }

    matchStage.employeeId = resolvedEmployeeId;
  }

  if (filters.status) matchStage.status = filters.status;
  if (filters.type) matchStage.type = filters.type;
  if (filters.month) matchStage['period.month'] = filters.month;
  if (filters.year) matchStage['period.year'] = filters.year;

  const summary = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalBonuses: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        paidAmount: {
          $sum: {
            $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0]
          }
        },
        pendingAmount: {
          $sum: {
            $cond: [{ $in: ['$status', ['pending', 'approved']] }, '$amount', 0]
          }
        }
      }
    }
  ]);

  return summary[0] || {
    totalBonuses: 0,
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0
  };
};

// Static method to get employee bonuses for payroll calculation
BonusSchema.statics.getPayrollBonuses = async function(employeeId, month, year) {
  // Convert employeeId to ObjectId if it's a string like "EMP048"
  let resolvedEmployeeId = employeeId;

  if (typeof employeeId === 'string' && !mongoose.Types.ObjectId.isValid(employeeId)) {
    const Employee = require('./Employee');
    const User = require('../User/User');

    const employee = await Employee.findOne({ employeeId: employeeId });
    if (!employee) {
      throw new Error(`ไม่พบพนักงานที่มีรหัส ${employeeId}`);
    }

    const user = await User.findOne({ employee: employee._id });
    if (!user) {
      throw new Error(`ไม่พบข้อมูลผู้ใช้สำหรับพนักงานรหัส ${employeeId}`);
    }

    resolvedEmployeeId = user._id;
  }

  const matchStage = {
    employeeId: resolvedEmployeeId,
    'period.month': month,
    'period.year': year,
    status: { $in: ['approved', 'paid'] } // Only include approved or paid bonuses in payroll
  };

  return await this.find(matchStage)
    .select('type typeName amount date description status')
    .sort({ date: -1 })
    .lean();
};

// Static method to calculate total bonus for payroll
BonusSchema.statics.calculatePayrollBonusTotal = async function(employeeId, month, year) {
  const bonuses = await this.getPayrollBonuses(employeeId, month, year);
  return bonuses.reduce((total, bonus) => total + bonus.amount, 0);
};

// Static method to auto-approve sales bonuses based on criteria
BonusSchema.statics.autoApproveSalesBonus = async function(employeeId, salesAmount, commissionRate = 0.05) {
  try {
    // Calculate bonus amount
    const bonusAmount = salesAmount * commissionRate;

    if (bonusAmount <= 0) return null;

    // Convert employeeId to ObjectId if it's a string like "EMP048"
    let resolvedEmployeeId = employeeId;

    if (typeof employeeId === 'string' && !mongoose.Types.ObjectId.isValid(employeeId)) {
      const Employee = require('./Employee');
      const employee = await Employee.findOne({ employeeId: employeeId });
      if (!employee) {
        throw new Error(`ไม่พบพนักงานที่มีรหัส ${employeeId}`);
      }

      const User = require('../User/User');
      const user = await User.findOne({ employee: employee._id });
      if (!user) {
        throw new Error(`ไม่พบข้อมูลผู้ใช้สำหรับพนักงานรหัส ${employeeId}`);
      }

      resolvedEmployeeId = user._id;
    }

    // Get employee information
    const User = require('../User/User');
    const user = await User.findById(resolvedEmployeeId).populate('employee');

    if (!user) {
      throw new Error('ไม่พบข้อมูลพนักงาน');
    }

    // Create bonus record
    const bonus = new this({
      employeeId: resolvedEmployeeId,
      employeeName: user.employee?.name || user.username,
      type: 'sales',
      typeName: 'โบนัสยอดขาย',
      amount: bonusAmount,
      date: new Date(),
      description: `โบนัสยอดขายอัตโนมัติ ${commissionRate * 100}% จากยอดขาย ฿${salesAmount.toLocaleString()}`,
      status: 'approved', // Auto-approve sales bonuses
      department: user.employee?.department,
      position: user.employee?.position,
      createdBy: resolvedEmployeeId, // System-generated
      approvedBy: resolvedEmployeeId,
      approvedDate: new Date()
    });

    await bonus.save();
    return bonus;
  } catch (error) {
    console.error('Error auto-approving sales bonus:', error);
    throw error;
  }
};

module.exports = mongoose.model('Bonus', BonusSchema);