// models/Installment/QuotationItem.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const QuotationItemSchema = new Schema({
  product: {                              // อ้างอิงไปยัง BranchStock
    type: Schema.Types.ObjectId,
    ref: 'BranchStock',
    required: false  // Made optional for flexibility
  },
  imei: {                                // เก็บ IMEI ของสินค้า
    type: String,
    default: ''
  },
  description: {                         // คำอธิบายเพิ่มเติม
    type: String,
    default: ''
  },
  quantity: {                            // จำนวนชิ้น
    type: Number,
    default: 1
  },
  unitPrice: {                           // ราคาต่อหน่วย (ก่อนส่วนลด)
    type: Number,
    default: 0,
    required: false  // Made optional
  },
  discount: {                            // ส่วนลดต่อรายการ
    type: Number,
    default: 0
  },
  docFee: {                              // ค่าธรรมเนียมเอกสาร
    type: Number,
    default: 0,
    required: false  // Made optional
  },
  downAmount: {                          // ยอดดาวน์
    type: Number,
    default: 0
  },
  termCount: {                           // จำนวนงวดผ่อน
    type: Number,
    default: 0
  },
  installmentAmount: {                   // ค่างวดต่อเดือน
    type: Number,
    default: 0
  },
  totalPrice: {                          // ราคาสุทธิของรายการ (คำนวณแล้ว)
    type: Number,
    default: 0,
    required: false  // Made optional
  }
}, {
  _id: false                             // ไม่สร้าง _id ให้ sub-doc
});

module.exports = QuotationItemSchema;
