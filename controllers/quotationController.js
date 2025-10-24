// controllers/quotationController.js

const mongoose      = require('mongoose');
const Quotation     = require('../models/Installment/Quotation');
const Customer      = require('../models/Customer/Customer');
const Counter       = require('../models/POS/Counter');
const PdfController = require('./QuotationPdfController');
const User          = require('../models/User/User');
const BranchStock   = require('../models/POS/BranchStock'); // เพิ่ม import BranchStock
const path          = require('path');
const { createFromQuotationData } = require('./invoiceController');

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

// ฟังก์ชันบันทึกข้อมูลลูกค้าสำหรับการผ่อนใหม่
async function recordInstallmentCustomer(customerData, quotationData, userId) {
  try {
    let customer = await findOrCreateCustomer(customerData, userId);

    const purchaseRecord = {
      type: 'installment_new',
      orderId: quotationData._id,
      orderModel: 'InstallmentOrder',
      purchaseDate: new Date(),
      amount: quotationData.summary.netTotal,
      branchCode: quotationData.branchCode,
      contractNo: quotationData.quotationNumber,
      planType: quotationData.planType,
      saleDetails: {
        pickupMethod: quotationData.pickupMethod,
        deliveryStatus: 'pending',
        usageStatus: 'active'
      },
      items: quotationData.items.map(item => ({
        productId: item.product,
        name: item.name || `สินค้า ${item.imei}`,
        imei: item.imei,
        qty: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        downPayment: item.downAmount,
        installmentAmount: item.installmentAmount,
        installmentTerms: item.termCount
      }))
    };

    customer.addPurchaseHistory(purchaseRecord);
    await customer.save();
    return customer;
  } catch (error) {
    console.error('Error recording installment customer:', error);
    throw error;
  }
}

