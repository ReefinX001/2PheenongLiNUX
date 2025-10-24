const mongoose = require('mongoose');

const creditNoteSchema = new mongoose.Schema({
  creditNoteNumber: { type: String, required: true, unique: true },        // เลขที่ใบลดหนี้
  creditNoteDate:   { type: Date, default: Date.now },                     // วันที่ออกใบลดหนี้

  // เชื่อมโยงกับใบรับเงินมัดจำ
  depositReceiptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DepositReceipt',
    required: true
  },                                                                        // ID ใบรับเงินมัดจำ
  depositReceiptNumber: { type: String, required: true },                  // เลขที่ใบรับเงินมัดจำ

  // เหตุผลในการลดหนี้
  reason: {
    type: String,
    enum: ['cancel_deposit', 'partial_refund', 'change_product', 'other'],
    required: true
  },                                                                        // เหตุผลการลดหนี้ (ยกเลิกมัดจำ, คืนบางส่วน, เปลี่ยนสินค้า, อื่นๆ)
  reasonDetail: String,                                                     // รายละเอียดเหตุผล

  // ข้อมูลลูกค้า
  customerId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customerName:    { type: String, required: true },
  customerAddress: String,
  customerPhone:   String,
  customerTaxId:   String,

  // รายการสินค้าที่ลดหนี้
  items: [{
    productId:   { type: mongoose.Schema.Types.ObjectId, ref: 'BranchStock' },
    productCode: String,
    productName: { type: String, required: true },
    quantity:    { type: Number, required: true },
    unit:        String,
    pricePerUnit:{ type: Number, required: true },
    discount:    { type: Number, default: 0 },
    amount:      { type: Number, required: true }      // จำนวนเงินรวม
  }],

  // รายละเอียดยอดเงิน
  subtotal:        { type: Number, required: true },   // ยอดก่อนภาษี
  discountAmount:  { type: Number, default: 0 },       // ส่วนลดรวม
  afterDiscount:   { type: Number, required: true },   // ยอดหลังหักส่วนลด
  vatType:         {
    type: String,
    enum: ['none', 'exclusive', 'inclusive'],
    default: 'none'
  },                                                    // ประเภทภาษี
  vatRate:         { type: Number, default: 0 },       // อัตราภาษี (%)
  vatAmount:       { type: Number, default: 0 },       // จำนวนภาษี
  totalAmount:     { type: Number, required: true },   // ยอดสุทธิ

  // การคืนเงิน (ถ้ามี)
  refundMethod:    { type: String, enum: ['cash', 'transfer', 'check', 'credit'] },
  refundDate:      Date,
  refundAmount:    Number,
  refundEvidence:  String,                              // หลักฐานการคืนเงิน

  // สถานะ
  status: {
    type: String,
    enum: ['draft', 'approved', 'completed', 'cancelled'],
    default: 'approved'
  },

  // ข้อมูล meta
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  approvedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedDate: Date,
  branch_code:  { type: String, required: true },
  notes:        String                                  // หมายเหตุเพิ่มเติม
}, {
  timestamps: true
});

// Index สำหรับการค้นหา
// Note: creditNoteNumber index is automatically created by 'unique: true'
creditNoteSchema.index({ branch_code: 1, creditNoteDate: -1 });
creditNoteSchema.index({ customerId: 1 });
creditNoteSchema.index({ depositReceiptId: 1 });
creditNoteSchema.index({ status: 1 });
creditNoteSchema.index({ createdAt: -1 });

// Virtual field สำหรับ populate ใบรับเงินมัดจำ
creditNoteSchema.virtual('depositReceipt', {
  ref: 'DepositReceipt',
  localField: 'depositReceiptId',
  foreignField: '_id',
  justOne: true
});

// Virtual field สำหรับคำนวณยอดคงเหลือ (ถ้ามีการคืนเงินบางส่วน)
creditNoteSchema.virtual('remainingAmount').get(function() {
  if (this.refundAmount && this.totalAmount) {
    return this.totalAmount - this.refundAmount;
  }
  return 0;
});

