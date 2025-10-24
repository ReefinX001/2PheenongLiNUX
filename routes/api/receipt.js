const express = require('express');
const router = express.Router();
const Receipt = require('../../models/Receipt');
const TaxInvoice = require('../../models/TaxInvoice');
const auth = require('../../middlewares/authMiddleware');

// ฟังก์ชันสร้างเลขที่ใบเสร็จ - รูปแบบใหม่ RE-YYMMDD-XXX (พ.ศ.)
function generateReceiptNumber(type, branchCode = '00000') {
  const now = new Date();

  // สร้าง datePrefix ตามวันที่ปัจจุบัน (พ.ศ.)
  const yearBE = now.getFullYear() + 543; // แปลงเป็นปี พ.ศ.
  const yearShort = yearBE.toString().slice(-2); // เอาแค่ 2 หลักสุดท้าย (68)
  const month = String(now.getMonth() + 1).padStart(2, '0'); // เดือน 2 หลัก (08)
  const day = String(now.getDate()).padStart(2, '0'); // วัน 2 หลัก (16)
  const datePrefix = `${yearShort}${month}${day}`; // 680816

  const suffix = String(Date.now()).slice(-3); // สุ่มเลข 3 หลัก

  const receiptNumber = `RE-${datePrefix}-${suffix}`;
  console.log('📄 Generated receipt number with current date:', receiptNumber);
  console.log(`🗓️ Date format: ${datePrefix} (${day}/${month}/${yearBE} พ.ศ.)`);

  return receiptNumber;
}

// ฟังก์ชัน sync ไปยัง Receipt Voucher System (เหมือนกับใน taxinvoice.js)
async function syncToReceiptVoucher(documentData, token) {
  try {
    const receiptVoucherData = {
      source: documentData.source || 'pos_system',
      sourceId: documentData._id,
      documentNumber: `RV-${documentData.receiptNumber}`,
      customerName: documentData.customer?.name || 'ลูกค้าทั่วไป',
      totalAmount: documentData.totalAmount,
      netAmount: documentData.netTotal,
      vatAmount: documentData.vatAmount || 0,
      paymentMethod: documentData.paymentMethod || 'cash',
      description: `ใบเสร็จรับเงิน เลขที่ ${documentData.receiptNumber}`,
      notes: `สร้างอัตโนมัติจากระบบ POS`,
      metadata: {
        documentType: documentData.documentType,
        documentNumber: documentData.receiptNumber,
        branchCode: documentData.branchCode,
        employeeName: documentData.employeeName,
        contractNo: documentData.contractNo,
        quotationNumber: documentData.quotationNumber,
        taxInvoiceNumber: documentData.taxInvoiceNumber,
        items: documentData.items?.map(item => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice
        })) || []
      }
    };

    const response = await fetch(`${process.env.API_BASE_URL || 'http://localhost:3000'}/api/receipt-vouchers/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(receiptVoucherData)
    });

    if (!response.ok) {
      throw new Error(`Receipt Voucher API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Synced to Receipt Voucher System:', result.data?.documentNumber);
    return result.data;
  } catch (error) {
    console.warn('⚠️ Receipt Voucher sync failed:', error.message);
    return null;
  }
}

// ฟังก์ชัน sync ไปยัง Firebase Realtime Database
async function syncToFirebase(documentData, branchCode) {
  try {
    if (!global.firebaseAdmin) {
      console.warn('⚠️ Firebase Admin SDK not initialized, skipping sync');
      return;
    }

    const db = global.firebaseAdmin.database();
    const firebaseData = {
      documentType: documentData.documentType,
      documentNumber: documentData.receiptNumber,
      customerName: documentData.customer?.name,
      totalAmount: documentData.totalAmount,
      branchCode: documentData.branchCode,
      timestamp: new Date().toISOString(),
      metadata: {
        employeeName: documentData.employeeName,
        paymentMethod: documentData.paymentMethod,
        itemCount: documentData.items?.length || 0
      }
    };

    // บันทึกไปยัง Firebase
    const ref = db.ref(`pos/${branchCode}/documents/${documentData._id}`);
    await ref.set(firebaseData);

    // อัปเดตสถิติ real-time
    const statsRef = db.ref(`pos/${branchCode}/stats`);
    const today = new Date().toISOString().split('T')[0];

    await statsRef.child(`daily/${today}/documentCount`).transaction(current => (current || 0) + 1);
    await statsRef.child(`daily/${today}/totalAmount`).transaction(current => (current || 0) + (documentData.totalAmount || 0));

    console.log('✅ Synced to Firebase Realtime Database');
  } catch (error) {
    console.warn('⚠️ Firebase sync failed:', error.message);
  }
}

