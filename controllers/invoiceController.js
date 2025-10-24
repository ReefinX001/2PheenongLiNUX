const mongoose      = require('mongoose');
const Invoice       = require('../models/Installment/Invoice');
const Quotation     = require('../models/Installment/Quotation');
const Counter       = require('../models/POS/Counter');
const PdfController = require('./InvoicePdfController');
const User          = require('../models/User/User');
const Branch        = require('../models/Account/Branch');
const BranchStock   = require('../models/POS/BranchStock'); // เพิ่ม import BranchStock
const path          = require('path');

/**
 * แปลงค่าที่ส่งมาให้เป็นตัวเลข หรือ fallback
 */
function ensureNumberData(value, fallback = 0) {
  const num = Number(value);
  return isNaN(num) ? fallback : num;
}

/**
 * ฟอร์แมตวันที่แบบไทยให้เป็นมาตรฐานเดียวกัน (เหมือน QuotationPdfController)
 */
function formatThaiDate(dateString) {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';

    // วัน เดือน พ.ศ.
    const day = date.getDate();
    const month = date.toLocaleDateString('th-TH', {month: 'long'});
    // ปี พ.ศ. (เพิ่ม 543 จาก ค.ศ.)
    const thaiYear = date.getFullYear() + 543;

    return `${day} ${month} ${thaiYear}`;
  } catch (e) {
    return '-';
  }
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
  console.log('🔍 DEBUG: ข้อมูล Quotation ที่ได้รับ:', {
    quotationNumber: q.quotationNumber,
    itemsCount: q.items?.length || 0,
    quotationDocFee: q.docFee,
    items: q.items?.map(item => ({
      product: item.product,
      productId: item.productId,
      name: item.name,
      unitPrice: item.unitPrice,
      hasProductField: !!item.product,
      productType: typeof item.product
    }))
  });

  const { date, shippingFee, docFee, discountValue = 0, planSummaryText, user } = opts;

  // ใช้ค่า docFee จาก quotation ถ้าไม่ได้ส่งมาใน opts
  const finalDocFee = docFee || q.docFee || 0;

  console.log('💰 DEBUG: Document fee selection (createFromQuotation):', {
    optsDocFee: docFee,
    quotationDocFee: q.docFee,
    finalDocFee: finalDocFee
  });

  // 1) ใช้เลขใบแจ้งหนี้เดียวกับเลขใบเสนอราคา
  const generatedNumber = q.quotationNumber;
  const today = date instanceof Date ? date : new Date(date || Date.now());

  // 2) คัดลอกรายการสินค้าโดยตรงจาก quotation items
  console.log('🔧 DEBUG: กำลังคัดลอก items จาก quotation...');

  const invoiceItems = q.items.map((item, index) => {
    console.log(`✅ Item ${index}: คัดลอกข้อมูลจาก quotation`);

    // Check if product exists
    if (!item.product) {
      console.log(`⚠️ Warning: Item ${index} has null product, using fallback data`);
    }

    // คัดลอกข้อมูลทั้งหมดจาก quotation item
    return {
      product: item.product?._id || item.product || null, // ใช้ BranchStock ID with null safety
      description: item.product?.name || item.description || `สินค้า ${index + 1}`,
      imei: item.imei || '',
      quantity: 1, // QuotationItem ไม่มี quantity field
      unitPrice: Number(item.unitPrice) || 0,
      discount: 0, // QuotationItem ไม่มี discount field
      docFee: Number(item.docFee) || 0,
      totalPrice: Number(item.totalPrice) || 0,
      downAmount: 0, // จะต้องคำนวณจากข้อมูลอื่น
      termCount: 0, // จะต้องคำนวณจากข้อมูลอื่น
      installmentAmount: 0, // จะต้องคำนวณจากข้อมูลอื่น
    };
  });

  console.log('✅ DEBUG: ประมวลผล items เสร็จแล้ว จำนวน:', invoiceItems.length);

  // 3) คำนวณยอดรวม
  const subtotal = invoiceItems.reduce((sum, it) => sum + it.totalPrice, 0);
  // หักส่วนลดก่อน บวก finalDocFee + shippingFee
  const beforeTax = subtotal - discountValue + finalDocFee + (shippingFee || 0);
  const vatVal    = Math.round(beforeTax * 0.07 * 100) / 100;  // VAT 7%
  const netTotal  = beforeTax + vatVal;

  console.log('💰 DEBUG: Invoice calculation (createFromQuotation):', {
    subtotal,
    discountValue,
    finalDocFee,
    shippingFee,
    beforeTax,
    vatVal,
    netTotal
  });

  // 4) สร้างและบันทึก Invoice โดยคัดลอกข้อมูลทั้งหมดจาก Quotation
  console.log('💾 DEBUG: กำลังสร้าง Invoice object...');

  const invoiceData = {
    invoiceNumber: generatedNumber,     // ใช้เลขเดียวกับ quotationNumber
    quotationNumber: q.quotationNumber, // เก็บเลขใบเสนอราคาด้วย
    quotationRef: q._id,
    date: today,
    branchCode: q.branchCode,
    pickupMethod: q.pickupMethod,
    docFee: q.docFee,                   // คัดลอกจาก quotation
    shippingFee: q.shippingFee,         // คัดลอกจาก quotation
    discountValue: q.discountValue,     // คัดลอกจาก quotation
    salesperson: q.salesperson,
    salespersonName: q.salespersonName,
    customer: q.customer,               // คัดลอก customer ทั้งหมด
    witness: q.witness || {},           // คัดลอก witness ถ้ามี
    currency: q.currency,               // คัดลอกสกุลเงิน
    creditTerm: q.creditTerm,           // คัดลอกเงื่อนไขชำระเงิน
    vatInclusive: q.vatInclusive,       // คัดลอกการรวม VAT
    items: invoiceItems,
    summary: q.summary,                 // คัดลอก summary ทั้งหมดจาก quotation
    customerSignatureUrl: q.customerSignatureUrl,
    salespersonSignatureUrl: q.salespersonSignatureUrl,
    authorizedSignatureUrl: q.authorizedSignatureUrl,
    planSummaryText: planSummaryText || q.planSummaryText,
    financedTotal: q.financedTotal,     // คัดลอกยอดผ่อนหลัก
    downTotal: q.downTotal,             // คัดลอกยอดดาวน์รวม
    grandTotal: q.grandTotal,           // คัดลอกยอดรวมทั้งสิ้น
    status: 'sent'
  };

  console.log('📊 DEBUG: Invoice data to save:', JSON.stringify(invoiceData, null, 2));

  try {
    console.log('💾 DEBUG: กำลังบันทึก Invoice ลงฐานข้อมูล...');
    const inv = await Invoice.create(invoiceData);
    console.log('✅ DEBUG: บันทึก Invoice สำเร็จ:', inv._id, inv.invoiceNumber);

    // 5) อัปเดตสถานะใน Quotation ให้มี ref Invoice
    console.log('� DEBUG: กำลังอัปเดต Quotation reference...');
    await require('../models/Installment/Quotation')
          .updateOne({ quotationNumber: q.quotationNumber }, {
            invoiceRef: inv._id,
            status: 'sent'
          });
    console.log('✅ DEBUG: อัปเดต Quotation reference สำเร็จ');

    return inv;
  } catch (saveError) {
    console.error('❌ DEBUG: เกิดข้อผิดพลาดในการบันทึก Invoice:', saveError);
    console.error('📋 DEBUG: Validation errors:', saveError.errors);
    throw saveError;
  }
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
      signatures = {},  // 🔧 เพิ่มรับ signatures object
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

    // ใช้เลขที่ Invoice เดียวกับเลขที่ใบเสนอราคา
    let invNo = '';
    if (quotationRef) {
      // หาเลขที่ใบเสนอราคาจาก quotationRef
      const quotation = await Quotation.findById(quotationRef).select('quotationNumber');
      if (quotation) {
        invNo = quotation.quotationNumber;
      }
    }

    // ถ้าไม่มี quotationRef หรือหาเลขที่ไม่เจอ ให้สร้างเลขใหม่
    if (!invNo) {
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
      invNo  = `${key}${seqStr}`;
    }

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

         // ถ้ามี quotationRef ให้ดึงข้อมูลจาก quotation มาใช้
     let invoiceData = {
       invoiceNumber: invNo,
       quotationRef,
       date,
       branchCode,
       pickupMethod,
       shippingFee,
       docFee,
       discountValue,
       salesperson: req.user.id,
       salespersonName,
       customer: {
         name:    customer.name,
         address: customer.address || '',
         taxId:   customer.taxId   || '',
         phone:   customer.phone   || ''
       },
       items: invoiceItems,
       summary: {
         subtotal,
         shipping:  shippingFee,
         discount:  discountValue,
         tax:       vatVal,
         netTotal
       },
       // 🔧 ลายเซ็น: ใช้จาก signatures object หรือ legacy fields
       customerSignature: signatures.customer || customerSignatureUrl || '',
       customerSignatureUrl: signatures.customer || customerSignatureUrl || '',
       salespersonSignature: signatures.salesperson || salespersonSignatureUrl || '',
       salespersonSignatureUrl: signatures.salesperson || salespersonSignatureUrl || '',
       employeeSignature: signatures.salesperson || salespersonSignatureUrl || '',
       authorizedSignature: signatures.authorized || authorizedSignatureUrl || '',
       authorizedSignatureUrl: signatures.authorized || authorizedSignatureUrl || '',
       planSummaryText,
       status:'sent'
     };

     // ถ้ามี quotationRef ให้คัดลอกข้อมูลทั้งหมดจาก quotation
     if (quotationRef) {
       const fullQuotation = await Quotation.findById(quotationRef).lean();
       if (fullQuotation) {
         // คัดลอกข้อมูลทั้งหมดจาก quotation
         invoiceData = {
           invoiceNumber: invNo,
           quotationNumber: fullQuotation.quotationNumber,
           quotationRef,
           date: date || fullQuotation.date,
           branchCode: fullQuotation.branchCode,
           pickupMethod: fullQuotation.pickupMethod,
           shippingFee: fullQuotation.shippingFee,
           docFee: fullQuotation.docFee,
           discountValue: fullQuotation.discountValue,
           salesperson: fullQuotation.salesperson,
           salespersonName: fullQuotation.salespersonName,
           customer: fullQuotation.customer,
           witness: fullQuotation.witness || {},
           currency: fullQuotation.currency,
           creditTerm: fullQuotation.creditTerm,
           vatInclusive: fullQuotation.vatInclusive,
           items: fullQuotation.items.map(item => ({
             product: item.product,
             imei: item.imei || '',
             description: '',
             quantity: 1,
             unitPrice: item.unitPrice,
             discount: 0,
             docFee: item.docFee,
             totalPrice: item.totalPrice,
             downAmount: 0,
             termCount: 0,
             installmentAmount: 0
           })),
           summary: fullQuotation.summary,
           financedTotal: fullQuotation.financedTotal,
           downTotal: fullQuotation.downTotal,
           grandTotal: fullQuotation.grandTotal,
           // 🔧 ลายเซ็น: ใช้จาก fullQuotation หรือ signatures object หรือ legacy fields
           customerSignature: fullQuotation.customerSignature || signatures.customer || customerSignatureUrl || '',
           customerSignatureUrl: fullQuotation.customerSignatureUrl || signatures.customer || customerSignatureUrl || '',
           salespersonSignature: fullQuotation.salespersonSignature || signatures.salesperson || salespersonSignatureUrl || '',
           salespersonSignatureUrl: fullQuotation.salespersonSignatureUrl || signatures.salesperson || salespersonSignatureUrl || '',
           employeeSignature: fullQuotation.employeeSignature || signatures.salesperson || salespersonSignatureUrl || '',
           authorizedSignature: fullQuotation.authorizedSignature || signatures.authorized || authorizedSignatureUrl || '',
           authorizedSignatureUrl: fullQuotation.authorizedSignatureUrl || signatures.authorized || authorizedSignatureUrl || '',
           planSummaryText: planSummaryText || fullQuotation.planSummaryText || '',
           status: 'sent'
         };
       }
     }

     // สร้างและบันทึก Invoice
     const inv = new Invoice(invoiceData);

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

    // ดึง Invoice พร้อม populate ข้ามไปที่ Quotation เพื่อเอา quotationNumber และ docFee
    const inv = await Invoice.findOne({ $or: orConds }).lean()
      // include quotationNumber และ docFee ใน populate
      .populate({
        path: 'quotationRef',
        select: 'quotationNumber number docFee',
        strictPopulate: false
      })
      .populate({
        path: 'items.product',
        select: 'name',
        strictPopulate: false
      })
      .lean();

    if (!inv) return res.status(404).json({ success: false, error: 'ไม่พบใบแจ้งหนี้' });

    // 1) fallback for quotation number - แก้ไขให้ดึงเลขใบเสนอราคาที่ถูกต้อง
    const quoteNo = inv.quotationRef?.quotationNumber
                  || inv.quotationRef?.number
                  || '-';

    console.log('🔍 DEBUG: Quotation number fallback:', {
      quotationRef: inv.quotationRef,
      quotationNumber: inv.quotationRef?.quotationNumber,
      number: inv.quotationRef?.number,
      finalQuoteNo: quoteNo,
      quotationDocFee: inv.quotationRef?.docFee
    });

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
      name:    rawBranch?.name    || '',
      code:    rawBranch?.branch_code || rawBranch?.code || '', // ← pick whichever exists
      address: rawBranch?.address || '',
      taxId:   rawBranch?.taxId   || '0945566000616',
      tel:     rawBranch?.tel     || '09-2427-0769'
    };

    // กำหนด path ของรูปผู้อนุมัติสำรอง (ใช้เมื่อ inv.authorizedSignatureUrl ว่าง)
    const defaultAuthSig = path.join(process.cwd(), 'uploads', 'S__15892486-Photoroom.png');

    // คำนวณค่าธรรมเนียมเอกสารให้ตรงกับใบเสนอราคา (ใช้ข้อมูลที่ populate มาแล้ว)
    // ลำดับความสำคัญ: invoice.docFee -> quotationRef.docFee -> default 0
    let docFee = ensureNumberData(inv.docFee, 0);
    if (docFee === 0 && inv.quotationRef?.docFee) {
      // ใช้ค่า docFee จาก quotation ที่ populate มาแล้ว (ไม่ต้อง query database อีกครั้ง)
      docFee = ensureNumberData(inv.quotationRef.docFee, 0);
      console.log('🔍 DEBUG: Using docFee from populated quotation:', {
        invoiceDocFee: inv.docFee,
        quotationDocFee: inv.quotationRef.docFee,
        finalDocFee: docFee
      });
    }

    console.log('💰 DEBUG: Document fee calculation (fixed):', {
      invoiceDocFee: inv.docFee,
      quotationDocFee: inv.quotationRef?.docFee,
      finalDocFee: docFee,
      quotationNumber: quoteNo
    });

    // ดึงข้อมูล Quotation เต็มเพื่อส่งเข้า PDF controller
    let quotationData = null;
    if (inv.quotationRef && inv.quotationRef._id) {
      try {
        quotationData = await require('../models/Installment/Quotation')
          .findById(inv.quotationRef._id)
          .lean();
        console.log('🔍 DEBUG: Loaded quotation data for PDF:', {
          quotationNumber: quotationData?.quotationNumber,
          hasCustomer: !!quotationData?.customer,
          hasItems: !!quotationData?.items,
          hasSummary: !!quotationData?.summary
        });
      } catch (error) {
        console.warn('⚠️ Failed to load quotation data:', error.message);
      }
    }

    // เตรียม payload ให้ PDF controller
    const formatted = {
      quotationNumber: quoteNo,      // ค่าที่คำนวณไว้
      number:          quoteNo,      // ← เพิ่ม alias นี้
      invoiceNumber:   inv.invoiceNumber || '-',
      issueDate:       inv.date     || new Date(),
      issueDateFormatted:   formatThaiDate(inv.date), // ← ใช้ฟังก์ชันฟอร์แมตวันที่แบบไทย
      pickupMethod:         inv.pickupMethod   || '',
      shippingFee:          ensureNumberData(inv.shippingFee, 0),
      docFee:               docFee,  // ← ใช้ค่าที่คำนวณใหม่
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
      creditTerm:              inv.creditTerm             || 'เงินสด',
      vatInclusive:            inv.vatInclusive           || false,
      planSummaryText:         inv.planSummaryText        || '',
      // ← เพิ่ม quotationData เพื่อให้ InvoicePdfController sync ข้อมูลได้
      quotationData:           quotationData
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

    // คำนวณ VAT & netTotal โดยใช้ค่า docFee ที่คำนวณใหม่
    const beforeTax = financedTotal + downTotal + docFee + formatted.shippingFee
                    - formatted.discountValue;
    formatted.summary.beforeTax = beforeTax;
    formatted.summary.tax       = Math.round(beforeTax * 0.07 * 100) / 100;
    formatted.summary.netTotal  = beforeTax + formatted.summary.tax;

    console.log('💰 DEBUG: VAT calculation (Invoice):', {
      financedTotal,
      downTotal,
      docFee,
      shippingFee: formatted.shippingFee,
      discountValue: formatted.discountValue,
      beforeTax,
      tax: formatted.summary.tax,
      netTotal: formatted.summary.netTotal
    });

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
    console.log('🔥 DEBUG: createFromQuotation function called!');
    console.log('📋 URL Parameters:', req.params);
    console.log('📝 Request Body:', req.body);
    console.log('👤 User Info:', req.user);

    const { quotationNumber } = req.params;

    console.log('📋 DEBUG: กำลังสร้าง Invoice จาก Quotation:', quotationNumber);

    // รับทั้ง discount และ discountValue (fallback)
    const {
      date = new Date(),
      shippingFee = 0,
      docFee = 0,
      discount = 0,             // ← ค่าจาก front-end
      discountValue = discount, // ← fallback ให้เท่ากับ discount
      planSummaryText = ''
    } = req.body;

    // 1) ดึง Quotation และ populate ข้อมูลสินค้า (BranchStock)
    console.log('🔍 DEBUG: กำลังค้นหา Quotation...');
    const q = await Quotation.findOne({ quotationNumber })
      .populate('items.product', 'name product_id imei')  // BranchStock fields
      .lean();

    if (!q) {
      console.error('❌ ไม่พบใบเสนอราคา:', quotationNumber);
      return res.status(404).json({
        success: false,
        error: `ไม่พบใบเสนอราคาเลขที่ ${quotationNumber}`
      });
    }

    console.log('✅ พบ Quotation แล้ว, จำนวนรายการ:', q.items?.length || 0);

    // 2) ส่งต่อเพื่อสร้าง Invoice
    const inv = await createInvoiceFromQuotationData(q, {
      date,
      shippingFee,
      docFee,
      discountValue,           // ← ส่งต่อ discountValue ที่ถูกต้อง
      planSummaryText,
      user: req.user
    });

    console.log('✅ สร้าง Invoice สำเร็จ:', inv.invoiceNumber);

    // 3) ส่งการแจ้งเตือน WebSocket (แก้ไข: ตรวจสอบ app และ io ก่อนใช้งาน)
    try {
      const io = req.app?.get('io');
      if (io && typeof io.emit === 'function') {
        io.emit('invoiceCreated', { invoiceNumber: inv.invoiceNumber, data: inv });
      }
    } catch (socketError) {
      console.warn('⚠️ WebSocket notification failed:', socketError.message);
    }

    // 4) ตอบกลับ API
    res.status(201).json({
      success: true,
      data: inv,
      message: `สร้างใบแจ้งหนี้เลขที่ ${inv.invoiceNumber} สำเร็จ`
    });
  } catch (err) {
    console.error('❌ เกิดข้อผิดพลาดในการสร้าง Invoice:', err);

    // แปลข้อความ error เป็นภาษาไทย
    let errorMessage = err.message;
    if (errorMessage.includes('validation failed')) {
      errorMessage = 'ข้อมูลไม่ถูกต้อง: ' + errorMessage;
    } else if (errorMessage.includes('required')) {
      errorMessage = 'ข้อมูลไม่ครบถ้วน: ' + errorMessage;
    }

    return res.status(500).json({
      success: false,
      error: errorMessage,
      message: 'ไม่สามารถสร้างใบแจ้งหนี้ได้ กรุณาลองใหม่อีกครั้ง'
    });
  }
};

// Export helper function for creating invoice from quotation
exports.createFromQuotationData = createInvoiceFromQuotationData;

