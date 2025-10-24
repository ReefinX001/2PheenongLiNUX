/**
 * models/SalesCreditNote.js - Model สำหรับใบลดหนี้การขาย (ลูกค้า)
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const salesCreditNoteSchema = new Schema(
  {
    // เลขที่ใบลดหนี้
    creditNoteNumber: {
      type: String,
      required: true,
      unique: true
    },

    // วันที่ออกใบลดหนี้
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

    // เหตุผลในการลดหนี้
    reason: {
      type: String,
      enum: [
        'RETURN_GOODS',          // คืนสินค้า
        'PRICE_REDUCTION',       // ลดราคา
        'DISCOUNT_ADJUSTMENT',   // ปรับส่วนลด
        'DELIVERY_ISSUE',        // ปัญหาการจัดส่ง
        'QUALITY_ISSUE',         // ปัญหาคุณภาพสินค้า
        'SERVICE_COMPENSATION',  // ชดเชยบริการ
        'ERROR_CORRECTION',      // แก้ไขข้อผิดพลาด
        'PROMOTIONAL_CREDIT',    // เครดิตส่งเสริมการขาย
        'GOODWILL_GESTURE',      // การแสดงความเข้าใจ
        'OTHER'                  // อื่นๆ
      ],
      required: true
    },

    // รายละเอียดเหตุผล
    reasonText: {
      type: String,
      required: true
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
    collection: 'tb_sales_credit_notes',
    timestamps: true
  }
);

// Index สำหรับการค้นหา
salesCreditNoteSchema.index({ creditNoteNumber: 1 });
salesCreditNoteSchema.index({ customer: 1 });
salesCreditNoteSchema.index({ status: 1 });
salesCreditNoteSchema.index({ issueDate: -1 });
salesCreditNoteSchema.index({ createdBy: 1 });

// Virtual สำหรับยอดคงเหลือ (ในกรณีที่มีการจ่ายบางส่วน)
salesCreditNoteSchema.virtual('remainingAmount').get(function() {
  return this.totalAmount; // สำหรับตอนนี้ให้เท่ากับยอดรวม
});

// Method สำหรับอนุมัติ
salesCreditNoteSchema.methods.approve = function(userId) {
  this.status = 'approved';
  this.approvedBy = userId;
  this.approvedAt = new Date();
  return this.save();
};

// Method สำหรับปฏิเสธ
salesCreditNoteSchema.methods.reject = function(userId, reason) {
  this.status = 'rejected';
  this.rejectedBy = userId;
  this.rejectedAt = new Date();
  this.rejectionReason = reason;
  return this.save();
};

// Method สำหรับยกเลิก
salesCreditNoteSchema.methods.cancel = function() {
  this.status = 'cancelled';
  return this.save();
};

salesCreditNoteSchema.set('toObject', { virtuals: true });
salesCreditNoteSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('SalesCreditNote', salesCreditNoteSchema);