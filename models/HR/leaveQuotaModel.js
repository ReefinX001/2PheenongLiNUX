// models/leaveQuotaModel.js
const mongoose = require('mongoose');

const leaveQuotaSchema = new mongoose.Schema({
  leaveType: { type: String, required: true, unique: true },
  label:     { type: String, required: true },
  totalDays: { type: Number, required: true },
});

module.exports = mongoose.model('LeaveQuota', leaveQuotaSchema);
