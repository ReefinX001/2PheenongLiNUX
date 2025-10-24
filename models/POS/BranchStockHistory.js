//Models/BranchStockHistory.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

// (1) Schema สำหรับแต่ละรายการสินค้าในเอกสารสต็อก
const itemSchema = new Schema({
  product_id:        { type: Schema.Types.ObjectId, ref: 'Product', default: null },
  productImageId:    { type: Schema.Types.ObjectId, ref: 'ProductImage', default: null },
  image:             { type: String, default: '' },
  poNumber:          { type: String, default: '' },
  documentNumber:    { type: String, default: '' },
  barcode:           { type: String, default: '' },

  imei:              { type: String, default: '' },
  category:          { type: String, default: '' },
  name:              { type: String, default: '' },
  brand:             { type: String, default: '' },
  status:            { type: String, default: 'active' },
  qty:               { type: Number, default: 1 },
  price:             { type: Number, default: 0 }, // ราคาขายตอน OUT / ราคาตั้งต้นตอน IN
  cost:              { type: Number, default: 0 },
  downAmount:        { type: Number, default: 0 },
  downInstallmentCount: { type: Number, default: 0 },
  downInstallment:   { type: Number, default: 0 },
  creditThreshold:   { type: Number, default: 0 },
  payUseInstallmentCount: { type: Number, default: 0 },
  payUseInstallment: { type: Number, default: 0 },
  unit:              { type: String, default: '' },
  remainQty: {
    type: Number,
    default: 0,
    required: function () {
      // ใช้เฉพาะตอนเป็น "IN"
      return this.parent().change_type === 'IN';
    },
  },
});

// (2) Schema สำหรับประวัติการเปลี่ยนสถานะ (optional)
const historySchema = new Schema({
  oldStatus:  { type: String, default: '' },
  newStatus:  { type: String, default: '' },
  changedBy:  { type: Schema.Types.ObjectId, ref: 'User' },
  changedAt:  { type: Date, default: Date.now },
  note:       { type: String, default: '' },
});

