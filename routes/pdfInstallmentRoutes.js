/**
 * @file pdfInstallmentRoutes.js
 * @description Routes for PDF generation in installment system
 * @version 1.0.0
 * @date 2025-01-27
 */

const express = require('express');
const router = express.Router();

// Import PDF Controllers
const QuotationPdfController = require('../controllers/QuotationPdfController');
const InvoicePdfController = require('../controllers/InvoicePdfController');
const A4PDFController = require('../controllers/pdf/A4PDFController');

// Import Models for database lookup
const TaxInvoice = require('../models/TaxInvoice');

// Middleware
const authenticateToken = (req, res, next) => {
  // Simple auth check - can be enhanced based on your auth system
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access token required' });
  }
  next();
};

/**
 * POST /api/pdf/installment/quotation
 * Generate Quotation PDF
 */
router.post('/quotation', authenticateToken, async (req, res) => {
  try {
    console.log('📄 Generate Quotation PDF request received');
    const { stepData } = req.body;

    if (!stepData) {
      return res.status(400).json({ error: 'Step data is required' });
    }

    // Transform step data to order format for QuotationPdfController
    const orderData = transformStepDataToOrder(stepData, 'quotation');

    // Generate PDF using QuotationPdfController
    const pdfResult = await QuotationPdfController.createQuotationPdf(orderData);

    // 🔧 FIX: ส่ง JSON response พร้อม quotationNumber แทนการส่ง PDF buffer โดยตรง
    // สร้าง blob URL สำหรับ PDF
    const base64 = pdfResult.buffer.toString('base64');
    const dataUrl = `data:application/pdf;base64,${base64}`;

    // ส่ง JSON response พร้อม quotationNumber และ PDF data
    res.json({
      success: true,
      quotationNumber: orderData.quotationNumber || orderData.quotationNo,
      fileName: pdfResult.fileName,
      url: dataUrl,
      downloadUrl: dataUrl,
      pdfBase64: base64
    });

    console.log('✅ Quotation PDF generated successfully:', pdfResult.fileName, 'with quotationNumber:', orderData.quotationNumber);

  } catch (error) {
    console.error('❌ Error generating quotation PDF:', error);
    res.status(500).json({
      error: 'Failed to generate quotation PDF',
      message: error.message
    });
  }
});

/**
 * POST /api/pdf/installment/invoice
 * Generate Invoice PDF
 */
router.post('/invoice', authenticateToken, async (req, res) => {
  try {
    console.log('📄 Generate Invoice PDF request received');
    const { stepData } = req.body;

    if (!stepData) {
      return res.status(400).json({ error: 'Step data is required' });
    }

    // Transform step data to order format for InvoicePdfController
    const orderData = transformStepDataToOrder(stepData, 'invoice');

    // Generate PDF using InvoicePdfController
    const pdfResult = await InvoicePdfController.createInvoicePdf(orderData);

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pdfResult.fileName}"`);
    res.setHeader('Content-Length', pdfResult.buffer.length);

    // Send PDF buffer
    res.send(pdfResult.buffer);

    console.log('✅ Invoice PDF generated successfully:', pdfResult.fileName);

  } catch (error) {
    console.error('❌ Error generating invoice PDF:', error);
    res.status(500).json({
      error: 'Failed to generate invoice PDF',
      message: error.message
    });
  }
});

/**
 * POST /api/pdf/installment/receipt
 * Generate Receipt PDF
 */