// POST /api/receipt - สร้างใบเสร็จรับเงิน (main route)
router.post('/', auth, async (req, res) => {
  try {
    const {
      receiptNumber,
      contractNo,
      quotationNumber,
      customer,
      items,
      totalAmount,
      documentFee, // no default here; prefer summary first
      vatAmount,   // no default here; prefer summary first
      paymentMethod = 'cash',
      branchCode = '00000',
      employeeName,
      notes,
      receiptType = 'down_payment_receipt',
      saleType = 'installment',
      downPaymentAmount,
      idempotencyKey
    } = req.body;

    // Validate required fields
    if (!customer?.name || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Customer name and items are required'
      });
    }

    // 🔍 DEBUG: ตรวจสอบข้อมูลลูกค้าที่ได้รับจาก frontend
    console.log('🔍 RECEIPT API DEBUG - Customer data received:', {
      customer,
      customerName: customer?.name,
      customerTaxId: customer?.taxId || customer?.tax_id,
      customerAddress: customer?.address,
      customerPhone: customer?.phone || customer?.phone_number,
      customerEmail: customer?.email
    });

    // Idempotency: ป้องกันข้อมูลซ้ำ
    const summary = req.body.summary || {};
    const computedIdemKey = idempotencyKey || [
      'installment',
      branchCode,
      contractNo || 'N/A',
      (customer?.taxId || customer?.tax_id || customer?.phone || customer?.name || '').replace(/\s+/g,'') || 'N/A',
      Number(summary.totalWithTax ?? totalAmount ?? 0).toFixed(2),
      Number(summary.docFee ?? documentFee ?? 0).toFixed(2),
      Number(downPaymentAmount ?? summary.subtotal ?? 0).toFixed(2)
    ].join('|');

    // ถ้ามีเอกสารที่สร้างด้วย key นี้แล้ว ให้คืนตัวเดิมทันที
    const existingByKey = await Receipt.findOne({ idempotencyKey: computedIdemKey });
    if (existingByKey) {
      return res.status(200).json({
        success: true,
        message: 'Receipt already exists (idempotent)',
        data: {
          id: existingByKey._id,
          receiptNumber: existingByKey.receiptNumber,
          documentNumber: existingByKey.receiptNumber,
          totalAmount: existingByKey.totalAmount,
          customer: existingByKey.customer,
          createdAt: existingByKey.createdAt
        }
      });
    }

    // ถ้ามีใบเสร็จเงินดาวน์ของสัญญานี้อยู่แล้ว ให้คืนใบเดิม (กันสร้างซ้ำ)
    if (receiptType === 'down_payment_receipt' && contractNo) {
      const existingForContract = await Receipt.findOne({ contractNo, receiptType: 'down_payment_receipt' })
        .sort({ createdAt: -1 });
      if (existingForContract) {
        return res.status(200).json({
          success: true,
          message: 'Down payment receipt already exists for this contract',
          data: {
            id: existingForContract._id,
            receiptNumber: existingForContract.receiptNumber,
            documentNumber: existingForContract.receiptNumber,
            totalAmount: existingForContract.totalAmount,
            customer: existingForContract.customer,
            createdAt: existingForContract.createdAt
          }
        });
      }
    }

    // Fallback dedupe: ค้นหาจากยอดและลูกค้าในช่วงเวลาใกล้ๆ (กันสองหน้าส่งพร้อมกัน)
    const minutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const existingSimilar = await Receipt.findOne({
      receiptType: 'down_payment_receipt',
      branchCode,
      'customer.taxId': customer?.taxId || customer?.tax_id,
      totalAmount: (typeof summary.totalWithTax === 'number') ? Number(summary.totalWithTax) : (typeof totalAmount === 'number' ? Number(totalAmount) : undefined),
      documentFee: (typeof summary.docFee === 'number') ? Number(summary.docFee) : (typeof documentFee === 'number' ? Number(documentFee) : 0),
      createdAt: { $gte: minutesAgo }
    });
    if (existingSimilar) {
      return res.status(200).json({
        success: true,
        message: 'Similar receipt already exists (time-window dedupe)',
        data: {
          id: existingSimilar._id,
          receiptNumber: existingSimilar.receiptNumber,
          documentNumber: existingSimilar.receiptNumber,
          totalAmount: existingSimilar.totalAmount,
          customer: existingSimilar.customer,
          createdAt: existingSimilar.createdAt
        }
      });
    }

    // สร้างเลขที่ใบเสร็จถ้าไม่มี
    const finalReceiptNumber = receiptNumber || generateReceiptNumber('RECEIPT', branchCode);

    // Map summary fields if provided (frontend may send under summary)
    const hasSummaryDocFee = typeof summary.docFee === 'number' && !isNaN(summary.docFee);
    const hasBodyDocFee = typeof documentFee === 'number' && !isNaN(documentFee);
    const mappedDocFee = hasSummaryDocFee ? Number(summary.docFee) : (hasBodyDocFee ? Number(documentFee) : 0);

    const hasSummaryVat = typeof summary.vatAmount === 'number' && !isNaN(summary.vatAmount);
    const hasBodyVat = typeof vatAmount === 'number' && !isNaN(vatAmount);
    const mappedVatAmount = hasSummaryVat ? Number(summary.vatAmount) : (hasBodyVat ? Number(vatAmount) : 0);

    const mappedTaxType = (summary.taxType || req.body.taxType || (mappedVatAmount > 0 ? 'inclusive' : 'none'));

    const mappedDownPayment = (typeof downPaymentAmount === 'number' && downPaymentAmount > 0)
      ? Number(downPaymentAmount)
      : (receiptType === 'down_payment_receipt' && typeof summary.subtotal === 'number' ? Number(summary.subtotal) : undefined);

    // Prefer summary.totalWithTax for frontend parity; model pre-save will recompute anyway
    const mappedTotalAmount = (typeof summary.totalWithTax === 'number')
      ? Number(summary.totalWithTax)
      : (typeof totalAmount === 'number' ? Number(totalAmount) : undefined);

    // สร้าง Receipt
    const receipt = new Receipt({
      receiptNumber: finalReceiptNumber,
      contractNo,
      quotationNumber,
      idempotencyKey: computedIdemKey,
      downPaymentAmount: mappedDownPayment,
      customer: {
        name: customer.name,
        taxId: customer.taxId || customer.tax_id,
        phone: customer.phone || customer.phone_number,
        email: customer.email,
        address: customer.address
      },
      items: items.map(item => ({
        product: item.product,
        name: item.name || item.description,
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || item.amount || 0,
        totalPrice: item.totalPrice || (item.unitPrice * item.quantity) || item.amount || 0,
        description: item.description || item.name
      })),
      totalAmount: mappedTotalAmount,
      documentFee: mappedDocFee,
      vatAmount: mappedVatAmount,
      paymentMethod,
      branchCode,
      employeeName,
      notes,
      receiptType,
      saleType,
      taxType: mappedTaxType,
      status: 'completed'
    });

    const savedReceipt = await receipt.save();

    // Sync ไปยัง Receipt Voucher System และ Firebase
    const token = req.header('Authorization')?.replace('Bearer ', '');

    // ทำ sync แบบ non-blocking
    Promise.all([
      syncToReceiptVoucher(savedReceipt, token),
      syncToFirebase(savedReceipt, branchCode)
    ]).catch(error => {
      console.warn('⚠️ Sync operations failed:', error);
    });

    res.status(201).json({
      success: true,
      message: 'Receipt created successfully',
      data: {
        id: savedReceipt._id,
        receiptNumber: savedReceipt.receiptNumber,
        documentNumber: savedReceipt.receiptNumber,
        totalAmount: savedReceipt.totalAmount,
        customer: savedReceipt.customer,
        createdAt: savedReceipt.createdAt
      }
    });

  } catch (error) {
    console.error('Error creating receipt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create receipt',
      details: error.message
    });
  }
});

