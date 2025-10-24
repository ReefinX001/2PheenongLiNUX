// routes/pdfRoutes.js

const express = require('express');
const router = express.Router();

// Import Controllers ตามต้องการ
const PDFController = require('../controllers/PDFController');
const PDFStockController = require('../controllers/PDFStockController');
const PDFOutReceiptController = require('../controllers/PDFOutReceiptController');
const OrderController = require('../controllers/orderController'); // สมมติว่ามี getOrderIds()

// เพิ่มเส้นทางใหม่สำหรับ A4PDFController
const A4PDFController = require('../controllers/pdf/A4PDFController');
const A4PDFFrontstoreController = require('../controllers/pdf/A4PDFFrontstoreController');

// Import Receipt_installment controller for installment receipt/tax invoice
const Receipt_installment = require('../controllers/Receipt_installment');

// Import models
const TaxInvoice = require('../models/TaxInvoice');
const Receipt = require('../models/Receipt');

// ถ้าต้องการป้องกันด้วย JWT ให้ import middleware
// const authJWT = require('../middlewares/authJWT');

// Helper function for formatting Tax ID
function formatTaxId(taxId) {
  if (!taxId) return '';
  const cleaned = taxId.toString().replace(/\D/g, '');
  if (cleaned.length === 13) {
    return `${cleaned.slice(0,1)}-${cleaned.slice(1,5)}-${cleaned.slice(5,10)}-${cleaned.slice(10,12)}-${cleaned.slice(12)}`;
  }
  return cleaned;
}

// ตัวอย่างเส้นทางทดสอบ
router.get('/test-receipt', PDFController.generatePdf);

// เส้นทาง PDF ประวัติสินค้าเข้า/ออก
// หมายเหตุ: ถ้า generatePdfFromHistory ใช้ข้อมูลจาก req.body.inRecords/outRecords
// ควรเป็น POST มากกว่า GET, แต่ตัวอย่างด้านล่างใช้ GET ตามโค้ดคุณ
router.get('/history', PDFStockController.generatePdfFromHistory);

// เส้นทาง PDF สินค้าออก (Out Receipt)
router.get('/out-receipt', PDFOutReceiptController.generateOutReceipt);

// เส้นทางดึงรายการ Order ทั้งหมด หรือเฉพาะ order_id
router.get('/orders', OrderController.getOrderIds);

  // A4 PDF Receipt Route - ส่งไฟล์ PDF โดยตรง
  router.post('/a4-receipt', async (req, res) => {
  try {
    console.log('📄 A4 PDF Receipt API called');

    const receiptData = req.body;

    // 🔧 รองรับการดึงข้อมูลจากฐานข้อมูลโดยตรง
    if (receiptData.useDatabase && receiptData.receiptId) {
      console.log('📋 Using database lookup for receipt:', receiptData.receiptId);
      console.log('📋 Source collection:', receiptData.sourceCollection);
      console.log('🔧 Force receipt mode:', receiptData.forceReceiptMode);
      console.log('🔧 Suppress VAT display:', receiptData.suppressVatDisplay);

      let pdfResult;

      // ดึงข้อมูลจาก Receipt collection โดยตรง
      const Receipt = require('../models/Receipt');
      const receipt = await Receipt.findById(receiptData.receiptId).lean();

      if (!receipt) {
        return res.status(404).json({
          success: false,
          error: 'Receipt not found'
        });
      }

      // แปลงข้อมูล Receipt เป็นรูปแบบใบเสร็จ (ไม่แสดงภาษี)
      const orderData = {
        _id: receipt._id,
        order_number: receipt.contractNo,
        documentType: 'RECEIPT', // บังคับเป็นใบเสร็จ
        invoiceType: 'RECEIPT',
        forceDocumentType: 'RECEIPT', // บังคับประเภทเอกสาร
        receiptNumber: receiptData.documentNumber || receipt.receiptNumber,

        // ข้อมูลลูกค้า - ใช้ข้อมูลจาก Receipt โดยตรง
        customer: {
          name: receipt.customer?.name || 'ลูกค้าทั่วไป',
          phone: receipt.customer?.phone || receipt.customer?.phone_number || '',
          taxId: receipt.customer?.taxId || receipt.customer?.tax_id || '',
          address: receipt.customer?.address || ''
        },

        // ข้อมูลการเงิน - ใช้ข้อมูลจาก Receipt
        subTotal: receipt.totalAmount || receipt.downPaymentAmount || 0,
        vatAmount: 0, // บังคับไม่แสดงภาษี
        grandTotal: receipt.totalAmount || receipt.downPaymentAmount || 0,
        downPayment: receipt.downPaymentAmount || receipt.totalAmount || 0,
        taxType: 'no_vat',

        // รายการสินค้า - ใช้ข้อมูลจาก Receipt
        items: receipt.items || [{
          description: `เงินดาวน์การผ่อนชำระ - สัญญา ${receipt.contractNo}`,
          quantity: 1,
          unitPrice: receipt.downPaymentAmount || receipt.totalAmount || 0,
          amount: receipt.downPaymentAmount || receipt.totalAmount || 0
        }],

        // ข้อมูลเพิ่มเติม
        saleDate: receipt.createdAt || receipt.issueDate,
        staffName: receipt.employeeName || 'พนักงาน',
        branchCode: receipt.branchCode || 'MAIN'
        };

        pdfResult = await A4PDFController.createReceiptPdf(orderData);

      // ส่ง PDF ไฟล์ให้ดาวน์โหลดทันที
      const fileName = `receipt_${receiptData.documentNumber || receiptData.receiptId}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', (pdfResult.buffer || pdfResult).length);
      return res.send(pdfResult.buffer || pdfResult);
    }

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!receiptData.order_number && !receiptData._id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required order information'
      });
    }

    // รองรับ frontstore payload ด้วย
    let result;
    if (receiptData && (receiptData.items || receiptData.cartItems)) {
      // มาจาก frontstore (ขายสด)
      result = await A4PDFFrontstoreController.createReceiptFromFrontstore(receiptData);
    } else {
      // มาจาก flow เดิม
      result = await A4PDFController.printReceipt(receiptData);
    }

    // ส่ง PDF ไฟล์ให้ดาวน์โหลดทันที ให้สอดคล้องกับฝั่งหน้าเว็บที่อ่านเป็น blob
    const contractNo = receiptData.order_number || receiptData._id || 'receipt';
    const fileName = `receipt_${contractNo}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', result.buffer.length);
    return res.send(result.buffer);

  } catch (error) {
    console.error('❌ Error in A4 PDF Receipt API:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: 'Failed to generate A4 PDF receipt'
    });
  }
});

// A4 PDF Receipt by ID Route (POST)
router.post('/a4-receipt/:orderId', async (req, res) => {
  try {
    console.log(`📄 A4 PDF Receipt by ID API called: ${req.params.orderId}`);

    const { orderId } = req.params;
    const { orderType = 'installment' } = req.body;

    // สร้าง PDF ด้วย A4PDFController โดยใช้ ID
    const result = await A4PDFController.printReceiptById(orderId, orderType);

    // ส่งไฟล์ PDF กลับ
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.setHeader('Content-Length', result.buffer.length);

    res.send(result.buffer);

    console.log(`✅ A4 PDF Receipt by ID generated: ${result.fileName} (${Math.round(result.buffer.length/1024)}KB)`);

  } catch (error) {
    console.error('❌ Error in A4 PDF Receipt by ID API:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: `Failed to generate A4 PDF receipt for ID: ${req.params.orderId}`
    });
  }
});

