// models/SalesReport.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const salesReportSchema = new Schema({
  report_date: { type: Date, default: Date.now },
  time_period: { type: String, default: '' },
  total_sales: { type: Number, default: 0 },
  total_orders: { type: Number, default: 0 },
  category_id: {
    type: Schema.Types.ObjectId,
    ref: 'ProductCategory', // หากมีโมเดล ProductCategory.js
    default: null
  },
  product_id: {
    type: Schema.Types.ObjectId,
    ref: 'Product', // หากมีโมเดล Product.js
    default: null
  },
  branch_code: {
    type: Schema.Types.ObjectId,
    ref: 'Branch', // หากมีโมเดล Branch.js
    default: null
  },
  graph_data: {
    type: String, // หรือ Mixed ถ้าเป็น JSON
    default: ''
  }
}, {
  collection: 'tb_ra_sales_reports',
  timestamps: false // หากต้องการ createdAt, updatedAt ให้เป็น true
});

// ถ้าต้องการฟีเจอร์ SoftDelete => เพิ่ม deleted_at + softDelete()
module.exports = mongoose.model('SalesReport', salesReportSchema);
