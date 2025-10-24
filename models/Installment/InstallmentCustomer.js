// models/Installment/InstallmentCustomer.js
// Customer model specifically for installment system
// This model uses snake_case field names to match existing route expectations

const mongoose = require('mongoose');
const { Schema } = mongoose;

const installmentCustomerSchema = new Schema({
  // Basic customer information
  first_name: {
    type: String,
    required: true,
    trim: true
  },
  last_name: {
    type: String,
    required: true,
    trim: true
  },
  phone_number: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^[0-9]{9,10}$/.test(v.replace(/-/g, ''));
      },
      message: 'Invalid phone number format'
    }
  },
  tax_id: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function(v) {
        return /^[0-9]{13}$/.test(v);
      },
      message: 'Tax ID must be 13 digits'
    }
  },

  // Contact information
  email: {
    type: String,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return !v || /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v);
      },
      message: 'Invalid email format'
    }
  },

  // Address information
  address: {
    house_no: String,
    moo: String,
    lane: String,
    road: String,
    sub_district: String,
    district: String,
    province: String,
    zipcode: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || /^[0-9]{5}$/.test(v);
        },
        message: 'Zipcode must be 5 digits'
      }
    }
  },

  // Occupation information
  occupation: {
    type: String,
    default: ''
  },
  income: {
    type: Number,
    min: 0,
    default: 0
  },

  // Image/Document fields that are referenced in the routes
  idCardImage: String,
  incomeSlip: String,
  selfieImage: String,
  customerSignature: String,
  employeeSignature: String,
  authorizedSignature: String,

  // Salesperson reference
  salesperson: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },

  // Reference to installment orders
  installmentOrder: [{
    type: Schema.Types.ObjectId,
    ref: 'InstallmentOrder'
  }],

  // Status and metadata
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field on save
installmentCustomerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for full name
installmentCustomerSchema.virtual('fullName').get(function() {
  return `${this.first_name} ${this.last_name}`.trim();
});

// Ensure virtual fields are serialized
installmentCustomerSchema.set('toJSON', { virtuals: true });
installmentCustomerSchema.set('toObject', { virtuals: true });

// Indexes for better performance
installmentCustomerSchema.index({ phone_number: 1 });
installmentCustomerSchema.index({ tax_id: 1 });
installmentCustomerSchema.index({ first_name: 1, last_name: 1 });
installmentCustomerSchema.index({ createdAt: -1 });

module.exports = mongoose.model('InstallmentCustomer', installmentCustomerSchema);
