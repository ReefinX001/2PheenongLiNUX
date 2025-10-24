const mongoose = require('mongoose');

const ExpenseItemSchema = new mongoose.Schema({
  account: String,
  description: String,
  quantity: { type: Number, default: 1 },
  unitPrice: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },       // ต่อหน่วย
  vatType: {                                   // ไม่มีภาษี, แยกภาษี, รวมภาษี
    type: String,
    enum: ['none','exclusive','inclusive'],
    default: 'none'
  },
  withholdingTax: { type: Number, default: 0 },  // %
}, { _id: false });

const ExpenseSchema = new mongoose.Schema({
  documentNumber:  { type: String, required: true },  // EXP-...
  taxInvoiceNumber:{ type: String },
  issueDate:       { type: Date, required: true },
  dueDate:         { type: Date },
  supplier:        { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  vatRate:         { type: Number, default: 7 },
  deposit:         { type: Number, default: 0 },
  notes:           String,
  tags:            [String],
  items:           [ExpenseItemSchema],
  totalBeforeTax:  { type: Number, default: 0 },
  totalNet:        { type: Number, default: 0 },
  status:          { type: String, enum: ['draft','approved'], default: 'draft' },
}, { timestamps: true });

// Guard against OverwriteModelError
module.exports = mongoose.models.Expense
  || mongoose.model('Expense', ExpenseSchema);
