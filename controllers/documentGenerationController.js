/**
 * Document Generation Controller
 * Unified endpoint for generating PDF documents for installment system
 */

const quotationController = require('./quotationController');
const invoiceController = require('./invoiceController');
// const InvoiceReceiptController = require('./InvoiceReceiptController'); // ลบแล้ว - ไม่ใช่ main flow
const DocumentNumberSystem = require('../utils/DocumentNumberSystem');
const A4PDFController = require('./pdf/A4PDFController');
// InstallmentPdfController removed - was duplicate of InvoicePdfController
const QuotationPdfController = require('./QuotationPdfController');
const InvoicePdfController = require('./InvoicePdfController');

/**
 * POST /api/document/generate/:type
 * Generate PDF document based on type
 */
exports.generateDocument = async (req, res, next) => {
  const { type } = req.params; // ย้ายออกมานอก try-catch เพื่อให้สามารถใช้ในขอบเขต catch ได้

  try {
    const documentData = req.body;

    console.log(`📄 Generating ${type} document...`);
    console.log(`📋 Document data received (keys):`, Object.keys(documentData || {}));

    // เพิ่ม detailed logging สำหรับ receipt
    if (type === 'receipt') {
      console.log('🧾 Receipt generation - detailed analysis:');
      console.log('  - receiptNumber:', documentData?.receiptNumber);
      console.log('  - customer:', documentData?.customer ? 'present' : 'missing');
      console.log('  - items:', Array.isArray(documentData?.items) ? `${documentData.items.length} items` : 'missing/invalid');
      console.log('  - summary:', documentData?.summary ? 'present' : 'missing');
      console.log('  - signatures:', documentData?.signatures ? Object.keys(documentData.signatures) : 'missing');
    }

    // ตรวจสอบข้อมูลพื้นฐาน
    if (!documentData || typeof documentData !== 'object') {
      console.error('❌ Invalid documentData:', documentData);
      return res.status(400).json({
        success: false,
        error: 'ข้อมูลเอกสารไม่ถูกต้อง'
      });
    }

    let result;

    switch (type) {
      case 'quotation':
        result = await generateQuotationPdf(documentData);
        break;

      case 'invoice':
        result = await generateInvoicePdf(documentData);
        break;

      case 'receipt':
        console.log('🧾 Starting receipt PDF generation...');
        result = await generateReceiptPdf(documentData);
        console.log('✅ Receipt PDF generation completed:', result ? 'success' : 'failed');
        break;

      // contract และ payment_schedule ถูกลบออกเนื่องจากไม่ได้ใช้งาน

      default:
        return res.status(400).json({
          success: false,
          error: `Unsupported document type: ${type}`
        });
    }

    if (!result) {
      console.error(`❌ No result returned for ${type} generation`);
      return res.status(500).json({
        success: false,
        error: 'Failed to generate document'
      });
    }

    console.log(`✅ Document generated successfully:`, {
      type,
      url: result.url,
      filename: result.filename
    });

    res.json({
      success: true,
      url: result.url,
      filename: result.filename,
      documentType: type,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error(`❌ Error generating ${type} document:`, error.message);
    console.error(`❌ Error stack:`, error.stack);
    console.error(`❌ Document data keys:`, Object.keys(req.body || {}));

    // เพิ่ม specific error handling สำหรับ receipt
    if (type === 'receipt') {
      console.error('🧾 Receipt generation failed - debugging info:');
      console.error('  - Error type:', error.constructor.name);
      console.error('  - Error in:', error.stack?.split('\n')[1]);
    }

    res.status(500).json({
      success: false,
      error: error.message,
      details: error.stack,
      documentType: type,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Generate Quotation PDF
 */
async function generateQuotationPdf(documentData) {
  try {
    // If quotationId is provided, use existing quotation
    if (documentData.quotationId) {
      const quotationController = require('./quotationController');
      // Create a mock request object
      const mockReq = {
        params: { id: documentData.quotationId }
      };

      // Create a mock response object to capture the PDF
      let pdfBuffer = null;
      let fileName = null;

      const mockRes = {
        type: () => mockRes,
        set: () => mockRes,
        send: (buffer) => {
          pdfBuffer = buffer;
          fileName = `quotation_${documentData.quotationId}.pdf`;
        },
        status: (code) => {
          if (code !== 200) {
            throw new Error(`Failed to generate quotation PDF: ${code}`);
          }
          return mockRes;
        },
        json: (data) => {
          if (!data.success) {
            throw new Error(data.error || 'Failed to generate quotation PDF');
          }
          return mockRes;
        }
      };

      // Call the existing quotation PDF controller
      await quotationController.getPdf(mockReq, mockRes, (err) => {
        if (err) throw err;
      });

      if (pdfBuffer) {
        // Save PDF to temp directory for download
        const fs = require('fs');
        const path = require('path');
        const tempDir = path.join(__dirname, '..', 'uploads', 'temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        const tempFile = path.join(tempDir, fileName);
        fs.writeFileSync(tempFile, pdfBuffer);

        return {
          url: `/uploads/temp/${fileName}`,
          filename: fileName
        };
      }
    }

    // If no quotationId, create new PDF from provided data (from step4)
    console.log('📄 Creating quotation PDF from step data...');

    // Generate proper quotation number
          const generatedQuotationNo = documentData.quotationNumber || await DocumentNumberSystem.generateQuotationNumber();

    // Transform step data to format expected by PDF controller
    const quotationPdfData = {
      quotationNumber: generatedQuotationNo,
      quotationNo: generatedQuotationNo,     // เพิ่มเพื่อให้ QuotationPdfController อ่านได้
      order_number: generatedQuotationNo,    // เพิ่ม fallback
      issueDate: documentData.issueDate || new Date(),

      // ตรวจสอบและแปลงข้อมูลลูกค้า
      customer: {
        name: documentData.customer?.name ||
              `${documentData.customer?.prefix || ''} ${documentData.customer?.firstName || ''} ${documentData.customer?.lastName || ''}`.trim() ||
              'ลูกค้าทดสอบ',
        taxId: documentData.customer?.taxId || '',
        address: documentData.customer?.address || 'ที่อยู่ทดสอบ',
        phone: documentData.customer?.phone || '0123456789',
        email: documentData.customer?.email || '',
        prefix: documentData.customer?.prefix || '',
        firstName: documentData.customer?.firstName || '',
        lastName: documentData.customer?.lastName || ''
      },

      // ตรวจสอบและแปลงข้อมูลรายการสินค้า
      items: Array.isArray(documentData.items) && documentData.items.length > 0
        ? documentData.items
        : [{
            description: 'รายการทดสอบ',
            imei: '',
            quantity: 1,
            unitPrice: 100,
            totalPrice: 100,
            discount: 0,
            downAmount: 0,
            termCount: 0,
            installmentAmount: 0
          }],

      // ข้อมูลยอดรวม
      summary: documentData.summary || {
        subtotal: 100,
        shipping: 0,
        discount: 0,
        beforeTax: 100,
        tax: 0,
        netTotal: 100
      },
      // เพิ่มข้อมูลภาษีและค่าธรรมเนียม
      taxType: documentData.taxType || 'none',
      docFee: documentData.docFee || 500,
      documentFee: documentData.docFee || 500,
      shippingFee: documentData.shippingFee || 0,
      vatAmount: documentData.vatAmount || 0,
      branch: documentData.branch || {
        name: 'สาขาหลัก',
        code: '00000',
        address: '',
        taxId: '0945566000616',
        tel: '09-2427-0769'
      },
      company: documentData.company || {
        name: 'บริษัท 2 พี่น้อง โมบาย จำกัด'
      },
      salesperson: {
        name: documentData.salesperson?.name ||
              documentData.staffName ||
              documentData.employeeName ||
              'พนักงานขาย',
        signature: documentData.salesperson?.signature
      },
      creditTerm: documentData.creditTerm || 'เงินสด',
      planType: documentData.planType || 'ผ่อนชำระ',
      downPayment: documentData.downPayment || 0,
      installmentCount: documentData.installmentCount || 0,
      installmentAmount: documentData.installmentAmount || 0,
      customerSignatureUrl: documentData.customerSignatureUrl || '',
      salespersonSignatureUrl: documentData.salespersonSignatureUrl || '',
      authorizedSignatureUrl: documentData.authorizedSignatureUrl || '',
      issueDateFormatted: documentData.issueDate
        ? new Date(documentData.issueDate).toLocaleDateString('th-TH')
        : new Date().toLocaleDateString('th-TH')
    };

    console.log('📊 Quotation PDF Data Summary:', {
      quotationNumber: quotationPdfData.quotationNumber,
      customerName: quotationPdfData.customer?.name || 'N/A',
      itemsCount: quotationPdfData.items?.length || 0,
      taxType: quotationPdfData.taxType,
      docFee: quotationPdfData.docFee,
      hasItems: Array.isArray(quotationPdfData.items) && quotationPdfData.items.length > 0
    });

    // ตรวจสอบข้อมูลพื้นฐานก่อนสร้าง PDF
    console.log('🔍 Validating quotation data...');
    if (!quotationPdfData.customer || !quotationPdfData.customer.name) {
      console.warn('⚠️ Customer data missing or incomplete');
    }
    if (!Array.isArray(quotationPdfData.items) || quotationPdfData.items.length === 0) {
      console.warn('⚠️ Items array is empty or invalid');
    }
    console.log('✅ Data validation complete');

    let buffer, fileName;
    try {
      console.log('📄 Calling QuotationPdfController.createQuotationPdf...');
      console.log('📋 QuotationPdf Data:', JSON.stringify({
        quotationNumber: quotationPdfData.quotationNumber,
        customerName: quotationPdfData.customer?.name,
        itemsCount: quotationPdfData.items?.length,
        taxType: quotationPdfData.taxType,
        hasCustomer: !!quotationPdfData.customer,
        hasItems: Array.isArray(quotationPdfData.items) && quotationPdfData.items.length > 0,
        hasSignatures: {
          customer: !!quotationPdfData.customerSignatureUrl,
          salesperson: !!quotationPdfData.salespersonSignatureUrl,
          authorized: !!quotationPdfData.authorizedSignatureUrl
        }
      }, null, 2));

      const result = await QuotationPdfController.createQuotationPdf(quotationPdfData);
      buffer = result.buffer;
      fileName = result.fileName;
      console.log('✅ QuotationPdfController.createQuotationPdf completed successfully');
    } catch (pdfError) {
      console.error('❌ Error in QuotationPdfController.createQuotationPdf:', pdfError);
      console.error('❌ PDF Error Stack:', pdfError.stack);
      console.error('❌ Quotation PDF Data that caused error:', quotationPdfData);
      throw new Error(`PDF generation failed: ${pdfError.message}`);
    }

    // Save to temp directory
    const fs = require('fs');
    const path = require('path');
    const tempDir = path.join(__dirname, '..', 'uploads', 'temp');

    try {
      if (!fs.existsSync(tempDir)) {
        console.log('📁 Creating temp directory:', tempDir);
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempFile = path.join(tempDir, fileName);
      fs.writeFileSync(tempFile, buffer);

      console.log('✅ Quotation PDF saved to:', tempFile);
      console.log('📊 File size:', buffer.length, 'bytes');
    } catch (fileError) {
      console.error('❌ Error saving quotation PDF file:', fileError);
      throw new Error(`Failed to save PDF file: ${fileError.message}`);
    }

    return {
      url: `/uploads/temp/${fileName}`,
      filename: fileName
    };

  } catch (error) {
    console.error('Error generating quotation PDF:', error);
    throw error;
  }
}

/**
 * Generate Invoice PDF
 */
async function generateInvoicePdf(documentData) {
  try {
    console.log('📄 generateInvoicePdf called with:', JSON.stringify(documentData, null, 2));

    // Validate required data
    if (!documentData || typeof documentData !== 'object') {
      throw new Error('Invalid documentData: must be an object');
    }

    // If invoiceId is provided, use existing invoice
    if (documentData.invoiceId) {
      const invoiceController = require('./invoiceController');
      // Similar to quotation but for invoice
      const mockReq = {
        params: { invoiceNumber: documentData.invoiceId }
      };

      let pdfBuffer = null;
      let fileName = null;

      const mockRes = {
        type: () => mockRes,
        set: () => mockRes,
        send: (buffer) => {
          pdfBuffer = buffer;
          fileName = `invoice_${documentData.invoiceId}.pdf`;
        },
        status: (code) => {
          if (code !== 200) {
            throw new Error(`Failed to generate invoice PDF: ${code}`);
          }
          return mockRes;
        },
        json: (data) => {
          if (!data.success) {
            throw new Error(data.error || 'Failed to generate invoice PDF');
          }
          return mockRes;
        }
      };

      await invoiceController.getPdf(mockReq, mockRes, (err) => {
        if (err) throw err;
      });

      if (pdfBuffer) {
        const fs = require('fs');
        const path = require('path');
        const tempDir = path.join(__dirname, '..', 'uploads', 'temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        const tempFile = path.join(tempDir, fileName);
        fs.writeFileSync(tempFile, pdfBuffer);

        return {
          url: `/uploads/temp/${fileName}`,
          filename: fileName
        };
      }
    }

    // If no invoiceId, create new PDF from provided data (from step4)
    console.log('📄 Creating invoice PDF from step data...');

          // Use DocumentNumberSystem for document numbering
      const generatedInvoiceNo = documentData.invoiceNumber || await DocumentNumberSystem.generateInvoiceNumber();

    // Transform step data to format expected by PDF controller
    const invoicePdfData = {
      quotationNumber: documentData.quotationNumber || `QT-${Date.now()}`,
      invoiceNumber: generatedInvoiceNo,
      issueDate: documentData.issueDate || new Date(),
      dueDate: documentData.dueDate || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),

      // ตรวจสอบและแปลงข้อมูลลูกค้า
      customer: {
        name: documentData.customer?.name ||
              `${documentData.customer?.prefix || ''} ${documentData.customer?.firstName || ''} ${documentData.customer?.lastName || ''}`.trim() ||
              'ลูกค้าทดสอบ',
        taxId: documentData.customer?.taxId || '1234567890123',
        address: documentData.customer?.address || 'ที่อยู่ทดสอบ',
        phone: documentData.customer?.phone || '0123456789',
        email: documentData.customer?.email || '',
        prefix: documentData.customer?.prefix || '',
        firstName: documentData.customer?.firstName || '',
        lastName: documentData.customer?.lastName || ''
      },

      // ตรวจสอบและแปลงข้อมูลรายการสินค้า
      items: Array.isArray(documentData.items) && documentData.items.length > 0
        ? documentData.items
        : [{
            description: 'รายการทดสอบ',
            imei: '',
            quantity: 1,
            unitPrice: 100,
            totalPrice: 100,
            amount: 100,
            discount: 0
          }],

      // ข้อมูลยอดรวม
      summary: documentData.summary || {
        subtotal: 100,
        shipping: 0,
        discount: 0,
        beforeTax: 100,
        tax: 0,
        netTotal: 100
      },
      // เพิ่มข้อมูลภาษีและค่าธรรมเนียม
      taxType: documentData.taxType || 'none',
      docFee: documentData.docFee || 500,
      documentFee: documentData.docFee || 500,
      shippingFee: documentData.shippingFee || 0,
      vatAmount: documentData.vatAmount || 0,
      branch: documentData.branch || {
        name: 'สาขาหลัก',
        code: '00000',
        address: '',
        taxId: '0945566000616',
        tel: '09-2427-0769'
      },
      company: documentData.company || {
        name: 'บริษัท 2 พี่น้อง โมบาย จำกัด'
      },
      salesperson: {
        name: documentData.salesperson?.name ||
              documentData.staffName ||
              documentData.employeeName ||
              'พนักงานขาย',
        signature: documentData.salesperson?.signature
      },
      creditTerm: documentData.creditTerm || 'เงินสด',
      paymentMethod: documentData.paymentMethod || 'เงินสด',
      customerSignatureUrl: documentData.customerSignatureUrl || '',
      salespersonSignatureUrl: documentData.salespersonSignatureUrl || '',
      authorizedSignatureUrl: documentData.authorizedSignatureUrl || '',
      issueDateFormatted: documentData.issueDate
        ? new Date(documentData.issueDate).toLocaleDateString('th-TH')
        : new Date().toLocaleDateString('th-TH')
    };

    // Use InvoicePdfController for invoice generation
    console.log('📄 Using InvoicePdfController for invoice generation');

    // ตรวจสอบข้อมูลพื้นฐานก่อนสร้าง PDF
    console.log('🔍 Validating invoice data...');
    if (!invoicePdfData.customer || !invoicePdfData.customer.name) {
      console.warn('⚠️ Customer data missing or incomplete');
    }
    if (!Array.isArray(invoicePdfData.items) || invoicePdfData.items.length === 0) {
      console.warn('⚠️ Items array is empty or invalid');
    }
    console.log('✅ Invoice data validation complete');

    let buffer, fileName;
    try {
      console.log('📄 Calling InvoicePdfController.createInvoicePdf...');
      console.log('📋 InvoicePdf Data:', JSON.stringify({
        invoiceNumber: invoicePdfData.invoiceNumber,
        quotationNumber: invoicePdfData.quotationNumber,
        customerName: invoicePdfData.customer?.name,
        itemsCount: invoicePdfData.items?.length,
        taxType: invoicePdfData.taxType,
        hasCustomer: !!invoicePdfData.customer,
        hasItems: Array.isArray(invoicePdfData.items) && invoicePdfData.items.length > 0,
        hasSignatures: {
          customer: !!invoicePdfData.customerSignatureUrl,
          salesperson: !!invoicePdfData.salespersonSignatureUrl,
          authorized: !!invoicePdfData.authorizedSignatureUrl
        }
      }, null, 2));

      const result = await InvoicePdfController.createInvoicePdf(invoicePdfData);
      buffer = result.buffer;
      fileName = result.fileName || `INV-${invoicePdfData.invoiceNumber}.pdf`;
      console.log('✅ InvoicePdfController.createInvoicePdf completed successfully');
    } catch (pdfError) {
      console.error('❌ Error in InvoicePdfController.createInvoicePdf:', pdfError);
      console.error('❌ PDF Error Stack:', pdfError.stack);
      console.error('❌ Invoice PDF Data that caused error:', invoicePdfData);
      throw new Error(`PDF generation failed: ${pdfError.message}`);
    }

    // Save to temp directory
    const fs = require('fs');
    const path = require('path');
    const tempDir = path.join(__dirname, '..', 'uploads', 'temp');

    try {
      if (!fs.existsSync(tempDir)) {
        console.log('📁 Creating temp directory:', tempDir);
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempFile = path.join(tempDir, fileName);
      fs.writeFileSync(tempFile, buffer);

      console.log('✅ Invoice PDF saved to:', tempFile);
      console.log('📊 File size:', buffer.length, 'bytes');
    } catch (fileError) {
      console.error('❌ Error saving invoice PDF file:', fileError);
      throw new Error(`Failed to save PDF file: ${fileError.message}`);
    }

    return {
      url: `/uploads/temp/${fileName}`,
      filename: fileName
    };

  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    throw error;
  }
}

/**
 * Generate Receipt PDF
 */
async function generateReceiptPdf(documentData) {
  try {
    console.log('📄 Generating receipt PDF...');
    console.log('📋 Receipt document data:', JSON.stringify(documentData, null, 2));

    // Validate basic required data
    if (!documentData) {
      throw new Error('Receipt document data is required');
    }

    // Ensure required fields have defaults
    const safeDocumentData = {
      ...documentData,
      receiptNumber: documentData.receiptNumber || `RE-${Date.now()}`,
      customer: documentData.customer || {
        name: documentData.customerName || 'ลูกค้า',
        address: 'ไม่มีข้อมูล',
        taxId: '',
        phone: ''
      },
      items: documentData.items || [],
      summary: documentData.summary || {
        subtotal: 0,
        total: 0
      },
      company: documentData.company || {
        name: 'บริษัท 2 พี่น้อง โมบาย จำกัด',
        taxId: '0945566000616'
      },
      branch: documentData.branch || {
        name: 'สำนักงานใหญ่',
        code: '00000'
      },
      // 🔧 Map signatures object to individual signature fields for PDF controllers
      customerSignature: documentData.signatures?.customer || documentData.customerSignature || '',
      employeeSignature: documentData.signatures?.salesperson || documentData.employeeSignature || documentData.salespersonSignature || '',
      authorizedSignature: documentData.signatures?.authorized || documentData.authorizedSignature || '',
      // Keep signatures object for backwards compatibility
      signatures: documentData.signatures || {}
    };

    let result;
    let lastError;

    // Try different PDF generation methods in order
    const pdfMethods = [
      {
        name: 'PDFoooRasterController',
        controller: './pdf/PDFoooRasterController',
        method: 'printReceipt'
      },
      {
        name: 'A4PDFController',
        controller: './pdf/A4PDFController',
        method: 'printReceipt'
      },
      {
        name: 'Receipt_installment',
        controller: './Receipt_installment',
        method: 'createReceiptOrTaxInvoicePdf'
      }
    ];

    for (const pdfMethod of pdfMethods) {
      try {
        console.log(`🖨️ Trying ${pdfMethod.name} for receipt generation...`);

        const Controller = require(pdfMethod.controller);
        result = await Controller[pdfMethod.method](safeDocumentData);

        if (result) {
          // Ensure result has proper format
          if (result.base64 && !result.buffer) {
            result.buffer = Buffer.from(result.base64, 'base64');
          }
          if (!result.fileName) {
            result.fileName = `receipt_${Date.now()}.pdf`;
          }

          console.log(`✅ Receipt generated successfully with ${pdfMethod.name}`);
          break;
        } else {
          throw new Error(`${pdfMethod.name} returned empty result`);
        }

      } catch (methodError) {
        lastError = methodError;
        console.warn(`⚠️ ${pdfMethod.name} failed:`, methodError.message);
        continue;
      }
    }

    if (!result) {
      const errorMsg = `Failed to generate receipt PDF with all methods. Last error: ${lastError?.message || 'Unknown error'}`;
      console.error('❌ All receipt PDF generation methods failed');
      console.error('❌ Last error details:', lastError);
      throw new Error(errorMsg);
    }

    // Ensure result has buffer data
    if (!result.buffer) {
      if (result.base64) {
        result.buffer = Buffer.from(result.base64, 'base64');
      } else if (result.pdf) {
        result.buffer = result.pdf;
      } else {
        throw new Error('Receipt result has no valid buffer data');
      }
    }

    // Save to temp directory
    const fs = require('fs');
    const path = require('path');
    const tempDir = path.join(__dirname, '..', 'uploads', 'temp');

    try {
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempFile = path.join(tempDir, result.fileName);
      fs.writeFileSync(tempFile, result.buffer);

      console.log(`📁 Receipt file saved: ${tempFile}`);

      return {
        url: `/uploads/temp/${result.fileName}`,
        filename: result.fileName
      };

    } catch (fileError) {
      console.error('❌ Error saving receipt file:', fileError);
      // Return the result anyway, let the client handle it
      return {
        url: null,
        filename: result.fileName,
        buffer: result.buffer,
        error: `File save failed: ${fileError.message}`
      };
    }

  } catch (error) {
    console.error('❌ Error generating receipt PDF:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Document data that caused error:', JSON.stringify(documentData, null, 2));
    throw error;
  }
}

// generateContractPdf และ generatePaymentSchedulePdf ถูกลบออกเนื่องจากไม่ได้ใช้งาน
// และ InstallmentPdfController ที่อ้างอิงถูกลบออกแล้ว

// No additional exports needed - using exports.generateDocument directly above