router.post('/receipt', async (req, res) => {
  try {
    console.log('📄 Generate Receipt/Tax Invoice PDF request received');
    const { stepData, options = {}, taxInvoiceId, ...directData } = req.body;

    // Check if direct data is provided (from our new implementation)
    if (directData && directData.documentNumber && directData.customer) {
      console.log('📋 Using direct data format for PDF generation');

      // Import the Receipt_installment controller
      const Receipt_installment = require('../controllers/Receipt_installment');

      // Generate PDF using Receipt_installment controller
      const result = await Receipt_installment.createReceiptOrTaxInvoicePdf(directData);

      // Send PDF response
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
      res.setHeader('Content-Length', result.buffer.length);
      res.setHeader('Cache-Control', 'no-cache');

      res.send(result.buffer);

      console.log(`✅ Receipt/Tax Invoice PDF generated: ${result.fileName} (${Math.round(result.buffer.length/1024)}KB)`);
      return;
    }

    if (!stepData && !taxInvoiceId) {
      return res.status(400).json({ error: 'Step data or Tax Invoice ID is required' });
    }

    // 🔧 Database lookup for Tax Invoice if taxInvoiceId is provided
    if (taxInvoiceId) {
      try {
        console.log('🔍 Looking up Tax Invoice in database:', taxInvoiceId);
        const databaseTaxInvoice = await TaxInvoice.findById(taxInvoiceId);

        if (databaseTaxInvoice) {
          console.log('✅ Tax Invoice found in database:', {
            id: databaseTaxInvoice._id,
            taxInvoiceNumber: databaseTaxInvoice.taxInvoiceNumber,
            customerName: databaseTaxInvoice.customer?.name,
            totalAmount: databaseTaxInvoice.summary?.totalWithTax
          });

          // Transform database data to order format
          const orderData = transformDatabaseTaxInvoiceToOrder(databaseTaxInvoice, stepData);

          // Generate PDF using A4PDFController
          const pdfResult = await A4PDFController.createReceiptPdf(orderData);

          // Set response headers for PDF download
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="${pdfResult.fileName}"`);
          res.setHeader('Content-Length', pdfResult.buffer.length);

          // Send PDF buffer
          res.send(pdfResult.buffer);

          console.log('✅ Receipt PDF generated from database successfully:', pdfResult.fileName);
          return;
        } else {
          console.log('⚠️ Tax Invoice not found in database, falling back to stepData');
        }
      } catch (dbError) {
        console.error('❌ Database lookup error:', dbError);
        console.log('⚠️ Falling back to stepData due to database error');
      }
    }

    // 🔧 Fallback to stepData processing if no taxInvoiceId or database lookup failed
    if (!stepData) {
      return res.status(400).json({ error: 'Step data is required when Tax Invoice not found' });
    }

    // 🔧 VAT Detection - ใช้ logic เดียวกับ step4-integration.js
    const hasVatItems = checkHasVatItems(stepData);
    console.log('🔍 VAT Detection in PDF Route:', {
      hasVatItems,
      documentType: hasVatItems ? 'Tax Invoice (TX-)' : 'Receipt (RE-)',
      timestamp: new Date().toLocaleTimeString(),
      stepData: {
        step1Items: stepData?.step1?.cartItems?.length || 0,
        step3TaxType: stepData?.step3?.taxType,
        step3VatAmount: stepData?.step3?.vatAmount
      }
    });

    // Transform step data to order format for A4PDFController
    const orderData = transformStepDataToOrder(stepData, hasVatItems ? 'tax_invoice' : 'receipt');

    // Add receipt-specific options
    if (options.focusOnDownPayment) {
      orderData.focusOnDownPayment = true;
      orderData.documentType = hasVatItems ? 'down_payment_tax_invoice' : 'down_payment_receipt';
    } else {
      // 🔧 Set document type based on VAT detection
      if (hasVatItems) {
        console.log('🔧 Setting as TAX INVOICE due to VAT items detected');
        orderData.documentType = 'TAX_INVOICE';
        orderData.invoiceType = 'TAX_INVOICE';
        orderData.receiptType = 'installment_tax_invoice';
      } else {
        console.log('🔧 Setting as RECEIPT - no VAT items detected');
        orderData.documentType = 'RECEIPT';
        orderData.invoiceType = 'RECEIPT';
        orderData.receiptType = 'installment_receipt';
        // Clear any VAT-related fields that might trigger Tax Invoice
        orderData.vatAmount = 0;
        orderData.vatTotal = 0;
        orderData.taxType = 'no_vat'; // Force no VAT for receipts
        orderData.beforeTaxAmount = orderData.subTotal || 0;
        orderData.totalWithTax = orderData.subTotal || 0;
      }
    }

    console.log('🔧 Final orderData for PDF generation:', {
      documentType: orderData.documentType,
      invoiceType: orderData.invoiceType,
      receiptType: orderData.receiptType,
      taxType: orderData.taxType,
      vatAmount: orderData.vatAmount,
      vatTotal: orderData.vatTotal,
      hasVatItems: hasVatItems
    });

    // 🔧 Generate PDF using createReceiptPdf with VAT information
    console.log('📄 Generating', hasVatItems ? 'Tax Invoice' : 'Receipt', 'PDF...');
    const pdfResult = await A4PDFController.createReceiptPdf(orderData);

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pdfResult.fileName}"`);
    res.setHeader('Content-Length', pdfResult.buffer.length);

    // Send PDF buffer
    res.send(pdfResult.buffer);

    console.log('✅ Receipt PDF generated successfully:', pdfResult.fileName);

  } catch (error) {
    console.error('❌ Error generating receipt PDF:', error);
    res.status(500).json({
      error: 'Failed to generate receipt PDF',
      message: error.message
    });
  }
});

/**
 * POST /api/pdf/installment/tax-invoice
 * Generate Tax Invoice PDF (with VAT)
 */
router.post('/tax-invoice', async (req, res) => {
  try {
    console.log('📄 Generate Tax Invoice PDF request received');
    const { ...directData } = req.body;

    // Ensure it's a tax invoice
    directData.documentType = 'TAX_INVOICE';
    directData.invoiceType = 'FULL_TAX';

    console.log('📋 Using direct data format for Tax Invoice PDF generation');

    // Import the Receipt_installment controller
    const Receipt_installment = require('../controllers/Receipt_installment');

    // Generate PDF using Receipt_installment controller
    const result = await Receipt_installment.createReceiptOrTaxInvoicePdf(directData);

    // Send PDF response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.setHeader('Content-Length', result.buffer.length);
    res.setHeader('Cache-Control', 'no-cache');

    res.send(result.buffer);

    console.log(`✅ Tax Invoice PDF generated: ${result.fileName} (${Math.round(result.buffer.length/1024)}KB)`);

  } catch (error) {
    console.error('❌ Error generating Tax Invoice PDF:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate Tax Invoice PDF',
      message: error.message
    });
  }
});

/**
 * POST /api/pdf/installment/contract
 * Generate Contract PDF
 */
router.post('/contract', authenticateToken, async (req, res) => {
  try {
    console.log('📄 Generate Contract PDF request received');
    const { stepData } = req.body;

    if (!stepData) {
      return res.status(400).json({ error: 'Step data is required' });
    }

    // Transform step data to order format for contract
    const orderData = transformStepDataToOrder(stepData, 'contract');

    // For now, return a placeholder response
    // This can be enhanced with a proper ContractPdfController later
    const contractContent = generateContractContent(orderData);

    res.json({
      success: true,
      message: 'Contract generation not implemented yet',
      contractData: contractContent
    });

    console.log('⚠️ Contract PDF generation is not implemented yet');

  } catch (error) {
    console.error('❌ Error generating contract PDF:', error);
    res.status(500).json({
      error: 'Failed to generate contract PDF',
      message: error.message
    });
  }
});

/**
 * POST /api/pdf/a4pdf-generate
 * Generate A4 PDF for step4-integration.js
 */
router.post('/a4pdf-generate', authenticateToken, async (req, res) => {
  try {
    console.log('📄 Generate A4 PDF request received');
    const { quotationData, contractData, documentType, receiptType } = req.body;

    if (!quotationData) {
      return res.status(400).json({ error: 'Quotation data is required' });
    }

    // Construct order data from quotation and contract data
    const orderData = {
      documentType: documentType || 'RECEIPT',
      receiptType: receiptType || 'installment_full',
      customer: quotationData.customer,
      items: quotationData.items,
      taxType: quotationData.taxType,
      vatAmount: quotationData.vatAmount,
      vatTotal: quotationData.vatAmount || quotationData.vatTotal || 0, // เพิ่ม vatTotal สำหรับ A4PDFController
      beforeTaxAmount: quotationData.beforeTaxAmount,
      totalWithTax: quotationData.totalWithTax,
      docFee: quotationData.docFee,
      downPayment: quotationData.downPayment || contractData?.downPayment || 0, // เพิ่ม downPayment
      summary: quotationData.summary,
      quotationNumber: quotationData.quotationNumber,
      contractData: contractData,
      issueDate: new Date().toISOString(),
      company: {
        name: 'บริษัท 2 พี่น้อง โมบาย จำกัด'
      },
      branch: {
        name: 'สาขาปัตตานี',
        code: 'PATTANI',
        address: 'ปัตตานี',
        tel: '09-2427-0769',
        taxId: '0945566000616'
      }
    };

    // Generate PDF using A4PDFController
    const pdfResult = await A4PDFController.createReceiptPdf(orderData);

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pdfResult.fileName}"`);
    res.setHeader('Content-Length', pdfResult.buffer.length);

    // Send PDF buffer
    res.send(pdfResult.buffer);

    console.log('✅ A4 PDF generated successfully:', pdfResult.fileName);

  } catch (error) {
    console.error('❌ Error generating A4 PDF:', error);
    res.status(500).json({
      error: 'Failed to generate A4 PDF',
      message: error.message
    });
  }
});

/**
 * Transform step data to order format for PDF controllers
 */
