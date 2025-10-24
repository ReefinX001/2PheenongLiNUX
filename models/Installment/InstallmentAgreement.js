// models/InstallmentAgreement.js
const mongoose = require('mongoose');

const InstallmentAgreementSchema = new mongoose.Schema({
  quotation:       { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation', required: true },
  downPayment:     Number,
  terms:           Number,         // จำนวนงวด
  installmentAmt:  Number,         // ค่างวดต่อเดือน
  planType:        { type: String, enum: ['plan1','plan2','plan3','manual'], default: 'plan1' },
  attachments: {
    idCardImage:   String,
    salarySlip:    String,
    selfie:        String,
    signature:     String
  },
  witness: {
    name:         String,
    idCard:       String,
    phone:        String,
    relation:     String
  }
}, { timestamps: true });

module.exports = mongoose.model('InstallmentAgreement', InstallmentAgreementSchema);