// A4 PDF Receipt by ID Route (GET) - ✅ เพิ่มสำหรับ frontend
router.get('/a4-receipt/:orderId', async (req, res) => {
  try {
    console.log(`📄 A4 PDF Receipt GET by ID API called: ${req.params.orderId}`);

    const { orderId } = req.params;
    const orderType = req.query.orderType || 'installment';

    // 🔍 ค้นหาข้อมูล order จากฐานข้อมูลก่อน
    let orderData = null;

    try {
      // เพิ่มการรองรับ POS History
      if (orderType === 'pos_history') {
        // ค้นหาจาก BranchStockHistory
        const BranchStockHistory = require('../models/POS/BranchStockHistory');
        const mongoose = require('mongoose');

        // ลองค้นหาด้วย ID ก่อน
        let historyData = null;
        if (mongoose.Types.ObjectId.isValid(orderId)) {
          historyData = await BranchStockHistory.findById(orderId).lean();
        }

        // ถ้าไม่เจอ ลองค้นหาด้วย invoice_no
        if (!historyData) {
          historyData = await BranchStockHistory.findOne({
            invoice_no: orderId,
            change_type: 'OUT',
            reason: 'ขาย POS'
          }).lean();
        }

        if (!historyData) {
          return res.status(404).json({
            success: false,
            error: `POS History not found: ${orderId}`,
            details: 'ไม่พบข้อมูลประวัติการขายใน BranchStockHistory'
          });
        }

        console.log(`✅ Found POS history data for ${orderId}`);

        // ใช้ createReceiptPdfFromHistory สำหรับ POS History
        const result = await A4PDFController.createReceiptPdfFromHistory(historyData._id);

        // ส่งไฟล์ PDF กลับ
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
        res.setHeader('Content-Length', result.buffer.length);

        return res.send(result.buffer);
      }

      // ลองค้นหาจาก Quotation collection
      const Quotation = require('../models/Installment/Quotation');
      orderData = await Quotation.findOne({ quotationNumber: orderId }).lean();

      if (!orderData) {
        // ลองค้นหาจาก InstallmentOrder collection
        const InstallmentOrder = require('../models/Installment/InstallmentOrder');
        orderData = await InstallmentOrder.findOne({
          $or: [
            { quotationNumber: orderId },
            { order_number: orderId },
            { contractNumber: orderId }
          ]
        }).lean();
      }

      if (!orderData) {
        return res.status(404).json({
          success: false,
          error: `Order not found: ${orderId}`,
          details: 'Order not found in Quotation or InstallmentOrder collections'
        });
      }

      console.log(`✅ Found order data for ${orderId}`);

    } catch (dbError) {
      console.error('❌ Database lookup error:', dbError);
      return res.status(500).json({
        success: false,
        error: 'Database lookup failed',
        details: dbError.message
      });
    }

    // 📄 สร้าง PDF ด้วย createReceiptPdf แทน printReceiptById
    const result = await A4PDFController.createReceiptPdf({
      ...orderData,
      _id: orderId,
      order_number: orderId,
      quotationNumber: orderId
    });

    // ส่งไฟล์ PDF กลับ
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.setHeader('Content-Length', result.buffer.length);

    res.send(result.buffer);

    console.log(`✅ A4 PDF Receipt GET by ID generated: ${result.fileName} (${Math.round(result.buffer.length/1024)}KB)`);

  } catch (error) {
    console.error('❌ Error in A4 PDF Receipt GET by ID API:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: `Failed to generate A4 PDF receipt for ID: ${req.params.orderId}`
    });
  }
});

