// File: models/POS/Counter.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const CounterSchema = new Schema({
  key: {
    type: String,
    required: true
  },
  reference_value: {
    type: String,
    required: true
  },
  seq: {
    type: Number,
    default: 0
  }
});

// ให้ตรวจ uniqueness ตามคู่ (key, reference_value) ไม่ใช่ seq
CounterSchema.index({ key: 1, reference_value: 1 }, { unique: true });

module.exports = mongoose.models.Counter || mongoose.model('Counter', CounterSchema);
