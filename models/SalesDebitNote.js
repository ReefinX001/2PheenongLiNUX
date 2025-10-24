/**
 * models/SalesDebitNote.js - Model สำหรับใบเพิ่มหนี้การขาย (ลูกค้า)
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const salesDebitNoteSchema = new Schema(
  {
    // เลขที่ใบเพิ่มหนี้
    debitNoteNumber: {
      type: String,
      required: true,
      unique: true
    },

    // วันที่ออกใบเพิ่มหนี้
    issueDate: {
      type: Date,
      required: true,
      default: Date.now
    },

    // ลูกค้า
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true
    },

    // รายการสินค้า/บริการ
    items: [{
      description: {
        type: String,
        required: true
      },
      quantity: {
        type: Number,
        default: 1
      },
      unitPrice: {
        type: Number,
        required: true
      },
      amount: {
        type: Number,
        required: true
      }
    }],

    // ยอดรวมก่อน VAT
    subtotal: {
      type: Number,
      required: true
    },

    // VAT
    vatRate: {
      type: Number,
      default: 7 // 7%
    },

    vatAmount: {
      type: Number,
      default: 0
    },

    // ยอดรวมสุทธิ
    totalAmount: {
      type: Number,
      required: true
    },

    // สถานะ
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending'
    },

    // หมายเหตุ
    notes: {
      type: String,
      default: ''
    },

    // ผู้สร้าง
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // ผู้อนุมัติ
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },

    // วันที่อนุมัติ
    approvedAt: {
      type: Date
    },

    // ผู้ปฏิเสธ
    rejectedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },

    // วันที่ปฏิเสธ
    rejectedAt: {
      type: Date
    },

    // เหตุผลในการปฏิเสธ
    rejectionReason: {
      type: String
    },

    // อ้างอิงเอกสารต้นฉบับ (ถ้ามี)
    referenceDocument: {
      type: String
    },

    // สาขา
    branch: {
      type: Schema.Types.ObjectId,
      ref: 'Branch'
    },

    // สินค้าที่เกี่ยวข้อง (เลือกจากประวัติการซื้อของลูกค้า)
    relatedProduct: {
      productId: {
        type: String
      },
      productName: {
        type: String
      },
      originalPrice: {
        type: Number
      },
      purchaseDate: {
        type: Date
      }
    }
  },
  {
    collection: 'tb_sales_debit_notes',
    timestamps: true
  }
);

// Index สำหรับการค้นหา
salesDebitNoteSchema.index({ debitNoteNumber: 1 });
salesDebitNoteSchema.index({ customer: 1 });
salesDebitNoteSchema.index({ status: 1 });
salesDebitNoteSchema.index({ issueDate: -1 });
salesDebitNoteSchema.index({ createdBy: 1 });

// Virtual สำหรับยอดคงเหลือ (ในกรณีที่มีการจ่ายบางส่วน)
salesDebitNoteSchema.virtual('remainingAmount').get(function() {
  return this.totalAmount; // สำหรับตอนนี้ให้เท่ากับยอดรวม
});

// Method สำหรับอนุมัติ
salesDebitNoteSchema.methods.approve = function(userId) {
  this.status = 'approved';
  this.approvedBy = userId;
  this.approvedAt = new Date();
  return this.save();
};

// Method สำหรับปฏิเสธ
salesDebitNoteSchema.methods.reject = function(userId, reason) {
  this.status = 'rejected';
  this.rejectedBy = userId;
  this.rejectedAt = new Date();
  this.rejectionReason = reason;
  return this.save();
};

// Method สำหรับยกเลิก
salesDebitNoteSchema.methods.cancel = function() {
  this.status = 'cancelled';
  return this.save();
};

salesDebitNoteSchema.set('toObject', { virtuals: true });
salesDebitNoteSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('SalesDebitNote', salesDebitNoteSchema);
