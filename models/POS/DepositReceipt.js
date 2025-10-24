const mongoose = require('mongoose');

const depositReceiptSchema = new mongoose.Schema({
  receiptNumber: { type: String, required: true, unique: true },          // เลขที่ใบรับเงินมัดจำ
  receiptDate:   { type: Date,   default: Date.now },                       // วันที่และเวลาออกใบ
  depositType:   { type: String, enum: ['preorder', 'online'], required: true }, // ประเภทการมัดจำ ('preorder' หรือ 'online')

  // ข้อมูลลูกค้า
  customerId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customerName:    String,  // ชื่อลูกค้า
  customerAddress: String,  // ที่อยู่ลูกค้า
  customerPhone:   String,  // เบอร์โทรลูกค้า
  customerTaxId:   String,  // เลขประจำตัวผู้เสียภาษีลูกค้า

  // ข้อมูลสินค้า
  productId:    { type: mongoose.Schema.Types.ObjectId, ref: 'BranchStock' }, // ID สินค้าในสต็อก
  productName:  String,  // ชื่อสินค้า
  productPrice: Number,  // ราคาสินค้า

  // กรณี Pre-order
  supplier:     String,  // ผู้จัดจำหน่าย (สำหรับ pre-order)
  expectedDate: Date,    // วันที่คาดว่าจะได้รับสินค้า

  // ประเภทการซื้อ
  purchaseType:     { type: String, enum: ['cash', 'installment'], default: 'cash' },  // 'cash' หรือ 'installment'
  installmentPeriod: Number,  // จำนวนงวด (กรณีผ่อน)

  // รายละเอียดยอดเงิน
  subtotal:      { type: Number, required: true },  // ยอดก่อนภาษี
  discount:      { type: Number, default: 0 },      // ส่วนลด
  vatAmount:     { type: Number, default: 0 },      // ภาษีมูลค่าเพิ่ม
  vatType:       {
    type: String,
    enum: ['none','exclusive','inclusive'],     // ไม่มีภาษี, แยกภาษี, รวมภาษี
    default: 'none'
  },
  vatRate:       { type: Number, default: 0 },     // อัตราภาษี (%)
  documentFee:   { type: Number, default: 0 },     // ค่าเอกสาร (เพิ่มใหม่)
  depositAmount: { type: Number, required: true },  // ยอดมัดจำ
  totalAmount:   { type: Number, required: true },  // ยอดสุทธิหลังหักส่วนลดและภาษี

  // ข้อมูลการคำนวณเงินมัดจำ (เพิ่มใหม่)
  saleTypeDetail: {
    type: {
      type: String,
      enum: ['cash', 'installment'],
      required: true
    },
    depositCalculation: {
      type: String,
      enum: ['custom', 'downPayment', 'percentage'],
      default: 'percentage'
    },
    originalDepositAmount: { type: Number, default: 0 },  // จำนวนเงินมัดจำที่ส่งมาจากฟอร์ม
    calculatedDepositAmount: { type: Number, required: true }, // จำนวนเงินมัดจำที่คำนวณได้
    customDepositAmount: { type: Number }, // จำนวนเงินมัดจำที่กำหนดเอง (สำหรับขายสด)
    downPaymentAmount: { type: Number },  // จำนวนเงินดาวน์ (สำหรับขายผ่อน)
    percentageUsed: { type: Number }      // เปอร์เซ็นต์ที่ใช้คำนวณ (ถ้าใช้วิธีเปอร์เซ็นต์)
  },

  // ข้อมูลการชำระเงิน
  paymentType:     { type: String, enum: ['cash', 'transfer', 'check'], default: 'transfer' }, // วิธีชำระเงิน
  paymentDate:     { type: Date, default: Date.now },     // วันที่ชำระเงิน
  paymentAmount:   { type: Number },  // ยอดเงินที่ชำระ (เพิ่มใหม่)
  paymentEvidence: String,   // หลักฐานการชำระเงิน (URL หรือ path)

  // ข้อมูลการจัดส่ง (ถ้ามี)
  salesChannel:   String,  // ช่องทางการขาย
  shippingMethod: String,  // วิธีการจัดส่ง
  shippingCost:   Number,  // ค่าจัดส่ง

  // สถานะ
  status: {
    type: String,
    enum: ['active', 'has_credit_note', 'partial_credit', 'fully_credited', 'cancelled', 'completed'],
    default: 'active'
  }, // สถานะเอกสาร

  // เชื่อมโยงกับใบลดหนี้
  creditNotes: [{
    creditNoteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CreditNote'
    },
    creditNoteNumber: String,
    creditNoteDate: Date,
    amount: Number,
    status: String, // สถานะของใบลดหนี้ เช่น 'approved', 'cancelled'
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  // เชื่อมโยงกับเอกสารอื่น
  linkedInvoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' }, // ใบแจ้งหนี้ที่เกี่ยวข้อง

  // ข้อมูล meta
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // ผู้สร้างเอกสาร
  branch_code: { type: String, required: true },  // โค้ดสาขา
  notes:       String   // หมายเหตุเพิ่มเติม
}, {
  timestamps: true // สร้าง fields createdAt และ updatedAt อัตโนมัติ
});

// Index สำหรับการค้นหา
// Note: receiptNumber index is automatically created by 'unique: true'
depositReceiptSchema.index({ branch_code: 1, receiptDate: -1 });
depositReceiptSchema.index({ customerId: 1 });
depositReceiptSchema.index({ productId: 1 });
depositReceiptSchema.index({ status: 1 });
depositReceiptSchema.index({ createdAt: -1 });

// Virtual field สำหรับคำนวณยอดค้างชำระ
depositReceiptSchema.virtual('remainingAmount').get(function() {
  return this.totalAmount - this.depositAmount;
});

// Method สำหรับยกเลิกใบเสร็จ
depositReceiptSchema.methods.cancel = async function(reason) {
  this.status = 'cancelled';
  this.notes = this.notes ? `${this.notes}\nยกเลิก: ${reason}` : `ยกเลิก: ${reason}`;
  return this.save();
};

// Method สำหรับทำให้สมบูรณ์
depositReceiptSchema.methods.complete = async function() {
  this.status = 'completed';
  return this.save();
};

// Check if model exists before creating it
module.exports = mongoose.models.DepositReceipt || mongoose.model('DepositReceipt', depositReceiptSchema);
