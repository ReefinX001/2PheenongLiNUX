// models/HR/BasicEmployee.js
const mongoose = require('mongoose');

const BasicEmployeeSchema = new mongoose.Schema({
  // Reference to User model
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },

  // Basic information
  code: {
    type: String,
    required: true,
    unique: true
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

  // Bank information
  bankName: {
    type: String,
    required: true
  },

  accountNumber: {
    type: String,
    required: true
  },

  // Basic salary information
  baseSalary: {
    type: Number,
    required: true,
    min: 0
  },

  // Work start date
  startDate: {
    type: Date,
    required: true
  },

  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'terminated'],
    default: 'active'
  },

  // Metadata
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

// Indexes for better performance
BasicEmployeeSchema.index({ employeeId: 1 });
BasicEmployeeSchema.index({ code: 1 });
BasicEmployeeSchema.index({ department: 1 });
BasicEmployeeSchema.index({ status: 1 });

// Pre-save middleware
BasicEmployeeSchema.pre('save', function(next) {
  try {
    // Auto-generate employee code if not provided
    if (!this.code && this.isNew) {
      const timestamp = Date.now().toString().slice(-4);
      this.code = `EMP${timestamp}`;
    }

    // Ensure required fields are present
    if (!this.name || this.name.trim() === '') {
      throw new Error('Name is required');
    }

    next();
  } catch (error) {
    console.error('❌ Pre-save validation error:', error);
    next(error);
  }
});

module.exports = mongoose.model('BasicEmployee', BasicEmployeeSchema);