// POST /api/receipt/create - สร้างใบเสร็จรับเงิน
router.post('/create', auth, async (req, res) => {
  try {
    const {
      contractNo,
      quotationNumber,
      taxInvoiceNumber,
      customer,
      items,
      totalAmount,
      documentFee = 0,
      vatAmount = 0,
      paymentMethod = 'cash',
      branchCode = '00000',
      employeeName,
      notes,
      receiptType = 'down_payment_receipt',
      saleType = 'cash', // เพิ่ม saleType
      hasVatItems = false,
      taxType = 'none'
    } = req.body;

    // Validate required fields
    if (!customer?.name || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Customer name and items are required'
      });
    }

    // สร้างเลขที่ใบเสร็จ
    const receiptNumber = generateReceiptNumber('RECEIPT', branchCode);

    // คำนวณยอดเงิน
    let calculatedTotal = 0;
    const processedItems = items.map(item => {
      const totalPrice = item.unitPrice * item.quantity;
      calculatedTotal += totalPrice;
      return {
        ...item,
        totalPrice
      };
    });

    const finalTotal = totalAmount || calculatedTotal;
    const netTotal = finalTotal + documentFee;

    // สร้าง Receipt
    const receipt = new Receipt({
      receiptNumber,
      saleType, // เพิ่ม saleType
      contractNo,
      quotationNumber,
      taxInvoiceNumber,
      receiptType,
      customer: {
        name: customer.name,
        fullName: customer.fullName || customer.name,
        prefix: customer.prefix,
        first_name: customer.first_name,
        last_name: customer.last_name,
        taxId: customer.taxId || customer.tax_id,
        tax_id: customer.tax_id || customer.taxId,
        phone: customer.phone || customer.phone_number,
        phone_number: customer.phone_number || customer.phone,
        email: customer.email,
        address: customer.address || 'ไม่ระบุที่อยู่',
        age: customer.age
      },
      items: processedItems,
      totalAmount: finalTotal,
      documentFee,
      vatAmount,
      netTotal,
      hasVatItems,
      vatDetectionMethod: hasVatItems ? 'taxType' : 'none',
      taxType,
      paymentMethod,
      branchCode,
      employeeName,
      notes
    });

    const savedReceipt = await receipt.save();

    // Sync ไปยัง Receipt Voucher System และ Firebase
    const token = req.header('Authorization')?.replace('Bearer ', '');

    // ทำ sync แบบ non-blocking
    Promise.all([
      syncToReceiptVoucher(savedReceipt, token),
      syncToFirebase(savedReceipt, branchCode)
    ]).catch(error => {
      console.warn('⚠️ Sync operations failed:', error);
    });

    res.json({
      success: true,
      data: {
        receipt: savedReceipt,
        receiptNumber: receiptNumber,
        documentNumber: receiptNumber,
        totalAmount: finalTotal,
        netTotal: netTotal
      },
      message: 'Receipt created successfully'
    });

  } catch (error) {
    console.error('Error creating receipt:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create receipt'
    });
  }
});

