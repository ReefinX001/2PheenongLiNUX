/**
 * models/Installment/InstallmentPayment.js - โมเดลการชำระค่างวดผ่อน
 */

const mongoose = require('mongoose');

const installmentPaymentSchema = new mongoose.Schema({
  // ข้อมูลการชำระ
  paymentId: {
    type: String,
    required: function() {
      return this.isNew; // Only required when creating new record
    },
    unique: true,
    index: true,
    default: function() {
      return `PAY${Date.now()}${Math.floor(Math.random() * 1000)}`;
    }
  },

  // ข้อมูลสัญญา
  contractId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InstallmentOrder',
    required: true,
    index: true
  },
  contractNumber: {
    type: String,
    required: false, // Made optional since we have contractId
    index: true
  },

  // ข้อมูลลูกค้า
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  customerName: String,
  customerPhone: String,

  // ข้อมูลงวด
  installmentNumber: {
    type: Number,
    required: false, // Made optional
    min: 1,
    default: 1
  },
  dueDate: {
    type: Date,
    required: false, // Made optional
    default: Date.now
  },

  // ข้อมูลการชำระ
  paymentDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  principalAmount: {
    type: Number,
    default: 0
  },
  interestAmount: {
    type: Number,
    default: 0
  },
  penaltyAmount: {
    type: Number,
    default: 0
  },

  // วิธีการชำระ
  paymentMethod: {
    type: String,
    required: true,
    enum: ['cash', 'transfer', 'card', 'mixed'], // เงินสด, โอน, บัตรเครดิต, ผสม
    default: 'cash'
  },

  // รายละเอียดการชำระเงินสด
  cashDetails: {
    cashAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    changeAmount: {
      type: Number,
      default: 0,
      min: 0
    }
  },

  // รายละเอียดการชำระแบบผสม
  mixedPayment: {
    cashAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    transferAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    cardAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    total: {
      type: Number,
      default: 0,
      min: 0
    },
    transferSlip: {
      fileName: String,
      filePath: String,
      uploadedAt: Date
    }
  },

  // รายละเอียดการโอนเงิน (สำหรับ transfer)
  transferDetails: {
    bankName: String,
    bankCode: String, // เพิ่ม bank code
    accountNumber: String,
    transferTime: Date,
    referenceNumber: String,
    slipImage: {
      fileName: String,
      filePath: String,
      originalName: String,
      fileSize: Number,
      uploadedAt: Date
    }
  },

  // สถานะการชำระ
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'paid', 'completed', 'failed'],
    default: 'confirmed'
  },

  // รายละเอียดเพิ่มเติม
  notes: String,
  receiptNumber: String,

  // ข้อมูลสาขา
  branchCode: {
    type: String,
    required: false, // Made optional
    index: true,
    default: '00000'
  },
  branchName: String,

  // ข้อมูลพนักงาน
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Made optional
  },
  recordedByName: String,

  // ข้อมูลระบบ
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },

  // สำหรับการยกเลิก
  cancelledAt: Date,
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancellationReason: String
});

// Indexes
installmentPaymentSchema.index({ contractId: 1, installmentNumber: 1 });
installmentPaymentSchema.index({ paymentDate: -1 });
installmentPaymentSchema.index({ branchCode: 1, paymentDate: -1 });
installmentPaymentSchema.index({ status: 1 });

// Pre-save middleware
installmentPaymentSchema.pre('save', function(next) {
  this.updatedAt = new Date();

  // สร้าง paymentId ถ้ายังไม่มี
  if (!this.paymentId) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomStr = Math.random().toString(36).substr(2, 6).toUpperCase();
    this.paymentId = `PAY-${dateStr}-${randomStr}`;
  }

  // Validate mixed payment
  if (this.paymentMethod === 'mixed') {
    const totalMixed = (this.mixedPayment.cashAmount || 0) +
                      (this.mixedPayment.transferAmount || 0) +
                      (this.mixedPayment.cardAmount || 0);
    if (Math.abs(totalMixed - this.amount) > 0.01) {
      return next(new Error('ยอดรวมการชำระแบบผสมไม่ตรงกับยอดที่ต้องชำระ'));
    }
    // Update total
    this.mixedPayment.total = totalMixed;
  }

  next();
});