function transformStepDataToOrder(stepData, documentType) {
  console.log('🔄 Transforming step data for:', documentType);

  // 🔧 Validate required data - รองรับทั้ง docFee และ doc_fee
  const docFee = stepData.step3?.docFee ?? stepData.step3?.doc_fee;
  if (docFee === undefined || docFee === null) {
    console.warn('⚠️ DocFee not provided in step3 data. Please ensure user enters document fee in step3.');
  } else {
    console.log('✅ DocFee found in step3:', docFee);
  }

  // 🔧 Validate tax data - ใช้ค่าจาก step3 ไม่ใช่ hardcode
  const taxType = stepData.step3?.taxType;
  const vatAmount = stepData.step3?.vatAmount;
  const beforeTaxAmount = stepData.step3?.beforeTaxAmount;
  const totalWithTax = stepData.step3?.totalWithTax;

  if (!taxType) {
    console.warn('⚠️ TaxType not provided in step3 data. Please ensure user selects tax type in step3.');
  } else {
    console.log('✅ Tax data found in step3:', { taxType, vatAmount, beforeTaxAmount, totalWithTax });
  }

  const orderData = {
    // Document type
    documentType: documentType,

    // Customer information from step2 - 🔧 ปรับปรุงการดึงข้อมูลให้ครบถ้วน
    customer: stepData.step2 ? {
      name: stepData.step2.customerName ||
            (stepData.step2.firstName && stepData.step2.lastName ?
             `${stepData.step2.firstName} ${stepData.step2.lastName}` :
             stepData.step2.firstName || stepData.step2.lastName || ''),
      firstName: stepData.step2.firstName,
      lastName: stepData.step2.lastName,
      phone: stepData.step2.customerPhone || stepData.step2.phone,
      email: stepData.step2.customerEmail || stepData.step2.email,
      // 🔧 FIX: แก้ไข address - แปลง object เป็น string อย่างระมัดระวัง
      address: (() => {
        // ลองดึงจาก customerAddress หรือ address ตัวแรก
        let addr = stepData.step2.customerAddress || stepData.step2.address;

        // ถ้าเป็น string แล้ว ใช้เลย
        if (typeof addr === 'string' && addr !== '[object Object]') {
          return addr;
        }

        // ถ้าเป็น object ให้แปลงเป็น string
        if (typeof addr === 'object' && addr !== null) {
          const addressParts = [
            addr.houseNo || '',
            addr.village ? `หมู่ ${addr.village}` : '',
            addr.subDistrict ? `ตำบล${addr.subDistrict}` : '',
            addr.district ? `อำเภอ${addr.district}` : '',
            addr.province ? `จังหวัด${addr.province}` : '',
            addr.zipcode || ''
          ].filter(part => part && part.trim() !== '').join(' ');

          if (addressParts.trim()) {
            return addressParts.replace(/\s+/g, ' ').trim();
          }
        }

        // Fallback: ลองดึงจาก localStorage หรือ step2 data อื่นๆ
        const fallbackAddr = stepData.step2.houseNo || stepData.step2.province || stepData.step2.district;
        if (fallbackAddr) {
          const fallbackParts = [
            stepData.step2.houseNo || '',
            stepData.step2.village ? `หมู่ ${stepData.step2.village}` : '',
            stepData.step2.subDistrict ? `ตำบล${stepData.step2.subDistrict}` : '',
            stepData.step2.district ? `อำเภอ${stepData.step2.district}` : '',
            stepData.step2.province ? `จังหวัด${stepData.step2.province}` : '',
            stepData.step2.zipcode || ''
          ].filter(part => part && part.trim() !== '').join(' ');

          if (fallbackParts.trim()) {
            return fallbackParts.replace(/\s+/g, ' ').trim();
          }
        }

        return '-';
      })(),
      // 🔧 FIX: ปรับปรุงการส่ง Tax ID ให้ครบถ้วน
      taxId: stepData.step2.customerTaxId ||
             stepData.step2.taxId ||
             stepData.step2.citizenId ||
             stepData.step2.idCard,
      citizenId: stepData.step2.citizenId,
      customerTaxId: stepData.step2.customerTaxId ||
                    stepData.step2.taxId ||
                    stepData.step2.citizenId ||
                    stepData.step2.idCard
    } : {},

    // Items from step1 - 🔧 รองรับทั้ง Array และ cartItems
    items: (() => {
      let cartItems = [];

      // ตรวจสอบว่า step1 เป็น array หรือ object ที่มี cartItems
      if (Array.isArray(stepData.step1)) {
        cartItems = stepData.step1;
      } else if (stepData.step1?.cartItems && Array.isArray(stepData.step1.cartItems)) {
        cartItems = stepData.step1.cartItems;
      }

      // 🔧 Get down payment from step3 for installment receipts
      const downPayment = stepData.step3?.downPayment || stepData.step3?.down_payment;
      const isInstallmentReceipt = documentType === 'receipt' && downPayment > 0;

      return cartItems
        .filter(item => {
          const desc = item.name || item.description || '';
          return !desc.includes('ค่าธรรมเนียมเอกสาร') && !desc.includes('Document Fee');
        })
        .map(item => {
          const quantity = parseInt(item.quantity || 1);
          let unitPrice = parseFloat(item.totalPrice || item.unitPrice || item.price || 0);

          // 🔧 For installment receipts, use down payment amount instead of full price
          if (isInstallmentReceipt && downPayment > 0) {
            // For receipt showing down payment, use down payment amount
            unitPrice = downPayment / quantity; // Divide by quantity to get per-unit down payment
            console.log('💰 Using down payment for receipt:', {
              originalPrice: parseFloat(item.totalPrice || item.unitPrice || item.price || 0),
              downPayment: downPayment,
              quantity: quantity,
              unitDownPayment: unitPrice
            });
          }

          const totalPrice = unitPrice * quantity;

          // 🔧 Smart description generation to avoid duplication
          let baseProductName = item.name || item.description || 'สินค้า';

          // If the name already contains "ค่าดาวน์", extract the product name
          if (baseProductName.includes('ค่าดาวน์')) {
            const match = baseProductName.match(/ค่าดาวน์\s*\(([^)]+)\)/);
            if (match) {
              baseProductName = match[1];
            }
          }

          // Generate clean description
          const cleanDescription = `ค่าดาวน์ (${baseProductName}${item.imei ? ` (IMEI: ${item.imei})` : ''})`;

          console.log('🏷️ Item description generation:', {
            originalName: item.name,
            baseProductName,
            imei: item.imei,
            cleanDescription,
            isInstallmentReceipt
          });

          return {
            description: cleanDescription,
            name: cleanDescription,
            imei: item.imei,
            quantity: quantity,
            unitPrice: unitPrice,
            totalPrice: totalPrice,
            amount: totalPrice,
            discount: item.discount || 0,
            // Installment specific fields
            downAmount: item.downAmount || item.downPayment || (isInstallmentReceipt ? downPayment : undefined),
            termCount: item.termCount || item.installmentCount,
            installmentAmount: item.installmentAmount
          };
        });
    })(),

    // 🔧 คำนวณ subTotal จาก cartItems (ใช้ down payment สำหรับ installment receipts)
    subTotal: (() => {
      let cartItems = [];

      // ตรวจสอบว่า step1 เป็น array หรือ object ที่มี cartItems
      if (Array.isArray(stepData.step1)) {
        cartItems = stepData.step1;
      } else if (stepData.step1?.cartItems && Array.isArray(stepData.step1.cartItems)) {
        cartItems = stepData.step1.cartItems;
      }

      // 🔧 Get down payment from step3 for installment receipts
      const downPayment = stepData.step3?.downPayment || stepData.step3?.down_payment;
      const isInstallmentReceipt = documentType === 'receipt' && downPayment > 0;

      console.log('🔍 Down payment debug:', {
        documentType,
        step3DownPayment: stepData.step3?.downPayment,
        step3DownPaymentAlt: stepData.step3?.down_payment,
        resolvedDownPayment: downPayment,
        isInstallmentReceipt,
        condition: isInstallmentReceipt && downPayment > 0
      });

      if (isInstallmentReceipt && downPayment > 0) {
        console.log('💰 Using down payment for subTotal calculation:', downPayment);
        return downPayment;
      }

      return cartItems
        .filter(item => {
          const desc = item.name || item.description || '';
          return !desc.includes('ค่าธรรมเนียมเอกสาร') && !desc.includes('Document Fee');
        })
        .reduce((sum, item) => {
          const quantity = parseInt(item.quantity || 1);
          const unitPrice = parseFloat(item.totalPrice || item.unitPrice || item.price || 0);
          return sum + (unitPrice * quantity);
        }, 0);
    })(),

    // 🔧 NEW: เพิ่มรายการค่าธรรมเนียมเอกสารเป็นรายการแยก (สำหรับใบแจ้งหนี้)
    docFeeAsItem: docFee > 0 ? {
      description: 'ค่าธรรมเนียมเอกสาร',
      name: 'ค่าธรรมเนียมเอกสาร',
      quantity: 1,
      unitPrice: docFee,
      totalPrice: docFee,
      amount: docFee,
      discount: 0
    } : null,

    // Payment plan from step3
    taxType: taxType,  // 🔧 ใช้ค่าจาก step3 ไม่มี fallback
    vatAmount: vatAmount,  // 🔧 เพิ่ม vatAmount จาก step3
    beforeTaxAmount: beforeTaxAmount,  // 🔧 เพิ่ม beforeTaxAmount จาก step3
    totalWithTax: totalWithTax,  // 🔧 เพิ่ม totalWithTax จาก step3
    docFee: docFee,  // 🔧 ใช้ค่าที่ validate แล้ว - รองรับทั้ง docFee และ doc_fee
    shippingFee: stepData.step3?.shippingFee || 0,
    // 🔧 FIX: แปลง paymentMethod จาก step3 เป็น creditTerm ภาษาไทย
    creditTerm: (() => {
      const paymentMethod = stepData.step3?.paymentMethod || stepData.step3?.creditTerm || 'cash';
      const paymentMethodMap = {
        'cash': 'เงินสด',
        'transfer': 'โอนเงิน',
        'card': 'บัตรเครดิต',
        'credit': 'เครดิต',
        'เงินสด': 'เงินสด',
        'โอนเงิน': 'โอนเงิน',
        'บัตรเครดิต': 'บัตรเครดิต'
      };
      console.log('💳 Payment method mapping:', {
        original: paymentMethod,
        mapped: paymentMethodMap[paymentMethod] || paymentMethod || 'เงินสด'
      });
      return paymentMethodMap[paymentMethod] || paymentMethod || 'เงินสด';
    })(),
    pickupMethod: stepData.step3?.pickupMethod,

    // Contract data from step4
    contractData: stepData.step4,

    // Signatures - 🔧 FIX: ดึงลายเซ็นจากแหล่งที่ถูกต้อง
    customerSignature: stepData.signatures?.customer ||
                      stepData.step2?.signatures?.customer ||
                      stepData.step2?.customerSignature ||
                      stepData.customerSignature,

    salespersonSignature: stepData.signatures?.salesperson ||
                         stepData.step2?.signatures?.salesperson ||
                         stepData.step2?.salespersonSignature ||
                         stepData.salespersonSignature,

    employeeSignature: stepData.signatures?.salesperson ||
                      stepData.step2?.signatures?.salesperson ||
                      stepData.step2?.employeeSignature ||
                      stepData.employeeSignature,

    authorizedSignature: stepData.signatures?.authorized ||
                        stepData.step2?.signatures?.authorized ||
                        stepData.step2?.authorizedSignature ||
                        stepData.authorizedSignature,

    // 🔧 ENHANCEMENT: เพิ่ม URL fields สำหรับ PDF Controllers
    customerSignatureUrl: stepData.signatures?.customer ||
                         stepData.step2?.signatures?.customer ||
                         stepData.step2?.customerSignatureUrl,

    salespersonSignatureUrl: stepData.signatures?.salesperson ||
                            stepData.step2?.signatures?.salesperson ||
                            stepData.step2?.salespersonSignatureUrl,

    authorizedSignatureUrl: stepData.signatures?.authorized ||
                           stepData.step2?.signatures?.authorized ||
                           stepData.step2?.authorizedSignatureUrl,

    // Document dates
    issueDate: new Date().toISOString(),

    // Company and branch info - 🔧 ใช้ข้อมูลจาก step4 branchData
    company: {
      name: 'บริษัท 2 พี่น้อง โมบาย จำกัด'
    },
    branch: stepData.step4?.branchData ? {
      name: stepData.step4.branchData.name,
      code: stepData.step4.branchData.code,
      address: stepData.step4.branchData.address,
      tel: stepData.step4.branchData.tel,
      taxId: stepData.step4.branchData.taxId
    } : {
      name: 'สาขาปัตตานี',
      code: 'PATTANI',
      address: 'ปัตตานี',
      tel: '09-2427-0769',
      taxId: '0945566000616'
    },

    // Salesperson info - 🔧 ใช้ข้อมูลจากหลายแหล่ง
    salesperson: {
      name: stepData.step4?.salespersonName ||
            stepData.step2?.salespersonName ||
            stepData.step2?.employeeName ||
            'พนักงานขาย'
    }
  };

  // Add quotation reference if this is an invoice
  console.log('🔍 Invoice quotationNumber check:', {
    documentType,
    hasQuotationNumber: !!stepData.quotationNumber,
    quotationNumber: stepData.quotationNumber
  });

  if (documentType === 'invoice') {
    // 🔧 FIX: หา quotationNumber จากหลายแหล่งถ้าไม่มีใน stepData
    let quotationNumber = stepData.quotationNumber ||
                          stepData.step4?.quotationNumber ||
                          stepData.step4?.data?.quotation_no ||
                          stepData.contractData?.quotationNumber ||
                          stepData.quotationData?.quotationNumber;

         if (quotationNumber) {
      // 🔧 FIX: ตรวจสอบและแก้ไข format ของ quotation number
      console.log('✅ Found quotationNumber for invoice:', quotationNumber);

    // ถ้าเป็น format เก่า QT20250730008 ให้แปลงเป็น QT-250730-008
    if (quotationNumber && typeof quotationNumber === 'string') {
      // ตรวจสอบว่าเป็น format QT20250730008 (ไม่มี dash)
      const oldFormatMatch = quotationNumber.match(/^(QT|INV|TX|RE)(\d{8})(\d+)$/);
      if (oldFormatMatch) {
        const [, prefix, dateStr, sequence] = oldFormatMatch;
        // แปลง 20250730 เป็น 250730 (ตัด 2 หลักแรกของปี)
        const shortDate = dateStr.substring(2);
        // แปลงเป็น format ใหม่ QT-250730-008
        quotationNumber = `${prefix}-${shortDate}-${sequence.padStart(3, '0')}`;
        console.log('🔧 Fixed quotation number format:', {
          original: stepData.quotationNumber,
          fixed: quotationNumber
        });
      }
    }

    orderData.quotationNumber = quotationNumber;
    orderData.quotationNo = quotationNumber;

          // 🔧 สร้าง quotationData เพื่อให้ InvoicePdfController sync ข้อมูลถูกต้อง
      orderData.quotationData = {
        quotationNumber: quotationNumber, // ใช้ quotationNumber ที่ fix format แล้ว
        quotationNo: quotationNumber,     // ใช้ quotationNumber ที่ fix format แล้ว
        customer: orderData.customer,
        // 🔧 Filter out docFee items from quotationData.items to prevent duplication in invoice
        items: orderData.items.filter(item => {
          const desc = item.description || '';
          return !desc.includes('ค่าธรรมเนียมเอกสาร') && !desc.includes('Document Fee');
        }),
        taxType: taxType,  // 🔧 ใช้ค่าจาก step3
        vatAmount: vatAmount,  // 🔧 ใช้ค่าจาก step3
        beforeTaxAmount: beforeTaxAmount,  // 🔧 ใช้ค่าจาก step3
        totalWithTax: totalWithTax,  // 🔧 ใช้ค่าจาก step3
        docFee: docFee,  // 🔧 ใช้ค่าที่ validate แล้ว
        shippingFee: orderData.shippingFee,
        creditTerm: orderData.creditTerm,
        summary: {
          beforeTax: beforeTaxAmount || 0,  // 🔧 ใช้ค่าจาก step3 แทน calculation
          tax: vatAmount || 0,  // 🔧 ใช้ค่าจาก step3 แทน hardcode 0.07
          netTotal: totalWithTax || 0,  // 🔧 ใช้ค่าจาก step3 แทน calculation
          discount: 0,
          docFee: docFee || 0  // 🔧 ใช้ค่าที่ validate แล้ว
        },
        salesperson: orderData.salesperson
      };
    } else {
      console.warn('⚠️ No quotationNumber found for invoice generation');
      console.log('🔍 Available stepData keys:', Object.keys(stepData));
      console.log('🔍 Step4 data:', stepData.step4);
      console.log('🔍 Contract data:', stepData.contractData);
      console.log('🔍 Quotation data:', stepData.quotationData);
    }
  }

  // 🔍 DEBUG: แสดงข้อมูลลายเซ็นที่จะส่งไปยัง PDF Controller
  console.log('🖋️ Signature data for PDF generation:', {
    customerSignature: orderData.customerSignature ? 'Present (' + orderData.customerSignature.substring(0, 50) + '...)' : 'MISSING',
    salespersonSignature: orderData.salespersonSignature ? 'Present (' + orderData.salespersonSignature.substring(0, 50) + '...)' : 'MISSING',
    employeeSignature: orderData.employeeSignature ? 'Present (' + orderData.employeeSignature.substring(0, 50) + '...)' : 'MISSING',
    authorizedSignature: orderData.authorizedSignature ? 'Present (' + orderData.authorizedSignature.substring(0, 50) + '...)' : 'MISSING',
    customerSignatureUrl: orderData.customerSignatureUrl ? 'Present' : 'MISSING',
    salespersonSignatureUrl: orderData.salespersonSignatureUrl ? 'Present' : 'MISSING',
    documentType: documentType
  });

  console.log('✅ Step data transformed successfully for:', documentType);
  return orderData;
}