// POST /api/receipt/installment - สร้างใบเสร็จสำหรับระบบผ่อนชำระ
router.post('/installment', auth, async (req, res) => {
  try {
    const {
      contractNo,
      quotationNumber,
      customer,
      items,
      installmentData,
      paymentMethod = 'cash',
      branchCode = '00000',
      employeeName,
      notes,
      idempotencyKey,
      saleType = 'installment' // เพิ่ม saleType สำหรับผ่อน
    } = req.body;

    if (!contractNo || !customer?.name || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Contract number, customer name and items are required'
      });
    }

    // Idempotency key สำหรับผ่อนงวด: กันโพสต์ซ้ำงวดเดียวกัน
    const idemKey = idempotencyKey || [
      'installment_payment',
      branchCode,
      contractNo || 'N/A',
      String(installmentData?.installmentNumber || 'N/A'),
      Number(installmentData?.amount || items?.[0]?.totalPrice || 0).toFixed(2)
    ].join('|');

    const existingPayment = await Receipt.findOne({ idempotencyKey: idemKey });
    if (existingPayment) {
      return res.json({
        success: true,
        data: {
          receipt: existingPayment,
          receiptNumber: existingPayment.receiptNumber,
          documentNumber: existingPayment.receiptNumber,
          downPaymentAmount: existingPayment.downPaymentAmount,
          totalAmount: existingPayment.totalAmount,
          contractNo
        },
        message: 'Installment receipt already exists (idempotent)'
      });
    }

    // สร้างใบเสร็จสำหรับเงินดาวน์
    const receiptNumber = generateReceiptNumber('INSTALLMENT', branchCode);

    const downPaymentAmount = installmentData?.downPayment || 0;
    const totalPrice = installmentData?.totalPrice || items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

    // ตรวจสอบว่ามี VAT หรือไม่
    const hasVatItems = items.some(item => item.hasVat || item.vatRate > 0);
    let vatAmount = 0;

    if (hasVatItems) {
      // คำนวณ VAT จากเงินดาวน์
      vatAmount = Math.round((downPaymentAmount * 7 / 107) * 100) / 100;
    }

    const receipt = new Receipt({
      receiptNumber,
      idempotencyKey: idemKey,
      receiptType: 'down_payment_receipt',
      saleType, // เพิ่ม saleType
      contractNo,
      quotationNumber,
      customer: {
        name: customer.name,
        fullName: customer.fullName || customer.name,
        prefix: customer.prefix,
        first_name: customer.first_name,
        last_name: customer.last_name,
        taxId: customer.taxId || customer.tax_id,
        phone: customer.phone || customer.phone_number,
        email: customer.email,
        address: customer.address || 'ไม่ระบุที่อยู่',
        age: customer.age
      },
      items: items.map(item => ({
        product: item.product || item.name,
        name: item.name,
        brand: item.brand,
        imei: item.imei,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.unitPrice * item.quantity,
        description: item.description
      })),
      totalAmount: totalPrice,
      downPaymentAmount,
      documentFee: 0,
      vatAmount,
      netTotal: downPaymentAmount,
      hasVatItems,
      vatDetectionMethod: hasVatItems ? 'taxType' : 'none',
      taxType: hasVatItems ? 'inclusive' : 'none',
      paymentMethod,
      branchCode,
      employeeName,
      notes: notes || `ใบเสร็จเงินดาวน์ สัญญาเลขที่ ${contractNo}`
    });

    const savedReceipt = await receipt.save();

    // Sync ไปยัง Receipt Voucher System และ Firebase
    const token = req.header('Authorization')?.replace('Bearer ', '');

    Promise.all([
      syncToReceiptVoucher({
        ...savedReceipt.toObject(),
        source: 'installment_system'
      }, token),
      syncToFirebase(savedReceipt, branchCode)
    ]).catch(error => {
      console.warn('⚠️ Sync operations failed:', error);
    });

    res.json({
      success: true,
      data: {
        receipt: savedReceipt,
        receiptNumber: receiptNumber,
        documentNumber: receiptNumber,
        downPaymentAmount,
        totalAmount: totalPrice,
        contractNo
      },
      message: 'Installment receipt created successfully'
    });

  } catch (error) {
    console.error('Error creating installment receipt:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create installment receipt'
    });
  }
});

