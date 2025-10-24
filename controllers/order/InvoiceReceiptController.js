// File: controllers/ReceiptController.js
const mongoose = require('mongoose');
const InvoicePdfController = require('../InvoicePdfController');
const Receipt = require('../../models/Receipt');
const Counter = require('../../models/POS/Counter');
const Branch = require('../../models/Account/Branch');
const User = require('../../models/User/User');
const bahtText = require('thai-baht-text');
const path = require('path');
const Customer = require('../../models/Customer/Customer');
const PdfController = require('../pdf/PDFOutReceiptController');

// Constants
const DEFAULT_TAX_RATE = 7;
const DEFAULT_SEQUENCE_PADDING = 4;
const DEFAULT_COMPANY_NAME = 'บริษัท 2 พี่น้อง โมบาย จำกัด';

/**
 * เปลี่ยนค่าเป็นตัวเลข หรือ fallback
 */
function ensureNumberData(value, fallback = 0) {
  const num = Number(value);
  return isNaN(num) ? fallback : num;
}

/**
 * คำนวณ VAT แบบ Tax Inclusive
 */
function calculateVATInclusive(amount, taxRate = DEFAULT_TAX_RATE) {
  return amount * taxRate / (100 + taxRate);
}

/**
 * คำนวณ VAT แบบ Tax Exclusive
 */
function calculateVATExclusive(amount, taxRate = DEFAULT_TAX_RATE) {
  return amount * taxRate / 100;
}

/**
 * คำนวณ totalPrice สำหรับ item
 */
function calculateItemTotalPrice(item) {
  const quantity = ensureNumberData(item.quantity, 1);
  const unitPrice = ensureNumberData(item.unitPrice, 0);
  const discount = ensureNumberData(item.discount, 0);
  return (quantity * unitPrice) - discount;
}

/**
 * sanitize และคำนวณตัวเลขใน formatted object
 */
function sanitizeNumericSections(formatted) {
  if (Array.isArray(formatted.items)) {
    formatted.items = formatted.items.map(i => {
      const quantity = ensureNumberData(i.quantity, 1);
      const unitPrice = ensureNumberData(i.unitPrice, 0);
      const discount = ensureNumberData(i.discount, 0);
      const downAmount = ensureNumberData(i.downAmount, 0);
      const termCount = ensureNumberData(i.termCount, 0);
      const installmentAmount = ensureNumberData(i.installmentAmount, 0);

      return {
        ...i,
        quantity,
        unitPrice,
        discount,
        totalPrice: i.totalPrice ? ensureNumberData(i.totalPrice) : calculateItemTotalPrice(i),
        downAmount,
        termCount,
        installmentAmount,
        taxRate: ensureNumberData(i.taxRate, DEFAULT_TAX_RATE),
        amount: ensureNumberData(i.amount) || downAmount
      };
    });
  }

  if (formatted.summary) {
    formatted.summary = {
      financedTotal: ensureNumberData(formatted.summary.financedTotal),
      downTotal: ensureNumberData(formatted.summary.downTotal),
      subtotal: ensureNumberData(formatted.summary.subtotal),
      discount: ensureNumberData(formatted.summary.discount),
      beforeTax: ensureNumberData(formatted.summary.beforeTax),
      tax: ensureNumberData(formatted.summary.tax),
      netTotal: ensureNumberData(formatted.summary.netTotal),
    };
  }

  formatted.shippingFee = ensureNumberData(formatted.shippingFee);
  formatted.docFee = ensureNumberData(formatted.docFee);
  return formatted;
}

/**
 * สร้าง receiptNumber
 */