// 🔧 NEW: API endpoint สำหรับสร้าง Receipt/Tax Invoice PDF
router.post('/receipt', async (req, res) => {
  try {
    console.log('📄 Creating Receipt/Tax Invoice PDF from installment data...');

    const { stepData } = req.body;
    console.log('📋 Received stepData structure:', {
      hasStepData: !!stepData,
      hasStep1: !!stepData?.step1,
      step1Type: typeof stepData?.step1,
      hasCartItems: !!stepData?.step1?.cartItems,
      cartItemsLength: stepData?.step1?.cartItems?.length || 0,
      hasStep3: !!stepData?.step3,
      step3TaxType: stepData?.step3?.taxType
    });

    if (!stepData) {
      return res.status(400).json({ error: 'Step data is required' });
    }

    // 🔧 VAT Detection with better error handling
    let hasVatItems = false;
    try {
      hasVatItems = checkHasVatItems(stepData);
    } catch (vatError) {
      console.warn('⚠️ VAT detection error, defaulting to Receipt:', vatError.message);
      hasVatItems = false;
    }

    console.log('� VAT Detection Result:', {
      hasVatItems,
      documentType: hasVatItems ? 'Tax Invoice (TX-)' : 'Receipt (RE-)'
    });

    const orderData = transformStepDataToOrder(stepData, hasVatItems ? 'tax_invoice' : 'receipt');

    // 🔧 Set document type based on VAT detection
    if (hasVatItems) {
      console.log('🔧 Setting as TAX INVOICE due to VAT items detected');
      orderData.documentType = 'TAX_INVOICE';
      orderData.invoiceType = 'TAX_INVOICE';
      orderData.receiptType = 'installment_tax_invoice';
    } else {
      console.log('🔧 Setting as RECEIPT - no VAT items detected');
      orderData.documentType = 'RECEIPT';
      orderData.invoiceType = 'RECEIPT';
      orderData.receiptType = 'installment_receipt';
      // Clear any VAT-related fields that might trigger Tax Invoice
      orderData.vatAmount = 0;
      orderData.vatTotal = 0;
      orderData.taxType = 'no_vat'; // Force no VAT for receipts
      orderData.beforeTaxAmount = orderData.subTotal || 0;
      orderData.totalWithTax = orderData.subTotal || 0;
    }

    console.log('📋 Order data for receipt generation:', {
      customer: orderData.customer?.name,
      items: orderData.items?.length,
      documentType: orderData.documentType,
      vatAmount: orderData.vatAmount
    });

    // สร้าง PDF ใบเสร็จรับเงิน/ใบกำกับภาษี
    const pdfBuffer = await A4PDFController.createReceiptPdf(orderData);

    // 🔧 Check if request wants download vs inline view
    const disposition = req.query.download === 'true' ? 'attachment' : 'inline';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${disposition}; filename="receipt_tax_invoice_${Date.now()}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);

    console.log('✅ Receipt/Tax Invoice PDF created successfully');

  } catch (error) {
    console.error('❌ Error creating Receipt/Tax Invoice PDF:', error);
    res.status(500).json({
      error: 'Failed to create Receipt/Tax Invoice PDF',
      details: error.message
    });
  }
});

