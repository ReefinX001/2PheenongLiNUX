/**
 * DepositReceipt.js - โมเดลสำหรับใบรับเงินมัดจำ
 * จัดการข้อมูลการมัดจำสินค้าทั้งแบบ Pre-order และ Online
 */

const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const { Schema } = mongoose;

const depositReceiptSchema = new Schema({
  // ข้อมูลพื้นฐานของใบรับเงินมัดจำ
  receiptNumber: {
    type: String,
    required: true,
    unique: true
  },

  // วันที่และเวลา
  depositDate: {
    type: Date,
    required: true,
    default: Date.now
  },

  depositTime: {
    type: String,
    required: true
  },

  // ประเภทการมัดจำ
  depositType: {
    type: String,
    enum: ['preorder', 'online'],
    required: true,
    default: 'online'
  },

  // ประเภทการขาย
  saleType: {
    type: String,
    enum: ['cash', 'installment'],
    required: true,
    default: 'cash'
  },

  // ข้อมูลลูกค้า
  customer: {
    _id: {
      type: Schema.Types.ObjectId,
      ref: 'Customer'
    },
    customerType: {
      type: String,
      enum: ['individual', 'corporate'],
      default: 'individual'
    },
    name: String,
    firstName: String,
    lastName: String,
    prefix: String,
    phone: String,
    email: String,
    taxId: String,
    age: Number,
    birthDate: Date,
    address: {
      houseNo: String,
      village: String,
      lane: String,
      road: String,
      subDistrict: String,
      district: String,
      province: String,
      zipcode: String,
      fullAddress: String
    },
    // สำหรับลูกค้านิติบุคคล
    companyName: String,
    companyTaxId: String,
    contactPerson: String,
    corporatePhone: String,
    companyAddress: String
  },

  // ข้อมูลสินค้า
  product: {
    _id: {
      type: Schema.Types.ObjectId,
      ref: 'Product'
    },
    name: {
      type: String,
      required: true
    },
    brand: String,
    model: String,
    category: String,
    price: {
      type: Number,
      required: true,
      min: 0
    },
    imei: String,
    serialNumber: String,
    color: String,
    storage: String,
    condition: {
      type: String,
      enum: ['new', 'used', 'refurbished'],
      default: 'new'
    },
    inStock: {
      type: Boolean,
      default: false
    },
    stockLocation: String,
    image: String,
    specifications: {
      type: Map,
      of: String
    }
  },

  // จำนวนเงิน
  amounts: {
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    depositAmount: {
      type: Number,
      required: true,
      min: 0
    },
    remainingAmount: {
      type: Number,
      required: true,
      min: 0
    },
    // สำหรับการคำนวณภาษี
    subTotal: Number,
    vatAmount: Number,
    docFee: Number,
    discount: Number,
    grandTotal: Number
  },

  // ข้อมูลภาษี
  tax: {
    taxType: {
      type: String,
      enum: ['none', 'inclusive', 'exclusive'],
      default: 'exclusive',
      required: true
    },
    taxRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 7
    },
    taxAmount: {
      type: Number,
      min: 0,
      default: 0
    },
    includeTaxInvoice: {
      type: Boolean,
      default: true
    }
  },

  // วิธีการชำระเงิน
  paymentMethod: {
    type: String,
    enum: ['cash', 'transfer', 'credit_card', 'debit_card', 'qr_code', 'mixed'],
    default: 'cash'
  },

  // รายละเอียดการชำระเงิน (สำหรับการชำระแบบผสม)
  paymentDetails: {
    method: {
      type: String,
      enum: ['cash', 'transfer', 'credit_card', 'debit_card', 'qr_code', 'mixed']
    },
    // สำหรับการชำระแบบผสม
    cash: {
      type: Number,
      min: 0,
      default: 0
    },
    transfer: {
      type: Number,
      min: 0,
      default: 0
    },
    total: {
      type: Number,
      min: 0
    },
    // ข้อมูลเพิ่มเติมสำหรับการชำระแต่ละประเภท
    details: {
      type: Map,
      of: Schema.Types.Mixed
    }
  },

  // ข้อมูลการโอนเงิน (ถ้าชำระผ่านการโอน)
  transferInfo: {
    bankName: String,
    accountNumber: String,
    accountName: String,
    transferDate: Date,
    transferTime: String,
    referenceNumber: String,
    slipImage: String
  },

  // สถานะของใบรับเงินมัดจำ
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'stock_available', 'completed', 'cancelled', 'expired'],
    default: 'pending'
  },

  // ข้อมูลการติดตาม
  tracking: {
    stockChecked: {
      type: Boolean,
      default: false
    },
    stockCheckedAt: Date,
    stockCheckedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Employee'
    },
    notificationSent: {
      type: Boolean,
      default: false
    },
    notificationSentAt: Date,
    customerContacted: {
      type: Boolean,
      default: false
    },
    customerContactedAt: Date,
    customerContactedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Employee'
    }
  },

  // ข้อมูลพนักงานขาย
  salesperson: {
    _id: {
      type: Schema.Types.ObjectId,
      ref: 'Employee'
    },
    name: {
      type: String,
      required: true
    },
    employeeId: String,
    department: String
  },

  // ข้อมูลสาขา
  branch: {
    _id: {
      type: Schema.Types.ObjectId,
      ref: 'Branch'
    },
    name: {
      type: String,
      required: true
    },
    code: {
      type: String,
      required: true
    },
    address: String,
    phone: String,
    taxId: String
  },

  // ข้อมูลบริษัท
  company: {
    name: {
      type: String,
      default: 'บริษัท 2 พี่น้อง โมบาย จำกัด'
    },
    address: String,
    taxId: String,
    phone: String
  },

  // หมายเหตุ
  notes: String,
  internalNotes: String, // หมายเหตุภายใน (ไม่แสดงในเอกสาร)

  // ข้อมูลการยกเลิก
  cancellation: {
    cancelled: {
      type: Boolean,
      default: false
    },
    cancelledAt: Date,
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: 'Employee'
    },
    cancelReason: String,
    refundAmount: Number,
    refundMethod: String,
    refundDate: Date,
    creditNoteNumber: String // เลขที่ใบลดหนี้
  },

  // ข้อมูลการแปลงเป็นการขาย
  conversion: {
    converted: {
      type: Boolean,
      default: false
    },
    convertedAt: Date,
    convertedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Employee'
    },
    convertedTo: {
      type: String,
      enum: ['cash_sale', 'installment_sale']
    },
    saleOrderId: {
      type: Schema.Types.ObjectId,
      refPath: function() {
        return this.conversion.convertedTo === 'cash_sale' ? 'CashSale' : 'InstallmentOrder';
      }
    },
    invoiceNumber: String,
    receiptNumber: String
  },

  // เอกสารที่เกี่ยวข้อง
  relatedDocuments: {
    quotationId: {
      type: Schema.Types.ObjectId,
      ref: 'Quotation'
    },
    quotationNumber: String,
    receiptId: {
      type: Schema.Types.ObjectId,
      ref: 'Receipt'
    },
    receiptNumber: String,
    taxInvoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'TaxInvoice'
    },
    taxInvoiceNumber: String,
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice'
    },
    invoiceNumber: String,
    creditNoteId: {
      type: Schema.Types.ObjectId,
      ref: 'CreditNote'
    },
    creditNoteNumber: String,
    // รายการบัญชี
    journalEntryId: {
      type: Schema.Types.ObjectId,
      ref: 'JournalEntry'
    },
    reverseJournalEntryId: {
      type: Schema.Types.ObjectId,
      ref: 'JournalEntry'
    }
  },

  // ข้อมูลการพิมพ์และส่งเอกสาร
  printing: {
    printCount: {
      type: Number,
      default: 0
    },
    lastPrintedAt: Date,
    lastPrintedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Employee'
    },
    emailSent: {
      type: Boolean,
      default: false
    },
    emailSentAt: Date,
    emailSentTo: String
  },

  // การตั้งค่าการแจ้งเตือน
  notifications: {
    reminderSent: {
      type: Boolean,
      default: false
    },
    reminderSentAt: Date,
    expiryNotificationSent: {
      type: Boolean,
      default: false
    },
    expiryNotificationSentAt: Date,
    stockAvailableNotificationSent: {
      type: Boolean,
      default: false
    },
    stockAvailableNotificationSentAt: Date
  },

  // วันหมดอายุของการมัดจำ
  expiryDate: {
    type: Date,
    default: function() {
      // มัดจำหมดอายุใน 30 วัน
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
  },

  // ลายเซ็นอิเล็กทรอนิกส์
  signatures: {
    customerSignature: {
      data: String, // Base64 encoded image data
      signedAt: Date,
      signedBy: String, // ชื่อผู้เซ็น
      ipAddress: String
    },
    cashierSignature: {
      data: String, // Base64 encoded image data
      signedAt: Date,
      signedBy: String, // ชื่อผู้เซ็น
      employeeId: String,
      ipAddress: String
    }
  },

  // ลายนิ้วมือ (ZK9500 Fingerprint Scanner)
  fingerprints: {
    customerFingerprint: {
      template: String, // Base64 encoded fingerprint template
      imageUrl: String, // URL to fingerprint image file
      scannedAt: Date,
      scannedBy: {
        type: Schema.Types.ObjectId,
        ref: 'Employee'
      },
      scannedByName: String,
      quality: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'high'
      },
      deviceInfo: {
        deviceIP: String,
        deviceModel: {
          type: String,
          default: 'ZK9500'
        },
        sdkVersion: String
      },
      ipAddress: String,
      verified: {
        type: Boolean,
        default: true
      }
    },
    cashierFingerprint: {
      template: String, // Base64 encoded fingerprint template
      imageUrl: String, // URL to fingerprint image file
      scannedAt: Date,
      scannedBy: {
        type: Schema.Types.ObjectId,
        ref: 'Employee'
      },
      scannedByName: String,
      employeeId: String,
      quality: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'high'
      },
      deviceInfo: {
        deviceIP: String,
        deviceModel: {
          type: String,
          default: 'ZK9500'
        },
        sdkVersion: String
      },
      ipAddress: String,
      verified: {
        type: Boolean,
        default: true
      }
    }
  },

  // ข้อมูล Metadata
  metadata: {
    source: {
      type: String,
      enum: ['web', 'pos', 'mobile', 'api'],
      default: 'web'
    },
    ipAddress: String,
    userAgent: String,
    sessionId: String,
    version: {
      type: String,
      default: '1.0.0'
    }
  }
}, {
  timestamps: true, // createdAt, updatedAt
  versionKey: false,
  // Force UTF-8 encoding
  collection: 'depositreceipts',
  strict: true,
  // Set encoding options
  bufferCommands: false,
  autoCreate: true
});