async function generateReceiptNumber() {
  const now = new Date();
  const yearBE = now.getFullYear() + 543; // แปลงเป็นปี พ.ศ.
  const yearShort = yearBE.toString().slice(-2); // เอาแค่ 2 หลักสุดท้าย (68)
  const MM = String(now.getMonth() + 1).padStart(2, '0'); // เดือน 2 หลัก (08)
  const DD = String(now.getDate()).padStart(2, '0'); // วัน 2 หลัก (16)
  const datePrefix = `${yearShort}${MM}${DD}`; // 680816
  const dateKey = `RE-${datePrefix}`;

  const ctr = await Counter.findOneAndUpdate(
    { key: 'receipt', reference_value: dateKey },
    { $inc: { seq: 1 }, $setOnInsert: { key: 'receipt', reference_value: dateKey } },
    { new: true, upsert: true, strict: false }
  );

  const receiptNumber = `${dateKey}-${String(ctr.seq).padStart(3, '0')}`;
  console.log('📄 Generated receipt number with current date:', receiptNumber);
  console.log(`🗓️ Date format: ${datePrefix} (${DD}/${MM}/${yearBE} พ.ศ.)`);

  return receiptNumber;
}

/**
 * สร้าง taxInvoiceNumber
 */
async function generateTaxInvoiceNumber() {
  const now = new Date();
  const yearBE = now.getFullYear() + 543; // แปลงเป็นปี พ.ศ.
  const yearShort = yearBE.toString().slice(-2); // เอาแค่ 2 หลักสุดท้าย (68)
  const MM = String(now.getMonth() + 1).padStart(2, '0'); // เดือน 2 หลัก (08)
  const DD = String(now.getDate()).padStart(2, '0'); // วัน 2 หลัก (16)
  const datePrefix = `${yearShort}${MM}${DD}`; // 680816
  const dateKey = `TX-${datePrefix}`;

  const ctr = await Counter.findOneAndUpdate(
    { key: 'tax_invoice', reference_value: dateKey },
    { $inc: { seq: 1 }, $setOnInsert: { key: 'tax_invoice', reference_value: dateKey } },
    { new: true, upsert: true, strict: false }
  );

  const taxInvoiceNumber = `${dateKey}-${String(ctr.seq).padStart(3, '0')}`;
  console.log('📄 Generated tax invoice number with current date:', taxInvoiceNumber);
  console.log(`🗓️ Date format: ${datePrefix} (${DD}/${MM}/${yearBE} พ.ศ.)`);

  return taxInvoiceNumber;
}

/**
 * สร้าง invoiceNumber
 */
async function generateInvoiceNumber() {
  const now = new Date();
  const thaiYear = now.getFullYear() + 543;
  const MM = String(now.getMonth() + 1).padStart(2, '0');
  const DD = String(now.getDate()).padStart(2, '0');
  const dateKey = `INV-${thaiYear}${MM}${DD}`;

  const ctr = await Counter.findOneAndUpdate(
    { key: 'invoice', reference_value: dateKey },
    { $inc: { seq: 1 }, $setOnInsert: { key: 'invoice', reference_value: dateKey } },
    { new: true, upsert: true, strict: false }
  );

  const seqStr = String(ctr.seq).padStart(DEFAULT_SEQUENCE_PADDING, '0');
  return `${dateKey}${seqStr}`;
}

/**
 * ดึงข้อมูลพนักงานขาย
 */
async function getSalespersonInfo(userId, defaultName = '', defaultSignature = '') {
  if (!userId) {
    return {
      name: defaultName || '(ไม่ระบุชื่อ)',
      signatureUrl: defaultSignature
    };
  }

  try {
    const user = await User.findById(userId).lean()
      .populate('employee', 'name')
      .lean();

    return {
      name: user?.employee?.name || defaultName || '(ไม่ระบุชื่อ)',
      signatureUrl: user?.employeeSignatureUrl || defaultSignature
    };
  } catch (error) {
    console.warn('Error fetching salesperson info:', error);
    return {
      name: defaultName || '(ไม่ระบุชื่อ)',
      signatureUrl: defaultSignature
    };
  }
}

/**
 * validate taxType
 */