// Quotation PDF by ID Route (GET) - ✅ เพิ่มสำหรับ frontend (ไม่ต้อง auth)
router.get('/quotation/:quotationNumber', async (req, res) => {
  try {
    console.log(`📄 Quotation PDF GET by ID API called: ${req.params.quotationNumber}`);

    const { quotationNumber } = req.params;

    // 🔍 ค้นหาข้อมูล quotation จากฐานข้อมูล (with populated product data)
    const Quotation = require('../models/Installment/Quotation');
    const quotationData = await Quotation.findOne({ quotationNumber })
      .populate('items.product', 'name imei sku product_id') // ✅ Populate product data
      .populate('salesperson', 'name signatureUrl')          // ✅ Populate salesperson data
      .lean();

    if (!quotationData) {
      return res.status(404).json({
        success: false,
        error: `Quotation not found: ${quotationNumber}`,
        details: 'Quotation not found in database'
      });
    }

    console.log(`✅ Found quotation data for ${quotationNumber}`);

    // ✅ ปรับแต่งข้อมูลให้ตรงกับที่ PDF Controller คาดหวัง
    const processedData = {
      ...quotationData,
      // ✅ แก้ไขรูปแบบเลขที่ใบเสนอราคา (เพิ่ม dash ถ้าไม่มี)
      quotationNumber: (() => {
        const qtNum = quotationData.quotationNumber || 'QT-ERROR';
        // เพิ่ม dash ถ้าไม่มี (QT20250729033 -> QT-20250729033)
        if (qtNum.startsWith('QT') && !qtNum.includes('-') && qtNum.length > 2) {
          return qtNum.replace(/^QT/, 'QT-');
        }
        return qtNum;
      })(),
      // ✅ ตรวจสอบและแก้ไข customer object
      customer: quotationData.customer ? {
        name: quotationData.customer.name || 'ลูกค้าทดสอบ',
        firstName: quotationData.customer.firstName || quotationData.customer.first_name || 'ทดสอบ',
        lastName: quotationData.customer.lastName || quotationData.customer.last_name || 'ระบบ',
        prefix: quotationData.customer.prefix || 'นาย',
        address: quotationData.customer.address || 'ไม่มีข้อมูล',
        phone: quotationData.customer.phone || '0123456789',
        taxId: formatTaxId(quotationData.customer.taxId) || '',
        email: quotationData.customer.email || 'test@example.com'
      } : {
        name: 'ลูกค้าทดสอบ',
        firstName: 'ทดสอบ',
        lastName: 'ระบบ',
        prefix: 'นาย',
        address: 'ไม่มีข้อมูล',
        phone: '0123456789',
        taxId: '',
        email: 'test@example.com'
      },

      // ✅ เพิ่มข้อมูลลายเซ็นสำหรับ PDF Controllers - 🔧 FIX: ไม่ใช้ dummy signature
      customerSignature: quotationData.customerSignature || quotationData.customerSignatureUrl ||
                        quotationData.signatures?.customer || null,
      customerSignatureUrl: quotationData.customerSignatureUrl || quotationData.customerSignature ||
                          quotationData.signatures?.customer || null,
      employeeSignature: quotationData.employeeSignature || quotationData.salespersonSignature ||
                        quotationData.salespersonSignatureUrl || quotationData.signatures?.salesperson || null,
      salespersonSignatureUrl: quotationData.salespersonSignatureUrl || quotationData.salespersonSignature ||
                              quotationData.employeeSignature || quotationData.signatures?.salesperson || null,
      authorizedSignature: quotationData.authorizedSignature || quotationData.authorizedSignatureUrl ||
                          quotationData.salespersonSignatureUrl || quotationData.signatures?.authorized || null,
      authorizedSignatureUrl: quotationData.authorizedSignatureUrl || quotationData.authorizedSignature ||
                            quotationData.salespersonSignatureUrl || quotationData.signatures?.authorized || null,
      // ✅ ตรวจสอบและแก้ไข salesperson object (Enhanced)
      salesperson: {
        name: quotationData.salesperson?.name ||
              quotationData.salespersonName ||
              quotationData.staffName ||
              quotationData.employee?.name ||
              'พนักงานขาย',
        id: quotationData.salesperson?.id || quotationData.salesperson || 'unknown',
        signature: quotationData.salesperson?.signature || null
      },
      // ✅ ตรวจสอบวันที่
      issueDate: quotationData.date || quotationData.issueDate || new Date(),
      issueDateFormatted: quotationData.issueDateFormatted || (quotationData.date ? new Date(quotationData.date).toLocaleDateString('th-TH') : new Date().toLocaleDateString('th-TH')),

      // ✅ แปลง payment method เป็นภาษาไทย
      creditTerm: (() => {
        const paymentMethod = quotationData.paymentMethod || quotationData.creditTerm || 'cash';
        const paymentMethodMap = {
          'cash': 'เงินสด',
          'transfer': 'โอนเงิน',
          'card': 'บัตรเครดิต',
          'credit': 'เครดิต',
          'เงินสด': 'เงินสด',
          'โอนเงิน': 'โอนเงิน',
          'บัตรเครดิต': 'บัตรเครดิต'
        };
        return paymentMethodMap[paymentMethod] || paymentMethod || 'เงินสด';
      })(),

      // ✅ เพิ่มข้อมูลบริษัทและสาขา
      company: {
        name: 'บริษัท 2 พี่น้อง โมบาย จำกัด',
        taxId: '0945566000616',
        tel: '09-2427-0769'
      },
      branch: {
        name: 'สำนักงานใหญ่',
        code: quotationData.branchCode || '00000',
        address: '148/91 หมู่ที่ 6 ตำบลรูสะมิแล อำเภอปัตตานี จังหวัดปัตตานี 94000'
      },
      // ✅ ตรวจสอบ items array (Enhanced with product name handling)
      items: Array.isArray(quotationData.items) ? quotationData.items.map(item => {
        // ✅ ดึงชื่อสินค้าจากหลายแหล่ง
        let productName = item.description ||
                         item.name ||
                         item.product?.name ||
                         item.productName ||
                         'สินค้า';

        // ✅ ถ้าเป็น ObjectId ให้ลองดึงจาก populated data
        if (typeof item.product === 'object' && item.product?.name) {
          productName = item.product.name;
        }

        return {
          ...item,
          description: productName,
          name: productName,
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || item.price || 0,
          amount: item.amount || item.totalPrice || (item.unitPrice * item.quantity) || 0,
          imei: item.imei || ''
        };
      }).concat(
        // ✅ เพิ่มค่าธรรมเนียมเอกสารเป็น item สุดท้าย (สำหรับ PDF แสดงผล)
        quotationData.doc_fee && parseFloat(quotationData.doc_fee) > 0 ? [{
          name: 'ค่าธรรมเนียมเอกสาร',
          description: 'ค่าธรรมเนียมเอกสาร',
          quantity: 1,
          unitPrice: parseFloat(quotationData.doc_fee),
          amount: parseFloat(quotationData.doc_fee),
          imei: '',
          isDocumentFee: true
        }] : []
      ) : [],

      // ✅ เพิ่มข้อมูลทางการเงินสำหรับ PDF controllers
      docFee: parseFloat(quotationData.doc_fee || quotationData.docFee || 0),
      vatAmount: parseFloat(quotationData.vatAmount || 0),
      taxType: quotationData.taxType || 'none',
      beforeTaxAmount: parseFloat(quotationData.beforeTaxAmount || 0),
      totalWithTax: parseFloat(quotationData.totalWithTax || 0),
      discount: parseFloat(quotationData.discount || 0),
      discountType: quotationData.discountType || 'amount'
    };

    // ✅ Enhanced signature debug logs
    console.log('🖋️ Quotation PDF Route - Raw signature data from database:', {
      customerSignature: quotationData.customerSignature ? 'Has data (' + quotationData.customerSignature.substring(0, 30) + '...)' : 'null/empty',
      customerSignatureUrl: quotationData.customerSignatureUrl ? 'Has data (' + quotationData.customerSignatureUrl.substring(0, 30) + '...)' : 'null/empty',
      salespersonSignature: quotationData.salespersonSignature ? 'Has data (' + quotationData.salespersonSignature.substring(0, 30) + '...)' : 'null/empty',
      salespersonSignatureUrl: quotationData.salespersonSignatureUrl ? 'Has data (' + quotationData.salespersonSignatureUrl.substring(0, 30) + '...)' : 'null/empty',
      employeeSignature: quotationData.employeeSignature ? 'Has data (' + quotationData.employeeSignature.substring(0, 30) + '...)' : 'null/empty',
      authorizedSignature: quotationData.authorizedSignature ? 'Has data (' + quotationData.authorizedSignature.substring(0, 30) + '...)' : 'null/empty',
      authorizedSignatureUrl: quotationData.authorizedSignatureUrl ? 'Has data (' + quotationData.authorizedSignatureUrl.substring(0, 30) + '...)' : 'null/empty'
    });

    console.log('🔍 Processed quotation data for PDF:', {
      quotationNumber: processedData.quotationNumber,
      customerName: processedData.customer?.name,
      salespersonName: processedData.salesperson?.name,
      itemsCount: processedData.items?.length,
      hasDate: !!processedData.issueDate,
      hasCustomerSignature: !!processedData.customerSignature || !!processedData.customerSignatureUrl,
      hasSalespersonSignature: !!processedData.salespersonSignatureUrl || !!processedData.employeeSignature,
      hasAuthorizedSignature: !!processedData.authorizedSignature || !!processedData.authorizedSignatureUrl,
      firstItemName: processedData.items?.[0]?.name || 'N/A',
      hasCompany: !!processedData.company,
      hasBranch: !!processedData.branch,
      creditTerm: processedData.creditTerm,
      // Debug financial data
      docFee: quotationData.doc_fee || quotationData.docFee || 0,
      vatAmount: quotationData.vatAmount || 0,
      taxType: quotationData.taxType || 'none',
      beforeTaxAmount: quotationData.beforeTaxAmount || 0,
      totalWithTax: quotationData.totalWithTax || 0,
      // Debug signature URLs processed
      customerSignatureProcessed: processedData.customerSignature ? 'Has data (' + processedData.customerSignature.substring(0, 30) + '...)' : 'null/empty',
      salespersonSignatureProcessed: processedData.salespersonSignatureUrl ? 'Has data (' + processedData.salespersonSignatureUrl.substring(0, 30) + '...)' : 'null/empty'
    });

    // 📄 สร้าง PDF ด้วย QuotationPdfController
    const QuotationPdfController = require('../controllers/QuotationPdfController');
    const result = await QuotationPdfController.createQuotationPdf(processedData);

    // ส่งไฟล์ PDF กลับ
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName || `quotation_${quotationNumber}.pdf`}"`);
    res.setHeader('Content-Length', result.buffer.length);

    res.send(result.buffer);

    console.log(`✅ Quotation PDF generated: ${result.fileName || `quotation_${quotationNumber}.pdf`} (${Math.round(result.buffer.length/1024)}KB)`);

  } catch (error) {
    console.error('❌ Error in Quotation PDF API:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: `Failed to generate quotation PDF for: ${req.params.quotationNumber}`
    });
  }
});