// 🔧 NEW: GET endpoint สำหรับ Gmail integration (ใบเสร็จรับเงิน/ใบกำกับภาษี)
router.get('/receipt', async (req, res) => {
  try {
    console.log('📄 Gmail requesting Receipt/Tax Invoice PDF...');

    // รับข้อมูลจาก query parameters
    const { quotationId, invoiceId, contractId } = req.query;

    if (!quotationId && !invoiceId && !contractId) {
      return res.status(400).json({
        error: 'Missing required identifiers',
        details: 'Please provide quotationId, invoiceId, or contractId'
      });
    }

    // หาข้อมูลจากฐานข้อมูลตาม ID
    let sourceData = null;

    if (quotationId) {
      const Quotation = require('../models/Installment/Quotation');
      sourceData = await Quotation.findById(quotationId).lean();
      console.log('📋 Found quotation data:', !!sourceData);
    } else if (invoiceId) {
      const Invoice = require('../models/Installment/Invoice');
      sourceData = await Invoice.findById(invoiceId).lean();
      console.log('📋 Found invoice data:', !!sourceData);
    } else if (contractId) {
      const InstallmentOrder = require('../models/Installment/InstallmentOrder');
      sourceData = await InstallmentOrder.findById(contractId).lean();
      console.log('📋 Found contract data:', !!sourceData);
    }

    if (!sourceData) {
      return res.status(404).json({
        error: 'Document not found',
        details: 'Unable to find source document for PDF generation'
      });
    }

    // แปลงข้อมูลเป็นรูปแบบที่ A4PDFController คาดหวัง
    const orderData = {
      documentType: 'RECEIPT',
      customer: sourceData.customer,
      items: sourceData.items || [],
      grandTotal: sourceData.grandTotal || sourceData.totalAmount || 0,
      subTotal: sourceData.subTotal || 0,
      vatTotal: sourceData.vatAmount || 0,
      docFee: sourceData.docFee || 0,
      creditTerm: sourceData.creditTerm || 'เงินสด',
      quotationNumber: sourceData.quotationNumber,
      invoiceNumber: sourceData.invoiceNumber,
      // ลายเซ็น
      customerSignature: sourceData.customerSignature || '',
      salespersonSignature: sourceData.salespersonSignature || '',
      employeeSignature: sourceData.employeeSignature || '',
      authorizedSignature: sourceData.authorizedSignature || '',
      branchCode: sourceData.branchCode || '00000'
    };

    console.log('📋 Order data for Gmail receipt generation:', {
      customer: orderData.customer?.name,
      items: orderData.items?.length,
      grandTotal: orderData.grandTotal,
      hasSignatures: {
        customer: !!orderData.customerSignature,
        salesperson: !!orderData.salespersonSignature
      }
    });

    // สร้าง PDF ใบเสร็จรับเงิน/ใบกำกับภาษี
    const pdfBuffer = await A4PDFController.createReceiptPdf(orderData);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt_tax_invoice_${Date.now()}.pdf"`);
    res.send(pdfBuffer);

    console.log('✅ Gmail Receipt/Tax Invoice PDF created successfully');

  } catch (error) {
    console.error('❌ Error creating Gmail Receipt/Tax Invoice PDF:', error);
    res.status(500).json({
      error: 'Failed to create Receipt/Tax Invoice PDF for Gmail',
      details: error.message
    });
  }
});

