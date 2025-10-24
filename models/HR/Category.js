const mongoose = require('mongoose');
const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  icon: {
    type: String,
    default: ''
  },
  color: {
    type: String,
    required: true,
    default: 'primary'
  }
}, {
  timestamps: true   // <-- จะสร้าง createdAt และ updatedAt ให้อัตโนมัติ
});

module.exports = mongoose.model('Category', categorySchema);