// Static methods
installmentPaymentSchema.statics.generatePaymentId = function() {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `PAY-${dateStr}-${randomStr}`;
};

installmentPaymentSchema.statics.getPaymentHistory = function(contractId, options = {}) {
  const query = { contractId };

  if (options.status) {
    query.status = options.status;
  }

  return this.find(query)
    .populate('recordedBy', 'name email')
    .sort({ installmentNumber: 1, createdAt: -1 })
    .limit(options.limit || 50);
};

installmentPaymentSchema.statics.getPaymentsByDateRange = function(startDate, endDate, branchCode = null) {
  const query = {
    paymentDate: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    },
    status: 'confirmed'
  };

  if (branchCode) {
    query.branchCode = branchCode;
  }

  return this.find(query)
    .populate('contractId', 'contractNumber customerName')
    .populate('recordedBy', 'name')
    .sort({ paymentDate: -1 });
};

// Methods
installmentPaymentSchema.methods.cancel = function(userId, reason) {
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  this.cancelledBy = userId;
  this.cancellationReason = reason;
  return this.save();
};

installmentPaymentSchema.methods.toReceiptData = function() {
  return {
    paymentId: this.paymentId,
    receiptNumber: this.receiptNumber,
    paymentDate: this.paymentDate,
    customerName: this.customerName,
    contractNumber: this.contractNumber,
    installmentNumber: this.installmentNumber,
    amount: this.amount,
    paymentMethod: this.paymentMethod,
    mixedPayment: this.mixedPayment,
    branchName: this.branchName,
    recordedByName: this.recordedByName
  };
};

// Virtual for payment method display
installmentPaymentSchema.virtual('paymentMethodDisplay').get(function() {
  switch (this.paymentMethod) {
    case 'cash':
      const cashAmount = this.cashDetails?.cashAmount || this.amount;
      const changeAmount = this.cashDetails?.changeAmount || 0;
      return changeAmount > 0 ?
        `เงินสด (รับ: ${cashAmount?.toLocaleString()} บาท, ทอน: ${changeAmount?.toLocaleString()} บาท)` :
        `เงินสด (${cashAmount?.toLocaleString()} บาท)`;
    case 'transfer':
      const bankName = this.transferDetails?.bankName || 'ไม่ระบุธนาคาร';
      const refNumber = this.transferDetails?.referenceNumber || '';
      return `โอนเงิน - ${bankName}${refNumber ? ` (อ้างอิง: ${refNumber})` : ''}`;
    case 'mixed':
      const mixedCash = this.mixedPayment?.cashAmount || 0;
      const mixedTransfer = this.mixedPayment?.transferAmount || 0;
      const mixedCard = this.mixedPayment?.cardAmount || 0;
      let displayText = 'ผสม (';
      const parts = [];
      if (mixedCash > 0) parts.push(`เงินสด: ${mixedCash.toLocaleString()} บาท`);
      if (mixedTransfer > 0) parts.push(`โอน: ${mixedTransfer.toLocaleString()} บาท`);
      if (mixedCard > 0) parts.push(`บัตรเครดิต: ${mixedCard.toLocaleString()} บาท`);
      displayText += parts.join(', ') + ')';
      return displayText;
    default:
      return 'ไม่ระบุ';
  }
});

// Virtual for bank display
installmentPaymentSchema.virtual('bankDisplay').get(function() {
  const bankCodes = {
    'kbank': 'ธนาคารกสิกรไทย',
    'scb': 'ธนาคารไทยพาณิชย์',
    'bbl': 'ธนาคารกรุงเทพ',
    'ktb': 'ธนาคารกรุงไทย',
    'tmb': 'ธนาคารทหารไทยธนชาต',
    'bay': 'ธนาคารกรุงศรีอยุธยา',
    'gsb': 'ธนาคารออมสิน'
  };

  const bankCode = this.transferDetails?.bankCode || this.transferDetails?.bankName;
  return bankCodes[bankCode] || this.transferDetails?.bankName || 'ไม่ระบุธนาคาร';
});

module.exports = mongoose.model('InstallmentPayment', installmentPaymentSchema);