// POST /api/quotation
exports.createQuotation = async (req, res, next) => {
  try {
    // 1) ดึงค่าจาก body พร้อมการตรวจสอบข้อมูล
    const {
      date,
      branchCode,
      docFee = 0,
      pickupMethod = 'store',
      shippingFee = 0,
      witness = {},
      customer = {},
      items = [],
      summary = {},
      signatures = {},  // 🔧 เพิ่มรับ signatures object
      customerSignatureUrl = '',
      salespersonSignatureUrl = '',
      authorizedSignatureUrl = '',
      planType = '',
      downPayment = 0,
      installmentCount = 0,
      installmentAmount = 0,
      currency = 'THB',
      creditTerm = '30 วัน',
      vatInclusive = true,
      discount = 0,                    // ← accept per‐line discount
      discountValue = discount,        // ← default invoice discount
      planSummaryText = '',
      // เพิ่มข้อมูลการจองสต็อก
      stockReservation = null,
      hasStockReservation = false,
      depositNavigationData = null,
      // เพิ่มฟิลด์สำหรับการตรวจสอบข้อมูลลูกค้า
      customerValidationData = {}
    } = req.body;

    // ✅ Enhanced Thai customer data validation
    if (customer.name && customer.name.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'ชื่อลูกค้าต้องมีความยาวอย่างน้อย 2 ตัวอักษร'
      });
    }

    // ✅ Thai phone number validation
    if (customer.phone) {
      const phoneRegex = /^[0-9]{9,10}$/;
      const cleanPhone = customer.phone.replace(/\D/g, '');
      if (!phoneRegex.test(cleanPhone)) {
        return res.status(400).json({
          success: false,
          error: 'เบอร์โทรศัพท์ต้องเป็นตัวเลข 9-10 หลัก'
        });
      }
    }

    // ✅ Thai ID card validation (if provided)
    if (customer.taxId || customer.idCard) {
      const idCard = customer.taxId || customer.idCard;
      const cleanId = idCard.replace(/\D/g, '');
      if (cleanId.length === 13) {
        // Thai ID validation algorithm
        let sum = 0;
        for (let i = 0; i < 12; i++) {
          sum += parseInt(cleanId.charAt(i)) * (13 - i);
        }
        const checkDigit = (11 - (sum % 11)) % 10;
        if (checkDigit !== parseInt(cleanId.charAt(12))) {
          return res.status(400).json({
            success: false,
            error: 'เลขบัตรประชาชนไม่ถูกต้อง'
          });
        }
      }
    }

    // 2) ตรวจฟิลด์จำเป็น
    const missing = [];
    if (!date)            missing.push('date');
    if (!branchCode)      missing.push('branchCode');
    if (!customer.name)   missing.push('customer.name');
    if (!items.length)    missing.push('items');
    ['subtotal','beforeTax','tax','netTotal'].forEach(k => {
      if (summary[k] == null) missing.push(`summary.${k}`);
    });
    if (!planType)        missing.push('planType');
    if (downPayment == null)      missing.push('downPayment');
    if (installmentCount == null) missing.push('installmentCount');
    if (installmentAmount == null)missing.push('installmentAmount');
    if (missing.length) {
      return res.status(400).json({
        success: false,
        error: `ข้อมูลไม่ครบ: ${missing.join(', ')}`
      });
    }

    // 3) หา salespersonName
    let salespersonName = req.user.name || '';
    if (!salespersonName) {
      const u = await User.findById(req.user.id)
                          .populate('employee','name')
                          .lean();
      salespersonName = u?.employee?.name || '';
    }
    if (!salespersonName) {
      return res.status(400).json({
        success: false,
        error: 'ไม่พบชื่อพนักงานขาย'
      });
    }

    // 4) สร้างหมายเลข QT ใหม่ โดยใช้ DocumentNumberSystem (รูปแบบ QT-680730-001)
    const { DocumentNumberSystem } = require('../utils/DocumentNumberSystem');
    let quotationNumber;

    try {
      quotationNumber = await DocumentNumberSystem.generateQuotationNumber();
      console.log('✅ Generated quotation number using DocumentNumberSystem:', quotationNumber);
    } catch (error) {
      console.error('❌ Error using DocumentNumberSystem, falling back to legacy format:', error);
      // Fallback ใช้รูปแบบเก่าแต่เพิ่ม dash
      const today = new Date();
      const y     = today.getFullYear() + 543; // ใช้ปี พ.ศ.
      const m     = String(today.getMonth() + 1).padStart(2, '0');
      const d     = String(today.getDate()).padStart(2, '0');
      const prefixDate = `QT-${String(y).slice(-2)}${m}${d}`; // เพิ่ม dash และใช้ปี พ.ศ.

      const counter = await Counter.findOneAndUpdate(
        { key: 'quotation', reference_value: prefixDate },
        {
          $inc: { seq: 1 },
          $setOnInsert: { key: 'quotation', reference_value: prefixDate }
        },
        { new: true, upsert: true }
      );
      const seqStr = String(counter.seq).padStart(3,'0');
      quotationNumber = `${prefixDate}-${seqStr}`;
    }

    // 5) สร้าง document Quotation
    const newQuotation = new Quotation({
      number:              quotationNumber,      // ← แก้ตรงนี้
      quotationNumber:     quotationNumber,      // ← และตรงนี้
      date,
      branchCode,
      docFee,
      pickupMethod,
      shippingFee,
      salesperson:         req.user.id,
      salespersonName,
      customer: {
        name:    customer.name || customer.fullAddress,
        address: customer.fullAddress || customer.address || '',
        taxId:   customer.individual?.taxId || customer.taxId || '',
        phone:   customer.individual?.phone || customer.phone || '',
        email:   customer.individual?.email || customer.email || ''
      },
      witness,
      // 🔧 ลายเซ็น: ใช้จาก signatures object หรือ legacy fields
      customerSignature: signatures.customer || customerSignatureUrl || '',
      customerSignatureUrl: signatures.customer || customerSignatureUrl || '',
      salespersonSignature: signatures.salesperson || salespersonSignatureUrl || '',
      salespersonSignatureUrl: signatures.salesperson || salespersonSignatureUrl || '',
      employeeSignature: signatures.salesperson || salespersonSignatureUrl || '',
      authorizedSignature: signatures.authorized || authorizedSignatureUrl || '',
      authorizedSignatureUrl: signatures.authorized || authorizedSignatureUrl || '',
      currency,
      creditTerm,
      vatInclusive,
      discountValue,                   // ← store invoice‐level discount
      planType,
      downPayment,
      installmentCount,
      installmentAmount,
      items: items.map((i, index) => {
        const productId = i.productId || i.product || i.product_id;
        console.log(`🔍 DEBUG: Item ${index} - productId จาก frontend:`, {
          productId: productId,
          productIdField: i.productId,
          productField: i.product,
          product_idField: i.product_id,
          imei: i.imei,
          name: i.name
        });

        return {
          product:           productId,
          imei:              i.imei || '',
          quantity:          Number(i.qty ?? i.quantity) || 1,
          unitPrice:         Number(i.unitPrice) || 0,
          totalPrice:        Number(i.totalPrice) || 0,
          docFee:            Number(i.docFee) || 0,
          downAmount:        Number(i.downAmount) || 0,
          installmentAmount: Number(i.installmentAmount) || 0,
          termCount:         Number(i.termCount) || 0,
          taxRate:           Number(i.taxRate) || 0,
          taxType:           i.taxType || 'ไม่มี VAT'
        };
      }),
      summary: {
        subtotal:  summary.subtotal,
        beforeTax: summary.beforeTax,
        shipping:  summary.shipping ?? shippingFee,
        discount:  summary.discount ?? discountValue,  // ← use discountValue if summary.discount missing
        tax:       summary.tax,
        netTotal:  summary.netTotal
      },
      status: 'draft'
    });
    const created = await newQuotation.save();

    // 5.5) บันทึกข้อมูลลูกค้า (ผ่อนใหม่)
    let customerRecord = null;
    if (customer && (customer.individual || customer.customerType === 'individual')) {
      try {
        customerRecord = await recordInstallmentCustomer(customer, created, req.user.id);
        // console.log('✅ Customer record saved:', customerRecord._id);
      } catch (customerError) {
        console.error('❌ Customer recording failed:', customerError);
        // ไม่ให้ error ของลูกค้ามาหยุดการทำงานของ quotation
      }
    }

    // 6) ไม่สร้าง Invoice ทันที - ให้ frontend เรียกแยก
    console.log('📋 สร้าง Quotation สำเร็จ - ไม่สร้าง Invoice ทันที');

    // บันทึก reference ว่าจะต้องสร้าง Invoice ภายหลัง
    // (ฟังก์ชันสร้าง Invoice จะถูกเรียกแยกจาก frontend)

    // จัดการการจองสต็อกหลังสร้างใบเสนอราคาสำเร็จ
    let stockReservationResult = null;
    if (hasStockReservation && stockReservation) {
      try {
        console.log('🔒 Processing stock reservation for quotation:', stockReservation);

        // ใช้การจองสต็อก
        const StockReservationController = require('./StockReservationController');
        const mockReq = {
          body: {
            reservationId: stockReservation.reservationId,
            transactionId: quotationNumber,
            saleType: 'installment'
          },
          user: req.user
        };

        const mockRes = {
          json: (data) => data,
          status: (code) => ({ json: (data) => data })
        };

        stockReservationResult = await StockReservationController.useReservation(mockReq, mockRes);
        console.log('✅ Stock reservation processed:', stockReservationResult);

      } catch (stockError) {
        console.error('❌ Error processing stock reservation:', stockError);
        // ไม่ให้ error ของ stock reservation หยุดการสร้างใบเสนอราคา
        stockReservationResult = { error: stockError.message };
      }
    }

    // 7) ตอบกลับ
    return res.status(201).json({
      success: true,
      data: {
        quotationNumber,
        quotationId: created._id,
        stockReservation: stockReservationResult,
        hasStockReservation: hasStockReservation
        // ไม่ส่ง invoiceNumber เพราะยังไม่ได้สร้าง Invoice
      },
      message: 'สร้างใบเสนอราคาเรียบร้อย - เตรียมสร้าง Invoice ต่อไป'
    });

  } catch (err) {
    console.error('Error createQuotation:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/quotation
exports.getAllQuotations = async (req, res) => {
  try {
    const list = await Quotation.find().limit(100).lean()
      .sort({ createdAt: -1 })
      .populate('items.product', 'name imei')
      .populate('invoiceRef', 'invoiceNumber')
      .lean();

    res.json({ success: true, data: list });
  } catch (err) {
    console.error('Error fetching quotations:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/quotation/:id
exports.getQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    const conditions = [];
    if (mongoose.Types.ObjectId.isValid(id)) {
      conditions.push({ _id: id });
    }
    conditions.push({ quotationNumber: id });

    const quote = await Quotation.findOne({ $or: conditions }).lean()
      .populate('invoiceRef', 'invoiceNumber')
      .lean();
    if (!quote) {
      return res.status(404).json({ success: false, error: 'ไม่พบใบเสนอราคา' });
    }
    res.json({ success: true, data: quote });
  } catch (err) {
    console.error('Error fetching quotation:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

// GET /api/quotation/next-number
exports.getNextNumber = async (req, res) => {
  try {
    const { DocumentNumberSystem } = require('../utils/DocumentNumberSystem');

    try {
      // ใช้ DocumentNumberSystem เพื่อดึงเลขถัดไป
      const nextNumber = await DocumentNumberSystem.getNextQuotationNumber();
      return res.json({ success: true, nextNumber: nextNumber });
    } catch (error) {
      console.error('❌ Error using DocumentNumberSystem for next number, falling back:', error);

      // Fallback ใช้รูปแบบเก่าแต่เพิ่ม dash
      const today = new Date();
      const y     = today.getFullYear() + 543; // ใช้ปี พ.ศ.
      const m     = String(today.getMonth() + 1).padStart(2, '0');
      const d     = String(today.getDate()).padStart(2, '0');
      const prefixDate = `QT-${String(y).slice(-2)}${m}${d}`;

      // หาว่ามี counter อยู่แล้วหรือยัง (ไม่ increment)
      const counter = await Counter.findOne({
        key: 'quotation',
        reference_value: prefixDate
      }).lean();

      // ถ้ามีแล้วให้ +1 แต่ยังไม่เขียนลง DB
      const nextSeq = counter ? counter.seq + 1 : 1;
      const seqStr  = String(nextSeq).padStart(3, '0');
      const nextNum = `${prefixDate}-${seqStr}`;

      return res.json({ success: true, nextNumber: nextNum });
    }
  } catch (err) {
    console.error('Error generating next number:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};


// GET /api/quotation/:id/pdf
exports.getPdf = async (req, res, next) => {
  try {
    const { id } = req.params;
    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { quotationNumber: id }] }
      : { quotationNumber: id };

    const quotation = await Quotation.findOne(query)
      .populate('salesperson','name signatureUrl')
      .populate('items.product','name product_id sku imei')
      .lean();

    if (!quotation) {
      return res.status(404).json({ success:false, error:'ไม่พบใบเสนอราคา' });
    }

    // โหลดข้อมูลสาขา
    const Branch = require('../models/Account/Branch');
    const rawBranch = await Branch.findOne({ branch_code: quotation.branchCode }).lean()
   .select('branch_code name address taxId tel')
   .lean();
 // map field branch_code → code เพื่อให้ PdfController ใช้ง่ายขึ้น
 const branch = {
   name:    rawBranch.name,
   code:    rawBranch.branch_code,
   address: rawBranch.address,
   taxId:   rawBranch.taxId,
   tel:     rawBranch.tel
 };

    // เตรียมข้อมูลสำหรับ PDF
    const defaultAuthSig = path.join(process.cwd(),'uploads','S__15892486-Photoroom.png');
    const planType = quotation.planType;
    const formattedItems = quotation.items.map(i => {
      const qty  = Number(i.quantity)           || 1;
      const down = Number(i.downAmount)         || 0;
      const fin  = Number(i.installmentAmount) * Number(i.termCount) || 0;
      let unitPrice = 0, totalPrice = 0;
      if (planType === 'plan1') {
        unitPrice  = down + fin;
        totalPrice = unitPrice * qty;
      } else if (planType === 'plan2') {
        unitPrice  = Number(i.installmentAmount);
        totalPrice = unitPrice * qty;
      } else {
        unitPrice  = Number(i.totalPrice);
        totalPrice = unitPrice * qty;
      }
      return {
        description:       i.product?.name || '-',
        imei:              i.imei          || '-',
        quantity:          qty,
        downAmount:        down,
        termCount:         Number(i.termCount)         || 0,
        installmentAmount: Number(i.installmentAmount) || 0,
        unitPrice,
        totalPrice,
        discount:          Number(i.discount) || 0,
        taxRate:           Number(i.taxRate)  || 0,
        taxType:           i.taxType         || 'ไม่มี VAT'
      };
    });

    // เตรียมข้อมูลสำหรับ PDF
    const formatted = {
      quotationNumber:      quotation.quotationNumber,
      quotationNo:          quotation.quotationNumber,  // เพิ่มเพื่อให้ QuotationPdfController อ่านได้
      order_number:         quotation.quotationNumber,  // เพิ่ม fallback
      issueDate:            quotation.date,
      issueDateFormatted:   new Date(quotation.date).toLocaleDateString('th-TH'),
      pickupMethod:         quotation.pickupMethod,
      shippingFee:          quotation.shippingFee || 0,
      docFee:               quotation.docFee      || 0,
      company:              { name:'บริษัท 2 พี่น้อง โมบาย จำกัด' },
      branch,
      customer:             quotation.customer,
      items:                formattedItems,
      summary: {
        subtotal: quotation.summary.subtotal,
        shipping: quotation.summary.shipping,
        discount: quotation.summary.discount,         // ← เพิ่มบรรทัดนี้
        tax:      quotation.summary.tax,
        netTotal: quotation.summary.netTotal
      },
      currency:             quotation.currency || 'THB',
      creditTerm:           quotation.creditTerm,
      vatInclusive:         quotation.vatInclusive,
      discountValue:        quotation.discountValue,
      planType,
      downPayment:          quotation.downPayment,
      installmentCount:     quotation.installmentCount,
      installmentAmount:    quotation.installmentAmount,
      salesperson: {
        name: quotation.salesperson?.name || quotation.salespersonName
      },
      salespersonSignatureUrl:
        quotation.salespersonSignatureUrl ||
        quotation.salesperson?.signatureUrl ||
        '',
      customerSignatureUrl:   quotation.customerSignatureUrl || '',
      authorizedSignatureUrl: quotation.authorizedSignatureUrl || defaultAuthSig,
      termsText: `…เงื่อนไขการรับประกัน…`
    };

    // apply discount to first line
    if (formatted.discountValue > 0 && formatted.items.length > 0) {
      formatted.items[0].discount   = formatted.discountValue;
      formatted.items[0].totalPrice = formatted.items[0].totalPrice - formatted.discountValue;
    }

    // sanitize ตัวเลข
    sanitizeNumericSections(formatted);

    // สร้าง PDF แล้วส่งกลับ
    const { buffer, fileName } = await PdfController.createQuotationPdf(formatted);
    res
      .type('application/pdf')
      .set('Content-Disposition', `attachment; filename="${fileName}"`)
      .send(buffer);

  } catch (err) {
    console.error('Error getPdf:', err);
    next(err);
  }
};

// DELETE /api/quotation/:id
exports.deleteQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Quotation.findOneAndDelete({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
        { quotationNumber: id }
      ]
    });
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'ไม่พบใบเสนอราคา' });
    }
    req.app.get('io')?.emit('quotationDeleted', { id });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting quotation:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

// ✅ Enhanced Step 2 Customer Data Processing
exports.processStep2CustomerData = async (req, res) => {
  try {
    const {
      customerData = {},
      addressData = {},
      occupationData = {},
      documentData = {},
      validateOnly = false
    } = req.body;

    console.log('📋 Processing Step 2 customer data:', {
      hasCustomerData: !!customerData,
      hasAddressData: !!addressData,
      validateOnly
    });

    // ✅ Enhanced validation with Thai language support
    const validationErrors = [];

    // Required customer fields validation
    if (!customerData.firstName || customerData.firstName.trim().length < 2) {
      validationErrors.push('ชื่อต้องมีอย่างน้อย 2 ตัวอักษร');
    }

    if (!customerData.lastName || customerData.lastName.trim().length < 2) {
      validationErrors.push('นามสกุลต้องมีอย่างน้อย 2 ตัวอักษร');
    }

    // Thai ID card validation
    if (customerData.idCard) {
      const cleanId = customerData.idCard.replace(/[-\s]/g, '');
      if (cleanId.length !== 13 || !/^\d{13}$/.test(cleanId)) {
        validationErrors.push('เลขบัตรประชาชนต้องมี 13 หลัก');
      } else {
        // Thai ID validation algorithm
        let sum = 0;
        for (let i = 0; i < 12; i++) {
          sum += parseInt(cleanId.charAt(i)) * (13 - i);
        }
        const checkDigit = (11 - (sum % 11)) % 10;
        if (checkDigit !== parseInt(cleanId.charAt(12))) {
          validationErrors.push('เลขบัตรประชาชนไม่ถูกต้อง');
        }
      }
    }

    // Thai phone number validation
    if (customerData.phone) {
      const cleanPhone = customerData.phone.replace(/\D/g, '');
      if (cleanPhone.length < 9 || cleanPhone.length > 10) {
        validationErrors.push('เบอร์โทรศัพท์ต้องมี 9-10 หลัก');
      }

      const phonePatterns = [
        /^0[6-9]\d{8}$/, // Mobile
        /^0[2-5]\d{7,8}$/ // Landline
      ];

      if (!phonePatterns.some(pattern => pattern.test(cleanPhone))) {
        validationErrors.push('รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง');
      }
    }

    // Email validation (optional)
    if (customerData.email) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(customerData.email)) {
        validationErrors.push('รูปแบบอีเมลไม่ถูกต้อง');
      }
      if (/[\u0E00-\u0E7F]/.test(customerData.email)) {
        validationErrors.push('อีเมลไม่ควรมีอักษรไทย');
      }
    }

    // Age validation
    if (customerData.age) {
      const age = parseInt(customerData.age);
      if (age < 15 || age > 100) {
        validationErrors.push('อายุต้องอยู่ระหว่าง 15-100 ปี');
      }
    }

    // Income validation
    if (occupationData.income) {
      const income = parseFloat(occupationData.income);
      if (income < 0) {
        validationErrors.push('รายได้ต้องไม่ติดลบ');
      }
      if (income < 5000) {
        validationErrors.push('รายได้ต้องอย่างน้อย 5,000 บาท');
      }
    }

    // If validation only, return results
    if (validateOnly) {
      return res.json({
        success: validationErrors.length === 0,
        isValid: validationErrors.length === 0,
        errors: validationErrors,
        message: validationErrors.length === 0 ? 'ข้อมูลถูกต้องครบถ้วน' : 'พบข้อผิดพลาดในการตรวจสอบ'
      });
    }

    // If there are validation errors, return them
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'ข้อมูลไม่ถูกต้อง',
        errors: validationErrors
      });
    }

    // ✅ Process and save customer data
    const processedData = {
      customerInfo: {
        fullName: `${customerData.firstName} ${customerData.lastName}`,
        firstName: customerData.firstName,
        lastName: customerData.lastName,
        idCard: customerData.idCard,
        phone: customerData.phone,
        email: customerData.email || '',
        birthDate: customerData.birthDate,
        age: parseInt(customerData.age) || null,
        facebook: customerData.facebook || '',
        lineId: customerData.lineId || ''
      },
      address: {
        houseNo: addressData.houseNo || '',
        moo: addressData.moo || '',
        soi: addressData.soi || '',
        road: addressData.road || '',
        province: addressData.province || '',
        district: addressData.district || '',
        subDistrict: addressData.subDistrict || '',
        postalCode: addressData.postalCode || '',
        coordinates: {
          latitude: addressData.latitude || '',
          longitude: addressData.longitude || '',
          mapUrl: addressData.mapUrl || ''
        }
      },
      occupation: {
        type: occupationData.occupation || '',
        workplace: occupationData.workplace || '',
        income: parseFloat(occupationData.income) || 0
      },
      documents: documentData || {},
      processedAt: new Date().toISOString(),
      processedBy: req.user?.userId || null
    };

    // Save to session or temporary storage for step3
    if (req.session) {
      req.session.step2Data = processedData;
    }

    res.json({
      success: true,
      message: 'บันทึกข้อมูลลูกค้าเรียบร้อย',
      data: processedData,
      nextStep: 3
    });

  } catch (error) {
    console.error('❌ Error processing Step 2 customer data:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล',
      error: error.message
    });
  }
};