// ✅ Helper function to format Tax ID
function formatTaxId(taxId) {
  if (!taxId) return '';

  // Remove all non-digits
  const digits = taxId.toString().replace(/\D/g, '');

  // Format as X-XXXX-XXXXX-XX-X for 13 digits
  if (digits.length === 13) {
    return `${digits.substring(0, 1)}-${digits.substring(1, 5)}-${digits.substring(5, 10)}-${digits.substring(10, 12)}-${digits.substring(12, 13)}`;
  }

  // Return original if not 13 digits
  return taxId;
}

// Invoice PDF by ID Route (GET) - ✅ เพิ่มสำหรับ frontend (ไม่ต้อง auth)
router.get('/invoice/:invoiceNumber', async (req, res) => {
  try {
    console.log(`📄 Invoice PDF GET by ID API called: ${req.params.invoiceNumber}`);

    const { invoiceNumber } = req.params;

    // 🔍 ค้นหาข้อมูล invoice จากฐานข้อมูล (ลองทั้ง quotation และ invoice collections)
    let invoiceData = null;

    // ลองค้นหาจาก Quotation collection (เนื่องจาก invoice อาจอิงจาก quotation)
    const Quotation = require('../models/Installment/Quotation');
    invoiceData = await Quotation.findOne({ quotationNumber: invoiceNumber })
      .populate('items.product', 'name imei sku product_id') // ✅ Populate product data
      .populate('salesperson', 'name signatureUrl')          // ✅ Populate salesperson data
      .lean();

    if (!invoiceData) {
      // ลองค้นหาจาก Invoice collection
      const Invoice = require('../models/Installment/Invoice');
      invoiceData = await Invoice.findOne({
        $or: [
          { invoiceNumber: invoiceNumber },
          { invoice_number: invoiceNumber },
          { quotationNumber: invoiceNumber }
        ]
      })
      .populate('items.product', 'name imei sku product_id') // ✅ Populate product data
      .populate('salesperson', 'name signatureUrl')          // ✅ Populate salesperson data
      .lean();
    }

    if (!invoiceData) {
      return res.status(404).json({
        success: false,
        error: `Invoice not found: ${invoiceNumber}`,
        details: 'Invoice not found in database'
      });
    }

    console.log(`✅ Found invoice data for ${invoiceNumber}`);

    // ✅ ปรับแต่งข้อมูลให้ตรงกับที่ PDF Controller คาดหวัง
    const processedData = {
      ...invoiceData,
      // ✅ ตรวจสอบและแก้ไข customer object
      customer: invoiceData.customer ? {
        name: invoiceData.customer.name || 'ลูกค้าทดสอบ',
        firstName: invoiceData.customer.firstName || invoiceData.customer.first_name || 'ทดสอบ',
        lastName: invoiceData.customer.lastName || invoiceData.customer.last_name || 'ระบบ',
        prefix: invoiceData.customer.prefix || 'นาย',
        address: invoiceData.customer.address || 'ไม่มีข้อมูล',
        phone: invoiceData.customer.phone || '0123456789',
        taxId: formatTaxId(invoiceData.customer.taxId) || '',
        email: invoiceData.customer.email || 'test@example.com'
      } : {
        name: 'ลูกค้าทดสอบ',
        firstName: 'ทดสอบ',
        lastName: 'ระบบ',
        prefix: 'นาย',
        address: 'ไม่มีข้อมูล',
        phone: '0123456789',
        taxId: '',
        email: 'test@example.com'
      },

      // ✅ เพิ่มข้อมูลลายเซ็นสำหรับ PDF Controllers - 🔧 FIX: ไม่ใช้ dummy signature
      customerSignature: invoiceData.customerSignature || invoiceData.customerSignatureUrl ||
                        invoiceData.signatures?.customer || null,
      customerSignatureUrl: invoiceData.customerSignatureUrl || invoiceData.customerSignature ||
                          invoiceData.signatures?.customer || null,
      employeeSignature: invoiceData.employeeSignature || invoiceData.salespersonSignature ||
                        invoiceData.salespersonSignatureUrl || invoiceData.signatures?.salesperson || null,
      salespersonSignatureUrl: invoiceData.salespersonSignatureUrl || invoiceData.salespersonSignature ||
                              invoiceData.employeeSignature || invoiceData.signatures?.salesperson || null,
      authorizedSignature: invoiceData.authorizedSignature || invoiceData.authorizedSignatureUrl ||
                          invoiceData.salespersonSignatureUrl || invoiceData.signatures?.authorized || null,
      authorizedSignatureUrl: invoiceData.authorizedSignatureUrl || invoiceData.authorizedSignature ||
                            invoiceData.salespersonSignatureUrl || invoiceData.signatures?.authorized || null,
      // ✅ ตรวจสอบและแก้ไข salesperson object (Enhanced)
      salesperson: {
        name: invoiceData.salesperson?.name ||
              invoiceData.salespersonName ||
              invoiceData.staffName ||
              invoiceData.employee?.name ||
              'พนักงานขาย',
        id: invoiceData.salesperson?.id || invoiceData.salesperson || 'unknown',
        signature: invoiceData.salesperson?.signature || null
      },
      // ✅ ตรวจสอบวันที่
      issueDate: invoiceData.date || invoiceData.issueDate || new Date(),
      issueDateFormatted: invoiceData.issueDateFormatted || (invoiceData.date ? new Date(invoiceData.date).toLocaleDateString('th-TH') : new Date().toLocaleDateString('th-TH')),

      // ✅ แปลง payment method เป็นภาษาไทย
      creditTerm: (() => {
        const paymentMethod = invoiceData.paymentMethod || invoiceData.creditTerm || 'cash';
        const paymentMethodMap = {
          'cash': 'เงินสด',
          'transfer': 'โอนเงิน',
          'card': 'บัตรเครดิต',
          'credit': 'เครดิต',
          'เงินสด': 'เงินสด',
          'โอนเงิน': 'โอนเงิน',
          'บัตรเครดิต': 'บัตรเครดิต'
        };
        return paymentMethodMap[paymentMethod] || paymentMethod || 'เงินสด';
      })(),

      // ✅ ตรวจสอบเลขที่ใบเสนอราคา (เพิ่ม dash ถ้าไม่มี)
      quotationNumber: (() => {
        const qtNum = invoiceData.quotationNumber || invoiceData.quotation_number || 'QT-ERROR';
        // เพิ่ม dash ถ้าไม่มี (QT20250729033 -> QT-20250729033)
        if (qtNum.startsWith('QT') && !qtNum.includes('-') && qtNum.length > 2) {
          return qtNum.replace(/^QT/, 'QT-');
        }
        return qtNum;
      })(),
      quotationNo: (() => {
        const qtNum = invoiceData.quotationNumber || invoiceData.quotation_number || 'QT-ERROR';
        // เพิ่ม dash ถ้าไม่มี (QT20250729033 -> QT-20250729033)
        if (qtNum.startsWith('QT') && !qtNum.includes('-') && qtNum.length > 2) {
          return qtNum.replace(/^QT/, 'QT-');
        }
        return qtNum;
      })(),

      // ✅ เพิ่มข้อมูลบริษัทและสาขา
      company: {
        name: 'บริษัท 2 พี่น้อง โมบาย จำกัด',
        taxId: '0945566000616',
        tel: '09-2427-0769'
      },
      branch: {
        name: 'สำนักงานใหญ่',
        code: invoiceData.branchCode || '00000',
        address: '148/91 หมู่ที่ 6 ตำบลรูสะมิแล อำเภอปัตตานี จังหวัดปัตตานี 94000'
      },
      // ✅ ตรวจสอบ items array (Enhanced with product name handling)
      items: Array.isArray(invoiceData.items) ? invoiceData.items.map(item => {
        // ✅ ดึงชื่อสินค้าจากหลายแหล่ง
        let productName = item.description ||
                         item.name ||
                         item.product?.name ||
                         item.productName ||
                         'สินค้า';

        // ✅ ถ้าเป็น ObjectId ให้ลองดึงจาก populated data
        if (typeof item.product === 'object' && item.product?.name) {
          productName = item.product.name;
        }

        return {
          ...item,
          description: productName,
          name: productName,
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || item.price || 0,
          amount: item.amount || item.totalPrice || (item.unitPrice * item.quantity) || 0,
          imei: item.imei || ''
        };
      }).concat(
        // ✅ เพิ่มค่าธรรมเนียมเอกสารเป็น item สุดท้าย (สำหรับ PDF แสดงผล)
        invoiceData.doc_fee && parseFloat(invoiceData.doc_fee) > 0 ? [{
          name: 'ค่าธรรมเนียมเอกสาร',
          description: 'ค่าธรรมเนียมเอกสาร',
          quantity: 1,
          unitPrice: parseFloat(invoiceData.doc_fee),
          amount: parseFloat(invoiceData.doc_fee),
          imei: '',
          isDocumentFee: true
        }] : []
      ) : [],

      // ✅ เพิ่มข้อมูลทางการเงินสำหรับ PDF controllers
      docFee: parseFloat(invoiceData.doc_fee || invoiceData.docFee || 0),
      vatAmount: parseFloat(invoiceData.vatAmount || 0),
      taxType: invoiceData.taxType || 'none',
      beforeTaxAmount: parseFloat(invoiceData.beforeTaxAmount || 0),
      totalWithTax: parseFloat(invoiceData.totalWithTax || 0),
      discount: parseFloat(invoiceData.discount || 0),
      discountType: invoiceData.discountType || 'amount'
    };

    // ✅ Enhanced signature debug logs for Invoice
    console.log('🖋️ Invoice PDF Route - Raw signature data from database:', {
      customerSignature: invoiceData.customerSignature ? 'Has data (' + invoiceData.customerSignature.substring(0, 30) + '...)' : 'null/empty',
      customerSignatureUrl: invoiceData.customerSignatureUrl ? 'Has data (' + invoiceData.customerSignatureUrl.substring(0, 30) + '...)' : 'null/empty',
      salespersonSignature: invoiceData.salespersonSignature ? 'Has data (' + invoiceData.salespersonSignature.substring(0, 30) + '...)' : 'null/empty',
      salespersonSignatureUrl: invoiceData.salespersonSignatureUrl ? 'Has data (' + invoiceData.salespersonSignatureUrl.substring(0, 30) + '...)' : 'null/empty',
      employeeSignature: invoiceData.employeeSignature ? 'Has data (' + invoiceData.employeeSignature.substring(0, 30) + '...)' : 'null/empty',
      authorizedSignature: invoiceData.authorizedSignature ? 'Has data (' + invoiceData.authorizedSignature.substring(0, 30) + '...)' : 'null/empty',
      authorizedSignatureUrl: invoiceData.authorizedSignatureUrl ? 'Has data (' + invoiceData.authorizedSignatureUrl.substring(0, 30) + '...)' : 'null/empty'
    });

    console.log('🔍 Processed invoice data for PDF:', {
      invoiceNumber: processedData.invoiceNumber,
      quotationNumber: processedData.quotationNumber,
      customerName: processedData.customer?.name,
      salespersonName: processedData.salesperson?.name,
      itemsCount: processedData.items?.length,
      hasDate: !!processedData.issueDate,
      hasCustomerSignature: !!processedData.customerSignature || !!processedData.customerSignatureUrl,
      hasSalespersonSignature: !!processedData.salespersonSignatureUrl || !!processedData.employeeSignature,
      hasAuthorizedSignature: !!processedData.authorizedSignature || !!processedData.authorizedSignatureUrl,
      firstItemName: processedData.items?.[0]?.name || 'N/A',
      hasCompany: !!processedData.company,
      hasBranch: !!processedData.branch,
      creditTerm: processedData.creditTerm,
      // Debug financial data
      docFee: invoiceData.doc_fee || invoiceData.docFee || 0,
      vatAmount: invoiceData.vatAmount || 0,
      taxType: invoiceData.taxType || 'none',
      beforeTaxAmount: invoiceData.beforeTaxAmount || 0,
      totalWithTax: invoiceData.totalWithTax || 0,
      // Debug signature URLs processed
      customerSignatureProcessed: processedData.customerSignature ? 'Has data (' + processedData.customerSignature.substring(0, 30) + '...)' : 'null/empty',
      salespersonSignatureProcessed: processedData.salespersonSignatureUrl ? 'Has data (' + processedData.salespersonSignatureUrl.substring(0, 30) + '...)' : 'null/empty'
    });

    // 📄 สร้าง PDF ด้วย InvoicePdfController
    const InvoicePdfController = require('../controllers/InvoicePdfController');
    const result = await InvoicePdfController.createInvoicePdf(processedData);

    // ส่งไฟล์ PDF กลับ
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName || `invoice_${invoiceNumber}.pdf`}"`);
    res.setHeader('Content-Length', result.buffer.length);

    res.send(result.buffer);

    console.log(`✅ Invoice PDF generated: ${result.fileName || `invoice_${invoiceNumber}.pdf`} (${Math.round(result.buffer.length/1024)}KB)`);

  } catch (error) {
    console.error('❌ Error in Invoice PDF API:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: `Failed to generate invoice PDF for: ${req.params.invoiceNumber}`
    });
  }
});