// (3) BranchStockHistory Schema หลัก
const branchStockHistorySchema = new Schema(
  {
    // ========== ฟิลด์หลักของประวัติสต็อก ==========

    branch_code: {
      type: String,
      required: true,
    },
    change_type: {
      type: String,
      enum: ['IN', 'OUT', 'UPDATE_IMEI', 'IN_PENDING'],
      required: true,
    },
    reason:          { type: String, default: '' },
    performed_at:    { type: Date, default: Date.now },
    performed_by:    { type: Schema.Types.ObjectId, ref: 'User' },
    scanned_by:      { type: Schema.Types.ObjectId, ref: 'User', default: null },
    verified_by:     { type: Schema.Types.ObjectId, ref: 'User', default: null },
    invoiceNumber:   { type: String, default: '' },
    seller:          { type: Schema.Types.ObjectId, ref: 'User', default: null },
    customer:        { type: Schema.Types.ObjectId, ref: 'User', default: null },
    order_id: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
      // หากเป็น OUT ต้องมี order_id
      required: function () {
        return this.change_type === 'OUT';
      },
    },
    invoice_no:       { type: String, default: '' },
    installment_id:   { type: Schema.Types.ObjectId, ref: 'InstallmentOrder', default: null },
    contract_no:      { type: String, default: '' },

    // รายการสินค้าในเอกสารสต็อก (IN, OUT, UPDATE)
    items: [itemSchema],

    // สรุปรวมจำนวนและมูลค่าสินค้า
    quantity:   { type: Number, default: 0 },
    stock_value:{ type: Number, default: 0 },
    sale_date:  { type: Date, default: null },
    staff_name: { type: String, default: '' },
    sub_total:  { type: Number, default: 0 },
    vat_amount: { type: Number, default: 0 },
    discount:   { type: Number, default: 0 },
    total_amount:{ type: Number, default: 0 },
    net_amount: { type: Number, default: 0 },

    // ========== ข้อมูลลูกค้าแบบใหม่ (แยกบุคคล / นิติฯ) ==========
    customerType: {
      type: String,
      enum: ['individual', 'corporate'],
      default: 'individual',
    },

    // กรณีบุคคลธรรมดา
    customerInfo: {
      prefix: { type: String, default: '' },
      firstName: { type: String, default: '' },
      lastName:  { type: String, default: '' },
      phone:     { type: String, default: '' },
      taxId:     { type: String, default: '' },
      birthDate: {
        type: Date,
        default: null,
        validate: {
          validator: function(v) {
            if (!v) return true; // Allow null/undefined
            const today = new Date();
            const minDate = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate());
            return v >= minDate && v <= today;
          },
          message: 'Birth date must be valid and not in the future'
        }
      },
      age: {
        type: Number,
        min: 0,
        max: 150,
        default: null,
        validate: {
          validator: function(v) {
            return v == null || (Number.isInteger(v) && v >= 0 && v <= 150);
          },
          message: 'Age must be a valid number between 0 and 150'
        }
      },
      address: {
        houseNo:     { type: String, default: '' },
        moo:         { type: String, default: '' },
        subDistrict: { type: String, default: '' },
        district:    { type: String, default: '' },
        province:    { type: String, default: '' },
        zipcode:     { type: String, default: '' },
      },
    },

    // กรณีนิติบุคคล
    corporateInfo: {
      companyName:     { type: String, default: '' },
      companyTaxId:    { type: String, default: '' },
      contactPerson:   { type: String, default: '' },
      corporatePhone:  { type: String, default: '' },
      companyAddress:  { type: String, default: '' },
    },

    // ซัพพลายเออร์ (กรณีเป็นการรับ IN มาจาก Supplier)
    supplier: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      default: null,
      required: false,
    },

    // สำหรับอ้างอิง CategoryGroup เพื่อจัดหมวด (ถ้ามี)
    categoryGroup: {
      type: Schema.Types.ObjectId,
      ref: 'CategoryGroup',
      default: null,
      validate: {
        validator: function (v) {
          return v === null || mongoose.Types.ObjectId.isValid(v);
        },
        message: props => `${props.value} is not a valid ObjectId for categoryGroup.`,
      },
    },

    // ประเภทภาษี (ไม่มีภาษี, แยกภาษี, รวมภาษี)
    taxType: {
      type: String,
      enum: ['ไม่มีภาษี', 'แยกภาษี', 'รวมภาษี'],
      default: 'แยกภาษี',
    },

    // ========== NEW: ประเภทการรับเงิน 5 ประเภท ==========
    transactionType: {
      type: String,
      enum: ['sale', 'credit_sale', 'debt_payment', 'deposit', 'return'],
      required: function() {
        // Required only for OUT transactions
        return this.change_type === 'OUT';
      }
    },

    // ========== NEW: ข้อมูลการชำระเงิน ==========
    paymentInfo: {
      method: {
        type: String,
        enum: ['cash', 'transfer', 'cheque', 'credit_card', 'none'],
        default: 'cash'
      },
      bankAccount: {
        type: String,
        default: '' // บัญชีธนาคารที่รับเงิน
      },
      originalInvoice: {
        type: String,
        default: '' // เลขที่ใบเสร็จเดิม (สำหรับรับคืน)
      },
      debtInvoices: [{
        type: String // รายการใบแจ้งหนี้ที่ชำระ
      }],
      depositAmount: {
        type: Number,
        default: 0 // จำนวนเงินมัดจำ
      },
      received: {
        type: Boolean,
        default: true // false = ขายเชื่อ
      },
      referenceDoc: {
        type: String,
        default: '' // เลขที่เอกสารอ้างอิง
      },
      chequeNumber: {
        type: String,
        default: '' // เลขที่เช็ค
      },
      chequeDate: {
        type: Date,
        default: null // วันที่เช็ค
      }
    },

    // ========== NEW: ข้อมูลใบสำคัญรับเงิน ==========
    hasReceiptVoucher: {
      type: Boolean,
      default: false
    },
    receiptVoucherId: {
      type: Schema.Types.ObjectId,
      ref: 'ReceiptVoucher',
      default: null
    },
    receiptVoucherCreatedAt: {
      type: Date,
      default: null
    },

    // ========== NEW: ข้อมูลบัญชี (สำหรับการ mapping) ==========
    accountingInfo: {
      debitAccount: {
        code: { type: String, default: '' },
        name: { type: String, default: '' }
      },
      creditAccount: {
        code: { type: String, default: '' },
        name: { type: String, default: '' }
      }
    }

  },
  { timestamps: true }
);