// Method สำหรับอนุมัติ
creditNoteSchema.methods.approve = async function(userId) {
  this.status = 'approved';
  this.approvedBy = userId;
  this.approvedDate = new Date();
  return this.save();
};

// Method สำหรับยกเลิก
creditNoteSchema.methods.cancel = async function(reason) {
  this.status = 'cancelled';
  this.notes = this.notes ? `${this.notes}\nยกเลิก: ${reason}` : `ยกเลิก: ${reason}`;
  return this.save();
};

// Method สำหรับทำให้สมบูรณ์
creditNoteSchema.methods.complete = async function() {
  this.status = 'completed';
  return this.save();
};

// Pre-save validation
creditNoteSchema.pre('save', async function(next) {
  // ตรวจสอบว่ายอดคืนเงินไม่เกินยอดรวม
  if (this.refundAmount && this.refundAmount > this.totalAmount) {
    throw new Error('ยอดคืนเงินไม่สามารถมากกว่ายอดรวมได้');
  }

  // ตรวจสอบว่าถ้ามีการคืนเงิน ต้องระบุวิธีการคืนเงิน
  if (this.refundAmount > 0 && !this.refundMethod) {
    throw new Error('กรุณาระบุวิธีการคืนเงิน');
  }

  next();
});

// Method สำหรับตรวจสอบว่าใบลดหนี้นี้ทำให้ต้องยกเลิกใบรับเงินมัดจำหรือไม่
creditNoteSchema.methods.shouldCancelDepositReceipt = function() {
  // ถ้าเหตุผลเป็นยกเลิกมัดจำ และคืนเงินเต็มจำนวน
  return this.reason === 'cancel_deposit' &&
         this.refundAmount === this.totalAmount;
};

// Method สำหรับดึงข้อมูลสรุป
creditNoteSchema.methods.getSummary = function() {
  return {
    creditNoteNumber: this.creditNoteNumber,
    creditNoteDate: this.creditNoteDate,
    depositReceiptNumber: this.depositReceiptNumber,
    customerName: this.customerName,
    reason: this.reason,
    reasonDetail: this.reasonDetail,
    totalAmount: this.totalAmount,
    refundAmount: this.refundAmount || 0,
    remainingAmount: this.remainingAmount || 0,
    status: this.status
  };
};

// Static method สำหรับหาใบลดหนี้ที่เกี่ยวข้องกับใบรับเงินมัดจำ
creditNoteSchema.statics.findByDepositReceipt = async function(depositReceiptId) {
  return this.find({
    depositReceiptId: depositReceiptId,
    status: { $ne: 'cancelled' }
  }).sort({ creditNoteDate: -1 });
};

// Static method สำหรับคำนวณยอดคืนเงินรวมของใบรับเงินมัดจำ
creditNoteSchema.statics.getTotalRefundByDepositReceipt = async function(depositReceiptId) {
  const creditNotes = await this.find({
    depositReceiptId: depositReceiptId,
    status: { $in: ['approved', 'completed'] }
  });

  return creditNotes.reduce((total, cn) => {
    return total + (cn.refundAmount || 0);
  }, 0);
};

// Hook หลังจากบันทึกเพื่ออัปเดตสถานะใบรับเงินมัดจำ
creditNoteSchema.post('save', async function(doc) {
  // ตรวจสอบว่าต้องอัปเดตสถานะใบรับเงินมัดจำหรือไม่
  if (doc.shouldCancelDepositReceipt() && doc.status === 'approved') {
    const DepositReceipt = mongoose.models.DepositReceipt || mongoose.model('DepositReceipt');
    await DepositReceipt.findByIdAndUpdate(doc.depositReceiptId, {
      status: 'cancelled',
      notes: `ยกเลิกโดยใบลดหนี้ ${doc.creditNoteNumber}`
    });
  }
});

module.exports = mongoose.models.CreditNote || mongoose.model('CreditNote', creditNoteSchema);
