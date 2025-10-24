const mongoose = require('mongoose');

const claimItemSchema = new mongoose.Schema({
  contractNumber: {
    type: String,
    required: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  itemName: String,
  reason: String,
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'pending'
  },
  claimDate: {
    type: Date,
    default: Date.now
  },
  branchCode: String
}, {
  timestamps: true
});

module.exports = mongoose.model('ClaimItem', claimItemSchema);