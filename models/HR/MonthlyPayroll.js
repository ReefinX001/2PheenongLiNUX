// models/HR/MonthlyPayroll.js
const mongoose = require('mongoose');

const MonthlyPayrollSchema = new mongoose.Schema({
  // Reference to BasicEmployee
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BasicEmployee',
    required: true
  },

  // Period information
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },

  year: {
    type: Number,
    required: true
  },

  // Income components
  positionAllowance: {
    type: Number,
    default: 0,
    min: 0
  },

  commission: {
    type: Number,
    default: 0,
    min: 0
  },

  // Field allowance
  fieldDays: {
    type: Number,
    default: 0,
    min: 0
  },

  fieldType: {
    type: String,
    enum: ['none', 'upper', 'lower'],
    default: 'none'
  },

  fieldAllowance: {
    type: Number,
    default: 0,
    min: 0
  },

  // Overtime
  otHours: {
    type: Number,
    default: 0,
    min: 0
  },

  otRate: {
    type: Number,
    default: 55,
    min: 0
  },

  otTotal: {
    type: Number,
    default: 0,
    min: 0
  },

  // Deductions
  socialSecurity: {
    type: Number,
    default: 0,
    min: 0
  },

  withholdingTax: {
    type: Number,
    default: 0,
    min: 0
  },

  // Totals
  grossIncome: {
    type: Number,
    required: true,
    min: 0
  },

  netSalary: {
    type: Number,
    required: true,
    min: 0
  },

  // Document attachment
  documentPath: {
    type: String
  },

  // Status
  status: {
    type: String,
    enum: ['draft', 'calculated', 'approved', 'paid'],
    default: 'calculated'
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

  // Notes
  notes: {
    type: String
  },

  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  approvedDate: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for better performance
MonthlyPayrollSchema.index({ employeeId: 1, year: -1, month: -1 }, { unique: true });
MonthlyPayrollSchema.index({ year: -1, month: -1 });
MonthlyPayrollSchema.index({ status: 1 });

// Pre-save middleware for calculations
MonthlyPayrollSchema.pre('save', function(next) {
  // Calculate field allowance
  if (this.fieldDays && this.fieldType !== 'none') {
    const rate = this.fieldType === 'upper' ? 300 : this.fieldType === 'lower' ? 200 : 0;
    this.fieldAllowance = this.fieldDays * rate;
  }

  // Calculate OT total
  if (this.otHours && this.otRate) {
    this.otTotal = this.otHours * this.otRate;
  }

  // Calculate withholding tax (3% if commission >= 1000)
  if (this.commission >= 1000) {
    this.withholdingTax = Math.round(this.commission * 0.03);
  } else {
    this.withholdingTax = 0;
  }

  next();
});

// Static method to get payroll summary
MonthlyPayrollSchema.statics.getSummary = async function(month, year) {
  const matchStage = { status: { $ne: 'draft' } };

  if (month) matchStage.month = month;
  if (year) matchStage.year = year;

  const summary = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalEmployees: { $sum: 1 },
        totalGrossIncome: { $sum: '$grossIncome' },
        totalNetSalary: { $sum: '$netSalary' },
        totalSocialSecurity: { $sum: '$socialSecurity' },
        totalWithholdingTax: { $sum: '$withholdingTax' },
        totalCommission: { $sum: '$commission' },
        totalOT: { $sum: '$otTotal' },
        avgNetSalary: { $avg: '$netSalary' }
      }
    }
  ]);

  return summary[0] || {
    totalEmployees: 0,
    totalGrossIncome: 0,
    totalNetSalary: 0,
    totalSocialSecurity: 0,
    totalWithholdingTax: 0,
    totalCommission: 0,
    totalOT: 0,
    avgNetSalary: 0
  };
};

module.exports = mongoose.model('MonthlyPayroll', MonthlyPayrollSchema);
