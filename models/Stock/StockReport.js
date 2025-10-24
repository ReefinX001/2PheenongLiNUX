// models/StockReport.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const stockReportSchema = new Schema({
  report_date: {
    type: Date,
    default: Date.now
  },
  time_period: {
    type: String,
    default: ''
  },
  branch_code: {
    type: Schema.Types.ObjectId,
    ref: 'Branch', // หากมีโมเดล Branch.js
    default: null
  },
  product_id: {
    type: Schema.Types.ObjectId,
    ref: 'Product', // หากมีโมเดล Product.js
    default: null
  },
  remaining_stock: {
    type: Number,
    default: 0
  },
  minimum_stock: {
    type: Number,
    default: 0
  },
  is_dead_stock: {
    type: Boolean,
    default: false
  },
  graph_data: {
    type: String, // ถ้าต้องการเก็บ JSON อาจใช้ { type: Schema.Types.Mixed, default: {} }
    default: ''
  }
}, {
  collection: 'tb_ra_stock_reports', // ชื่อ table ให้ตรงกับ Laravel
  timestamps: false // ถ้าต้องการฟิลด์ createdAt, updatedAt => true
});

// ถ้าคุณต้องการ SoftDelete:
// 1) เพิ่มฟิลด์ deleted_at: { type: Date, default: null }
// 2) เพิ่มเมธอด softDelete()

module.exports = mongoose.model('StockReport', stockReportSchema);