// ดัชนีสำหรับการค้นหาที่มีประสิทธิภาพ
depositReceiptSchema.index({ receiptNumber: 1 });
depositReceiptSchema.index({ 'customer.phone': 1 });
depositReceiptSchema.index({ 'customer.taxId': 1 });
depositReceiptSchema.index({ 'product.name': 1 });
depositReceiptSchema.index({ status: 1 });
depositReceiptSchema.index({ depositDate: -1 });
depositReceiptSchema.index({ 'branch.code': 1 });
depositReceiptSchema.index({ 'salesperson._id': 1 });
depositReceiptSchema.index({ createdAt: -1 });

// Virtual สำหรับคำนวณข้อมูลที่ไม่ต้องเก็บในฐานข้อมูล
depositReceiptSchema.virtual('isExpired').get(function() {
  return new Date() > this.expiryDate;
});

depositReceiptSchema.virtual('daysUntilExpiry').get(function() {
  const now = new Date();
  const expiry = this.expiryDate;
  const diffTime = expiry - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

depositReceiptSchema.virtual('customerFullName').get(function() {
  if (this.customer.customerType === 'corporate') {
    return this.customer.companyName;
  }

  const parts = [
    this.customer.prefix,
    this.customer.firstName || this.customer.name,
    this.customer.lastName
  ].filter(part => part && part.trim());

  return parts.join(' ').trim() || 'ไม่ระบุ';
});

// Pre-save middleware
depositReceiptSchema.pre('save', function(next) {
  // คำนวณยอดเงินคงเหลือ
  if (this.amounts && this.amounts.totalAmount && this.amounts.depositAmount) {
    this.amounts.remainingAmount = this.amounts.totalAmount - this.amounts.depositAmount;
  }

  // ตั้งค่า grandTotal
  if (this.amounts && this.amounts.subTotal !== undefined) {
    const subTotal = this.amounts.subTotal || 0;
    const vatAmount = this.amounts.vatAmount || 0;
    const docFee = this.amounts.docFee || 0;
    const discount = this.amounts.discount || 0;

    this.amounts.grandTotal = subTotal + vatAmount + docFee - discount;
  }

  next();
});

// Static methods
depositReceiptSchema.statics.generateReceiptNumber = async function(branchCode = '00000') {
  const now = new Date();
  const thaiYear = (now.getFullYear() + 543).toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  // หาเลขที่ล่าสุดในวันนี้
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const lastReceipt = await this.findOne({
    receiptNumber: { $regex: `^DR-${thaiYear}${month}${day}` },
    depositDate: { $gte: startOfDay, $lt: endOfDay }
  }).sort({ receiptNumber: -1 });

  let sequence = 1;
  if (lastReceipt) {
    const lastSequence = parseInt(lastReceipt.receiptNumber.slice(-3));
    sequence = lastSequence + 1;
  }

  const sequenceStr = String(sequence).padStart(3, '0');
  return `DR-${thaiYear}${month}${day}${sequenceStr}`;
};

depositReceiptSchema.statics.findByReceiptNumber = function(receiptNumber) {
  return this.findOne({ receiptNumber });
};

depositReceiptSchema.statics.findByCustomerPhone = function(phone) {
  return this.find({ 'customer.phone': phone }).sort({ createdAt: -1 });
};

depositReceiptSchema.statics.findByBranch = function(branchCode) {
  return this.find({ 'branch.code': branchCode }).sort({ createdAt: -1 });
};

depositReceiptSchema.statics.findExpired = function() {
  return this.find({
    expiryDate: { $lt: new Date() },
    status: { $nin: ['completed', 'cancelled'] }
  });
};

depositReceiptSchema.statics.findExpiringSoon = function(days = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  return this.find({
    expiryDate: { $lte: futureDate, $gte: new Date() },
    status: { $nin: ['completed', 'cancelled'] }
  });
};

// Instance methods
depositReceiptSchema.methods.markAsCompleted = function(convertedData = {}) {
  this.status = 'completed';
  this.conversion.converted = true;
  this.conversion.convertedAt = new Date();

  if (convertedData.convertedBy) {
    this.conversion.convertedBy = convertedData.convertedBy;
  }
  if (convertedData.convertedTo) {
    this.conversion.convertedTo = convertedData.convertedTo;
  }
  if (convertedData.saleOrderId) {
    this.conversion.saleOrderId = convertedData.saleOrderId;
  }

  return this.save();
};

depositReceiptSchema.methods.markAsCancelled = function(cancelData = {}) {
  this.status = 'cancelled';
  this.cancellation.cancelled = true;
  this.cancellation.cancelledAt = new Date();

  if (cancelData.cancelledBy) {
    this.cancellation.cancelledBy = cancelData.cancelledBy;
  }
  if (cancelData.cancelReason) {
    this.cancellation.cancelReason = cancelData.cancelReason;
  }
  if (cancelData.refundAmount) {
    this.cancellation.refundAmount = cancelData.refundAmount;
  }

  return this.save();
};

depositReceiptSchema.methods.updateStockStatus = function(inStock, checkedBy = null) {
  this.product.inStock = inStock;
  this.tracking.stockChecked = true;
  this.tracking.stockCheckedAt = new Date();

  if (checkedBy) {
    this.tracking.stockCheckedBy = checkedBy;
  }

  if (inStock) {
    this.status = 'stock_available';
  }

  return this.save();
};

// เพิ่ม pagination plugin
depositReceiptSchema.plugin(mongoosePaginate);

const DepositReceipt = mongoose.models.DepositReceipt || mongoose.model('DepositReceipt', depositReceiptSchema);

module.exports = DepositReceipt;