// File: models/InstallmentOrder.js
// Enhanced InstallmentOrder model with proper relationships and indexes

const mongoose = require('mongoose');
const { Schema } = mongoose;

// โครงสร้างการชำระเงิน (แต่ละงวดย่อย) สำหรับใบสัญญาผ่อน
const PaymentSchema = new Schema({
  payDate: { type: Date, default: Date.now },
  amount:  { type: Number, default: 0 },
  method:  { type: String, default: 'cash' },
  note:    { type: String, default: '' },
});

// โครงสร้างรายการสินค้าที่ผ่อน
const ItemSchema = new Schema({
  productId:              { type: Schema.Types.ObjectId, ref: 'Product', default: null },
  name:                   { type: String, default: '' },
  qty:                    { type: Number, default: 1 },
  imei:                   { type: String, default: '' },
  downAmount:             { type: Number, default: 0 },
  downInstallmentCount:   { type: Number, default: 0 },
  downInstallment:        { type: Number, default: 0 },
  creditThreshold:        { type: Number, default: 0 },
  payUseInstallmentCount: { type: Number, default: 0 },
  payUseInstallment:      { type: Number, default: 0 },
  pricePayOff:            { type: Number, default: 0 },

  // ✅ เพิ่มฟิลด์โปรโมชั่นสำหรับแต่ละ item
  promotion: {
    id: { type: String, default: null },
    name: { type: String, default: '' },
    type: { type: String, default: '' },
    discount: { type: Number, default: 0 }
  },
  itemDiscount: { type: Number, default: 0 }
});

