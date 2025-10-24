// models/Account/ChartOfAccount.js
const mongoose = require('mongoose');

const ChartOfAccountSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['Asset', 'Liabilities', 'Equity', 'Income', 'Expense']
  },
  category: {
    type: String,
    required: true,
    enum: ['Asset', 'Liabilities', 'Equity', 'Income', 'Expense']
  },
  level: {
    type: Number,
    default: 0
  },
  isMainCategory: {
    type: Boolean,
    default: false
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChartOfAccount',
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ChartOfAccount', ChartOfAccountSchema);
