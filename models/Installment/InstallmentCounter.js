// /models/InstallmentCounter.js
const mongoose = require('mongoose');

const installmentCounterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    default: 'installment'
  },
  year: {
    type: Number,
    required: true
  },
  month: {
    type: Number,
    required: true
  },
  dateKey: {
    type: String,
    required: false // ไม่บังคับเพื่อให้ backward compatible
  },
  seq: {
    type: Number,
    required: true,
    default: 0
  }
});

// สร้าง unique index - ใช้ dateKey เป็นหลักเพื่อป้องกันการซ้ำกันต่อวัน
installmentCounterSchema.index({ name: 1, dateKey: 1 }, { unique: true });

// Static method to generate next contract number
installmentCounterSchema.statics.getNextContractNo = async function() {
  try {
    // ใช้ DocumentNumberSystem เพื่อให้เลขตรงกับเอกสารอื่นๆ
    const { DocumentNumberSystem } = require('../../utils/DocumentNumberSystem');

    // สร้างเลขสัญญาผ่อนชำระโดยใช้ระบบเดียวกับเอกสารอื่น
    const contractNumber = await DocumentNumberSystem.generateInstallmentContractNumber();

    console.log('✅ Generated installment contract number using DocumentNumberSystem:', contractNumber);
    return contractNumber;

  } catch (error) {
    console.error('❌ Error using DocumentNumberSystem for installment, falling back to legacy:', error);

    // Fallback แบบเดิม
    const now = new Date();
    const yearBE = now.getFullYear() + 543; // ใช้ปี พ.ศ.
    const month = now.getMonth() + 1; // JavaScript months are 0-indexed
    const day = now.getDate();

    // สร้างรูปแบบ date string: YYMMDD (ปีพ.ศ. 2 หลัก + เดือน + วัน)
    const yearShort = String(yearBE).slice(-2); // เอา 2 หลักสุดท้าย เช่น 68 จาก 2568
    const monthStr = String(month).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${yearShort}${monthStr}${dayStr}`;

    const counter = await this.findOneAndUpdate(
      { name: 'installment', year: yearBE, month, dateKey: dateStr },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // Format: INST-YYMMDD-XXX เหมือนกับเอกสารอื่นๆ
    const seqStr = counter.seq.toString().padStart(3, '0');

    return `INST-${dateStr}-${seqStr}`;
  }
};

module.exports = mongoose.model('InstallmentCounter', installmentCounterSchema);
