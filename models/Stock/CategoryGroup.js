// models/Stock/CategoryGroup.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const categoryGroupSchema = new Schema({
  name: { type: String, required: true },
  // เพิ่มฟิลด์ unitName เพื่อระบุหน่วยนับ เช่น 'เครื่อง', 'ชิ้น', ฯลฯ
  unitName: { type: String, default: '' },
});

module.exports = mongoose.models.CategoryGroup || mongoose.model('CategoryGroup', categoryGroupSchema);