const validateTaxType = (taxType) => {
  const validTypes = ['รวมภาษี', 'แยกภาษี', 'ไม่มี VAT', 'ภาษีรวมยอดดาวน์', 'ภาษีรวมยอดค่างวด'];
  return validTypes.includes(taxType) ? taxType : 'ไม่มี VAT';
};

/**
 * GET /api/receipt/:id/pdf
 * ดาวน์โหลด PDF ใบเสร็จ/ใบกำกับภาษี โดยใช้ _id ของ InvoiceReceipt
 */
exports.getPdf = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validation
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'รูปแบบ ID ไม่ถูกต้อง'
      });
    }

    // หาใบเสร็จ - เพิ่ม populate เพื่อดึงข้อมูลพนักงาน
    const order = await InvoiceReceipt.findById(id).lean()
      .populate('items.product', 'name')
      .populate({
        path: 'userId',
        select: 'employee',
        populate: {
          path: 'employee',
          select: 'name'
        }
      })
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบเอกสาร'
      });
    }

    // ตรวจสอบข้อมูลรายการสินค้า
    if (!order.items || !Array.isArray(order.items)) {
      return res.status(400).json({
        success: false,
        error: 'ข้อมูลรายการสินค้าไม่ถูกต้อง'
      });
    }

    // ดึงข้อมูลสาขา
    const rawBranch = await Branch.findOne({
      $or: [
        { code: order.branchCode },
        { branch_code: order.branchCode }
      ]
    })
    .select('branch_code code name address taxId tel')
    .lean();

    // ใช้ข้อมูลจาก order ที่ populate มาแล้ว
    const salespersonInfo = {
      name: order.userId?.employee?.name || order.salespersonName || '(ไม่ระบุชื่อ)',
      signatureUrl: order.salespersonSignatureUrl || ''
    };

    // เตรียมข้อมูลสาขา
    const branch = rawBranch ? {
      name: rawBranch.name,
      code: rawBranch.branch_code || rawBranch.code,
      address: rawBranch.address,
      taxId: rawBranch.taxId,
      tel: rawBranch.tel
    } : {
      name: '-',
      code: '-',
      address: '-',
      taxId: '-',
      tel: '-'
    };

    // เตรียมข้อมูล company
    const company = {
      name: DEFAULT_COMPANY_NAME,
    };

    // เตรียมวันที่ออกใบเสร็จ
    const issueDate = order.date || new Date();
    const issueDateFormatted = order.date
      ? new Date(order.date).toLocaleDateString('th-TH')
      : '-';

    // เตรียมข้อมูลลูกค้า
    const customer = {
      name: order.customer?.name || '-',
      address: order.customer?.address || '-',
      taxId: order.customer?.taxId || '-',
      phone: order.customer?.phone || '-'
    };

    // เตรียมรายการสินค้า และคำนวณ VAT ที่สอดคล้องกัน
    const items = order.items.map(i => {
      const downAmount = ensureNumberData(i.downAmount, 0);
      const installmentAmount = ensureNumberData(i.installmentAmount, 0);
      const termCount = ensureNumberData(i.termCount, 0);
      const amount = downAmount;

      return {
        description: i.description || i.product?.name || '-',
        imei: i.imei || '',
        quantity: ensureNumberData(i.quantity, 1),
        unitPrice: ensureNumberData(i.unitPrice, 0),
        discount: ensureNumberData(i.discount, 0),
        totalPrice: calculateItemTotalPrice(i),
        downAmount,
        termCount,
        installmentAmount,
        amount,
        taxRate: ensureNumberData(i.taxRate, DEFAULT_TAX_RATE),
        taxType: validateTaxType(i.taxType)
      };
    });

    // คำนวณสรุปยอด - ใช้วิธีเดียวกันทั้งหมด
    let sumAmount = 0;
    let vatTotal = 0;

    // ✅ ให้ตรงกับ Receipt_installment.js
    items.forEach(item => {
      sumAmount += item.amount;

      if (item.taxType === 'ภาษีรวมยอดดาวน์') {
        // หัก VAT จากยอดดาวน์
        const vatDown = item.downAmount * item.taxRate / (100 + item.taxRate);
        vatTotal += vatDown;
      } else if (item.taxType === 'ภาษีรวมยอดค่างวด') {
        // หัก VAT จากยอดค่างวดทั้งหมด
        const totalInst = item.installmentAmount * item.termCount;
        const vatInst = totalInst * item.taxRate / (100 + item.taxRate);
        vatTotal += vatInst;
      } else if (item.taxType === 'แยกภาษี') {
        // VAT คิดจากยอดรวม
        vatTotal += item.amount * item.taxRate / 100;
      } else if (item.taxType === 'รวมภาษี') {
        // หัก VAT จากยอดรวม
        const vatIncluded = item.amount * item.taxRate / (100 + item.taxRate);
        vatTotal += vatIncluded;
      }
    });

    vatTotal = Math.round(vatTotal * 100) / 100;

    const netBeforeTax = sumAmount - vatTotal;
    const grandTotal = sumAmount;

    const summary = {
      financedTotal: items.reduce((sum, i) => sum + (i.installmentAmount * i.termCount), 0),
      downTotal: items.reduce((sum, i) => sum + i.downAmount, 0),
      subtotal: items.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0),
      discount: items.reduce((sum, i) => sum + i.discount, 0),
      beforeTax: netBeforeTax,
      tax: vatTotal,
      netTotal: grandTotal
    };

    // เตรียม payload สุดท้าย
    const formatted = {
      receiptNumber: order.receiptNumber || '-',
      documentNumber: order.receiptNumber || '-',
      invoiceNumber: order.receiptNumber || '-',
      type: order.type || 'RECEIPT',
      issueDate,
      issueDateFormatted,
      pickupMethod: order.pickupMethod || '-',

      company,
      branch,
      customer,
      salesperson: salespersonInfo,

      items,

      shippingFee: ensureNumberData(order.shippingFee, 0),
      docFee: ensureNumberData(order.docFee, 0),
      paymentMethod: order.paymentMethod || 'เงินสด',

      sumAmount,
      vatTotal,
      netBeforeTax,
      grandTotal,
      amountInWords: bahtText(grandTotal),
      summary,

      planSummaryText: order.planSummaryText || '',
      termsText: order.termsText || '',

      customerSignatureUrl: order.customerSignatureUrl || '',
      salespersonSignatureUrl: salespersonInfo.signatureUrl,
      authorizedSignatureUrl: order.authorizedSignatureUrl || path.join(process.cwd(), 'uploads', 'default-sign.png')
    };

    // sanitize ตัวเลข
    sanitizeNumericSections(formatted);

    // Debug log
    // console.log('➡️ formatted for Receipt PDF:', {
    //   receiptNumber: formatted.receiptNumber,
    //   issueDate: formatted.issueDateFormatted,
    //   branchName: formatted.branch.name,
    //   itemsCount: formatted.items.length,
    //   sumAmount: formatted.sumAmount,
    //   vatTotal: formatted.vatTotal,
    //   grandTotal: formatted.grandTotal
    // });

    // เรียกสร้าง PDF
    const { buffer, fileName } = await InvoicePdfController.createReceiptOrTaxInvoicePdf(formatted);

    return res
      .type('application/pdf')
      .set('Content-Disposition', `attachment; filename="${fileName}"`)
      .send(buffer);

  } catch (err) {
    console.error('PDF Generate Error:', err);

    // จัดการ error แบบละเอียดขึ้น
    if (err.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'รูปแบบข้อมูลไม่ถูกต้อง'
      });
    }

    if (err.message?.includes('PDF')) {
      return res.status(500).json({
        success: false,
        error: 'เกิดข้อผิดพลาดในการสร้าง PDF'
      });
    }

    next(err);
  }
};

