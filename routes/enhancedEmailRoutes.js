// ========================================
// ENHANCED EMAIL ROUTES - PDF INTEGRATION
// Enhanced email routes with correct PDF controller usage
// ========================================

const express = require('express');
const router = express.Router();
const enhancedEmailService = require('../services/enhancedEmailService');

/**
 * Send installment email with enhanced PDF attachments
 * POST /api/email/send-installment-enhanced
 */
router.post('/send-installment-enhanced', async (req, res) => {
  try {
    console.log('📧 Enhanced email route: Processing installment email request...');
    console.log('📧 Request body:', req.body);

    const {
      recipient,
      customerInfo,
      documents,
      installmentData,
      pdfEndpoints,
      branchCode,
      customMessage
    } = req.body;

    // Validate required fields
    if (!recipient) {
      return res.status(400).json({
        success: false,
        message: 'Recipient email is required'
      });
    }

    if (!Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one document must be selected'
      });
    }

    if (!installmentData) {
      return res.status(400).json({
        success: false,
        message: 'Installment data is required'
      });
    }

    console.log('📧 Validation passed, processing email...');

    // Send enhanced email using correct PDF controllers
    const result = await enhancedEmailService.sendInstallmentEmailEnhanced({
      recipient,
      customerInfo: customerInfo || {
        name: 'ลูกค้า'
      },
      documents,
      installmentData,
      pdfEndpoints,
      branchCode: branchCode || 'PATTANI',
      customMessage
    });

    console.log('✅ Enhanced email sent successfully');

    // Log successful email send
    console.log('📧 Email send result:', {
      recipient,
      messageId: result.messageId,
      attachmentsCount: result.attachmentsCount,
      totalFileSize: result.totalFileSize,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Email sent successfully with enhanced PDF attachments',
      data: result
    });

  } catch (error) {
    console.error('❌ Enhanced email route error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to send enhanced installment email',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Test enhanced PDF generation
 * POST /api/email/test-pdf-generation
 */
router.post('/test-pdf-generation', async (req, res) => {
  try {
    console.log('🧪 Testing enhanced PDF generation...');

    const { documents = ['quotation', 'invoice', 'receipt'], installmentData } = req.body;

    if (!installmentData) {
      return res.status(400).json({
        success: false,
        message: 'Installment data is required for testing'
      });
    }

    // Generate test PDFs
    const testResults = [];

    for (const docType of documents) {
      try {
        console.log(`🧪 Testing ${docType} PDF generation...`);

        let pdfResult = null;
        let controller = '';

        switch (docType) {
          case 'quotation':
            controller = 'QuotationPdfController';
            pdfResult = await enhancedEmailService.generateQuotationPdf(installmentData);
            break;
          case 'invoice':
            controller = 'InvoicePdfController';
            pdfResult = await enhancedEmailService.generateInvoicePdf(installmentData);
            break;
          case 'receipt':
            controller = 'A4PDFController';
            pdfResult = await enhancedEmailService.generateReceiptPdf(installmentData);
            break;
        }

        testResults.push({
          docType,
          controller,
          success: !!pdfResult,
          size: pdfResult?.buffer?.length || 0,
          filename: pdfResult?.fileName || `${docType}.pdf`
        });

        console.log(`✅ ${docType} PDF test passed`);

      } catch (error) {
        console.error(`❌ ${docType} PDF test failed:`, error);
        testResults.push({
          docType,
          controller: `${docType}Controller`,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = testResults.filter(r => r.success).length;
    const totalCount = testResults.length;

    console.log(`📊 PDF generation test results: ${successCount}/${totalCount} successful`);

    res.json({
      success: successCount > 0,
      message: `PDF generation test completed: ${successCount}/${totalCount} successful`,
      data: {
        results: testResults,
        summary: {
          total: totalCount,
          successful: successCount,
          failed: totalCount - successCount
        }
      }
    });

  } catch (error) {
    console.error('❌ PDF generation test error:', error);

    res.status(500).json({
      success: false,
      message: 'PDF generation test failed',
      error: error.message
    });
  }
});

/**
 * Get email templates
 * GET /api/email/templates/installment
 */
router.get('/templates/installment', async (req, res) => {
  try {
    const templates = {
      standard: {
        subject: '📄 เอกสารการผ่อนชำระ - สัญญาเลขที่ {{contractNo}}',
        message: 'ขอบคุณที่ไว้วางใจในการซื้อสินค้าผ่อนชำระกับเรา',
        documents: ['quotation', 'invoice', 'receipt']
      },
      quotationOnly: {
        subject: '📋 ใบเสนอราคาการผ่อนชำระ - {{contractNo}}',
        message: 'ใบเสนอราคาสำหรับการซื้อสินค้าผ่อนชำระ',
        documents: ['quotation']
      },
      receiptOnly: {
        subject: '🧾 ใบเสร็จค่าดาวน์ - สัญญาเลขที่ {{contractNo}}',
        message: 'ใบเสร็จรับเงินค่าดาวน์การผ่อนชำระ',
        documents: ['receipt']
      }
    };

    res.json({
      success: true,
      data: templates
    });

  } catch (error) {
    console.error('❌ Get email templates error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to get email templates',
      error: error.message
    });
  }
});

/**
 * Validate installment data for email sending
 * POST /api/email/validate-installment-data
 */
router.post('/validate-installment-data', async (req, res) => {
  try {
    const { installmentData } = req.body;

    if (!installmentData) {
      return res.status(400).json({
        success: false,
        message: 'Installment data is required'
      });
    }

    const validation = {
      hasContractNo: !!(installmentData.contractNo || installmentData.contract_no),
      hasQuotationId: !!(installmentData.quotationId || installmentData.quotation_id),
      hasInvoiceId: !!(installmentData.invoiceId || installmentData.invoice_id),
      hasReceiptVoucherId: !!(installmentData.receiptVoucherId || installmentData.receipt_voucher_id),
      hasOrderId: !!(installmentData.orderId || installmentData.order_id || installmentData._id),
      hasCustomerInfo: !!(installmentData.customerInfo),
      canGenerateQuotation: false,
      canGenerateInvoice: false,
      canGenerateReceipt: false
    };

    // Check if PDFs can be generated
    validation.canGenerateQuotation = validation.hasQuotationId || validation.hasOrderId;
    validation.canGenerateInvoice = validation.hasInvoiceId || validation.hasOrderId;
    validation.canGenerateReceipt = validation.hasReceiptVoucherId || validation.hasContractNo;

    const availableDocuments = [];
    if (validation.canGenerateQuotation) availableDocuments.push('quotation');
    if (validation.canGenerateInvoice) availableDocuments.push('invoice');
    if (validation.canGenerateReceipt) availableDocuments.push('receipt');

    res.json({
      success: true,
      data: {
        validation,
        availableDocuments,
        recommendations: {
          message: availableDocuments.length > 0
            ? `${availableDocuments.length} document(s) can be generated`
            : 'No documents can be generated with current data',
          suggestedDocuments: availableDocuments
        }
      }
    });

  } catch (error) {
    console.error('❌ Installment data validation error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to validate installment data',
      error: error.message
    });
  }
});

/**
 * Get PDF controller status
 * GET /api/email/pdf-controllers/status
 */
router.get('/pdf-controllers/status', async (req, res) => {
  try {
    const controllers = {
      A4PDFController: {
        available: true,
        description: 'A4 PDF Controller for receipts and tax invoices',
        endpoints: [
          '/api/receipt-vouchers/{id}/pdf-a4',
          '/api/receipt-vouchers/contract/{contractNo}/pdf-a4',
          '/api/receipt-vouchers/document/{documentNo}/pdf-a4'
        ]
      },
      QuotationPdfController: {
        available: true,
        description: 'Quotation PDF Controller for quotations',
        endpoints: [
          '/api/pdf/quotation/{id}',
          '/api/pdf/quotation/order/{orderId}'
        ]
      },
      InvoicePdfController: {
        available: true,
        description: 'Invoice PDF Controller for invoices and tax invoices',
        endpoints: [
          '/api/pdf/invoice/{id}',
          '/api/pdf/invoice/order/{orderId}'
        ]
      }
    };

    res.json({
      success: true,
      data: {
        controllers,
        totalControllers: Object.keys(controllers).length,
        availableControllers: Object.values(controllers).filter(c => c.available).length
      }
    });

  } catch (error) {
    console.error('❌ PDF controller status error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to get PDF controller status',
      error: error.message
    });
  }
});

/**
 * Save documents via Enhanced Email Service
 * POST /api/enhanced-email/save-documents
 * สำหรับบันทึกข้อมูลการชำระค่าดาวน์ไปฐานข้อมูล
 */
router.post('/save-documents', async (req, res) => {
  try {
    console.log('📧 Enhanced Email Service API called');
    console.log('📥 Request body:', JSON.stringify(req.body, null, 2));

    const { orderData, installmentData, documentType, saveToDatabase } = req.body;

    if (!orderData || !installmentData) {
      return res.status(400).json({
        success: false,
        error: 'Missing orderData or installmentData'
      });
    }

    console.log('🔄 Calling Enhanced Email Service...');

    // เรียกใช้ Enhanced Email Service
    const result = await enhancedEmailService.saveReceiptAndTaxInvoiceByTaxType(
      orderData,
      installmentData
    );

    console.log('✅ Enhanced Email Service completed:', {
      hasReceipt: !!result.receipt,
      hasTaxInvoice: !!result.taxInvoice,
      taxType: result.taxType,
      hasVat: result.hasVat
    });

    res.json({
      success: true,
      message: 'Documents saved successfully via Enhanced Email Service',
      data: result,
      receipt: result.receipt,
      taxInvoice: result.taxInvoice,
      taxType: result.taxType,
      hasVat: result.hasVat,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Enhanced Email Service API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.stack,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
