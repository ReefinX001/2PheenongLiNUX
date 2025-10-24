// File: models/Installment/Invoice.js
const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

// --- sub-schema สำหรับแต่ละรายการสินค้า (inline) ---
const InvoiceItemSchema = new Schema({
  product: {                              // อ้างอิงไปยัง BranchStock
    type: Schema.Types.ObjectId,
    ref: 'BranchStock',
    required: false                       // Allow null products for compatibility with existing quotations
  },
  imei: {                                // เพิ่มฟิลด์เก็บ IMEI ของสินค้า
    type: String,
    default: ''
  },
  description: {                         // คำอธิบายเพิ่มเติม (fallback)
    type: String,
    default: ''
  },
  quantity: {                            // จำนวนชิ้น
    type: Number,
    default: 1
  },
  unitPrice: {                           // ราคาต่อหน่วย (ก่อนส่วนลด)
    type: Number,
    default: 0,
    required: true                       // เพิ่ม required ตาม QuotationItem
  },
  discount: {                            // ส่วนลดต่อรายการ
    type: Number,
    default: 0
  },
  docFee: {                              // เพิ่ม docFee ตาม QuotationItem
    type: Number,
    default: 0,
    required: true
  },
  downAmount: {                          // ยอดดาวน์
    type: Number,
    default: 0
  },
  termCount: {                           // จำนวนงวดผ่อน
    type: Number,
    default: 0
  },
  installmentAmount: {                   // ค่างวดต่อเดือน
    type: Number,
    default: 0
  },
  totalPrice: {                          // ราคาสุทธิของรายการ (คำนวณแล้ว)
    type: Number,
    default: 0,
    required: true                       // เพิ่ม required ตาม QuotationItem
  }
}, {
  _id: false                             // ไม่สร้าง _id ให้ sub-doc
});

// --- Schema หลักของ Invoice ---
const InvoiceSchema = new Schema({
  invoiceNumber:     { type: String, required: true, unique: true },
  quotationNumber:   { type: String, required: true }, // เลขที่ใบเสนอราคา (จะใช้เลขเดียวกัน)
  quotationRef:      { type: Schema.Types.ObjectId, ref: 'Quotation' },
  date:              { type: Date,   required: true, default: Date.now },
  branchCode:        { type: String, required: true },
  pickupMethod:      { type: String, enum: ['store','online'], default: 'store' },

  customer: {
    name:    { type: String, required: true },
    address: { type: String, default: '' },
    taxId:   { type: String, default: '' },
    phone:   { type: String, default: '' }
  },

  // เพิ่มข้อมูลพยาน (จาก Quotation)
  witness: {
    name:     { type: String, default: '' },
    id_card:  { type: String, default: '' },
    phone:    { type: String, default: '' },
    relation: { type: String, default: '' }
  },

  currency:          { type: String, default: 'THB' },

  items: [ InvoiceItemSchema ],           // ใช้ inline sub-schema

  summary: {
    subtotal:  { type: Number, default: 0 },
    shipping:  { type: Number, default: 0 },  // จะอัปเดตจาก hook
    discount:  { type: Number, default: 0 },
    tax:       { type: Number, default: 0 },
    netTotal:  { type: Number, default: 0 }   // เก็บ Grand Total
  },

  planSummaryText:    { type: String, default: '' },
  shippingFee:        { type: Number, default: 0 },
  docFee:             { type: Number, default: 0 },

  salesperson:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
  salespersonName:    { type: String, required: true },

  // 🔧 ฟิลด์ลายเซ็นสำหรับ PDF generation
  customerSignature:       { type: String, default: '' },
  customerSignatureUrl:    { type: String, default: '' },
  salespersonSignature:    { type: String, default: '' },
  salespersonSignatureUrl: { type: String, default: '' },
  employeeSignature:       { type: String, default: '' },
  authorizedSignature:     { type: String, default: '' },
  authorizedSignatureUrl:  { type: String, default: '' },

  creditTerm:         { type: String,  default: '' },
  vatInclusive:       { type: Boolean, default: true },
  discountValue:      { type: Number,  default: 0 },

  status:             { type: String, enum: ['draft','sent','paid'], default: 'draft' },
  deliveryRef:        { type: String, default: '' },
  deliveryStatus:     { type: String, enum: ['pending','delivered','overdue'], default: 'pending' },

  financedTotal:      { type: Number, default: 0 },  // ยอดผ่อนหลักรวม
  downTotal:          { type: Number, default: 0 },  // ยอดดาวน์รวม
  grandTotal:         { type: Number, default: 0 }   // ยอดรวมทั้งสิ้น
}, { timestamps: true });