const InstallmentOrderSchema = new Schema({
  contractNo:       { type: String, default: '' },
  planType:         { type: String, required: true, enum: ['plan1','plan2','plan3','manual'] },
  branch_code:      { type: String, default: '' },

  // ประเภทการผ่อน: 'pay-as-you-go' (ผ่อนไปใช้ไป) หรือ 'pay-in-full' (ผ่อนหมดรับของ)
  installmentType:  { type: String, enum: ['pay-as-you-go', 'pay-in-full'], default: 'pay-as-you-go' },

  // ✅ แก้ไข: เปลี่ยนจาก customer_id เป็น customer และ ref ไปยัง Customer
  customer: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',  // ← เปลี่ยนจาก 'InstallmentCustomer' เป็น 'Customer'
    required: false  // Made optional for easier testing and flexibility
  },

  // Salesperson info
  salesperson: {
    id:        { type: Schema.Types.ObjectId, ref: 'User', default: null },
    name:      { type: String, default: '' },
    signature: { type: String, default: '' },
  },

  // Customer info (เก็บ snapshot ณ เวลาที่สร้างใบสัญญา)
  customer_info: {
    prefix:    { type: String, default: '' },
    firstName: { type: String, default: '' },
    lastName:  { type: String, default: '' },
    phone:     { type: String, default: '' },
    email:     { type: String, default: '' },
    age:       { type: Number, min: 0, max: 150, default: null },
    taxId:     { type: String, default: '' },
    invoiceNo: { type: String, default: '' },
    // ข้อมูลอาชีพ - รองรับระบบใหม่
    occupation: {
      category: {
        type: String,
        enum: [
          'ข้าราชการ',
          'พนักงานรัฐวิสาหกิจ',
          'พนักงานบริษัท',
          'ธุรกิจส่วนตัว',
          'เกษตรกร',
          'รับจ้างทั่วไป',
          'อื่นๆ',
          '' // Allow empty for backward compatibility
        ],
        default: ''
      },
      subcategory: { type: String, default: '' },
      workplace: { type: String, default: '' },
      workAddress: { type: String, default: '' },
      position: { type: String, default: '' },
      workExperience: { type: Number, min: 0, default: 0 },
      monthlyIncome: { type: Number, min: 0, default: 0 },
      // สำหรับเก็บข้อมูลเดิม (backward compatibility)
      legacyOccupationText: { type: String, default: '' },
      // ข้อมูลเพิ่มเติมสำหรับอาชีพ "อื่นๆ"
      otherOccupationDetail: { type: String, default: '' }
    },
    // ข้อมูลรายได้เดิม (เก็บไว้เพื่อ backward compatibility)
    income: { type: Number, min: 0, default: 0 },
    address: {
      houseNo:     { type: String, default: '' },
      moo:         { type: String, default: '' },
      subDistrict: { type: String, default: '' },
      district:    { type: String, default: '' },
      province:    { type: String, default: '' },
      zipcode:     { type: String, default: '' },
    },
    // ที่อยู่ที่สามารถติดต่อได้
    contactAddress: {
      useSameAddress: { type: Boolean, default: false },
      houseNo:        { type: String, default: '' },
      moo:            { type: String, default: '' },
      lane:           { type: String, default: '' },
      road:           { type: String, default: '' },
      subDistrict:    { type: String, default: '' },
      district:       { type: String, default: '' },
      province:       { type: String, default: '' },
      zipcode:        { type: String, default: '' },
    },
  },

  items: [ ItemSchema ],

  // แผนการผ่อน
  downPayment:      { type: Number, default: 0 },
  monthlyPayment:   { type: Number, default: 0 },
  installmentCount: { type: Number, default: 1 },

  // สรุปรายการทางการเงิน
  subTotal:    { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  totalText:   { type: String, default: '' },
  creditTerm:  { type: String, default: '' },
  quotationTerms: { type: String, default: '' },

  // ✅ เพิ่มฟิลด์โปรโมชั่น
  promotionDiscount: { type: Number, default: 0 },
  appliedPromotions: [{
    id: { type: String },
    name: { type: String },
    type: {
      type: String,
      enum: ['percentage', 'fixed', 'special_price', 'buy_x_get_y']
    },
    discount: { type: Number }
  }],
  finalTotalAmount: { type: Number, default: 0 },

  // ชำระเงิน
  paidAmount: { type: Number, default: 0 },
  payments:   [ PaymentSchema ],
  dueDate:    { type: Date, default: null },

  // สถานะ
  status: {
    type: String,
    enum: ['pending', 'approved', 'active', 'ongoing', 'completed', 'cancelled', 'rejected'],
    default: 'ongoing'
  },
  completedDate: { type: Date, default: null },

  // ฟิลด์สำหรับติดตามการตัดสต๊อก
  isStockCommitted: {
    type: Boolean,
    default: false
  },

  // ✅ เพิ่มฟิลด์สำหรับเอกสารแนบ
  idCardImageUrl: { type: String, default: '' },
  salarySlipUrl: { type: String, default: '' },
  selfieUrl: { type: String, default: '' },

  // 🔧 ฟิลด์ลายเซ็นสำหรับ PDF generation
  customerSignature: { type: String, default: '' },
  customerSignatureUrl: { type: String, default: '' },
  salespersonSignature: { type: String, default: '' },
  salespersonSignatureUrl: { type: String, default: '' },
  employeeSignature: { type: String, default: '' },
  authorizedSignature: { type: String, default: '' },
  authorizedSignatureUrl: { type: String, default: '' },

  // ✅ เพิ่มข้อมูลพยาน
  witness: {
    name: { type: String, default: '' },
    idCard: { type: String, default: '' },
    phone: { type: String, default: '' },
    relation: { type: String, default: '' },
    // เพิ่มฟิลด์สำหรับรูปพยาน
    idCardImageUrl: { type: String, default: '' },
    selfieUrl: { type: String, default: '' }
  },

  // ✅ เพิ่มฟิลด์สำหรับตัดสต็อก
  isStockCommitted: { type: Boolean, default: false },
  stockCommittedAt: { type: Date, default: null },

  // ✅ เพิ่มฟิลด์สำหรับบริการหลังการขาย
  purchaseType: {
    type: String,
    enum: ['cash', 'installment'],
    default: 'installment'
  },
  hasWarranty: { type: Boolean, default: true },
  warrantyStartDate: { type: Date, default: null },
  warrantyEndDate: { type: Date, default: null },
  eligibleServices: [{ type: String }],
  serviceUsageCount: {
    type: Map,
    of: Number,
    default: {}
  },

  // ✅ เพิ่ม staffName
  staffName: { type: String, default: '' },

  // 🔥 BAD DEBT INTEGRATION FIELDS
  debtTrackingInfo: {
    isTrackedForBadDebt: { type: Boolean, default: false },
    trackedSince: { type: Date, default: null },
    initialRiskLevel: { type: String, default: '' },
    currentRiskLevel: { type: String, default: '' },
    lastRiskAssessment: { type: Date, default: null },
    badDebtStatus: {
      type: String,
      enum: ['normal', 'watch', 'follow_up', 'doubtful', 'bad_debt', 'write_off'],
      default: 'normal'
    },
    allowanceAmount: { type: Number, default: 0 },
    debtRecord: { type: Schema.Types.Mixed, default: null }, // Embedded debt record
    badDebtHistory: [{
      date: { type: Date, default: Date.now },
      action: { type: String }, // 'status_change', 'risk_update', 'allowance_set', etc.
      fromStatus: { type: String },
      toStatus: { type: String },
      notes: { type: String },
      updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
    }]
  },

  // Debt aging calculations
  agingInfo: {
    daysPastDue: { type: Number, default: 0 },
    lastCalculated: { type: Date, default: null },
    agingCategory: {
      type: String,
      enum: ['current', '1-30', '31-60', '61-90', '91-180', '180+'],
      default: 'current'
    }
  },

  // Collection activities tracking
  collectionActivities: [{
    date: { type: Date, default: Date.now },
    type: {
      type: String,
      enum: ['call', 'letter', 'email', 'sms', 'visit', 'legal', 'other'],
      required: true
    },
    description: { type: String, required: true },
    outcome: {
      type: String,
      enum: ['contacted', 'no_answer', 'promised_payment', 'dispute', 'unable_to_pay', 'other']
    },
    nextAction: { type: String },
    nextActionDate: { type: Date },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String }
  }],

  // Soft delete
  deleted_at: { type: Date, default: null },
  deleted_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },

  // Timestamps
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }
}, {
  timestamps: true,  // ← ใช้ timestamps แทนการจัดการ createdAt/updatedAt เอง
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Remove old indexes that are duplicated below

// ก่อนบันทึก: คำนวณยอด
InstallmentOrderSchema.pre('save', function(next) {
  // คำนวณ subTotal (รวม downAmount + ทุกงวด)
  this.subTotal = this.items.reduce((sum, it) => {
    return sum + (it.downAmount || 0)
               + ((it.payUseInstallmentCount || 0) * (it.payUseInstallment || 0));
  }, 0);

  // totalAmount = subTotal
  this.totalAmount = this.subTotal;

  // ✅ คำนวณยอดสุทธิหลังหักโปรโมชั่น
  this.finalTotalAmount = this.totalAmount - (this.promotionDiscount || 0);

  // Set warranty dates if hasWarranty
  if (this.hasWarranty && !this.warrantyStartDate) {
    this.warrantyStartDate = new Date();
    this.warrantyEndDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
  }

  next();
});

// Virtual Relations
InstallmentOrderSchema.virtual('installmentPayments', {
  ref: 'InstallmentPayment',
  localField: '_id',
  foreignField: 'installmentOrder',
});

InstallmentOrderSchema.virtual('customerDetails', {
  ref: 'Customer',
  localField: 'customer',
  foreignField: '_id',
  justOne: true
});

// Virtual fields เพื่อใช้ใน frontend
InstallmentOrderSchema.virtual('productName').get(function() {
  return this.items[0]?.name || '';
});

InstallmentOrderSchema.virtual('totalPrice').get(function() {
  return this.finalTotalAmount || this.totalAmount;
});

InstallmentOrderSchema.virtual('term').get(function() {
  return this.installmentCount;
});

InstallmentOrderSchema.virtual('amountPerInstallment').get(function() {
  return this.monthlyPayment;
});

InstallmentOrderSchema.virtual('remainingAmount').get(function() {
  // คำนวณยอดคงเหลือจากยอดผ่อน (ไม่รวมเงินดาวน์)
  const financeAmount = (this.monthlyPayment || 0) * (this.installmentCount || 0);
  const remainingFinance = financeAmount - (this.paidAmount || 0);
  return Math.max(0, remainingFinance); // ป้องกันค่าติดลบ
});

InstallmentOrderSchema.virtual('paymentStatus').get(function() {
  const totalDue = this.finalTotalAmount || this.totalAmount;
  if (this.paidAmount >= totalDue) return 'ชำระครบ';
  if (this.paidAmount > 0) return 'ชำระบางส่วน';
  return 'ค้างชำระ';
});

InstallmentOrderSchema.virtual('nextDueDateFormatted').get(function() {
  return this.dueDate;
});

InstallmentOrderSchema.virtual('displayCustomerName').get(function() {
  if (this.customer_info) {
    const { prefix, firstName, lastName } = this.customer_info;
    return `${prefix || ''} ${firstName || ''} ${lastName || ''}`.trim();
  }
  return 'ไม่ระบุชื่อ';
});

// Methods
InstallmentOrderSchema.methods.softDelete = function(userId) {
  this.deleted_at = new Date();
  this.deleted_by = userId;
  return this.save();
};

InstallmentOrderSchema.methods.restore = function() {
  this.deleted_at = null;
  this.deleted_by = null;
  return this.save();
};

// Static Methods
InstallmentOrderSchema.statics.findByCustomer = function(customerId) {
  return this.find({
    customer: customerId,  // ← ใช้ customer แทน customer_id
    deleted_at: null
  }).sort({ createdAt: -1 });
};

InstallmentOrderSchema.statics.findActiveContracts = function() {
  return this.find({
    status: { $in: ['approved', 'active', 'ongoing'] },
    deleted_at: null
  });
};

// ============================================
// VIRTUAL FIELDS FOR SNAKE_CASE COMPATIBILITY
// ============================================

// Virtual fields to support both camelCase and snake_case naming conventions
InstallmentOrderSchema.virtual('contract_no').get(function() {
  return this.contractNo;
});

InstallmentOrderSchema.virtual('contract_no').set(function(value) {
  this.contractNo = value;
});

InstallmentOrderSchema.virtual('plan_type').get(function() {
  return this.planType;
});

InstallmentOrderSchema.virtual('plan_type').set(function(value) {
  this.planType = value;
});

InstallmentOrderSchema.virtual('installment_type').get(function() {
  return this.installmentType;
});

InstallmentOrderSchema.virtual('installment_type').set(function(value) {
  this.installmentType = value;
});

InstallmentOrderSchema.virtual('total_amount').get(function() {
  return this.totalAmount;
});

InstallmentOrderSchema.virtual('total_amount').set(function(value) {
  this.totalAmount = value;
});

InstallmentOrderSchema.virtual('paid_amount').get(function() {
  return this.paidAmount;
});

InstallmentOrderSchema.virtual('paid_amount').set(function(value) {
  this.paidAmount = value;
});

InstallmentOrderSchema.virtual('down_payment').get(function() {
  return this.downPayment;
});

InstallmentOrderSchema.virtual('down_payment').set(function(value) {
  this.downPayment = value;
});

InstallmentOrderSchema.virtual('monthly_payment').get(function() {
  return this.monthlyPayment;
});

InstallmentOrderSchema.virtual('monthly_payment').set(function(value) {
  this.monthlyPayment = value;
});

InstallmentOrderSchema.virtual('installment_count').get(function() {
  return this.installmentCount;
});

InstallmentOrderSchema.virtual('installment_count').set(function(value) {
  this.installmentCount = value;
});

InstallmentOrderSchema.virtual('sub_total').get(function() {
  return this.subTotal;
});

InstallmentOrderSchema.virtual('sub_total').set(function(value) {
  this.subTotal = value;
});

InstallmentOrderSchema.virtual('final_total_amount').get(function() {
  return this.finalTotalAmount;
});

InstallmentOrderSchema.virtual('final_total_amount').set(function(value) {
  this.finalTotalAmount = value;
});

InstallmentOrderSchema.virtual('promotion_discount').get(function() {
  return this.promotionDiscount;
});

InstallmentOrderSchema.virtual('promotion_discount').set(function(value) {
  this.promotionDiscount = value;
});

InstallmentOrderSchema.virtual('applied_promotions').get(function() {
  return this.appliedPromotions;
});

InstallmentOrderSchema.virtual('applied_promotions').set(function(value) {
  this.appliedPromotions = value;
});

InstallmentOrderSchema.virtual('due_date').get(function() {
  return this.dueDate;
});

InstallmentOrderSchema.virtual('due_date').set(function(value) {
  this.dueDate = value;
});

InstallmentOrderSchema.virtual('completed_date').get(function() {
  return this.completedDate;
});

InstallmentOrderSchema.virtual('completed_date').set(function(value) {
  this.completedDate = value;
});

InstallmentOrderSchema.virtual('created_at').get(function() {
  return this.createdAt;
});

InstallmentOrderSchema.virtual('updated_at').get(function() {
  return this.updatedAt;
});

InstallmentOrderSchema.virtual('created_by').get(function() {
  return this.createdBy;
});

InstallmentOrderSchema.virtual('created_by').set(function(value) {
  this.createdBy = value;
});

InstallmentOrderSchema.virtual('updated_by').get(function() {
  return this.updatedBy;
});

InstallmentOrderSchema.virtual('updated_by').set(function(value) {
  this.updatedBy = value;
});

// ============================================
// METHODS FOR DATA FORMAT CONVERSION
// ============================================

// Method to return data in camelCase format
InstallmentOrderSchema.methods.toCamelCase = function() {
  const obj = this.toObject({ virtuals: false });

  // Convert field names to camelCase
  const camelCaseObj = {
    id: obj._id,
    contractNo: obj.contractNo,
    planType: obj.planType,
    branchCode: obj.branch_code,
    installmentType: obj.installmentType,
    customer: obj.customer,
    salesperson: obj.salesperson,
    customerInfo: obj.customer_info,
    items: obj.items,
    downPayment: obj.downPayment,
    monthlyPayment: obj.monthlyPayment,
    installmentCount: obj.installmentCount,
    subTotal: obj.subTotal,
    totalAmount: obj.totalAmount,
    totalText: obj.totalText,
    creditTerm: obj.creditTerm,
    quotationTerms: obj.quotationTerms,
    promotionDiscount: obj.promotionDiscount,
    appliedPromotions: obj.appliedPromotions,
    finalTotalAmount: obj.finalTotalAmount,
    paidAmount: obj.paidAmount,
    payments: obj.payments,
    dueDate: obj.dueDate,
    status: obj.status,
    completedDate: obj.completedDate,
    idCardImageUrl: obj.idCardImageUrl,
    salarySlipUrl: obj.salarySlipUrl,
    selfieUrl: obj.selfieUrl,
    customerSignature: obj.customerSignature,
    customerSignatureUrl: obj.customerSignatureUrl,
    salespersonSignature: obj.salespersonSignature,
    salespersonSignatureUrl: obj.salespersonSignatureUrl,
    employeeSignature: obj.employeeSignature,
    authorizedSignature: obj.authorizedSignature,
    authorizedSignatureUrl: obj.authorizedSignatureUrl,
    witness: obj.witness,
    isStockCommitted: obj.isStockCommitted,
    stockCommittedAt: obj.stockCommittedAt,
    purchaseType: obj.purchaseType,
    hasWarranty: obj.hasWarranty,
    warrantyStartDate: obj.warrantyStartDate,
    warrantyEndDate: obj.warrantyEndDate,
    eligibleServices: obj.eligibleServices,
    serviceUsageCount: obj.serviceUsageCount,
    staffName: obj.staffName,
    deletedAt: obj.deleted_at,
    deletedBy: obj.deleted_by,
    createdBy: obj.createdBy,
    updatedBy: obj.updatedBy,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt
  };

  return camelCaseObj;
};

// Method to return data in snake_case format
InstallmentOrderSchema.methods.toSnakeCase = function() {
  const obj = this.toObject({ virtuals: false });

  // Convert field names to snake_case
  const snakeCaseObj = {
    id: obj._id,
    contract_no: obj.contractNo,
    plan_type: obj.planType,
    branch_code: obj.branch_code,
    installment_type: obj.installmentType,
    customer: obj.customer,
    salesperson: obj.salesperson,
    customer_info: obj.customer_info,
    items: obj.items,
    down_payment: obj.downPayment,
    monthly_payment: obj.monthlyPayment,
    installment_count: obj.installmentCount,
    sub_total: obj.subTotal,
    total_amount: obj.totalAmount,
    total_text: obj.totalText,
    credit_term: obj.creditTerm,
    quotation_terms: obj.quotationTerms,
    promotion_discount: obj.promotionDiscount,
    applied_promotions: obj.appliedPromotions,
    final_total_amount: obj.finalTotalAmount,
    paid_amount: obj.paidAmount,
    payments: obj.payments,
    due_date: obj.dueDate,
    status: obj.status,
    completed_date: obj.completedDate,
    id_card_image_url: obj.idCardImageUrl,
    salary_slip_url: obj.salarySlipUrl,
    selfie_url: obj.selfieUrl,
    customer_signature: obj.customerSignature,
    customer_signature_url: obj.customerSignatureUrl,
    salesperson_signature: obj.salespersonSignature,
    salesperson_signature_url: obj.salespersonSignatureUrl,
    employee_signature: obj.employeeSignature,
    authorized_signature: obj.authorizedSignature,
    authorized_signature_url: obj.authorizedSignatureUrl,
    witness: obj.witness,
    is_stock_committed: obj.isStockCommitted,
    stock_committed_at: obj.stockCommittedAt,
    purchase_type: obj.purchaseType,
    has_warranty: obj.hasWarranty,
    warranty_start_date: obj.warrantyStartDate,
    warranty_end_date: obj.warrantyEndDate,
    eligible_services: obj.eligibleServices,
    service_usage_count: obj.serviceUsageCount,
    staff_name: obj.staffName,
    deleted_at: obj.deleted_at,
    deleted_by: obj.deleted_by,
    created_by: obj.createdBy,
    updated_by: obj.updatedBy,
    created_at: obj.createdAt,
    updated_at: obj.updatedAt
  };

  return snakeCaseObj;
};

// Method to return data in unified format for loan system compatibility
InstallmentOrderSchema.methods.toLoanFormat = function() {
  const obj = this.toObject({ virtuals: true });

  // Calculate additional fields for loan system
  const totalDue = this.finalTotalAmount || this.totalAmount || 0;
  const paidAmount = this.paidAmount || 0;
  const remainingAmount = Math.max(0, totalDue - paidAmount);
  const progress = totalDue > 0 ? ((paidAmount / totalDue) * 100) : 0;

  const loanFormatObj = {
    // Core identification
    id: obj._id,
    contractNumber: obj.contractNo,
    loanType: 'installment',

    // Customer information
    customerId: obj.customer,
    customerName: obj.customer_info ?
      `${obj.customer_info.firstName || ''} ${obj.customer_info.lastName || ''}`.trim() :
      'ไม่ระบุ',
    customerPhone: obj.customer_info?.phone || '',
    customerEmail: obj.customer_info?.email || '',
    customerAddress: obj.customer_info?.address ?
      `${obj.customer_info.address.houseNo || ''} ${obj.customer_info.address.subDistrict || ''} ${obj.customer_info.address.district || ''} ${obj.customer_info.address.province || ''}`.trim() :
      '',

    // Financial details
    principalAmount: totalDue,
    loanAmount: totalDue,
    totalAmount: totalDue,
    paidAmount: paidAmount,
    remainingBalance: remainingAmount,
    downPayment: obj.downPayment || 0,
    monthlyPayment: obj.monthlyPayment || 0,

    // Loan terms
    termMonths: obj.installmentCount || 0,
    installmentCount: obj.installmentCount || 0,
    interestRate: 0, // Installment system doesn't track interest separately

    // Status and dates
    status: obj.status,
    applicationDate: obj.createdAt,
    approvalDate: obj.status === 'approved' ? obj.createdAt : null,
    startDate: obj.createdAt,
    maturityDate: obj.dueDate,
    lastPaymentDate: obj.payments && obj.payments.length > 0 ?
      obj.payments[obj.payments.length - 1].payDate : null,
    nextDueDate: obj.dueDate,

    // Progress tracking
    progressPercentage: Math.round(progress * 100) / 100,
    paymentsCount: obj.payments ? obj.payments.length : 0,
    remainingInstallments: Math.max(0, (obj.installmentCount || 0) - (obj.payments ? obj.payments.length : 0)),

    // Risk assessment
    isOverdue: obj.dueDate && new Date(obj.dueDate) < new Date() && obj.status !== 'completed',
    daysPastDue: obj.dueDate ?
      Math.max(0, Math.floor((new Date() - new Date(obj.dueDate)) / (1000 * 60 * 60 * 24))) : 0,
    riskLevel: this.calculateRiskLevel(),

    // Additional details
    purpose: obj.items && obj.items.length > 0 ? obj.items[0].name : 'ผ่อนชำระสินค้า',
    collateral: obj.items ? obj.items.map(item => ({
      type: 'product',
      description: item.name,
      value: item.downAmount || 0,
      serialNumber: item.imei || ''
    })) : [],

    // Branch and staff
    branchCode: obj.branch_code,
    salesPerson: obj.salesperson?.name || obj.staffName || '',
    createdBy: obj.createdBy,

    // System tracking
    source: 'installment_system',
    lastUpdated: obj.updatedAt || obj.createdAt,

    // Payment history (if available)
    paymentHistory: obj.payments ? obj.payments.map(payment => ({
      date: payment.payDate,
      amount: payment.amount,
      method: payment.method,
      notes: payment.note,
      principal: payment.amount, // Simplified - installment system doesn't separate principal/interest
      interest: 0,
      balance: remainingAmount // Simplified calculation
    })) : []
  };

  return loanFormatObj;
};

// Helper method to calculate risk level
InstallmentOrderSchema.methods.calculateRiskLevel = function() {
  if (!this.dueDate || this.status === 'completed') return 'ต่ำ';

  const daysPastDue = Math.floor((new Date() - new Date(this.dueDate)) / (1000 * 60 * 60 * 24));
  const paidRatio = this.totalAmount > 0 ? (this.paidAmount / this.totalAmount) : 0;

  if (daysPastDue > 90 || paidRatio < 0.3) return 'สูงมาก';
  if (daysPastDue > 60 || paidRatio < 0.5) return 'สูง';
  if (daysPastDue > 30 || paidRatio < 0.7) return 'ปานกลาง';
  return 'ต่ำ';
};

// 🔥 NEW: Bad Debt Management Methods

/**
 * Initialize debt tracking for this contract
 */
InstallmentOrderSchema.methods.initializeDebtTracking = function() {
  this.debtTrackingInfo = {
    isTrackedForBadDebt: true,
    trackedSince: new Date(),
    initialRiskLevel: this.calculateRiskLevel(),
    currentRiskLevel: this.calculateRiskLevel(),
    lastRiskAssessment: new Date(),
    badDebtStatus: 'normal',
    allowanceAmount: 0,
    badDebtHistory: [{
      date: new Date(),
      action: 'tracking_initiated',
      fromStatus: 'not_tracked',
      toStatus: 'normal',
      notes: 'Debt tracking initiated automatically from Step4 completion'
    }]
  };

  this.updateAgingInfo();
  return this.save();
};

/**
 * Update aging information
 */
InstallmentOrderSchema.methods.updateAgingInfo = function() {
  if (!this.dueDate) {
    this.agingInfo = {
      daysPastDue: 0,
      lastCalculated: new Date(),
      agingCategory: 'current'
    };
    return;
  }

  const daysPastDue = Math.max(0, Math.floor((new Date() - new Date(this.dueDate)) / (1000 * 60 * 60 * 24)));

  let agingCategory = 'current';
  if (daysPastDue > 180) agingCategory = '180+';
  else if (daysPastDue > 90) agingCategory = '91-180';
  else if (daysPastDue > 60) agingCategory = '61-90';
  else if (daysPastDue > 30) agingCategory = '31-60';
  else if (daysPastDue > 0) agingCategory = '1-30';

  this.agingInfo = {
    daysPastDue,
    lastCalculated: new Date(),
    agingCategory
  };
};

/**
 * Update debt status and risk level
 */
InstallmentOrderSchema.methods.updateDebtStatus = function(newStatus, userId, notes = '') {
  if (!this.debtTrackingInfo) {
    this.initializeDebtTracking();
  }

  const oldStatus = this.debtTrackingInfo.badDebtStatus;
  const oldRiskLevel = this.debtTrackingInfo.currentRiskLevel;
  const newRiskLevel = this.calculateRiskLevel();

  this.debtTrackingInfo.badDebtStatus = newStatus;
  this.debtTrackingInfo.currentRiskLevel = newRiskLevel;
  this.debtTrackingInfo.lastRiskAssessment = new Date();

  // Add to history
  this.debtTrackingInfo.badDebtHistory.push({
    date: new Date(),
    action: 'status_change',
    fromStatus: oldStatus,
    toStatus: newStatus,
    notes: notes || `Status changed from ${oldStatus} to ${newStatus}`,
    updatedBy: userId
  });

  // If risk level changed, add that to history too
  if (oldRiskLevel !== newRiskLevel) {
    this.debtTrackingInfo.badDebtHistory.push({
      date: new Date(),
      action: 'risk_update',
      fromStatus: oldRiskLevel,
      toStatus: newRiskLevel,
      notes: `Risk level changed from ${oldRiskLevel} to ${newRiskLevel}`,
      updatedBy: userId
    });
  }

  this.updateAgingInfo();
  return this.save();
};

/**
 * Add collection activity
 */
InstallmentOrderSchema.methods.addCollectionActivity = function(activity) {
  if (!this.collectionActivities) {
    this.collectionActivities = [];
  }

  this.collectionActivities.push({
    ...activity,
    date: activity.date || new Date()
  });

  return this.save();
};

/**
 * Calculate allowance amount based on criteria
 */
InstallmentOrderSchema.methods.calculateAllowanceAmount = function(criteria = null) {
  if (!criteria) {
    // Default criteria if none provided
    criteria = {
      allowance: 5.0,  // 5% for 30-90 days
      doubtful: 15.0,  // 15% for 90-180 days
      badDebt: 50.0    // 50% for 180+ days
    };
  }

  const daysPastDue = this.agingInfo?.daysPastDue || 0;
  const remainingAmount = Math.max(0, (this.totalAmount || 0) - (this.paidAmount || 0));

  if (remainingAmount <= 0) return 0;

  if (daysPastDue <= 30) return 0;
  else if (daysPastDue <= 90) return remainingAmount * (criteria.allowance / 100);
  else if (daysPastDue <= 180) return remainingAmount * (criteria.doubtful / 100);
  else return remainingAmount * (criteria.badDebt / 100);
};

/**
 * Check if contract needs attention
 */
InstallmentOrderSchema.methods.needsAttention = function() {
  const daysPastDue = this.agingInfo?.daysPastDue || 0;
  const riskLevel = this.calculateRiskLevel();
  const lastActivity = this.collectionActivities && this.collectionActivities.length > 0 ?
    this.collectionActivities[this.collectionActivities.length - 1] : null;

  // Needs attention if:
  // 1. More than 30 days overdue
  // 2. High risk
  // 3. No collection activity in last 30 days for overdue contracts
  if (daysPastDue > 30) return true;
  if (riskLevel === 'สูง' || riskLevel === 'สูงมาก') return true;
  if (daysPastDue > 0 && lastActivity &&
      ((new Date() - new Date(lastActivity.date)) / (1000 * 60 * 60 * 24)) > 30) return true;

  return false;
};

// Static method to convert query parameters between formats
InstallmentOrderSchema.statics.convertQueryFormat = function(query, targetFormat = 'camelCase') {
  const converted = {};

  const fieldMappings = {
    // camelCase -> snake_case
    contractNo: 'contract_no',
    planType: 'plan_type',
    installmentType: 'installment_type',
    totalAmount: 'total_amount',
    paidAmount: 'paid_amount',
    downPayment: 'down_payment',
    monthlyPayment: 'monthly_payment',
    installmentCount: 'installment_count',
    finalTotalAmount: 'final_total_amount',
    promotionDiscount: 'promotion_discount',
    appliedPromotions: 'applied_promotions',
    dueDate: 'due_date',
    completedDate: 'completed_date',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    createdBy: 'created_by',
    updatedBy: 'updated_by',
    deletedBy: 'deleted_by'
  };

  // Create reverse mapping
  const reverseMappings = {};
  Object.entries(fieldMappings).forEach(([camel, snake]) => {
    reverseMappings[snake] = camel;
  });

  Object.entries(query).forEach(([key, value]) => {
    let newKey = key;

    if (targetFormat === 'snake_case' && fieldMappings[key]) {
      newKey = fieldMappings[key];
    } else if (targetFormat === 'camelCase' && reverseMappings[key]) {
      newKey = reverseMappings[key];
    }

    converted[newKey] = value;
  });

  return converted;
};

// Add indexes for performance
InstallmentOrderSchema.index({ contractNo: 1 }, { unique: true });
InstallmentOrderSchema.index({ customer: 1, deleted_at: 1 });
InstallmentOrderSchema.index({ branch_code: 1, status: 1 });
InstallmentOrderSchema.index({ status: 1, dueDate: 1 });
InstallmentOrderSchema.index({ createdAt: -1 });
InstallmentOrderSchema.index({ planType: 1, installmentType: 1 });
InstallmentOrderSchema.index({ 'items.productId': 1 });
InstallmentOrderSchema.index({ 'customer_info.phone': 1 });
InstallmentOrderSchema.index({ deleted_at: 1 });

// Compound indexes for common queries
InstallmentOrderSchema.index({ customer: 1, status: 1, createdAt: -1 });
InstallmentOrderSchema.index({ branch_code: 1, createdAt: -1, deleted_at: 1 });
InstallmentOrderSchema.index({ status: 1, totalAmount: -1, createdAt: -1 });

// Text search index for customer name and contract number
InstallmentOrderSchema.index({
  contractNo: 'text',
  'customer_info.firstName': 'text',
  'customer_info.lastName': 'text',
  'customer_info.phone': 'text'
}, {
  name: 'search_index',
  weights: {
    contractNo: 10,
    'customer_info.firstName': 5,
    'customer_info.lastName': 5,
    'customer_info.phone': 3
  }
});

// Ensure virtual fields are included in JSON output
InstallmentOrderSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    // Remove MongoDB specific fields from JSON output
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

InstallmentOrderSchema.set('toObject', {
  virtuals: true
});

module.exports = mongoose.model('InstallmentOrder', InstallmentOrderSchema);