/**
 * POST /api/receipt
 * สร้างใบเสร็จ (RECEIPT) หรือ ใบกำกับภาษี (TAX_INVOICE)
 */
exports.create = async (req, res, next) => {
  try {
    const rawPayload = req.body;

    // Calculate idempotency key for duplicate prevention
    const summary = rawPayload.summary || {};
    const branchCode = rawPayload.branchCode || '00000';
    const customerKey = (rawPayload.customer?.taxId || rawPayload.customer?.tax_id || rawPayload.customer?.phone || '').toString().replace(/\s+/g, '');
    const subtotal = Number(summary.subtotal ?? rawPayload.downPaymentAmount ?? 0);
    const docFee = Number(summary.docFee ?? rawPayload.documentFee ?? 0);
    const totalWithTax = Number(summary.totalWithTax ?? (subtotal + docFee));
    const stableIdemKey = [
      'installment',
      branchCode,
      rawPayload.contractNo || 'N/A',
      customerKey || 'N/A',
      totalWithTax.toFixed(2),
      docFee.toFixed(2),
      subtotal.toFixed(2)
    ].join('|');

    // Check for existing receipts (idempotency)
    const InvoiceReceipt = require('../../models/Installment/InvoiceReceipt');
    const incomingKey = rawPayload.idempotencyKey;
    let existingReceipt = null;

    if (incomingKey) {
      existingReceipt = await InvoiceReceipt.findOne({ idempotencyKey: incomingKey });
    }
    if (!existingReceipt) {
      existingReceipt = await InvoiceReceipt.findOne({ idempotencyKey: stableIdemKey });
    }
    if (!existingReceipt && rawPayload.contractNo) {
      existingReceipt = await InvoiceReceipt.findOne({ contractNo: rawPayload.contractNo }).sort({ createdAt: -1 });
    }
    if (!existingReceipt && rawPayload.receiptNumber) {
      existingReceipt = await InvoiceReceipt.findOne({ receiptNumber: rawPayload.receiptNumber });
    }

    if (existingReceipt) {
      return res.status(200).json({
        success: true,
        message: 'Receipt already exists (idempotent)',
        data: existingReceipt
      });
    }

    // Set idempotencyKey in payload
    rawPayload.idempotencyKey = incomingKey || stableIdemKey;

    // Validation พื้นฐาน
    if (!rawPayload.items || !Array.isArray(rawPayload.items) || rawPayload.items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ต้องมีรายการสินค้าอย่างน้อย 1 รายการ'
      });
    }

    // Map items ให้ถูกต้อง
    rawPayload.items = rawPayload.items.map(i => ({
      ...i,
      product: i.product_id || i.product,
      amount: i.amount || ensureNumberData(i.downAmount)
    }));

    // เพิ่มการจัดเก็บ paymentMethod
    rawPayload.paymentMethod = rawPayload.paymentMethod || 'เงินสด';

    // เก็บ userId และชื่อพนักงานขาย
    if (req.user && req.user.id) {
      rawPayload.userId = req.user.id;
    }

    // ดึงข้อมูลพนักงานขาย
    const salespersonInfo = await getSalespersonInfo(
      req.user?.id,
      rawPayload.salespersonName,
      rawPayload.salespersonSignatureUrl
    );

    // บันทึกชื่อพนักงานขาย
    rawPayload.salespersonName = salespersonInfo.name;
    rawPayload.salespersonSignatureUrl = salespersonInfo.signatureUrl;

    // สร้าง receiptNumber
    const receiptNumber = await generateReceiptNumber();
    rawPayload.receiptNumber = receiptNumber;

    // บันทึกข้อมูล
    const receipt = new InvoiceReceipt(rawPayload);
    const saved = await receipt.save();

    // บันทึกข้อมูลลูกค้า (ถ้ามี)
    let customerRecord = null;
    if (rawPayload.customer && (rawPayload.customer.individual || rawPayload.customer.customerType === 'individual')) {
      try {
        // กำหนด receiptType ตาม planType
        let receiptType = 'installment_ongoing'; // default
        if (rawPayload.planType === 'plan3') {
          receiptType = 'installment_pickup';
        } else if (rawPayload.type === 'PAYOFF_RECEIPT') {
          receiptType = 'installment_ongoing';
        }

        customerRecord = await recordReceiptCustomer(rawPayload.customer, saved, req.user?.id, receiptType);
        // console.log('✅ Customer record saved for receipt:', customerRecord._id);
      } catch (customerError) {
        console.error('❌ Customer recording failed for receipt:', customerError);
        // ไม่ให้ error ของลูกค้ามาหยุดการทำงานของใบเสร็จ
      }
    }

    return res.status(201).json({
      success: true,
      data: saved,
      customerInfo: customerRecord ? {
        customerId: customerRecord._id,
        isNewCustomer: customerRecord.statistics.isNewCustomer
      } : null
    });

  } catch (err) {
    console.error('Error in create InvoiceReceipt:', err);

    if (err.name === 'ValidationError') {
      const fieldErrors = Object.keys(err.errors).map(field => ({
        field,
        message: err.errors[field].message
      }));

      return res.status(400).json({
        success: false,
        error: 'ข้อมูลไม่ครบถ้วน โปรดตรวจสอบฟิลด์ที่จำเป็น',
        details: fieldErrors
      });
    }

    if (err.code === 11000 && err.keyPattern?.receiptNumber) {
      return res.status(400).json({
        success: false,
        error: 'เลขที่เอกสารซ้ำ (receiptNumber) โปรดลองใหม่อีกครั้ง'
      });
    }

    next(err);
  }
};