/**
 * POST /api/pdf/installment/down-payment-receipt-voucher
 * Generate Down Payment Receipt Voucher PDF
 */
router.post('/down-payment-receipt-voucher', authenticateToken, async (req, res) => {
  try {
    console.log('📄 Generate Down Payment Receipt Voucher PDF request received');
    const { receiptVoucherData } = req.body;

    if (!receiptVoucherData) {
      return res.status(400).json({ error: 'Receipt voucher data is required' });
    }

    // Import ReceiptVoucherController
    const ReceiptVoucherController = require('../controllers/receiptVoucherController');

    // Generate PDF using ReceiptVoucherController
    const pdfBuffer = await ReceiptVoucherController.generateReceiptVoucherPDF(receiptVoucherData);

    // Set response headers for PDF download
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="receipt-voucher-${receiptVoucherData.contractNumber || Date.now()}.pdf"`,
      'Content-Length': pdfBuffer.length
    });

    // Send PDF buffer
    res.send(pdfBuffer);

    console.log('✅ Receipt Voucher PDF generated successfully');

  } catch (error) {
    console.error('❌ Error creating Receipt Voucher PDF:', error);
    res.status(500).json({
      error: 'Failed to create Receipt Voucher PDF',
      details: error.message
    });
  }
});

/**
 * 🔧 VAT Detection Function - คัดลอกมาจาก step4-integration.js
 * ตรวจสอบว่ามีสินค้าที่ต้องเสียภาษีมูลค่าเพิ่มหรือไม่
 */
function checkHasVatItems(stepData) {
  console.log('🔍 VAT Detection - Checking multiple sources...');
  console.log('🔍 Input stepData structure:', {
    hasStep1: !!stepData?.step1,
    hasStep3: !!stepData?.step3,
    step1Type: Array.isArray(stepData?.step1) ? 'array' : typeof stepData?.step1,
    step3TaxType: stepData?.step3?.taxType,
    step1CartItems: stepData?.step1?.cartItems?.length || 0
  });

  try {
    let hasVatFromItems = false;
    let hasVatFromStep3 = false;
    let hasCalculatedVat = false;

    // 1. ตรวจสอบจากสินค้าใน step1 - ปรับให้รองรับทั้ง array และ object
    let cartItems = [];
    if (Array.isArray(stepData?.step1)) {
      cartItems = stepData.step1;
    } else if (stepData?.step1?.cartItems && Array.isArray(stepData.step1.cartItems)) {
      cartItems = stepData.step1.cartItems;
    }

    if (cartItems.length > 0) {
      hasVatFromItems = cartItems.some(item => {
        const hasVat = item.vatStatus === 'vat' || item.vat === 'vat' || item.isVat === true;
        if (hasVat) {
          console.log('🔍 Found VAT item:', { name: item.name, vatStatus: item.vatStatus, vat: item.vat, isVat: item.isVat });
        }
        return hasVat;
      });
    }

    // 2. ตรวจสอบจาก step3 taxType
    if (stepData?.step3?.taxType) {
      hasVatFromStep3 = stepData.step3.taxType === 'include_vat' || stepData.step3.taxType === 'exclude_vat';
      console.log('🔍 Step3 taxType:', stepData.step3.taxType, 'hasVatFromStep3:', hasVatFromStep3);
    }

    // 3. ตรวจสอบจากการคำนวณภาษี
    try {
      const vatAmount = calculateVatAmount(stepData?.step1, stepData?.step3);
      hasCalculatedVat = vatAmount > 0;
      console.log('🔍 Calculated VAT amount:', vatAmount, 'hasCalculatedVat:', hasCalculatedVat);
    } catch (error) {
      console.warn('⚠️ Could not calculate VAT amount:', error.message);
    }

    // 🔧 SPECIAL CASE: สำหรับค่าดาวน์ที่ไม่มีสินค้า VAT ให้ force เป็น Receipt
    const isDownPaymentOnly = cartItems.length === 0 || cartItems.every(item => {
      const desc = item.name || item.description || '';
      return desc.includes('ค่าดาวน์') || desc.includes('down payment');
    });

    if (isDownPaymentOnly && !hasVatFromItems) {
      console.log('🔧 SPECIAL: Down payment only detected, forcing Receipt');
      return false;
    }

    const finalResult = hasVatFromItems || hasVatFromStep3 || hasCalculatedVat;

    console.log('🔍 VAT Detection Summary:', {
      hasVatFromItems,
      hasVatFromStep3,
      hasCalculatedVat,
      isDownPaymentOnly,
      finalResult,
      documentType: finalResult ? 'Tax Invoice (TX-)' : 'Receipt (RE-)'
    });

    return finalResult;
  } catch (error) {
    console.error('❌ Error in VAT detection:', error);
    return false; // Default to Receipt if error
  }
}

/**
 * 🔧 VAT Calculation Function - คัดลอกมาจาก step4-integration.js
 * คำนวณจำนวนภาษีมูลค่าเพิ่ม
 */
function calculateVatAmount(step1Data, step3Data) {
  console.log('💰 Calculating VAT amount...');

  if (!step1Data?.cartItems || !Array.isArray(step1Data.cartItems)) {
    console.log('💰 No cart items found for VAT calculation');
    return 0;
  }

  if (!step3Data?.taxType) {
    console.log('💰 No tax type specified in step3');
    return 0;
  }

  const taxType = step3Data.taxType;
  console.log('💰 Tax type:', taxType);

  // คำนวณราคารวมของสินค้า
  const subtotal = step1Data.cartItems.reduce((sum, item) => {
    const price = parseFloat(item.price) || 0;
    const quantity = parseInt(item.quantity) || 1;
    return sum + (price * quantity);
  }, 0);

  console.log('💰 Subtotal:', subtotal);

  let vatAmount = 0;
  const VAT_RATE = 0.07; // 7%

  if (taxType === 'include_vat') {
    // ภาษีรวมในราคา: VAT = ราคารวม * 7/107
    vatAmount = subtotal * (VAT_RATE / (1 + VAT_RATE));
  } else if (taxType === 'exclude_vat') {
    // ภาษีไม่รวมในราคา: VAT = ราคา * 7%
    vatAmount = subtotal * VAT_RATE;
  }

  console.log('💰 Calculated VAT amount:', vatAmount);
  return vatAmount;
}

/**
 * Generate contract content (placeholder)
 */
function generateContractContent(orderData) {
  return {
    contractNumber: `CONTRACT-${Date.now()}`,
    customerName: orderData.customer?.name,
    items: orderData.items,
    totalAmount: orderData.items?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0,
    terms: 'สัญญาผ่อนชำระ - รอการพัฒนา',
    createdAt: new Date().toISOString()
  };
}

/**
 * Transform database Tax Invoice to order format for A4PDFController
 */
function transformDatabaseTaxInvoiceToOrder(databaseTaxInvoice, stepData) {
  console.log('🔄 Transforming database Tax Invoice for PDF generation');

  const orderData = {
    // Document type - always Tax Invoice since we have database record
    documentType: 'TAX_INVOICE',
    invoiceType: 'TAX_INVOICE',
    receiptType: 'installment_tax_invoice',

    // Use database Tax Invoice number
    taxInvoiceNumber: databaseTaxInvoice.taxInvoiceNumber,
    documentNumber: databaseTaxInvoice.taxInvoiceNumber,
    invoiceNumber: databaseTaxInvoice.taxInvoiceNumber,

    // Customer information from database
    customer: {
      name: databaseTaxInvoice.customer?.name || databaseTaxInvoice.customerName,
      firstName: databaseTaxInvoice.customer?.first_name,
      lastName: databaseTaxInvoice.customer?.last_name,
      phone: databaseTaxInvoice.customer?.phone || databaseTaxInvoice.customer?.phone_number,
      email: databaseTaxInvoice.customer?.email,
      address: databaseTaxInvoice.customer?.address,
      taxId: databaseTaxInvoice.customer?.taxId || databaseTaxInvoice.customer?.tax_id,
      citizenId: databaseTaxInvoice.customer?.citizenId,
      customerTaxId: databaseTaxInvoice.customer?.taxId || databaseTaxInvoice.customer?.tax_id
    },

    // Items from database
    items: (databaseTaxInvoice.items || []).map(item => ({
      description: item.description || item.name,
      name: item.name || item.description,
      imei: item.imei,
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice || 0,
      totalPrice: item.totalPrice || item.amount || 0,
      amount: item.amount || item.totalPrice || 0,
      discount: item.discount || 0,
      downAmount: item.downAmount,
      termCount: item.termCount,
      installmentAmount: item.installmentAmount
    })),

    // Financial data from database summary
    subTotal: databaseTaxInvoice.summary?.subtotal || 0,
    vatAmount: databaseTaxInvoice.summary?.vatAmount || databaseTaxInvoice.summary?.vat_amount || databaseTaxInvoice.summary?.tax || 0,
    vatTotal: databaseTaxInvoice.summary?.vatAmount || databaseTaxInvoice.summary?.vat_amount || databaseTaxInvoice.summary?.tax || 0,
    beforeTaxAmount: databaseTaxInvoice.summary?.beforeTax || databaseTaxInvoice.calculation?.beforeTax || 0,
    totalWithTax: databaseTaxInvoice.summary?.totalWithTax || databaseTaxInvoice.summary?.netTotal || databaseTaxInvoice.summary?.total || 0,
    docFee: databaseTaxInvoice.summary?.docFee || databaseTaxInvoice.calculation?.documentFee || 0,
    shippingFee: 0,

    // Tax type from database
    taxType: databaseTaxInvoice.calculation?.taxType || 'inclusive',

    // Payment and contract information
    creditTerm: stepData?.step3?.paymentMethod === 'transfer' ? 'โอนเงิน' : 'เงินสด',
    pickupMethod: stepData?.step3?.pickupMethod || 'store',
    contractData: stepData?.step4,
    downPaymentAmount: databaseTaxInvoice.downPaymentAmount,

    // Contract reference
    contractNo: databaseTaxInvoice.contractNo,
    quotationNumber: databaseTaxInvoice.contractNo,
    quotationNo: databaseTaxInvoice.contractNo,

    // Signatures from stepData (database doesn't store signatures as base64)
    customerSignature: stepData?.signatures?.customer || stepData?.step2?.signatures?.customer,
    salespersonSignature: stepData?.signatures?.salesperson || stepData?.step2?.signatures?.salesperson,
    employeeSignature: stepData?.signatures?.salesperson || stepData?.step2?.signatures?.salesperson,
    authorizedSignature: stepData?.signatures?.authorized || stepData?.step2?.signatures?.authorized,

    // Document dates
    issueDate: databaseTaxInvoice.createdAt || new Date().toISOString(),

    // Company and branch info from database or stepData
    company: databaseTaxInvoice.company || {
      name: 'บริษัท 2 พี่น้อง โมบาย จำกัด'
    },
    branch: databaseTaxInvoice.branch || stepData?.step4?.branchData || {
      name: 'สำนักงานใหญ่',
      code: '00000',
      address: '148/91 หมู่ที่ 6 ตำบลรูสะมิแล อำเภอปัตตานี จังหวัดปัตตานี 94000',
      tel: '09-2427-0769',
      taxId: '0945566000616'
    },

    // Salesperson info from stepData
    salesperson: {
      name: stepData?.step4?.salespersonName ||
            stepData?.step2?.salespersonName ||
            stepData?.step2?.employeeName ||
            'พนักงานขาย'
    }
  };

  console.log('✅ Database Tax Invoice transformed for PDF:', {
    documentType: orderData.documentType,
    taxInvoiceNumber: orderData.taxInvoiceNumber,
    customerName: orderData.customer?.name,
    itemsCount: orderData.items?.length,
    vatAmount: orderData.vatAmount,
    totalWithTax: orderData.totalWithTax
  });

  return orderData;
}

/**
 * GET /api/pdf/installment/receipt/:id
 * Generate PDF from existing Receipt document
 */
router.get('/receipt/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📄 Generate PDF from Receipt ID:', id);

    // Import PDFoooRasterController for PDF generation
    const PDFoooRasterController = require('../controllers/pdf/PDFoooRasterController');

    // Generate PDF from Receipt ID
    const result = await PDFoooRasterController.printFromDbById(id, 'RECEIPT');

    if (!result || !result.base64) {
      return res.status(404).json({
        success: false,
        error: 'Receipt not found or PDF generation failed'
      });
    }

    // Convert base64 to buffer (แต่ PDFoooRasterController ส่งกลับเป็นภาพ PNG ไม่ใช่ PDF)
    // ในที่นี้เราจะส่งภาพ PNG กลับไปแทน
    const imageBuffer = Buffer.from(result.base64, 'base64');

    // Check if client wants JSON response or direct image
    const acceptHeader = req.headers['accept'];
    if (acceptHeader && acceptHeader.includes('application/json')) {
      return res.json({
        success: true,
        data: {
          fileName: result.fileName,
          base64: result.base64
        }
      });
    }

    // Send image directly
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.setHeader('Content-Length', imageBuffer.length);
    res.send(imageBuffer);

    console.log('✅ Receipt image sent successfully:', result.fileName);

  } catch (error) {
    console.error('❌ Error generating Receipt image:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate Receipt image',
      message: error.message
    });
  }
});

/**
 * GET /api/pdf/installment/tax-invoice/:id
 * Generate PDF from existing Tax Invoice document
 */
router.get('/tax-invoice/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📄 Generate PDF from Tax Invoice ID:', id);

    // Import PDFoooRasterController for PDF generation
    const PDFoooRasterController = require('../controllers/pdf/PDFoooRasterController');

    // Generate PDF from Tax Invoice ID
    const result = await PDFoooRasterController.printFromDbById(id, 'TAX_INVOICE');

    if (!result || !result.base64) {
      return res.status(404).json({
        success: false,
        error: 'Tax Invoice not found or PDF generation failed'
      });
    }

    // Convert base64 to buffer (แต่ PDFoooRasterController ส่งกลับเป็นภาพ PNG ไม่ใช่ PDF)
    const imageBuffer = Buffer.from(result.base64, 'base64');

    // Check if client wants JSON response or direct image
    const acceptHeader = req.headers['accept'];
    if (acceptHeader && acceptHeader.includes('application/json')) {
      return res.json({
        success: true,
        data: {
          fileName: result.fileName,
          base64: result.base64
        }
      });
    }

    // Send image directly
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.setHeader('Content-Length', imageBuffer.length);
    res.send(imageBuffer);

    console.log('✅ Tax Invoice image sent successfully:', result.fileName);

  } catch (error) {
    console.error('❌ Error generating Tax Invoice image:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate Tax Invoice image',
      message: error.message
    });
  }
});

/**
 * POST /api/pdf/installment/generate
 * Generate PDF from custom installment data
 */
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    console.log('📄 Generate Custom Installment PDF request received');

    const {
      documentId,
      documentType,
      documentNumber,
      contractNo,
      customer,
      totalAmount,
      employeeName,
      branchCode,
      createdAt
    } = req.body;

    if (!documentId) {
      return res.status(400).json({
        success: false,
        error: 'Document ID is required'
      });
    }

    // Import PDFoooRasterController
    const PDFoooRasterController = require('../controllers/pdf/PDFoooRasterController');

    let result;

    if (documentType === 'TAX_INVOICE') {
      result = await PDFoooRasterController.printFromDbById(documentId, 'TAX_INVOICE');
    } else {
      result = await PDFoooRasterController.printFromDbById(documentId, 'RECEIPT');
    }

    if (!result || !result.base64) {
      return res.status(404).json({
        success: false,
        error: 'Document not found or PDF generation failed'
      });
    }

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(result.base64, 'base64');

    // Check if client wants JSON response or direct image
    const acceptHeader = req.headers['accept'];
    if (acceptHeader && acceptHeader.includes('application/json')) {
      return res.json({
        success: true,
        data: {
          fileName: result.fileName,
          base64: result.base64
        }
      });
    }

    // Send image directly
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.setHeader('Content-Length', imageBuffer.length);
    res.send(imageBuffer);

    console.log('✅ Custom Installment image sent successfully:', result.fileName);

  } catch (error) {
    console.error('❌ Error generating Custom Installment image:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate Custom Installment image',
      message: error.message
    });
  }
});

module.exports = router;