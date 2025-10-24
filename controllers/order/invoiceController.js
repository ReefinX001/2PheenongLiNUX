const mongoose      = require('mongoose');
const Invoice       = require('../models/Installment/Invoice');
const Quotation     = require('../models/Installment/Quotation');
const Counter       = require('../models/POS/Counter');
const PdfController = require('./InvoicePdfController');
const User          = require('../models/User/User');
const Branch        = require('../models/Account/Branch');
const path          = require('path');

/**
 * แปลงค่าที่ส่งมาให้เป็นตัวเลข หรือ fallback
 */
function ensureNumberData(value, fallback = 0) {
  const num = Number(value);
  return isNaN(num) ? fallback : num;
}

/**
 * sanitize เฉพาะ section ที่เป็นตัวเลข
 */
function sanitizeNumericSections(formatted) {
  formatted.items = formatted.items.map(i => ({
    ...i,
    quantity:          ensureNumberData(i.quantity,         1),
    unitPrice:         ensureNumberData(i.unitPrice),
    discount:          ensureNumberData(i.discount),
    totalPrice:        ensureNumberData(i.totalPrice),
    downAmount:        ensureNumberData(i.downAmount),
    termCount:         ensureNumberData(i.termCount),
    installmentAmount: ensureNumberData(i.installmentAmount),
  }));
  formatted.summary = {
    beforeTax: ensureNumberData(formatted.summary.beforeTax),
    shipping:  ensureNumberData(formatted.summary.shipping),
    discount:  ensureNumberData(formatted.summary.discount),
    tax:       ensureNumberData(formatted.summary.tax),
    netTotal:  ensureNumberData(formatted.summary.netTotal),
  };
  formatted.shippingFee   = ensureNumberData(formatted.shippingFee);
  formatted.docFee        = ensureNumberData(formatted.docFee);
  formatted.discountValue = ensureNumberData(formatted.discountValue);
  return formatted;
}

/**
 * สร้าง Invoice จาก Quotation document
 * @param {Object} q             Quotation doc (lean() หรือ real mongoose doc)
 * @param {Object} opts          ตัวเลือกจาก request: { date, shippingFee, docFee, planSummaryText, user }
 * @returns {Promise<Invoice>}   doc ที่เพิ่งสร้าง
 */
async function createInvoiceFromQuotationData(q, opts) {
  // Debug: log quotation items to verify field naming
  // console.log('⚙️ quotation items payload:', q.items);

  const { date, shippingFee, docFee, discountValue = 0, planSummaryText, user } = opts;

  // 1) สร้างเลขใบแจ้งหนี้
    // ให้แน่ใจว่า today เป็น Date object ไม่ว่าจะส่งมาเป็นสตริงหรือไม่
  const today = date instanceof Date
    ? date
    : new Date(date || Date.now());
  const thaiYY  = today.getFullYear() + 543;
  const MM      = String(today.getMonth() + 1).padStart(2, '0');
  const DD      = String(today.getDate()).padStart(2, '0');
  const key     = `INV-${thaiYY}${MM}${DD}`;
  const counter = await Counter.findOneAndUpdate(
    { id: 'invoice', reference_value: key },
    {
      $inc: { seq: 1 },
      $setOnInsert: { id: 'invoice', reference_value: key }
    },
    { new: true, upsert: true, strict: false }
  );
  const seqStr          = String(counter.seq).padStart(4, '0');
  const generatedNumber = `${key}${seqStr}`;

  // 2) map รายการสินค้า (แน่ใจว่า q.items มาจาก populate แล้ว)
  const invoiceItems = q.items.map(i => ({
    product:            (i.product && i.product._id) ? i.product._id : i.product,
    // ถ้ามี name ที่ส่งมาจาก front-end ให้ใช้ก่อน ถ้ายังไม่มีค่อย fallback เป็นชื่อจาก populated product
    description:        i.name
                        || (i.product && i.product.name)
                        || '-',
    imei:               i.imei || '',
    // qty จาก front-end คือจำนวนที่แท้จริง
    quantity:           Number(i.qty ?? i.quantity) || 1,
    unitPrice:          Number(i.unitPrice)  || 0,
    discount:           Number(i.discount)   || 0,
    totalPrice:         Number(i.totalPrice) || 0,
    downAmount:         Number(i.downAmount) || 0,
    termCount:          Number(i.termCount)  || 0,
    installmentAmount:  Number(i.installmentAmount) || 0,
  }));

  // 3) คำนวณยอดรวม
  const subtotal = invoiceItems.reduce((sum, it) => sum + it.totalPrice, 0);
  // หักส่วนลดก่อน บวก docFee + shippingFee
  const beforeTax = subtotal - discountValue + (docFee || 0) + (shippingFee || 0);
  const vatVal    = Math.round(beforeTax * 0.07 * 100) / 100;  // VAT 7%
  const netTotal  = beforeTax + vatVal;

  // 4) สร้างและบันทึก Invoice
  const inv = await Invoice.create({
    invoiceNumber: generatedNumber,
    quotationRef: q._id,
    date: today,
    branchCode: q.branchCode,
    pickupMethod: q.pickupMethod,
    docFee:        docFee      || q.docFee,
    shippingFee:   shippingFee || q.shippingFee,
    discountValue,                      // ← persist invoice‐level discount
    salesperson:   q.salesperson,
    salespersonName: q.salespersonName,
    customer: q.customer,
    items: invoiceItems,
    summary: {
      subtotal,
      shipping:  shippingFee || q.summary.shipping,
      discount:  discountValue,
      tax:       vatVal,
      netTotal,
    },
    customerSignatureUrl: q.customerSignatureUrl,
    salespersonSignatureUrl: q.salespersonSignatureUrl,
    authorizedSignatureUrl: q.authorizedSignatureUrl,
    planSummaryText: planSummaryText || q.planSummaryText,
    status: 'sent'
  });

  // 5) อัปเดตสถานะใน Quotation ให้มี ref Invoice
  await require('../models/Installment/Quotation')
        .updateOne({ quotationNumber: q.quotationNumber }, {
          invoiceRef: inv._id,
          status: 'sent'
        });

  return inv;
}