/**
 * POST /api/receipt/:quotationId/invoice
 * สร้างใบกำกับภาษี (TAX_INVOICE) จากข้อมูล Quotation
 */
exports.createFromQuotation = async (req, res, next) => {
  try {
    const Quotation = require('../models/Installment/Quotation');
    const { quotationId } = req.params;
    const {
      shippingFee = 0,
      docFee = 0,
      discount = 0,
      planSummaryText = '',
      paymentMethod = 'เงินสด'   // default เป็น 'เงินสด' หากไม่ส่งมา
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(quotationId)) {
      return res.status(400).json({
        success: false,
        error: 'รูปแบบ Quotation ID ไม่ถูกต้อง'
      });
    }

    const quotation = await Quotation.findById(quotationId).lean()
      .populate('items.product', 'name')
      .lean();

    if (!quotation) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบใบเสนอราคา'
      });
    }

    if (!quotation.items || !Array.isArray(quotation.items) || quotation.items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ใบเสนอราคาไม่มีรายการสินค้า'
      });
    }

    // สร้าง receiptNumber ใหม่
    const receiptNumber = await generateReceiptNumber();

    // แปลง items และคำนวณ amount
    const items = quotation.items.map(it => {
      const downAmount = ensureNumberData(it.downAmount, 0);
      const installmentAmount = ensureNumberData(it.installmentAmount, 0);
      const termCount = ensureNumberData(it.termCount, 0);
      const amount = downAmount;

      return {
        product: it.product._id,
        description: it.product.name,
        imei: it.imei || '',
        quantity: ensureNumberData(it.quantity, 1),
        unitPrice: ensureNumberData(it.unitPrice, 0),
        discount: ensureNumberData(it.discount, 0),
        downAmount,
        termCount,
        installmentAmount,
        amount,
        taxRate: quotation.summary?.taxRate || DEFAULT_TAX_RATE,
        taxType: validateTaxType(quotation.summary?.taxType)
      };
    });

    // คำนวณสรุปยอด - ใช้วิธีเดียวกับ getPdf()
    const subtotal = items.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);
    const totalDisc = items.reduce((sum, i) => sum + (i.discount || 0), 0);

    // แทนที่การคำนวณ taxVal เดิม
    let vatTotal = 0;
    const taxType = validateTaxType(quotation.summary?.taxType);
    const taxRate = quotation.summary?.taxRate || DEFAULT_TAX_RATE;

    // คำนวณ VAT ตาม taxType
    let sumAmount = 0; // เพิ่มตัวแปรนี้
    items.forEach(item => {
      item.taxType = taxType; // ใช้ taxType เดียวกันทั้งใบ
      sumAmount += item.amount; // เพิ่มการรวมยอด amount

      if (item.taxType === 'ภาษีรวมยอดดาวน์') {
        const vatDown = item.downAmount * item.taxRate / (100 + item.taxRate);
        vatTotal += vatDown;
      } else if (item.taxType === 'ภาษีรวมยอดค่างวด') {
        const totalInst = item.installmentAmount * item.termCount;
        const vatInst = totalInst * item.taxRate / (100 + item.taxRate);
        vatTotal += vatInst;
      } else if (item.taxType === 'แยกภาษี') {
        vatTotal += item.amount * item.taxRate / 100;
      } else if (item.taxType === 'รวมภาษี') {
        const vatIncluded = item.amount * item.taxRate / (100 + item.taxRate);
        vatTotal += vatIncluded;
      }
    });

    vatTotal = Math.round(vatTotal * 100) / 100;

    // แก้ไขการคำนวณ netTotal ให้สอดคล้องกับ taxType
    let netTotalCalc;
    if (taxType === 'แยกภาษี') {
      // กรณีแยกภาษี: ยอดสุทธิ = ยอดรวม + VAT + ค่าธรรมเนียม - ส่วนลด
      netTotalCalc = sumAmount + vatTotal + ensureNumberData(docFee) + ensureNumberData(shippingFee) - ensureNumberData(discount);
    } else if (taxType === 'รวมภาษี' || taxType === 'ภาษีรวมยอดดาวน์' || taxType === 'ภาษีรวมยอดค่างวด') {
      // กรณีรวมภาษี: VAT รวมอยู่ในยอดแล้ว
      netTotalCalc = sumAmount + ensureNumberData(docFee) + ensureNumberData(shippingFee) - ensureNumberData(discount);
    } else {
      // กรณีไม่มี VAT
      netTotalCalc = sumAmount + ensureNumberData(docFee) + ensureNumberData(shippingFee) - ensureNumberData(discount);
    }

    // คำนวณ beforeTax ใหม่ให้ถูกต้อง
    const beforeTaxCalc = netTotalCalc - vatTotal;

    // ดึงข้อมูลพนักงานขาย
    const salespersonInfo = await getSalespersonInfo(req.user?.id);

    // ประกอบ payload
    const invoicePayload = {
      receiptNumber,
      type: 'TAX_INVOICE',
      date: new Date(),
      branchCode: quotation.branchCode || '',
      pickupMethod: quotation.pickupMethod || '',
      customer: quotation.customer,
      items,
      docFee: ensureNumberData(docFee),
      shippingFee: ensureNumberData(shippingFee),
      planSummaryText,

      // **ตรงนี้สำคัญ** ให้เอา paymentMethod ที่อ่านจาก req.body มาใส่
      paymentMethod: paymentMethod,

      summary: {
        financedTotal: items.reduce((sum, i) => sum + (i.installmentAmount * i.termCount), 0),
        downTotal: items.reduce((sum, i) => sum + (i.downAmount || 0), 0),
        subtotal,
        discount: ensureNumberData(discount),
        beforeTax: beforeTaxCalc,
        tax: vatTotal,
        netTotal: netTotalCalc
      },
      salespersonName: salespersonInfo.name,
      salespersonSignatureUrl: salespersonInfo.signatureUrl
    };

    const invoice = new InvoiceReceipt(invoicePayload);
    const saved = await invoice.save();
    return res.status(201).json({ success: true, data: saved });

  } catch (err) {
    console.error('Error creating invoice from quotation:', err);

    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'ข้อมูลไม่ครบถ้วน โปรดตรวจสอบฟิลด์ที่จำเป็น',
        details: Object.keys(err.errors).map(field => ({
          field,
          message: err.errors[field].message
        }))
      });
    }

    if (err.code === 11000 && err.keyPattern?.receiptNumber) {
      return res.status(400).json({
        success: false,
        error: 'เลขที่เอกสารซ้ำ (receiptNumber) โปรดลองใหม่อีกครั้ง'
      });
    }

    next(err);
  }
};

