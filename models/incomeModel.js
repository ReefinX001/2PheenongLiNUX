// models/incomeModel.js
const mongoose = require('mongoose');

const incomeSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  description: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Income', incomeSchema);
