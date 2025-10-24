// File: models/Installment/Quotation.js

const mongoose = require('mongoose');
const { Schema } = mongoose;
const QuotationItemSchema = require('./QuotationItem');

const QuotationSchema = new Schema({
  number: {
    type: String,
    required: false, // Made optional
    unique: true,
    default: function() {
      return `QT${Date.now()}`;
    }
  },
  quotationNumber: {
    type: String,
    required: false, // Made optional
    unique: true,
    default: function() {
      return this.number || `QT${Date.now()}`;
    }
  },
  date:            { type: Date,   required: true, default: Date.now },
  salesperson:     {
    type: Schema.Types.ObjectId,
    ref: 'Employee',
    required: false // Made optional
  },
  salespersonName: { type: String },
  branchCode:      {
    type: String,
    required: false, // Made optional
    default: '00000'
  },

  // ค่าธรรมเนียมเอกสาร
  docFee:          { type: Number, default: 0 },

  // ช่องทางรับสินค้า: 'store' หรือ 'online'
  pickupMethod:    {
    type: String,
    enum: ['store', 'online'],
    default: 'store'
  },

  // ค่าจัดส่ง (เฉพาะกรณี pickupMethod==='online')
  shippingFee:     { type: Number, default: 0 },

  customer: {
    name:       {
      type: String,
      required: false, // Made optional
      default: 'ลูกค้าทั่วไป'
    },
    address:    { type: String },
    taxId:      { type: String },
    phone:      { type: String },
  },

  // ข้อมูลพยาน (ถ้ามี)
  witness: {
    name:     { type: String },
    id_card:  { type: String },
    phone:    { type: String },
    relation: { type: String }
  },

  // 🔧 เพิ่มฟิลด์ลายเซ็นสำหรับ PDF generation
  customerSignature: { type: String, default: '' },
  customerSignatureUrl: { type: String, default: '' },
  salespersonSignature: { type: String, default: '' },
  salespersonSignatureUrl: { type: String, default: '' },
  employeeSignature: { type: String, default: '' },
  authorizedSignature: { type: String, default: '' },
  authorizedSignatureUrl: { type: String, default: '' },

  currency:       { type: String, default: 'THB' },
  creditTerm:     { type: String, default: '30 วัน' },
  vatInclusive:   { type: Boolean, default: true },
  discountValue:  { type: Number, default: 0 },

  items:          [QuotationItemSchema],

  summary: {
    subtotal:   { type: Number, required: false, default: 0 }, // Made optional
    shipping:   { type: Number, default: 0 },  // รวมค่าจัดส่งในสรุปด้วย
    discount:   { type: Number, default: 0 },
    beforeTax:  { type: Number, required: false, default: 0 }, // Made optional
    tax:        { type: Number, required: false, default: 0 }, // Made optional
    netTotal:   { type: Number, required: false, default: 0 } // Made optional
  },

  // ► เพิ่มฟิลด์เก็บยอดผ่อนหลัก ยอดดาวน์ และยอดรวมทั้งสิ้น ◄
  financedTotal:  { type: Number, default: 0 },  // ยอดผ่อนหลัก (installmentAmount * termCount รวมทุกรายการ)
  downTotal:      { type: Number, default: 0 },  // ยอดดาวน์รวม
  grandTotal:     { type: Number, default: 0 },  // ยอดรวมทั้งสิ้น (financedTotal + downTotal + docFee + shippingFee)

  status:        { type: String, enum: ['draft','sent','confirmed'], default: 'draft' },

  // เปลี่ยนจาก String เป็น ObjectId reference
  invoiceRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',    // ชื่อตัวโมเดล Invoice ที่สร้างใบแจ้งหนี้ไว้
  },
}, { timestamps: true });

// --- Pre-save hook: สร้างเลขที่และคำนวณยอดอัตโนมัติก่อนบันทึก ---
QuotationSchema.pre('save', async function(next) {
  // 0) สร้างเลขที่ใบเสนอราคาถ้ายังไม่มี (รูปแบบ QT-YYMMDD-XXX)
  if (this.isNew && (!this.quotationNumber || this.quotationNumber.startsWith('QT1'))) {
    const now = new Date();
    const year = String(now.getFullYear() - 543).slice(-2); // พ.ศ. 2 หลัก
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const datePrefix = `${year}${month}${day}`;

    // หาเลขที่ล่าสุดของวันนี้
    const latestQuotation = await this.constructor.findOne({
      quotationNumber: new RegExp(`^QT-${datePrefix}-`)
    }).sort({ quotationNumber: -1 });

    let sequence = 1;
    if (latestQuotation && latestQuotation.quotationNumber) {
      const match = latestQuotation.quotationNumber.match(/-(\d{3})$/);
      if (match) {
        sequence = parseInt(match[1]) + 1;
      }
    }

    this.quotationNumber = `QT-${datePrefix}-${String(sequence).padStart(3, '0')}`;
    this.number = this.quotationNumber; // sync number field
  }

  // 1) คำนวณยอดผ่อนหลัก และยอดดาวน์รวม
  const financed = this.items.reduce(
    (sum, it) => sum + (Number(it.installmentAmount || 0) * Number(it.termCount || 0)),
    0
  );
  const down     = this.items.reduce(
    (sum, it) => sum + Number(it.downAmount || 0),
    0
  );

  // 2) สรุปยอดทั้งหมด: ยอดผ่อนหลัก + ดาวน์ + ค่าธรรมเนียม + ค่าจัดส่ง
  const grand = financed + down + Number(this.docFee || 0) + Number(this.shippingFee || 0);

  // 3) บันทึกลงในฟิลด์ schema
  this.financedTotal = financed;
  this.downTotal     = down;
  this.grandTotal    = grand;

  // 4) อัปเดต summary fields
  this.summary.shipping   = Number(this.shippingFee || 0);
  this.summary.discount   = Number(this.discountValue || 0);  // ← set discount from payload
  this.summary.beforeTax  = financed + down;                  // ← recalc beforeTax
  this.summary.netTotal   = grand;

  next();
});

module.exports = mongoose.model('Quotation', QuotationSchema);