/**
 * DELETE /api/receipt/:id
 * ลบใบเสร็จ/ใบกำกับภาษี โดยใช้ _id
 */
exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'รูปแบบ ID ไม่ถูกต้อง'
      });
    }

    const result = await InvoiceReceipt.findByIdAndDelete(id);
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบเอกสารที่จะลบ'
      });
    }

    return res.json({
      success: true,
      message: 'ลบเอกสารสำเร็จ',
      deletedId: id
    });
  } catch (err) {
    console.error('Error deleting receipt:', err);
    next(err);
  }
};

// ฟังก์ชันหาหรือสร้างลูกค้า
async function findOrCreateCustomer(customerData, userId) {
  let customer = null;

  // หาลูกค้าด้วย taxId ก่อน
  if (customerData.individual?.taxId) {
    customer = await Customer.findOne({
      'individual.taxId': customerData.individual.taxId,
      deleted_at: null
    });
  }

  // ถ้าไม่เจอ ให้หาด้วยเบอร์โทร
  if (!customer && customerData.individual?.phone) {
    customer = await Customer.findOne({
      'individual.phone': customerData.individual.phone,
      deleted_at: null
    });
  }

  // ถ้ายังไม่เจอ ให้สร้างใหม่
  if (!customer) {
    const newCustomerData = {
      ...customerData,
      createdBy: userId
    };
    customer = new Customer(newCustomerData);
    await customer.save();
  }

  return customer;
}