// A4 PDF Receipt Voucher Route
router.post('/a4-receipt-voucher', async (req, res) => {
  try {
    console.log('📄 A4 PDF Receipt Voucher API called');

    const receiptVoucherData = req.body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!receiptVoucherData.documentNumber && !receiptVoucherData._id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required receipt voucher information'
      });
    }

    // สร้าง PDF ด้วย A4PDFController
    const result = await A4PDFController.printReceiptVoucher(receiptVoucherData);

    // ส่งไฟล์ PDF กลับ
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.setHeader('Content-Length', result.buffer.length);

    res.send(result.buffer);

    console.log(`✅ A4 PDF Receipt Voucher generated: ${result.fileName} (${Math.round(result.buffer.length/1024)}KB)`);

  } catch (error) {
    console.error('❌ Error in A4 PDF Receipt Voucher API:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: 'Failed to generate A4 PDF receipt voucher'
    });
  }
});

// ========== TAX INVOICE PDF ROUTES ==========

// A4 PDF TaxInvoice Route (POST) - ส่งไฟล์ PDF โดยตรง
router.post('/a4-tax-invoice', async (req, res) => {
  try {
    console.log('📄 A4 PDF Tax Invoice API called');

    const data = req.body;

    // 🔧 รองรับการดึงข้อมูลจากฐานข้อมูลโดยตรง
    if (data.useDatabase && data.taxInvoiceId) {
      console.log('📋 Using database lookup for tax invoice:', data.taxInvoiceId);
      console.log('📋 Source collection:', data.sourceCollection);
      console.log('📋 Force document type:', data.forceDocumentType);

      let pdfResult;

      // ดึงข้อมูลจาก TaxInvoice collection โดยตรง
      const TaxInvoice = require('../models/TaxInvoice');
      const taxInvoice = await TaxInvoice.findById(data.taxInvoiceId).lean();

      if (!taxInvoice) {
        return res.status(404).json({
          success: false,
          error: 'TaxInvoice not found'
        });
      }

      // แปลงข้อมูล TaxInvoice เป็นรูปแบบที่ A4PDFController ต้องการ
      const orderData = {
        _id: taxInvoice._id,
        order_number: taxInvoice.contractNo,
        documentType: 'TAX_INVOICE', // บังคับเป็นใบกำกับภาษี
        invoiceType: 'TAX_INVOICE',
        forceDocumentType: 'TAX_INVOICE', // บังคับประเภทเอกสาร
        taxInvoiceNumber: taxInvoice.taxInvoiceNumber,

        // ข้อมูลลูกค้า - ใช้ข้อมูลจาก TaxInvoice โดยตรง
        customer: {
          name: taxInvoice.customer?.name || 'ลูกค้าทั่วไป',
          phone: taxInvoice.customer?.phone || taxInvoice.customer?.phone_number || '',
          taxId: taxInvoice.customer?.taxId || taxInvoice.customer?.tax_id || '',
          address: taxInvoice.customer?.address || ''
        },

        // ข้อมูลการเงิน - ใช้ข้อมูลจาก TaxInvoice
        subTotal: taxInvoice.summary?.beforeTax || (taxInvoice.summary?.totalWithTax - taxInvoice.summary?.vatAmount) || 0,
        vatAmount: taxInvoice.summary?.vatAmount || taxInvoice.calculation?.vatAmount || 0,
        grandTotal: taxInvoice.summary?.totalWithTax || taxInvoice.calculation?.totalAmount || 0,
        downPayment: taxInvoice.downPaymentAmount || 0,

        // รายการสินค้า - ใช้ข้อมูลจาก TaxInvoice
        items: taxInvoice.items || [{
          description: `เงินดาวน์การผ่อนชำระ - สัญญา ${taxInvoice.contractNo}`,
          quantity: 1,
          unitPrice: taxInvoice.downPaymentAmount || taxInvoice.summary?.totalWithTax || 0,
          amount: taxInvoice.downPaymentAmount || taxInvoice.summary?.totalWithTax || 0
        }],

        // ข้อมูลเพิ่มเติม
        saleDate: taxInvoice.createdAt || taxInvoice.issueDate,
        staffName: taxInvoice.employeeName || 'พนักงาน',
        branchCode: taxInvoice.branchCode || 'MAIN'
        };

        pdfResult = await A4PDFController.createReceiptPdf(orderData);

      // ส่ง PDF ไฟล์ให้ดาวน์โหลดทันที
      const fileName = `tax_invoice_${data.documentNumber || data.taxInvoiceId}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', (pdfResult.buffer || pdfResult).length);
      return res.send(pdfResult.buffer || pdfResult);
    }

    // รองรับ 2 แหล่งข้อมูล: (1) frontstore payload (2) taxInvoice model payload
    let result;
    if (data && (data.items || data.cartItems)) {
      // มาจาก frontstore (ขายสด)
      result = await A4PDFFrontstoreController.createTaxInvoiceFromFrontstore(data);
    } else {
      // มาจาก taxInvoice model (ขายผ่อนเดิม)
      if (!data.taxInvoiceNumber && !data._id) {
        return res.status(400).json({ success: false, error: 'Missing required tax invoice information' });
      }
      const orderData = A4PDFController._convertTaxInvoiceToOrder(data);
      result = await A4PDFController.printReceipt(orderData);
    }

    // ส่งไฟล์ PDF กลับ (browser จะโหลดเป็นไฟล์หรือเปิด viewer ได้)
    const fileId = data?.taxInvoiceNumber || data?._id || 'tax_invoice';
    const fileName = `tax_invoice_${fileId}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', result.buffer.length);
    return res.send(result.buffer);

    console.log(`✅ A4 PDF Tax Invoice generated: ${Math.round(result.buffer.length/1024)}KB`);

  } catch (error) {
    console.error('❌ Error in A4 PDF Tax Invoice API:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: 'Failed to generate A4 PDF tax invoice'
    });
  }
});

