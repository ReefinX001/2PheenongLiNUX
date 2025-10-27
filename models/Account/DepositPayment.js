/**
 * DepositPayment Model - ใบจ่ายเงินมัดจำ
 * สำหรับบันทึกการจ่ายเงินมัดจำให้ผู้จำหน่าย/ซัพพลายเออร์
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const depositPaymentSchema = new Schema(
  {
    // เลขที่เอกสาร
    paymentNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    // ข้อมูลผู้จำหน่าย (Embedded)
    supplier: {
      supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier' },
      code: { type: String, required: true },
      name: { type: String, required: true },
      taxId: String,
      address: String,
      phone: String,
      email: String
    },

    // ข้อมูลสาขาที่ทำรายการ
    branch: {
      code: { type: String, required: true },
      name: { type: String, required: true }
    },

    // วันที่ทำรายการ
    paymentDate: {
      type: Date,
      required: true,
      default: Date.now
    },

    // อ้างอิงใบสั่งซื้อ (ถ้ามี)
    purchaseOrder: {
      poNumber: String,
      poId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder' }
    },

    // ประเภทเงินมัดจำ
    depositType: {
      type: String,
      enum: ['deposit', 'advance', 'partial'],
      default: 'deposit',
      required: true
    },

    // จำนวนเงิน
    amounts: {
      subtotalAmount: { type: Number, required: true, default: 0 }, // ยอดก่อนภาษี
      discountAmount: { type: Number, default: 0 },                 // ส่วนลด
      vatAmount: { type: Number, default: 0 },                      // ภาษีมูลค่าเพิ่ม 7%
      totalAmount: { type: Number, required: true },                // ยอดรวม
      depositAmount: { type: Number, required: true },              // เงินมัดจำที่จ่ายไป
      remainingAmount: { type: Number, required: true }             // ยอดคงเหลือที่ต้องจ่าย
    },

    // วิธีการชำระเงิน
    paymentMethod: {
      type: String,
      enum: ['cash', 'transfer', 'check', 'mixed'],
      required: true,
      default: 'transfer'
    },

    // รายละเอียดการชำระเงิน (สำหรับ transfer/check)
    paymentDetails: {
      // สำหรับโอนเงิน
      bankName: String,
      bankAccountNumber: String,
      transferDate: Date,
      transferReference: String,

      // สำหรับเช็ค
      checkNumber: String,
      checkDate: Date,
      checkBankName: String,

      // สำหรับการชำระแบบผสม
      cash: Number,
      transfer: Number,
      check: Number
    },

    // สถานะ
    status: {
      type: String,
      enum: ['pending', 'approved', 'paid', 'completed', 'cancelled'],
      default: 'pending'
    },

    // หมายเหตุ
    notes: {
      type: String,
      default: ''
    },

    // ข้อมูลพนักงานที่บันทึก
    createdBy: {
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      name: String,
      employeeId: String
    },

    // ข้อมูลการอนุมัติ
    approvedBy: {
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      name: String,
      approvedAt: Date
    },

    // ข้อมูลการยกเลิก
    cancelledBy: {
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      name: String,
      cancelReason: String,
      cancelledAt: Date
    },

    // เอกสารที่เกี่ยวข้อง
    relatedDocuments: {
      journalEntryId: { type: Schema.Types.ObjectId, ref: 'JournalEntry' },
      receiptVoucherId: { type: Schema.Types.ObjectId, ref: 'ReceiptVoucher' },
      reverseJournalEntryId: { type: Schema.Types.ObjectId, ref: 'JournalEntry' }
    },

    // Metadata
    metadata: {
      source: { type: String, default: 'web' },
      ipAddress: String,
      userAgent: String
    }
  },
  {
    timestamps: true,
    collection: 'deposit_payments'
  }
);

// Indexes
depositPaymentSchema.index({ paymentNumber: 1 }, { unique: true });
depositPaymentSchema.index({ 'supplier.supplierId': 1 });
depositPaymentSchema.index({ 'branch.code': 1 });
depositPaymentSchema.index({ paymentDate: -1 });
depositPaymentSchema.index({ status: 1 });
depositPaymentSchema.index({ createdAt: -1 });

// Static Methods

/**
 * สร้างเลขที่ใบจ่ายเงินมัดจำ
 */
depositPaymentSchema.statics.generatePaymentNumber = async function (branchCode) {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');

  const prefix = `${branchCode}-DP-${year}${month}`;

  // หาเลขล่าสุด
  const lastPayment = await this.findOne({
    paymentNumber: new RegExp(`^${prefix}`)
  })
    .sort({ paymentNumber: -1 })
    .select('paymentNumber')
    .lean();

  let nextNumber = 1;
  if (lastPayment && lastPayment.paymentNumber) {
    const lastNum = parseInt(lastPayment.paymentNumber.split('-').pop());
    if (!isNaN(lastNum)) {
      nextNumber = lastNum + 1;
    }
  }

  const paymentNumber = `${prefix}-${String(nextNumber).padStart(4, '0')}`;
  return paymentNumber;
};

/**
 * ค้นหาด้วยเลขที่เอกสาร
 */
depositPaymentSchema.statics.findByPaymentNumber = function (paymentNumber) {
  return this.findOne({ paymentNumber });
};

/**
 * ค้นหาด้วยผู้จำหน่าย
 */
depositPaymentSchema.statics.findBySupplier = function (supplierId) {
  return this.find({ 'supplier.supplierId': supplierId }).sort({ paymentDate: -1 });
};

// Instance Methods

/**
 * อนุมัติใบจ่ายเงินมัดจำ
 */
depositPaymentSchema.methods.approve = function (approvedBy) {
  this.status = 'approved';
  this.approvedBy = {
    userId: approvedBy.userId,
    name: approvedBy.name,
    approvedAt: new Date()
  };
  return this.save();
};

/**
 * เปลี่ยนสถานะเป็นจ่ายแล้ว
 */
depositPaymentSchema.methods.markAsPaid = function () {
  this.status = 'paid';
  return this.save();
};

/**
 * ยกเลิกใบจ่ายเงินมัดจำ
 */
depositPaymentSchema.methods.cancel = function (cancelledBy, reason) {
  this.status = 'cancelled';
  this.cancelledBy = {
    userId: cancelledBy.userId,
    name: cancelledBy.name,
    cancelReason: reason,
    cancelledAt: new Date()
  };
  return this.save();
};

/**
 * คำนวณยอดคงเหลือ
 */
depositPaymentSchema.methods.calculateRemaining = function () {
  return this.amounts.totalAmount - this.amounts.depositAmount;
};

// Virtual fields
depositPaymentSchema.virtual('isFullyPaid').get(function () {
  return this.amounts.depositAmount >= this.amounts.totalAmount;
});

// Middlewares

// Pre-save: คำนวณยอดคงเหลืออัตโนมัติ
depositPaymentSchema.pre('save', function (next) {
  if (this.amounts.totalAmount && this.amounts.depositAmount) {
    this.amounts.remainingAmount = this.amounts.totalAmount - this.amounts.depositAmount;
  }
  next();
});

// JSON transformation
depositPaymentSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('DepositPayment', depositPaymentSchema);