// POST /api/invoice
exports.createInvoice = async (req, res) => {
  try {
    let {
      quotationRef,
      date = new Date(),
      branchCode,
      customer,
      items,
      pickupMethod    = 'store',
      shippingFee     = 0,
      docFee          = 0,
      discountValue   = 0,            // ← ดึงส่วนลดจาก body
      planSummaryText = '',
      customerSignatureUrl    = '',
      salespersonSignatureUrl = '',
      authorizedSignatureUrl  = ''
    } = req.body;

    // ─────────────────────────────────────────────────
    // รองรับกรณีส่ง quotationNumber มาแทน ObjectId
    if (quotationRef && !mongoose.Types.ObjectId.isValid(quotationRef)) {
      // ถ้า quotationRef ไม่ใช่ ObjectId ให้มองว่าเป็นเลข QT
      const q = await Quotation.findOne({ quotationNumber: quotationRef }).lean().select('_id');
      if (!q) {
        return res.status(400).json({ success: false, error: 'ไม่พบใบเสนอราคา ' + quotationRef });
      }
      quotationRef = q._id;
    }
    // ─────────────────────────────────────────────────

    // ตรวจความครบถ้วน
    const missing = [];
    if (!branchCode)            missing.push('branchCode');
    if (!customer?.name)         missing.push('customer.name');
    if (!Array.isArray(items))   missing.push('items');
    // ตรวจ quotationRef ด้วย
    if (!quotationRef)           missing.push('quotationRef');
    if (missing.length) {
      return res.status(400).json({ success:false, error:`ข้อมูลไม่ครบ: ${missing.join(', ')}` });
    }

    // หาชื่อพนักงานขาย
    let salespersonName = req.user.name;
    if (!salespersonName) {
      const u = await User.findById(req.user.id).populate('employee','name').lean();
      salespersonName = u?.employee?.name;
    }
    if (!salespersonName) {
      return res.status(400).json({ success:false, error:'ไม่พบชื่อพนักงานขาย' });
    }

    // สร้างเลขที่ Invoice
    const today  = new Date();
    const yy543  = today.getFullYear() + 543;
    const MM     = String(today.getMonth()+1).padStart(2,'0');
    const DD     = String(today.getDate()).padStart(2,'0');
    const key    = `INV-${yy543}${MM}${DD}`;
    const ctr    = await Counter.findOneAndUpdate(
      { id:'invoice', reference_value:key },
      { $inc:{ seq:1 }, $setOnInsert:{ id:'invoice', reference_value:key } },
      { new:true, upsert:true, strict:false }
    );
    const seqStr = String(ctr.seq).padStart(4,'0');
    const invNo  = `${key}${seqStr}`;

    // map items → ต้องใช้ฟิลด์ `product` ตามโมเดลใหม่
    const invoiceItems = items.map(i => ({
      product:            i.product || i.productId,
      description:        i.name || i.description || '-',
      imei:               i.imei || '',
      quantity:           ensureNumberData(i.qty ?? i.quantity, 1),
      unitPrice:          ensureNumberData(i.unitPrice),
      discount:           ensureNumberData(i.discount),
      totalPrice:         ensureNumberData(i.totalPrice),
      downAmount:         ensureNumberData(i.downAmount),
      termCount:          ensureNumberData(i.termCount),
      installmentAmount:  ensureNumberData(i.installmentAmount),
    }));

    // คำนวณสรุปยอด
    const subtotal = invoiceItems.reduce((s,it)=> s + it.totalPrice, 0);
    // คำนวณก่อน VAT และ VAT 7%
    const beforeTax = subtotal - discountValue + docFee + shippingFee;
    const vatVal    = Math.round(beforeTax * 0.07 * 100) / 100;
    const netTotal  = beforeTax + vatVal;

    // สร้างและบันทึก Invoice
    const inv = new Invoice({
      invoiceNumber:       invNo,
      quotationRef,
      date,
      branchCode,
      pickupMethod,
      shippingFee,
      docFee,
      discountValue,               // ← persist invoice‐level discount
      salesperson:        req.user.id,
      salespersonName,
      customer: {
        name:    customer.name,
        address: customer.address || '',
        taxId:   customer.taxId   || '',
        phone:   customer.phone   || ''
      },
      items:    invoiceItems,
      summary: {
        subtotal,
        shipping:  shippingFee,
        discount:  discountValue,
        tax:       vatVal,
        netTotal
      },
      customerSignatureUrl,
      salespersonSignatureUrl,
      authorizedSignatureUrl,
      planSummaryText,
      status:'sent'
    });

    const created = await inv.save();

    // แจ้ง WebSocket
    req.app.get('io')?.emit('invoiceCreated', {
      invoiceNumber: invNo,
      data: created
    });

    res.status(201).json({ success:true, data: created, invoiceNumber: invNo });

  } catch (err) {
    console.error('Error creating invoice:', err);
    res.status(500).json({ success:false, error: err.message });
  }
};