// A4 PDF TaxInvoice by ID Route (GET)
router.get('/a4-tax-invoice/:taxInvoiceId', async (req, res) => {
  try {
    console.log(`📄 A4 PDF Tax Invoice by ID API called: ${req.params.taxInvoiceId}`);

    const { taxInvoiceId } = req.params;

    // สร้าง PDF ด้วย A4PDFController
    const A4PDFController = require('../controllers/pdf/A4PDFController');
    const result = await A4PDFController.createTaxInvoicePdf(taxInvoiceId);

    // ส่งไฟล์ PDF กลับ
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.setHeader('Content-Length', result.buffer.length);

    res.send(result.buffer);

    console.log(`✅ A4 PDF Tax Invoice by ID generated: ${result.fileName} (${Math.round(result.buffer.length/1024)}KB)`);

  } catch (error) {
    console.error('❌ Error in A4 PDF Tax Invoice by ID API:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: `Failed to generate A4 PDF tax invoice for ID: ${req.params.taxInvoiceId}`
    });
  }
});

// GET /api/pdf/receipt-pdf/:receiptId - สร้าง PDF ใบเสร็จรับเงิน (ไม่ซ้ำกับ route เก่า)
router.get('/receipt-pdf/:receiptId', async (req, res) => {
  try {
    console.log(`📄 A4 PDF Receipt by ID API called: ${req.params.receiptId}`);

    const { receiptId } = req.params;

    console.log(`🔍 Searching for Receipt with ID: ${receiptId}`);

    // ดึงข้อมูล Receipt จากฐานข้อมูล
    let receipt = await Receipt.findById(receiptId) || await Receipt.findOne({ receiptNumber: receiptId });

    console.log(`📋 Receipt found:`, !!receipt);
    if (receipt) {
      console.log(`📋 Receipt details:`, {
        id: receipt._id,
        receiptNumber: receipt.receiptNumber,
        documentNumber: receipt.documentNumber,
        customer: !!receipt.customer,
        items: receipt.items?.length || 0
      });
    }

    if (!receipt) {
      return res.status(404).json({
        success: false,
        error: `Receipt not found: ${receiptId}`
      });
    }

    // เตรียมข้อมูลสำหรับ PDF (ประเภทใบเสร็จ) - ตาม A4PDFController format
    const orderData = {
      // Document identification
      type: 'receipt',
      invoiceType: 'RECEIPT_ONLY',
      documentType: 'RECEIPT',
      order_number: receipt.receiptNumber || receipt.documentNumber,
      invoiceNo: receipt.receiptNumber || receipt.documentNumber,
      receiptNumber: receipt.receiptNumber || receipt.documentNumber,

      // Customer data
      customer: {
        name: receipt.customer?.name || receipt.customer?.fullName || 'ไม่ระบุ',
        fullName: receipt.customer?.fullName || receipt.customer?.name || 'ไม่ระบุ',
        phone: receipt.customer?.phone || receipt.customer?.phone_number || '',
        address: receipt.customer?.address || ''
      },

      // Items (ensure proper format with fallback)
      items: receipt.items && receipt.items.length > 0 ? receipt.items : [
        {
          product: 'สินค้าทั่วไป',
          name: 'สินค้าทั่วไป',
          quantity: 1,
          price: receipt.totalAmount || 0,
          amount: receipt.totalAmount || 0,
          unit: 'ชิ้น'
        }
      ],

      // Financial data (ใบเสร็จไม่แสดงภาษี)
      subTotal: receipt.summary?.subtotal || receipt.totalAmount || 0,
      vatAmount: 0,
      vatTotal: 0,
      grandTotal: receipt.totalAmount || receipt.summary?.grandTotal || 0,
      totalAmount: receipt.totalAmount || receipt.summary?.grandTotal || 0,
      total: receipt.summary?.totalAmount || receipt.totalAmount || 0,
      docFee: 0,
      documentFee: 0,

      // Payment info
      paymentMethod: receipt.paymentMethod || 'เงินสด',
      issueDate: receipt.issueDate || new Date(),

      // Branch info
      branchInfo: receipt.branchInfo || {
        name: 'สำนักงานใหญ่',
        address: '789 หมู่ 6 ตำบลรูสะมิแล อำเภอเมือง จังหวัดปัตตานี 94000',
        phone: '09-2427-0769',
        vatNumber: '0-9457-60004-24-1'
      },
      branchCode: receipt.branchCode || '00000',
      staffName: receipt.employeeName || 'ระบบ',
      saleDate: receipt.createdAt || new Date(),

      // Additional fields that A4PDFController might need
      step3Data: {
        docFee: 0
      }
    };

    console.log(`📊 Generating PDF for receipt: ${orderData.receiptNumber}`);
    console.log(`📊 Order data structure:`, {
      type: orderData.type,
      hasCustomer: !!orderData.customer,
      itemsCount: orderData.items?.length || 0,
      subTotal: orderData.subTotal,
      grandTotal: orderData.grandTotal
    });

    // สร้าง PDF ด้วย A4PDFController
    const result = await A4PDFController.printReceipt(orderData);

    console.log(`✅ PDF generated successfully:`, {
      fileName: result.fileName,
      bufferSize: `${Math.round(result.buffer.length/1024)}KB`
    });

    // ส่งไฟล์ PDF กลับ
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${result.fileName}"`);
    res.setHeader('Content-Length', result.buffer.length);
    res.setHeader('Cache-Control', 'no-cache');

    res.send(result.buffer);

    console.log(`✅ A4 PDF Receipt sent: ${result.fileName}`);

  } catch (error) {
    console.error('❌ Error in A4 PDF Receipt by ID API:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Receipt ID being processed:', req.params.receiptId);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      details: `Failed to generate A4 PDF receipt for ID: ${req.params.receiptId}`
    });
  }
});