// GET /api/receipt/:id - ดูใบเสร็จ
router.get('/:id', auth, async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id);

    if (!receipt) {
      return res.status(404).json({
        success: false,
        error: 'Receipt not found'
      });
    }

    res.json({
      success: true,
      data: receipt
    });
  } catch (error) {
    console.error('Error fetching receipt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch receipt'
    });
  }
});

// GET /api/receipt/contract/:contractNo - ดูใบเสร็จตามสัญญา
router.get('/contract/:contractNo', auth, async (req, res) => {
  try {
    const receipts = await Receipt.find({ contractNo: req.params.contractNo })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: receipts
    });
  } catch (error) {
    console.error('Error fetching receipts by contract:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch receipts'
    });
  }
});

// GET /api/receipt/branch/:branchCode - ดูใบเสร็จตามสาขา
router.get('/branch/:branchCode', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, startDate, endDate, receiptType, saleType } = req.query;
    const query = { branchCode: req.params.branchCode };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (receiptType) {
      query.receiptType = receiptType;
    }

    // เพิ่มการกรองตาม saleType (สำหรับแยกขายสด/ขายผ่อน)
    if (saleType) {
      query.saleType = saleType;
    }

    const receipts = await Receipt.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Receipt.countDocuments(query);

    res.json({
      success: true,
      data: {
        documents: receipts,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Error fetching receipts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch receipts'
    });
  }
});

