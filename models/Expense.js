const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
  documentNumber: { type: String, required: true },
  taxInvoiceNumber: { type: String, required: true },
  issueDate: { type: Date, required: true },
  dueDate: { type: Date, required: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  items: [{
    account: { type: String, required: true },
    description: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    vatType: { type: String, enum: ['ไม่มีภาษี', 'รวมภาษี 7%', 'แยกภาษี 7%'], default: 'ไม่มีภาษี' },
    withholdingTax: { type: Number, default: 0 }
  }],
  amount: { type: Number }, // เอา required: true ออก
  totalBeforeTax: { type: Number, default: 0 },
  totalNet: { type: Number, default: 0 },
  tags: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  vatRate: { type: Number, default: 0 },
  deposit: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.models.Expense || mongoose.model('Expense', ExpenseSchema);
