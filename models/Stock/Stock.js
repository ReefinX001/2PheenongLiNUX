const mongoose = require('mongoose');
const { Schema } = mongoose;

const stockSchema = new Schema({
  product_id: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  branch_code: {
    type: String,
    required: true
  },
  imei: {                     // ฟิลด์ใหม่สำหรับเก็บข้อมูล IMEI
    type: String,
    default: '',
  },
  quantity: {
    type: Number,
    default: 0
  },
  updated_by: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  collection: 'tb_pi_stock',
  timestamps: true
});

module.exports = mongoose.model('Stock', stockSchema);
