// models/HR/Counter.js
const mongoose = require('mongoose');

const HRCounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
}, {
  collection: 'hr_counters' // ใช้ collection แยกสำหรับ HR
});

// ใช้ชื่อ model ที่แตกต่างเพื่อไม่ให้ชนกับ POS Counter
module.exports = mongoose.models.HRCounter || mongoose.model('HRCounter', HRCounterSchema);