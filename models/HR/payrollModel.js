const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema({
  employee: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('Payroll', payrollSchema);