// ฟังก์ชันบันทึกข้อมูลลูกค้าสำหรับใบเสร็จ
async function recordReceiptCustomer(customerData, receiptData, userId, receiptType = 'installment_ongoing') {
  try {
    let customer = await findOrCreateCustomer(customerData, userId);

    const purchaseRecord = {
      type: receiptType,
      orderId: receiptData._id,
      orderModel: 'InvoiceReceipt',
      purchaseDate: new Date(),
      amount: receiptData.summary?.netTotal || receiptData.netTotal || 0,
      branchCode: receiptData.branchCode,
      contractNo: receiptData.receiptNumber,
      planType: receiptData.planType,
      saleDetails: {
        pickupMethod: receiptData.pickupMethod || 'store',
        deliveryStatus: receiptType === 'installment_pickup' ? 'pending' : 'delivered',
        usageStatus: receiptType === 'installment_ongoing' ? 'active' : 'completed',
        completionDate: receiptType === 'installment_pickup' ? null : new Date()
      },
      items: (receiptData.items || []).map(item => ({
        productId: item.product,
        name: item.description || item.name,
        imei: item.imei || '',
        qty: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.amount,
        downPayment: item.downAmount || 0,
        installmentAmount: item.installmentAmount || 0,
        installmentTerms: item.termCount || 0
      }))
    };

    customer.addPurchaseHistory(purchaseRecord);
    await customer.save();
    return customer;
  } catch (error) {
    console.error('Error recording receipt customer:', error);
    throw error;
  }
}

// Export functions for use in other controllers
exports.generateReceiptNumber = generateReceiptNumber;
exports.generateTaxInvoiceNumber = generateTaxInvoiceNumber;
exports.generateInvoiceNumber = generateInvoiceNumber;