// --- Pre-save hook: คำนวณยอดต่าง ๆ ก่อนบันทึก ---
InvoiceSchema.pre('save', async function(next) {
  // กรณีใบใหม่อ้างอิง quotation ให้ดึงข้อมูลทั้งหมดจาก Quotation
  if (this.isNew && this.quotationRef) {
    try {
      const Quotation = mongoose.model('Quotation');
      const quotation = await Quotation.findById(this.quotationRef)
        .select('-createdAt -updatedAt -__v');

      if (quotation) {
        // คัดลอกข้อมูลหลักจาก Quotation
        this.quotationNumber = quotation.quotationNumber || quotation.number;
        this.date = quotation.date;
        this.branchCode = quotation.branchCode || '00000';
        this.pickupMethod = quotation.pickupMethod;

        // คัดลอกข้อมูลลูกค้า
        this.customer = {
          name: quotation.customer.name,
          address: quotation.customer.address || '',
          taxId: quotation.customer.taxId || '',
          phone: quotation.customer.phone || ''
        };

        // คัดลอกข้อมูลพยาน
        this.witness = {
          name: quotation.witness?.name || '',
          id_card: quotation.witness?.id_card || '',
          phone: quotation.witness?.phone || '',
          relation: quotation.witness?.relation || ''
        };

        // คัดลอกการกำหนดค่า
        this.currency = quotation.currency;
        this.creditTerm = quotation.creditTerm;
        this.vatInclusive = quotation.vatInclusive;
        this.discountValue = quotation.discountValue;

        // คัดลอกค่าธรรมเนียม
        this.shippingFee = quotation.shippingFee || 0;
        this.docFee = quotation.docFee || 0;

        // คัดลอกรายการสินค้าทั้งหมด
        this.items = quotation.items.map(item => ({
          product: item.product._id || item.product,
          imei: item.imei || '',
          description: item.description || '',
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
          discount: item.discount || 0,
          docFee: item.docFee || 0,
          downAmount: item.downAmount || 0,
          termCount: item.termCount || 0,
          installmentAmount: item.installmentAmount || 0,
          totalPrice: item.totalPrice || 0
        }));

        // คัดลอกข้อมูลพนักงานขาย (พร้อม fallback)
        this.salesperson = quotation.salesperson || new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');
        this.salespersonName = quotation.salespersonName || 'พนักงานขาย';

        // คัดลอกยอดสรุปจาก Quotation
        this.financedTotal = quotation.financedTotal || 0;
        this.downTotal = quotation.downTotal || 0;
        this.grandTotal = quotation.grandTotal || 0;
      }
    } catch (err) {
      return next(err);
    }
  }

  // คำนวณยอดต่างๆ (ไม่ว่าจะเป็นใบใหม่หรือแก้ไข)
  // 1) ยอดผ่อนหลัก และดาวน์รวม
  const financed = this.items.reduce((sum, it) =>
    sum + (it.installmentAmount * it.termCount), 0
  );
  const down = this.items.reduce((sum, it) =>
    sum + it.downAmount, 0
  );

  // 2) ยอดรวมรายการก่อนส่วนลด (subtotal) และยอดส่วนลดรวม
  const subtotal        = this.items.reduce((sum, it) =>
    sum + (it.unitPrice * it.quantity), 0
  );
  const invoiceDiscount = this.discountValue || 0;

  // 3) ค่าธรรมเนียม + ค่าจัดส่ง
  const docFee  = Number(this.docFee    || 0);
  const shipFee = Number(this.shippingFee || 0);

  // 4) คำนวณ VAT (ถ้ามี) และ Grand Total
  const beforeTax = subtotal - invoiceDiscount + docFee + shipFee;
  const vatVal    = this.vatInclusive
    ? Math.round(beforeTax * 0.07 * 100) / 100
    : 0;
  const netTotal  = beforeTax + vatVal;

  // 5) เก็บลงฟิลด์
  this.financedTotal      = financed;
  this.downTotal          = down;
  this.summary.subtotal   = subtotal;
  this.summary.discount   = invoiceDiscount;
  this.summary.shipping   = shipFee;
  this.summary.tax        = vatVal;
  this.summary.netTotal   = netTotal;
  this.grandTotal         = netTotal;

  next();
});

// --- Post-save hook: อัปเดตกลับไปที่ Quotation.invoiceRef ---
InvoiceSchema.post('save', async function(doc, next) {
  if (doc.quotationRef) {
    try {
      const Quotation = mongoose.model('Quotation');
      await Quotation.findByIdAndUpdate(
        doc.quotationRef,
        { invoiceRef: doc._id }
      );
    } catch (err) {
      // แค่ log error แต่ไม่ขัดขวางการบันทึก
      console.error('Failed to link Invoice → Quotation:', err);
    }
  }
  next();
});

// Export โมเดล
module.exports = mongoose.models.Invoice
  ? mongoose.model('Invoice')
  : mongoose.model('Invoice', InvoiceSchema);
