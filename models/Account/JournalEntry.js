// models/JournalEntry.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const journalEntrySchema = new Schema({
  date: { type: Date, default: Date.now },
  reference: { type: String, default: '' }, // เช่น ใบเสร็จ/Invoice/Doc no.
  memo: { type: String, default: '' },

  // รายการเดบิตเครดิต
  lines: [{
    account_id: {
      type: Schema.Types.ObjectId,
      ref: 'ChartOfAccount',
      required: true
    },
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
    description: { type: String, default: '' }
  }],

  posted: { type: Boolean, default: false }, // สมมติว่า post -> lock editing
  deleted_at: { type: Date, default: null }
}, {
  collection: 'journal_entries',
  timestamps: true
});

journalEntrySchema.methods.softDelete = function() {
  this.deleted_at = new Date();
  return this.save();
};

module.exports = mongoose.model('JournalEntry', journalEntrySchema);