// GET /api/pdf/tax-invoice-pdf/:taxInvoiceId - สร้าง PDF ใบกำกับภาษี (แก้ไขให้ส่ง type)
router.get('/tax-invoice-pdf/:taxInvoiceId', async (req, res) => {
  try {
    console.log(`📄 A4 PDF Tax Invoice (Fixed) by ID API called: ${req.params.taxInvoiceId}`);

    const { taxInvoiceId } = req.params;

    console.log(`🔍 Searching for TaxInvoice with ID: ${taxInvoiceId}`);

    // ดึงข้อมูล TaxInvoice จากฐานข้อมูล
    let taxInvoice = await TaxInvoice.findById(taxInvoiceId) || await TaxInvoice.findOne({ taxInvoiceNumber: taxInvoiceId });

    console.log(`📋 TaxInvoice found:`, !!taxInvoice);
    if (taxInvoice) {
      console.log(`📋 TaxInvoice details:`, {
        id: taxInvoice._id,
        taxInvoiceNumber: taxInvoice.taxInvoiceNumber,
        customer: !!taxInvoice.customer,
        items: taxInvoice.items?.length || 0,
        summary: !!taxInvoice.summary
      });
    }

    if (!taxInvoice) {
      return res.status(404).json({
        success: false,
        error: `Tax Invoice not found: ${taxInvoiceId}`
      });
    }

    // เตรียมข้อมูลสำหรับ PDF (ประเภทใบกำกับภาษี) - ตาม A4PDFController format
    const orderData = {
      // Document identification
      type: 'tax_invoice',
      invoiceType: 'TAX_INVOICE',
      documentType: 'TAX_INVOICE',
      order_number: taxInvoice.taxInvoiceNumber,
      invoiceNo: taxInvoice.taxInvoiceNumber,
      taxInvoiceNumber: taxInvoice.taxInvoiceNumber,

      // Customer data
      customer: {
        name: taxInvoice.customer?.name || taxInvoice.customer?.fullName || 'ไม่ระบุ',
        fullName: taxInvoice.customer?.fullName || taxInvoice.customer?.name || 'ไม่ระบุ',
        phone: taxInvoice.customer?.phone || taxInvoice.customer?.phone_number || '',
        address: taxInvoice.customer?.address || '',
        taxId: taxInvoice.customer?.taxId || taxInvoice.customer?.tax_id || ''
      },

      // Items (ensure proper format with fallback)
      items: taxInvoice.items && taxInvoice.items.length > 0 ? taxInvoice.items : [
        {
          product: 'สินค้าทั่วไป',
          name: 'สินค้าทั่วไป',
          quantity: 1,
          price: taxInvoice.summary?.subtotal || taxInvoice.summary?.beforeTax || 0,
          amount: taxInvoice.summary?.subtotal || taxInvoice.summary?.beforeTax || 0,
          unit: 'ชิ้น'
        }
      ],

      // Financial data (ใบกำกับภาษีแสดงภาษี)
      subTotal: taxInvoice.summary?.subtotal || taxInvoice.summary?.beforeTax || 0,
      vatAmount: taxInvoice.summary?.vatAmount || 0,
      vatTotal: taxInvoice.summary?.vatAmount || 0,
      grandTotal: taxInvoice.summary?.total || taxInvoice.summary?.grandTotal || 0,
      totalAmount: taxInvoice.summary?.total || taxInvoice.summary?.grandTotal || 0,
      total: taxInvoice.summary?.total || 0,
      docFee: 0,
      documentFee: 0,

      // Payment info
      paymentMethod: taxInvoice.paymentMethod || 'เงินสด',
      issueDate: taxInvoice.issueDate || new Date(),

      // Branch info
      branchInfo: taxInvoice.branchInfo || {
        name: 'สำนักงานใหญ่',
        address: '789 หมู่ 6 ตำบลรูสะมิแล อำเภอเมือง จังหวัดปัตตานี 94000',
        phone: '09-2427-0769',
        vatNumber: '0-9457-60004-24-1'
      },
      branchCode: taxInvoice.branchCode || '00000',
      staffName: taxInvoice.employeeName || 'ระบบ',
      saleDate: taxInvoice.createdAt || new Date(),

      // Tax settings (บังคับให้แสดงภาษี)
      taxType: 'inclusive',
      step3Data: {
        docFee: 0
      }
    };

    console.log(`📊 Generating PDF for tax invoice: ${orderData.taxInvoiceNumber}`);
    console.log(`📊 Order data structure:`, {
      type: orderData.type,
      hasCustomer: !!orderData.customer,
      itemsCount: orderData.items?.length || 0,
      subTotal: orderData.subTotal,
      vatAmount: orderData.vatAmount,
      grandTotal: orderData.grandTotal
    });

    // สร้าง PDF ด้วย A4PDFController
    const result = await A4PDFController.printReceipt(orderData);

    console.log(`✅ PDF generated successfully:`, {
      fileName: result.fileName,
      bufferSize: `${Math.round(result.buffer.length/1024)}KB`
    });

    // ส่งไฟล์ PDF กลับ
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${result.fileName}"`);
    res.setHeader('Content-Length', result.buffer.length);
    res.setHeader('Cache-Control', 'no-cache');

    res.send(result.buffer);

    console.log(`✅ A4 PDF Tax Invoice sent: ${result.fileName}`);

    console.log(`✅ A4 PDF Tax Invoice (Fixed) generated: ${result.fileName} (${Math.round(result.buffer.length/1024)}KB)`);

  } catch (error) {
    console.error('❌ Error in A4 PDF Tax Invoice (Fixed) by ID API:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Tax Invoice ID being processed:', req.params.taxInvoiceId);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      details: `Failed to generate A4 PDF tax invoice for ID: ${req.params.taxInvoiceId}`
    });
  }
});