// ========== Hook เพื่อเคลียร์ข้อมูลอีกฟากตาม customerType ==========
branchStockHistorySchema.pre('save', function(next) {
  if (this.customerType === 'individual') {
    // ถ้าเป็นบุคคลธรรมดา -> ล้างข้อมูล corporate
    this.corporateInfo = undefined;
  } else {
    // ถ้าเป็นนิติบุคคล -> ล้างข้อมูล individual
    this.customerInfo = undefined;
  }
  next();
});

// ========== NEW: Hook สำหรับ Auto-Detection และ Account Mapping ==========
branchStockHistorySchema.pre('save', async function(next) {
  // Auto-detect transaction type based on conditions
  if (this.change_type === 'OUT' && !this.transactionType) {
    // Logic สำหรับ auto-detect
    if (this.paymentInfo && this.paymentInfo.originalInvoice) {
      this.transactionType = 'return'; // รับคืนสินค้า
    } else if (this.paymentInfo && this.paymentInfo.debtInvoices && this.paymentInfo.debtInvoices.length > 0) {
      this.transactionType = 'debt_payment'; // รับชำระหนี้
    } else if (this.paymentInfo && this.paymentInfo.received === false) {
      this.transactionType = 'credit_sale'; // ขายเชื่อ
    } else if (this.reason && this.reason.toLowerCase().includes('มัดจำ')) {
      this.transactionType = 'deposit'; // รับเงินมัดจำ
    } else {
      this.transactionType = 'sale'; // ขายสินค้า (default)
    }
  }

  // Account mapping based on transaction type
  if (this.change_type === 'OUT' && this.transactionType) {
    const accountMapping = {
      'sale': {
        debit: { code: '11101', name: 'เงินสด' }, // หรือ 11103 เงินฝากธนาคาร
        credit: { code: '44101', name: 'รายได้จากการขาย' }
      },
      'credit_sale': {
        debit: { code: '11301', name: 'ลูกหนี้การค้า' },
        credit: { code: '44101', name: 'รายได้จากการขาย' }
      },
      'debt_payment': {
        debit: { code: '11101', name: 'เงินสด' }, // หรือ 11103 เงินฝากธนาคาร
        credit: { code: '11301', name: 'ลูกหนี้การค้า' }
      },
      'deposit': {
        debit: { code: '11101', name: 'เงินสด' }, // หรือ 11103 เงินฝากธนาคาร
        credit: { code: '21104', name: 'เงินรับล่วงหน้า – เงินมัดจำ' }
      },
      'return': {
        debit: { code: '44103', name: 'รับคืนสินค้า' },
        credit: { code: '11101', name: 'เงินสด' } // หรือ 11103 เงินฝากธนาคาร
      }
    };

    // Set accounting info
    if (accountMapping[this.transactionType]) {
      this.accountingInfo = accountMapping[this.transactionType];

      // Adjust debit account based on payment method
      if (this.paymentInfo && this.paymentInfo.method === 'transfer' &&
          (this.transactionType === 'sale' || this.transactionType === 'debt_payment' || this.transactionType === 'deposit')) {
        this.accountingInfo.debit = { code: '11103', name: 'เงินฝากธนาคาร' };
      }
    }
  }

  next();
});

// ========== Pre-find hook เดิมสำหรับ populate categoryGroup ==========
branchStockHistorySchema.pre(/^find/, function (next) {
  this.populate({
    path: 'categoryGroup',
    select: 'name unitName',
  });
  next();
});

// ========== NEW: Method สำหรับ generate receipt number ==========
branchStockHistorySchema.methods.generateReceiptNumber = function() {
  const typePrefix = {
    'sale': 'REC',
    'credit_sale': 'INV',
    'debt_payment': 'PAY',
    'deposit': 'DEP',
    'return': 'RTN'
  };

  const prefix = typePrefix[this.transactionType] || 'REC';
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');

  // Format: PREFIX-YYYY-MM-XXXXX
  return `${prefix}-${year}-${month}-${String(this._id).slice(-5).toUpperCase()}`;
};

module.exports = mongoose.models.BranchStockHistory || mongoose.model('BranchStockHistory', branchStockHistorySchema);
