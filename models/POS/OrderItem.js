// File: models/OrderItem.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const orderItemSchema = new Schema({
  order_id: {
    type: Schema.Types.ObjectId,
    ref: 'Order', // ผูกกับโมเดล Order.js
    required: true
  },
  // ถ้าเคยมี product_id อยู่แล้วก็เก็บไว้ด้วย
  product_id: {
    type: Schema.Types.ObjectId,
    ref: 'Product', // สมมติถ้ามีโมเดล Product.js
    default: null
  },

  // เก็บข้อมูลสินค้าตามที่ต้องการ สำหรับกรณีไม่อยาก populate กับ Product อีก
  // เช่น ถ้าสินค้ามาจาก POS โดยตรง
  name:      { type: String, default: '' },
  model:     { type: String, default: '' },
  color:     { type: String, default: '' },
  capacity:  { type: String, default: '' },
  imei:      { type: String, default: '' },

  quantity:  { type: Number, default: 1 },
  price:     { type: Number, default: 0 },    // ราคาต่อหน่วย
  discount:  { type: Number, default: 0 },    // ส่วนลด (ต่อชิ้นหรือต่อรายการ)
  subtotal:  { type: Number, default: 0 },    // ยอดรวมของแถวนี้ (price * quantity - discount)

  // ถ้าจะเก็บเวลาสร้าง/แก้ไข ก็เปิด timestamps ใน options หรือตั้งเป็น false ก็ได้
}, {
  collection: 'tb_orders_items', // ชื่อคอลเลกชันตามโครงสร้างที่ต้องการ
  timestamps: false
});

module.exports = mongoose.model('OrderItem', orderItemSchema);