// ========== FALLBACK A4 DOCUMENT PDF ROUTE (สำหรับ installment documents) ==========

// A4 Document PDF Route (POST) - Fallback สำหรับเอกสารต่าง ๆ รวม installment
router.post('/a4-document', async (req, res) => {
  try {
    console.log('📄 A4 Document PDF Fallback API called');

    const data = req.body;

    // ตรวจสอบข้อมูลพื้นฐาน
    if (!data.documentId && !data._id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required document ID'
      });
    }

    const A4PDFController = require('../controllers/pdf/A4PDFController');
    let result;

    // ตรวจสอบประเภทเอกสารและเรียกใช้ method ที่เหมาะสม
    if (data.documentType === 'TAX_INVOICE' || data.format === 'TAX_INVOICE') {
      console.log('🧾 Processing Tax Invoice document...');

      // แปลงข้อมูลเป็นรูปแบบที่ A4PDFController ต้องการ
      const orderData = A4PDFController._convertTaxInvoiceToOrder(data);
      result = await A4PDFController.printReceipt(orderData);

    } else {
      console.log('🧾 Processing Receipt document...');

      // แปลงข้อมูลเป็นรูปแบบที่ A4PDFController ต้องการ
      const orderData = A4PDFController._convertReceiptToOrder(data);
      result = await A4PDFController.printReceipt(orderData);
    }

    if (!result || !result.buffer) {
      throw new Error('Failed to generate PDF document');
    }

    // ส่งไฟล์ PDF กลับ (browser จะโหลดเป็นไฟล์หรือเปิด viewer ได้)
    const fileId = data?.documentNumber || data?.contractNo || data?._id || 'document';
    const docType = data.documentType === 'TAX_INVOICE' ? 'tax_invoice' : 'receipt';
    const fileName = `${docType}_${fileId}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', result.buffer.length);
    res.setHeader('Cache-Control', 'no-cache');
    return res.send(result.buffer);

  } catch (error) {
    console.error('❌ Error in A4 Document PDF Fallback API:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: 'Failed to generate A4 PDF document'
    });
  }
});

// ==================== INSTALLMENT RECEIPT/TAX INVOICE ENDPOINTS ====================
// Endpoint สำหรับสร้าง PDF ใบเสร็จรับเงิน/ใบกำกับภาษี สำหรับการผ่อนชำระ
router.post('/installment/receipt', async (req, res) => {
  try {
    console.log('📄 Installment Receipt PDF API called');
    console.log('📋 Request body:', JSON.stringify(req.body, null, 2));

    const order = req.body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!order) {
      return res.status(400).json({
        success: false,
        error: 'Missing order data'
      });
    }

    // เรียกใช้ Receipt_installment controller
    const result = await Receipt_installment.createReceiptOrTaxInvoicePdf(order);

    // ส่ง PDF ไฟล์กลับ
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.setHeader('Content-Length', result.buffer.length);
    res.setHeader('Cache-Control', 'no-cache');

    res.send(result.buffer);

    console.log(`✅ Installment Receipt PDF generated: ${result.fileName} (${Math.round(result.buffer.length/1024)}KB)`);

  } catch (error) {
    console.error('❌ Error in Installment Receipt PDF API:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: 'Failed to generate installment receipt PDF'
    });
  }
});

// Endpoint สำหรับสร้างใบกำกับภาษีอย่างเดียว
router.post('/installment/tax-invoice', async (req, res) => {
  try {
    console.log('📄 Installment Tax Invoice PDF API called');
    console.log('📋 Request body:', JSON.stringify(req.body, null, 2));

    const order = req.body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!order) {
      return res.status(400).json({
        success: false,
        error: 'Missing order data'
      });
    }

    // บังคับให้เป็นใบกำกับภาษี
    order.documentType = 'TAX_INVOICE';
    order.invoiceType = 'FULL_TAX';

    // เรียกใช้ Receipt_installment controller
    const result = await Receipt_installment.createReceiptOrTaxInvoicePdf(order);

    // ส่ง PDF ไฟล์กลับ
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.setHeader('Content-Length', result.buffer.length);
    res.setHeader('Cache-Control', 'no-cache');

    res.send(result.buffer);

    console.log(`✅ Installment Tax Invoice PDF generated: ${result.fileName} (${Math.round(result.buffer.length/1024)}KB)`);

  } catch (error) {
    console.error('❌ Error in Installment Tax Invoice PDF API:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: 'Failed to generate installment tax invoice PDF'
    });
  }
});

// ส่ง router ออกไป
module.exports = router;