// GET /api/invoice
exports.listInvoices = async (req, res) => {
  try {
    const list = await Invoice.find().limit(100).lean()
      .sort({ date: -1 })

      // เอาเลขใบเสนอราคา
      .populate({
        path: 'quotationRef',
        select: 'quotationNumber',
        strictPopulate: false
      })

      // แก้ไขวิธีการ populate ชื่อสินค้า (ชี้ที่ items.product โดยตรง)
      .populate('items.product', 'name')

      .lean();

    res.json({ success: true, data: list });
  } catch (err) {
    console.error('Error fetching invoices:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/invoice/:invoiceNumber
exports.getInvoice = async (req, res) => {
  try {
    const key   = req.params.invoiceNumber;
    const conds = [];
    if (mongoose.Types.ObjectId.isValid(key)) conds.push({ _id: key });
    if (!isNaN(Number(key)))                conds.push({ invoiceNumber: Number(key) });
    conds.push({ invoiceNumber: key });

    const inv = await Invoice.findOne({ $or: conds }).lean()
      // เอาเลขใบเสนอราคา
      .populate({
        path: 'quotationRef',
        select: 'quotationNumber',
        strictPopulate: false
      })
      // เอาชื่อสินค้า (ปรับให้กระชับขึ้น)
      .populate('items.product', 'name')
      .lean();

    if (!inv) {
      return res.status(404).json({ success: false, error: 'ไม่พบใบแจ้งหนี้' });
    }

    res.json({ success: true, data: inv });
  } catch (err) {
    console.error('Error fetching invoice:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};


// GET /api/invoice/next-number
exports.getNextInvoiceNumber = async (req, res) => {
  try {
    const today   = new Date();
    const thaiYY  = today.getFullYear() + 543;
    const MM      = String(today.getMonth()+1).padStart(2,'0');
    const DD      = String(today.getDate()).padStart(2,'0');
    const key     = `INV-${thaiYY}${MM}${DD}`;
    const counter = await Counter.findOne({ id: 'invoice', reference_value: key }).lean();
    const nextSeq = counter ? counter.seq + 1 : 1;
    const seqStr  = String(nextSeq).padStart(4, '0');
    res.json({ success: true, nextNumber: `${key}${seqStr}` });
  } catch (err) {
    console.error('Error fetching next invoice number:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE /api/invoice/:invoiceNumber
exports.deleteInvoice = async (req, res) => {
  try {
    const { invoiceNumber } = req.params;
    const conds = [];
    if (mongoose.Types.ObjectId.isValid(invoiceNumber)) {
      conds.push({ _id: invoiceNumber });
    }
    conds.push({ invoiceNumber });
    const deleted = await Invoice.findOneAndDelete({ $or: conds });
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'ไม่พบใบแจ้งหนี้' });
    }
    req.app.get('io')?.emit('invoiceDeleted', { invoiceNumber });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting invoice:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/invoice/:invoiceNumber/pdf
// GET /api/invoice/:invoiceNumber/pdf
exports.getPdf = async (req, res, next) => {
  try {
    const invoiceNumber = req.params.invoiceNumber;
    const orConds = [];

    // หา Invoice ด้วย _id, numeric invoiceNumber หรือ string invoiceNumber
    if (mongoose.Types.ObjectId.isValid(invoiceNumber)) {
      orConds.push({ _id: invoiceNumber });
    }
    if (!isNaN(Number(invoiceNumber))) {
      orConds.push({ invoiceNumber: Number(invoiceNumber) });
    }
    orConds.push({ invoiceNumber });

    // ดึง Invoice พร้อม populate ข้ามไปที่ Quotation เพื่อเอา quotationNumber
    const inv = await Invoice.findOne({ $or: orConds }).lean()
      // include both fields in populate
      .populate({
        path: 'quotationRef',
        select: 'quotationNumber number',
        strictPopulate: false
      })
      .populate({
        path: 'items.product',
        select: 'name',
        strictPopulate: false
      })
      .lean();

    if (!inv) return res.status(404).json({ success: false, error: 'ไม่พบใบแจ้งหนี้' });

    // 1) fallback for quotation number
    const quoteNo = inv.quotationRef?.quotationNumber
                  || inv.quotationRef?.number
                  || '-';

    // 2) find branch by code or branch_code
    const rawBranch = await Branch.findOne({
      $or: [
        { code:        inv.branchCode },
        { branch_code: inv.branchCode }
      ]
    })
    .select('branch_code code name address taxId tel')  // ← use real field names
    .lean();

    const branch = {
      name:    rawBranch.name,
      code:    rawBranch.branch_code || rawBranch.code, // ← pick whichever exists
      address: rawBranch.address,
      taxId:   rawBranch.taxId,
      tel:     rawBranch.tel
    };

    // กำหนด path ของรูปผู้อนุมัติสำรอง (ใช้เมื่อ inv.authorizedSignatureUrl ว่าง)
    const defaultAuthSig = path.join(process.cwd(), 'uploads', 'S__15892486-Photoroom.png');

    // เตรียม payload ให้ PDF controller
    const formatted = {
      quotationNumber: quoteNo,      // ค่าที่คำนวณไว้
      number:          quoteNo,      // ← เพิ่ม alias นี้
      invoiceNumber:   inv.invoiceNumber || '-',
      issueDate:       inv.date     || new Date(),
      issueDateFormatted:   inv.date
                              ? new Date(inv.date).toLocaleDateString('th-TH')
                              : '-',
      pickupMethod:         inv.pickupMethod   || '',
      shippingFee:          ensureNumberData(inv.shippingFee, 0),
      docFee:               ensureNumberData(inv.docFee,      0),
      company:              { name:'บริษัท 2 พี่น้อง โมบาย จำกัด' },
      branch,
      customer: {
        name:    inv.customer?.name    || '-',
        address: inv.customer?.address || '-',
        taxId:   inv.customer?.taxId   || '-',
        phone:   inv.customer?.phone   || '-',
      },
      items: Array.isArray(inv.items) ? inv.items.map(i => ({
        description:       i.description    || '-',
        imei:              i.imei           || '',
        quantity:          ensureNumberData(i.quantity,          1),
        unitPrice:         ensureNumberData(i.unitPrice,         0),
        discount:          ensureNumberData(i.discount,          0),
        totalPrice:        ensureNumberData(i.totalPrice,        0),
        downAmount:        ensureNumberData(i.downAmount,        0),
        termCount:         ensureNumberData(i.termCount,         0),
        installmentAmount: ensureNumberData(i.installmentAmount, 0),
      })) : [],
      summary: {
        beforeTax: 0,
        shipping:  ensureNumberData(inv.summary?.shipping, 0),
        discount:  ensureNumberData(inv.discountValue, 0), // ← use invoice-level discountValue
        tax:       0,
        netTotal:  0,
      },
      discountValue:   ensureNumberData(inv.discountValue, 0),
      currency:               inv.currency            || 'THB',
      salesperson: {
        name:         inv.salespersonName    || '(ไม่ระบุชื่อ)',
        signatureUrl: inv.salespersonSignatureUrl || ''
      },
      customerSignatureUrl:    inv.customerSignatureUrl    || '',
      salespersonSignatureUrl: inv.salespersonSignatureUrl || '',
      authorizedSignatureUrl:  inv.authorizedSignatureUrl  || defaultAuthSig,
      creditTerm:              inv.creditTerm             || '',
      vatInclusive:            inv.vatInclusive           || false,
      planSummaryText:         inv.planSummaryText        || ''
    };

    // คำนวณยอดผ่อนและดาวน์รวม
    const financedTotal = formatted.items.reduce(
      (sum, i) => sum + i.installmentAmount * i.termCount,
      0
    );
    const downTotal = formatted.items.reduce(
      (sum, i) => sum + i.downAmount,
      0
    );
    formatted.financedTotal = financedTotal;
    formatted.downTotal     = downTotal;

    // คำนวณ VAT & netTotal
    const beforeTax = financedTotal + downTotal + formatted.docFee + formatted.shippingFee
                    - formatted.discountValue;
    formatted.summary.beforeTax = beforeTax;
    formatted.summary.tax       = Math.round(beforeTax * 0.07 * 100) / 100;
    formatted.summary.netTotal  = beforeTax + formatted.summary.tax;

    // ถ้ามีส่วนลดระดับ invoice ให้หักไปที่บรรทัดแรกแทน
    if (formatted.discountValue > 0 && formatted.items.length > 0) {
      formatted.items[0].discount   = formatted.discountValue;
      formatted.items[0].totalPrice = formatted.items[0].totalPrice - formatted.discountValue;
    }

    // sanitize ตัวเลข
    sanitizeNumericSections(formatted);

    // ——— Debug: เช็คค่าของ formatted ก่อนส่งเข้า PDF ———
    // console.log('➡️ formatted for PDF:', JSON.stringify({
    //   quotationNumber: formatted.quotationNumber,
    //   invoiceNumber:   formatted.invoiceNumber
    // }));
    // ———————————————————————————————

    // สร้าง PDF
    const { buffer, fileName } = await PdfController.createInvoicePdf(formatted); // Renamed from createQuotationPdf
    return res
      .type('application/pdf')
      .set('Content-Disposition', `attachment; filename="${fileName}"`)
      .send(buffer);

  } catch (err) {
    console.error('PDF Generate Error:', err);
    next(err);
  }
};


// POST /api/quotation/:quotationNumber/invoice
exports.createFromQuotation = async (req, res) => {
  try {
    const { quotationNumber } = req.params;

    // รับทั้ง discount และ discountValue (fallback)
    const {
      date = new Date(),
      shippingFee = 0,
      docFee = 0,
      discount = 0,             // ← ค่าจาก front-end
      discountValue = discount, // ← fallback ให้เท่ากับ discount
      planSummaryText = ''
    } = req.body;

    // 1) ดึง Quotation และ populate ข้อมูลสินค้า
    const q = await Quotation.findOne({ quotationNumber }).lean()
      .populate('items.product', 'name')
      .lean();

    if (!q) {
      return res.status(404).json({ success: false, error: 'ไม่พบใบเสนอราคา' });
    }

    // 2) ส่งต่อเพื่อสร้าง Invoice
    const inv = await createInvoiceFromQuotationData(q, {
      date,
      shippingFee,
      docFee,
      discountValue,           // ← ส่งต่อ discountValue ที่ถูกต้อง
      planSummaryText,
      user: req.user
    });

    // 3) ส่งการแจ้งเตือน WebSocket
    req.app.get('io')?.emit('invoiceCreated', { invoiceNumber: inv.invoiceNumber, data: inv });

    // 4) ตอบกลับ API
    res.status(201).json({ success: true, data: inv });
  } catch (err) {
    console.error('Error creating invoice from quotation:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Export helper function for creating invoice from quotation
exports.createFromQuotationData = createInvoiceFromQuotationData;