// POST /api/receipt/generate-image - สร้างภาพใบเสร็จ (สำหรับ History_installment.html)
router.post('/generate-image', auth, async (req, res) => {
  try {
    const { receiptData } = req.body;

    if (!receiptData) {
      return res.status(400).json({
        success: false,
        error: 'Receipt data is required'
      });
    }

    // ใช้ PDFoooRasterController สร้างภาพใบเสร็จ
    const PDFoooRasterController = require('../../controllers/pdf/PDFoooRasterController');

    // เตรียมข้อมูลสำหรับ PDF generation
    const orderData = {
      invoiceNo: receiptData.documentNumber,
      order_number: receiptData.documentNumber,
      invoiceType: receiptData.documentType === 'TAX_INVOICE' ? 'TAX_INVOICE' : 'RECEIPT_ONLY',
      saleDate: new Date(receiptData.createdAt),
      staffName: receiptData.employeeName,
      employeeName: receiptData.employeeName,
      branch: receiptData.branch,
      company: {
        name: 'บริษัท 2 พี่น้อง โมบาย จำกัด'
      },
      customer: receiptData.customerInfo,
      items: receiptData.items.map(item => ({
        name: item.description,
        quantity: item.quantity,
        unitPrice: item.amount,
        totalPrice: item.amount * item.quantity,
        taxType: receiptData.documentType === 'TAX_INVOICE' ? 'รวมภาษี' : 'ไม่มีภาษี'
      })),
      subtotal: receiptData.totalAmount,
      discount: 0,
      vatAmount: receiptData.documentType === 'TAX_INVOICE' ? Math.round(receiptData.totalAmount * 7 / 107) : 0,
      total: receiptData.totalAmount,
      paymentMethod: receiptData.paymentMethod === 'cash' ? 'เงินสด' : receiptData.paymentMethod
    };

    const receiptResult = await PDFoooRasterController.printReceipt(orderData);

    if (!receiptResult || !receiptResult.base64) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate receipt image'
      });
    }

    res.json({
      success: true,
      data: {
        receiptImage: receiptResult.base64,
        documentNumber: receiptData.documentNumber,
        documentType: receiptData.documentType
      }
    });

  } catch (error) {
    console.error('Error generating receipt image:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate receipt image: ' + error.message
    });
  }
});

module.exports = router;