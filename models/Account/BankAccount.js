// models/BankAccount.js
const mongoose = require('mongoose');

const bankAccountSchema = new mongoose.Schema({
  bankName: { type: String, required: true },
  accountNumber: { type: String, required: true },
  accountName: { type: String, required: true },
  // ฟิลด์อื่น ๆ ตามต้องการ
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('BankAccount', bankAccountSchema);
