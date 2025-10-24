// ========================================
// ENHANCED EMAIL SERVICE - PDF INTEGRATION v2.2.0
// Enhanced email service with direct controller usage and database persistence
// Uses: Direct PDF controller calls for invoice and receipt, Step4 API for quotation
// Quotation: Step4 API /api/pdf/installment/quotation
// Invoice: InvoicePdfController.createInvoicePdf (direct) + Database save
// Receipt: A4PDFController.createReceiptPdf (direct) + Database save
// v2.2.0: Added automatic database persistence for Invoice and ReceiptVoucher records
// Features: Data normalization, blob URL handling, database persistence, PDF generation
// Database: Saves to Invoice collection and ReceiptVoucher collection for future reference
// ========================================

const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const nodemailer = require('nodemailer');

// Import fetch for Node.js (for API calls to Step4 endpoints)
let fetch;
try {
  // Try to use node-fetch if available
  fetch = require('node-fetch');
} catch (error) {
  // Fallback to built-in fetch (Node.js 18+) or create a simple implementation
  if (typeof globalThis.fetch !== 'undefined') {
    fetch = globalThis.fetch;
  } else {
    // Simple fetch implementation using https/http
    fetch = async (url, options = {}) => {
      return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const isHttps = urlObj.protocol === 'https:';
        const lib = isHttps ? https : http;

        const requestOptions = {
          method: options.method || 'GET',
          headers: options.headers || {},
          ...urlObj
        };

        const req = lib.request(requestOptions, (res) => {
          const chunks = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => {
            const buffer = Buffer.concat(chunks);
            resolve({
              ok: res.statusCode >= 200 && res.statusCode < 300,
              status: res.statusCode,
              statusText: res.statusMessage,
              buffer: () => Promise.resolve(buffer),
              json: () => Promise.resolve(JSON.parse(buffer.toString()))
            });
          });
        });

        req.on('error', reject);

        if (options.body) {
          req.write(options.body);
        }

        req.end();
      });
    };
  }
}

// Import correct PDF controllers
const A4PDFController = require('../controllers/pdf/A4PDFController');
const QuotationPdfController = require('../controllers/QuotationPdfController');
const InvoicePdfController = require('../controllers/InvoicePdfController');

// Import controllers for database operations
const ReceiptController = require('../controllers/ReceiptController');
const TaxInvoiceController = require('../controllers/TaxInvoiceController');

// Import models
const mongoose = require('mongoose');
const InstallmentOrder = require('../models/Installment/InstallmentOrder');
const ReceiptVoucher = require('../models/POS/ReceiptVoucher');
const Order = require('../models/POS/Order');
const Invoice = require('../models/Installment/Invoice');
const Quotation = require('../models/Installment/Quotation');

class EnhancedEmailService {

  /**
   * Send installment email with correct PDF attachments
   * @param {Object} emailData - Email configuration
   * @returns {Promise<Object>} Send result
   */
  async sendInstallmentEmailEnhanced(emailData) {
    try {
      console.log('📧 Enhanced email service: Processing installment email...');
      console.log('📧 Email data:', emailData);

      const {
        recipient,
        customerInfo,
        documents = [],
        installmentData,
        pdfEndpoints,
        branchCode,
        customMessage
      } = emailData;

      // Validate required data
      if (!recipient) {
        throw new Error('Recipient email is required');
      }

      if (!Array.isArray(documents) || documents.length === 0) {
        throw new Error('At least one document must be selected');
      }

      console.log('📧 Processing PDF attachments from downloaded files...');

      let attachments = [];

      // 🔧 FIX: ใช้ pdfEndpoints ที่ส่งมาจาก frontend (ไฟล์ที่ดาวน์โหลดแล้ว) พร้อม fallback
      if (pdfEndpoints && Array.isArray(pdfEndpoints) && pdfEndpoints.length > 0) {
        console.log('📧 Using downloaded PDF files from frontend:', pdfEndpoints);

        try {
          attachments = await this.createAttachmentsFromUrls(pdfEndpoints, documents);

          // 🔧 FIX: ถ้าไม่ได้ attachment ครบตาม documents ที่ต้องการ ให้ fallback
          if (attachments.length < documents.length) {
            console.log(`⚠️ Only ${attachments.length}/${documents.length} attachments created from URLs, generating missing PDFs...`);

            // หาเอกสารที่ขาดหาย
            const successfulDocs = attachments.map(att => {
              if (att.filename.includes('quotation') || att.filename.includes('ใบเสนอราคา')) return 'quotation';
              if (att.filename.includes('invoice') || att.filename.includes('ใบแจ้งหนี้')) return 'invoice';
              if (att.filename.includes('receipt') || att.filename.includes('ใบเสร็จ')) return 'receipt';
              return null;
            }).filter(Boolean);

            const missingDocs = documents.filter(doc => !successfulDocs.includes(doc));
            console.log('📄 Missing documents:', missingDocs);

            // สร้าง PDF สำหรับเอกสารที่ขาดหาย
            const additionalAttachments = await this.generateEnhancedPdfAttachments({
              documents: missingDocs,
              installmentData,
              branchCode
            });

            attachments = [...attachments, ...additionalAttachments];
            console.log(`✅ Total attachments after fallback: ${attachments.length}`);
          }
        } catch (urlError) {
          console.error('❌ Error creating attachments from URLs:', urlError);
          console.log('📧 Falling back to fresh PDF generation...');

          // Fallback: Generate PDF attachments using correct controllers
          attachments = await this.generateEnhancedPdfAttachments({
            documents,
            installmentData,
            branchCode
          });
        }
      } else {
        console.log('📧 No downloaded files found, generating fresh PDFs...');

        // Fallback: Generate PDF attachments using correct controllers
        attachments = await this.generateEnhancedPdfAttachments({
          documents,
          installmentData,
          branchCode
        });
      }

      console.log(`📧 Generated ${attachments.length} PDF attachments`);

      // Prepare email content
      const emailContent = this.generateInstallmentEmailContent({
        customerInfo,
        installmentData,
        documents,
        customMessage
      });

      // Send email
      const emailResult = await this.sendEmailWithAttachments({
        to: recipient,
        subject: this.generateEmailSubject(installmentData),
        html: emailContent,
        attachments
      });

      console.log('✅ Enhanced installment email sent successfully');

      return {
        success: true,
        messageId: emailResult.messageId,
        recipient,
        attachmentsCount: attachments.length,
        pdfGenerated: true,
        totalFileSize: attachments.reduce((sum, att) => sum + (att.size || 0), 0),
        attachments: attachments.map(att => ({
          filename: att.filename,
          size: this.formatFileSize(att.size || 0),
          controller: att.controller
        }))
      };

    } catch (error) {
      console.error('❌ Enhanced email service error:', error);
      throw error;
    }
  }

  /**
   * Create email attachments from downloaded PDF URLs
   * @param {Array} pdfEndpoints - Array of PDF URLs from frontend
   * @param {Array} documents - Document types array
   * @returns {Promise<Array>} Email attachments
   */
  async createAttachmentsFromUrls(pdfEndpoints, documents) {
    const attachments = [];

    try {
      for (let i = 0; i < pdfEndpoints.length; i++) {
        const pdfUrl = pdfEndpoints[i];
        const docType = documents[i];

        if (!pdfUrl || !docType) continue;

        console.log(`📄 Processing downloaded ${docType} from URL:`, pdfUrl);

        // Fetch PDF content from URL
        let pdfBuffer;

        try {
          // Handle different URL types
          if (pdfUrl.startsWith('data:')) {
            // Data URL - extract base64 content
            console.log(`📄 Processing data URL for ${docType}`);
            const base64Data = pdfUrl.split(',')[1];
            if (!base64Data) {
              console.error(`❌ Invalid data URL for ${docType}, skipping`);
              continue;
            }
            pdfBuffer = Buffer.from(base64Data, 'base64');
          } else if (pdfUrl.startsWith('blob:')) {
            // Blob URL - skip because server cannot access browser blob URLs
            console.log(`⚠️ Blob URL detected for ${docType}, skipping (server cannot access blob URLs)`);
            continue;
          } else if (pdfUrl.startsWith('http://') || pdfUrl.startsWith('https://')) {
            // HTTP URL - fetch content using Node.js built-in modules
            console.log(`📄 Fetching HTTP URL for ${docType}: ${pdfUrl}`);
            pdfBuffer = await this.fetchPdfFromUrl(pdfUrl);
          } else {
            console.error(`❌ Unsupported URL format for ${docType}: ${pdfUrl}`);
            continue;
          }
        } catch (fetchError) {
          console.error(`❌ Error fetching ${docType} PDF:`, fetchError);
          console.log(`⚠️ Will skip ${docType} and let fallback mechanism handle it`);
          continue;
        }

        // Generate filename
        const filename = this.generateFilename(docType);

        attachments.push({
          filename,
          content: pdfBuffer,
          contentType: 'application/pdf'
        });

        console.log(`✅ Added ${docType} attachment: ${filename}`);
      }

      return attachments;

    } catch (error) {
      console.error('❌ Error creating attachments from URLs:', error);
      throw error;
    }
  }

  /**
   * Generate filename for document type
   * @param {string} docType - Document type
   * @returns {string} Generated filename
   */
  generateFilename(docType) {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '_');
    const fileNames = {
      'quotation': `ใบเสนอราคา_${timestamp}.pdf`,
      'invoice': `ใบแจ้งหนี้_${timestamp}.pdf`,
      'receipt': `ใบเสร็จรับเงิน_${timestamp}.pdf`,
      'taxInvoice': `ใบกำกับภาษี_${timestamp}.pdf`
    };
    return fileNames[docType] || `เอกสาร_${timestamp}.pdf`;
  }

  /**
   * Fetch PDF from URL using Node.js built-in modules
   * @param {string} url - PDF URL
   * @returns {Promise<Buffer>} PDF buffer
   */
  async fetchPdfFromUrl(url) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const protocol = urlObj.protocol === 'https:' ? https : http;

      const request = protocol.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }

        const chunks = [];
        response.on('data', (chunk) => {
          chunks.push(chunk);
        });

        response.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve(buffer);
        });
      });

      request.on('error', (error) => {
        reject(error);
      });

      request.setTimeout(30000, () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  /**
   * Generate PDF attachments using correct controllers
   * @param {Object} config - Configuration object
   * @returns {Promise<Array>} PDF attachments
   */
  async generateEnhancedPdfAttachments({ documents, installmentData, branchCode }) {
    const attachments = [];

    try {
      console.log('📧 DEBUG: Starting PDF generation for documents:', documents);
      console.log('📧 DEBUG: InstallmentData keys:', Object.keys(installmentData || {}));
      console.log('📧 DEBUG: InstallmentData:', {
        quotationId: installmentData?.quotationId,
        invoiceId: installmentData?.invoiceId,
        receiptVoucherId: installmentData?.receiptVoucherId,
        contractNo: installmentData?.contractNo,
        orderId: installmentData?.orderId
      });

      for (const docType of documents) {
        console.log(`\n📄 === Generating ${docType} PDF using correct controller ===`);

        let pdfResult = null;
        let filename = '';
        let controller = '';
        let error = null;

        try {
          switch (docType) {
            case 'quotation':
              controller = 'QuotationPdfController';
              filename = `quotation_${installmentData.quotationId || installmentData.contractNo || 'QT-' + Date.now()}.pdf`;
              console.log(`📄 Calling generateQuotationPdf with filename: ${filename}`);
              pdfResult = await this.generateQuotationPdf(installmentData);
              break;

            case 'invoice':
              controller = 'InvoicePdfController';
              filename = `invoice_${installmentData.invoiceId || installmentData.contractNo || 'INV-' + Date.now()}.pdf`;
              console.log(`📄 Calling generateInvoicePdf with filename: ${filename}`);
              pdfResult = await this.generateInvoicePdf(installmentData);
              break;

            case 'receipt':
              controller = 'A4PDFController';
              filename = `receipt_${installmentData.receiptVoucherId || installmentData.contractNo || 'RCP-' + Date.now()}.pdf`;
              console.log(`📄 Calling generateReceiptPdf with filename: ${filename}`);
              pdfResult = await this.generateReceiptPdf(installmentData);
              break;

            case 'taxInvoice':
              controller = 'A4PDFController';
              filename = `taxinvoice_${installmentData.taxInvoiceId || installmentData.contractNo || 'TAX-' + Date.now()}.pdf`;
              console.log(`📄 Calling generateReceiptPdf for tax invoice with filename: ${filename}`);
              pdfResult = await this.generateReceiptPdf(installmentData); // ใช้ receipt controller เดียวกัน
              break;

            default:
              console.warn(`⚠️ Unknown document type: ${docType}`);
              continue;
          }

          console.log(`📄 PDF Result for ${docType}:`, {
            hasResult: !!pdfResult,
            hasBuffer: !!(pdfResult && pdfResult.buffer),
            bufferLength: pdfResult?.buffer?.length || 0,
            resultType: typeof pdfResult,
            resultKeys: pdfResult ? Object.keys(pdfResult) : []
          });

        } catch (docError) {
          console.error(`❌ Error generating ${docType} PDF:`, docError);
          error = docError;
        }

        if (pdfResult && pdfResult.buffer) {
          attachments.push({
            filename,
            content: pdfResult.buffer,
            contentType: 'application/pdf',
            size: pdfResult.buffer.length,
            controller
          });

          console.log(`✅ ${docType} PDF generated successfully using ${controller} (${pdfResult.buffer.length} bytes)`);
        } else {
          console.warn(`⚠️ Failed to generate ${docType} PDF - No buffer returned`);
          if (error) {
            console.error(`❌ ${docType} Error details:`, error.message);
            console.error(`❌ ${docType} Stack:`, error.stack);
          }
        }
      }

      console.log(`\n📊 PDF Generation Summary: ${attachments.length}/${documents.length} documents generated`);
      console.log('📊 Generated files:', attachments.map(att => att.filename));

    } catch (error) {
      console.error('❌ PDF attachment generation failed:', error);
      throw new Error(`PDF generation failed: ${error.message}`);
    }

    return attachments;
  }

  /**
   * Generate quotation PDF using Step4 Integration API
   * @param {Object} installmentData - Installment data
   * @returns {Promise<Object>} PDF result
   */
  async generateQuotationPdf(installmentData) {
    try {
      console.log('📄 Generating quotation PDF using Step4 Integration API...');

      // Use Step4 installment quotation API endpoint
      const response = await fetch('/api/pdf/installment/quotation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SYSTEM_TOKEN || 'system-internal-token'}`
        },
        body: JSON.stringify({
          stepData: this.transformInstallmentDataToStepData(installmentData)
        })
      });

      if (!response.ok) {
        throw new Error(`Quotation API Error: ${response.status} - ${response.statusText}`);
      }

      const buffer = await response.buffer();
      const filename = `quotation_${installmentData.quotationId || Date.now()}.pdf`;

      console.log('✅ Quotation PDF generated successfully via Step4 API');
      return {
        buffer: buffer,
        fileName: filename
      };

    } catch (error) {
      console.error('❌ Quotation PDF generation failed, falling back to controller:', error);

      // Fallback to original controller method
      const orderData = await this.findOrCreateOrderData(installmentData, 'quotation');
      const normalizedOrderData = this.normalizeDataForPdf(orderData);
      return await QuotationPdfController.createQuotationPdf(normalizedOrderData);
    }
  }

  /**
   * Transform installment data to Step4 format
   * @param {Object} installmentData - Installment data
   * @returns {Object} Step4 format data
   */
  transformInstallmentDataToStepData(installmentData) {
    return {
      step1: installmentData.items || [],
      step2: {
        customerEmail: installmentData.customerInfo?.email,
        customerData: installmentData.customerInfo,
        ...installmentData.customerInfo
      },
      step3: {
        downPayment: installmentData.downPayment,
        totalAmount: installmentData.totalAmount,
        paymentPlan: installmentData.paymentPlan
      },
      step4: {
        contractNo: installmentData.contractNo,
        quotationId: installmentData.quotationId,
        invoiceId: installmentData.invoiceId,
        receiptVoucherId: installmentData.receiptVoucherId
      },
      customerSignature: installmentData.customerSignature,
      salespersonSignature: installmentData.salespersonSignature,
      branchCode: installmentData.branchCode || '00000'
    };
  }

  /**
   * Generate invoice PDF using InvoicePdfController
   * @param {Object} installmentData - Installment data
   * @returns {Promise<Object>} PDF result
   */
  async generateInvoicePdf(installmentData) {
    try {
      console.log('📄 Generating invoice PDF using InvoicePdfController...');
      console.log('📄 InstallmentData for invoice:', {
        invoiceId: installmentData.invoiceId,
        quotationId: installmentData.quotationId,
        contractNo: installmentData.contractNo,
        orderId: installmentData.orderId
      });

      // Try to find invoice from database first
      let invoiceData = null;

      if (installmentData.invoiceId) {
        console.log(`🔍 Searching for invoice by invoiceId: ${installmentData.invoiceId}`);
        invoiceData = await Invoice.findOne({
          $or: [
            { invoiceNumber: installmentData.invoiceId },
            { _id: installmentData.invoiceId }
          ]
        }).populate('quotationRef').lean();
      }

      if (!invoiceData && installmentData.quotationId) {
        console.log('🔍 No invoice found, searching for quotation:', installmentData.quotationId);
        const quotationData = await Quotation.findOne({
          $or: [
            { quotationNumber: installmentData.quotationId },
            { _id: installmentData.quotationId }
          ]
        }).populate('salesperson', 'name signatureUrl').lean();

        if (quotationData) {
          console.log('✅ Found quotation for invoice generation');

          // 🔧 NEW: สร้างและเซฟข้อมูลใบแจ้งหนี้ลงฐานข้อมูลก่อน
          const invoiceNumber = installmentData.invoiceId || `INV-${installmentData.contractNo || Date.now()}`;

          const newInvoiceData = {
            invoiceNumber: invoiceNumber,
            quotationRef: quotationData._id,
            quotationNumber: quotationData.quotationNumber,
            branchCode: installmentData.branchCode || quotationData.branchCode || '00000',

            // ข้อมูลลูกค้า (required)
            customer: {
              name: quotationData.customer?.name || installmentData.customerInfo?.name || 'ลูกค้า',
              address: quotationData.customer?.address || installmentData.customerInfo?.address || '',
              taxId: quotationData.customer?.taxId || installmentData.customerInfo?.tax_id || '',
              phone: quotationData.customer?.phone || installmentData.customerInfo?.phone_number || ''
            },

            // ข้อมูลพนักงานขาย (required)
            salesperson: quotationData.salesperson || new mongoose.Types.ObjectId(),
            salespersonName: quotationData.salespersonName || installmentData.salespersonName || 'พนักงานขาย',

            // รายการสินค้า
            items: quotationData.items || [],

            // ยอดเงิน
            summary: quotationData.summary || {
              subtotal: quotationData.subtotal || 0,
              shipping: 0,
              discount: 0,
              tax: quotationData.vatAmount || 0,
              netTotal: quotationData.grandTotal || quotationData.subtotal || 0
            },

            // ข้อมูลเพิ่มเติม
            docFee: quotationData.docFee || 500,
            shippingFee: quotationData.shippingFee || 0,
            creditTerm: quotationData.creditTerm || 'เงินสด',
            vatInclusive: quotationData.vatInclusive !== undefined ? quotationData.vatInclusive : true,
            discountValue: quotationData.discountValue || 0,

            // ข้อมูลผ่อนชำระ
            financedTotal: quotationData.financedTotal || 0,
            downTotal: quotationData.downTotal || installmentData.downPayment || 0,
            grandTotal: quotationData.grandTotal || quotationData.summary?.netTotal || 0,

            // ข้อมูลสัญญา
            contractNo: installmentData.contractNo,
            status: 'draft'
          };

          try {
            console.log('💾 Saving invoice data to database...');
            console.log('📋 Invoice data to save:', {
              invoiceNumber: newInvoiceData.invoiceNumber,
              quotationRef: newInvoiceData.quotationRef,
              quotationNumber: newInvoiceData.quotationNumber,
              customerName: newInvoiceData.customer?.name,
              salespersonName: newInvoiceData.salespersonName,
              itemsCount: newInvoiceData.items?.length || 0,
              grandTotal: newInvoiceData.grandTotal
            });

            const savedInvoice = await Invoice.create(newInvoiceData);
            console.log('✅ Invoice saved to database:', savedInvoice.invoiceNumber);
            console.log('✅ Saved invoice ID:', savedInvoice._id);

            // ใช้ข้อมูลที่เซฟแล้วสำหรับสร้าง PDF
            invoiceData = savedInvoice;
          } catch (saveError) {
            console.error('❌ Failed to save invoice:', saveError.message);
            console.error('❌ Invoice save error details:', {
              name: saveError.name,
              code: saveError.code,
              errors: saveError.errors
            });
            // ถ้าเซฟไม่ได้ ใช้ข้อมูลชั่วคราว
          }

          const orderData = {
            ...quotationData,
            ...newInvoiceData,
            quotationData: quotationData,
            invoiceNumber: invoiceNumber,
            branchCode: installmentData.branchCode || quotationData.branchCode,
            documentType: 'invoice'
          };

          const normalizedOrderData = this.normalizeDataForPdf(orderData);
          const pdfResult = await InvoicePdfController.createInvoicePdf(normalizedOrderData);
          console.log('✅ Invoice PDF generated from quotation data');
          return pdfResult;
        }
      }

      if (invoiceData) {
        console.log('✅ Found invoice in database');
        const orderData = {
          ...invoiceData,
          quotationData: invoiceData.quotationRef || null,
          branchCode: installmentData.branchCode || invoiceData.branchCode,
          documentType: 'invoice'
        };

        const normalizedOrderData = this.normalizeDataForPdf(orderData);
        const pdfResult = await InvoicePdfController.createInvoicePdf(normalizedOrderData);
        console.log('✅ Invoice PDF generated from database');
        return pdfResult;
      }

      // Final option: create from installment data and save to database
      console.log('⚠️ No invoice/quotation found, creating from installment data');
      const orderData = await this.findOrCreateOrderData(installmentData, 'invoice');

      // 🔧 NEW: บันทึกใบแจ้งหนี้และเอกสารที่เกี่ยวข้องผ่าน Controllers
      let invoiceControllerResults = null;
      try {
        console.log('💾 Saving invoice and related documents via controllers...');
        invoiceControllerResults = await this.saveReceiptAndTaxInvoiceByTaxType(orderData, installmentData);
        console.log('✅ Invoice controller save results:', {
          receiptSaved: !!invoiceControllerResults.receipt,
          taxInvoiceSaved: !!invoiceControllerResults.taxInvoice,
          taxType: invoiceControllerResults.taxType,
          hasVat: invoiceControllerResults.hasVat
        });
      } catch (controllerError) {
        console.error('❌ Error saving invoice via controllers (continuing with fallback):', controllerError);
      }

      // 🔧 NEW: เซฟข้อมูลใบแจ้งหนี้ลงฐานข้อมูลจากข้อมูล fallback
      if (orderData && !invoiceData) {
        const invoiceNumber = installmentData.invoiceId || `INV-${installmentData.contractNo || Date.now()}`;

        const fallbackInvoiceData = {
          invoiceNumber: invoiceNumber,
          quotationNumber: installmentData.quotationId || 'N/A',
          branchCode: installmentData.branchCode || '00000',

          // ข้อมูลลูกค้า (required)
          customer: {
            name: orderData.customerInfo?.name || installmentData.customerInfo?.name || orderData.customer?.name || 'ลูกค้า',
            address: orderData.customerInfo?.address || installmentData.customerInfo?.address || '',
            taxId: orderData.customerInfo?.taxId || installmentData.customerInfo?.tax_id || '',
            phone: orderData.customerInfo?.phone || installmentData.customerInfo?.phone_number || ''
          },

          // ข้อมูลพนักงานขาย (required)
          salesperson: new mongoose.Types.ObjectId(),
          salespersonName: installmentData.salespersonName || 'พนักงานขาย',

          // รายการสินค้า
          items: orderData.items || [],

          // ยอดเงิน
          summary: {
            subtotal: orderData.totalAmount || 0,
            shipping: 0,
            discount: 0,
            tax: orderData.vatAmount || 0,
            netTotal: orderData.totalAmount || 0
          },

          // ข้อมูลเพิ่มเติม
          docFee: orderData.docFee || 500,
          shippingFee: 0,
          creditTerm: 'เงินสด',
          vatInclusive: true,
          discountValue: 0,

          // ข้อมูลผ่อนชำระ
          financedTotal: 0,
          downTotal: installmentData.downPayment || 0,
          grandTotal: orderData.totalAmount || 0,

          // ข้อมูลสัญญา
          contractNo: installmentData.contractNo,
          status: 'draft'
        };

        try {
          console.log('💾 Saving fallback invoice data to database...');
          console.log('📋 Fallback invoice data to save:', {
            invoiceNumber: fallbackInvoiceData.invoiceNumber,
            quotationNumber: fallbackInvoiceData.quotationNumber,
            customerName: fallbackInvoiceData.customer?.name,
            salespersonName: fallbackInvoiceData.salespersonName,
            itemsCount: fallbackInvoiceData.items?.length || 0,
            grandTotal: fallbackInvoiceData.grandTotal
          });

          const savedInvoice = await Invoice.create(fallbackInvoiceData);
          console.log('✅ Fallback invoice saved to database:', savedInvoice.invoiceNumber);
          console.log('✅ Fallback invoice ID:', savedInvoice._id);
        } catch (saveError) {
          console.error('❌ Failed to save fallback invoice:', saveError.message);
          console.error('❌ Fallback invoice save error details:', {
            name: saveError.name,
            code: saveError.code,
            errors: saveError.errors
          });
        }
      }

      const normalizedOrderData = this.normalizeDataForPdf(orderData);
      const pdfResult = await InvoicePdfController.createInvoicePdf(normalizedOrderData);
      console.log('✅ Invoice PDF generated from fallback data');
      return pdfResult;

    } catch (error) {
      console.error('❌ Invoice PDF generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate receipt PDF using A4PDFController
   * @param {Object} installmentData - Installment data
   * @returns {Promise<Object>} PDF result
   */
  async generateReceiptPdf(installmentData) {
    try {
      console.log('📄 Generating receipt PDF using A4PDFController...');
      console.log('📄 InstallmentData for receipt:', {
        receiptVoucherId: installmentData.receiptVoucherId,
        contractNo: installmentData.contractNo,
        orderId: installmentData.orderId,
        downPayment: installmentData.downPayment
      });

      // Find receipt voucher or create receipt data
      let receiptVoucher = null;

      if (installmentData.receiptVoucherId) {
        console.log(`🔍 Searching for receipt voucher by ID: ${installmentData.receiptVoucherId}`);
        // Try to find by receiptNumber field instead of _id
        receiptVoucher = await ReceiptVoucher.findOne({
          $or: [
            { receiptNumber: installmentData.receiptVoucherId },
            { documentNumber: installmentData.receiptVoucherId }
          ]
        }).populate('details');
        console.log('🔍 Receipt voucher by ID result:', !!receiptVoucher);
      }

      if (!receiptVoucher && installmentData.contractNo) {
        console.log(`🔍 Searching for receipt voucher by contractNo: ${installmentData.contractNo}`);
        receiptVoucher = await ReceiptVoucher.findOne({
          $or: [
            { 'metadata.contractNumber': installmentData.contractNo },
            { 'metadata.sourceId': installmentData.contractNo },
            { documentNumber: { $regex: installmentData.contractNo, $options: 'i' } }
          ]
        }).populate('details');
        console.log('🔍 Receipt voucher by contractNo result:', !!receiptVoucher);
      }

      // Create order data for receipt PDF generation
      console.log('📄 Creating order data for receipt...');
      const orderData = await this.findOrCreateOrderData(installmentData, 'receipt');

      // 🔧 NEW: เซฟข้อมูลใบเสร็จและใบกำกับภาษีผ่าน Controllers ตาม taxType
      let controllerSaveResults = null;
      try {
        console.log('💾 Saving receipt and tax invoice via controllers...');
        controllerSaveResults = await this.saveReceiptAndTaxInvoiceByTaxType(orderData, installmentData);
        console.log('✅ Controller save results:', {
          receiptSaved: !!controllerSaveResults.receipt,
          taxInvoiceSaved: !!controllerSaveResults.taxInvoice,
          taxType: controllerSaveResults.taxType,
          hasVat: controllerSaveResults.hasVat
        });
      } catch (controllerError) {
        console.error('❌ Error saving via controllers (continuing with PDF generation):', controllerError);
      }

      // 🔧 NEW: เซฟข้อมูลใบเสร็จลงฐานข้อมูลถ้ายังไม่มี (Fallback to original method)
      if (!receiptVoucher && orderData) {
        const receiptNumber = installmentData.receiptVoucherId || `RCP-${installmentData.contractNo || Date.now()}`;

        const newReceiptData = {
          documentNumber: receiptNumber,
          receiptNumber: receiptNumber,
          documentType: 'RECEIPT',
          invoiceType: 'RECEIPT',
          contractNumber: installmentData.contractNo,
          quotationNumber: installmentData.quotationId,
          customer: orderData.customerInfo || orderData.customer,
          items: orderData.items,
          subtotal: orderData.downPayment || orderData.totalAmount || 0,
          totalAmount: orderData.downPayment || orderData.totalAmount || 0,
          downPayment: orderData.downPayment || 0,
          vatAmount: orderData.vatAmount || 0,
          docFee: orderData.docFee || orderData.doc_fee || 150,
          branchCode: installmentData.branchCode || '00000',
          salesperson: orderData.salesperson || { name: 'พนักงาน' },
          paymentMethod: 'โอนเงิน',
          receiptType: 'down_payment',
          taxType: orderData.taxType || 'none',
          status: 'completed',
          metadata: {
            contractNumber: installmentData.contractNo,
            sourceId: installmentData.contractNo,
            quotationId: installmentData.quotationId
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };

        try {
          console.log('💾 Saving receipt voucher to database...');
          console.log('📋 Receipt voucher data to save:', {
            receiptNumber: newReceiptData.receiptNumber,
            contractNumber: newReceiptData.contractNumber,
            quotationNumber: newReceiptData.quotationNumber,
            customerName: newReceiptData.customer?.name,
            totalAmount: newReceiptData.totalAmount,
            downPayment: newReceiptData.downPayment,
            receiptType: newReceiptData.receiptType
          });

          const savedReceipt = await ReceiptVoucher.create(newReceiptData);
          console.log('✅ Receipt voucher saved to database:', savedReceipt.receiptNumber);
          console.log('✅ Receipt voucher ID:', savedReceipt._id);
          receiptVoucher = savedReceipt;
        } catch (saveError) {
          console.error('❌ Failed to save receipt voucher:', saveError.message);
          console.error('❌ Receipt save error details:', {
            name: saveError.name,
            code: saveError.code,
            errors: saveError.errors
          });
        }
      }

      console.log('📄 Order data created:', {
        hasCustomer: !!orderData.customerInfo,
        hasItems: !!orderData.items,
        itemsLength: orderData.items?.length || 0,
        totalAmount: orderData.totalAmount,
        receiptVoucherSaved: !!receiptVoucher
      });

      // Use A4PDFController to generate PDF
      console.log('📄 Calling A4PDFController.createReceiptPdf...');

      // Normalize data to prevent null/undefined values
      const normalizedOrderData = this.normalizeDataForPdf(orderData);

      const pdfResult = await A4PDFController.createReceiptPdf(normalizedOrderData);
      console.log('📄 Receipt PDF result:', {
        hasBuffer: !!(pdfResult && pdfResult.buffer),
        bufferLength: pdfResult?.buffer?.length || 0,
        resultType: typeof pdfResult,
        resultKeys: pdfResult ? Object.keys(pdfResult) : []
      });
      console.log('✅ Receipt PDF generated successfully');
      return pdfResult;

    } catch (error) {
      console.error('❌ Receipt PDF generation failed:', error);
      console.error('❌ Receipt error details:', error.message);
      console.error('❌ Receipt error stack:', error.stack);
      throw error;
    }
  }

  /**
   * Save receipt data using ReceiptController
   * @param {Object} receiptData - Receipt data to save
   * @returns {Promise<Object>} Saved receipt result
   */
  async saveReceiptViaController(receiptData) {
    try {
      console.log('💾 Saving receipt via ReceiptController...');

      // Create a mock request object for the controller
      const mockReq = {
        body: receiptData
      };

      let controllerResult = null;

      const mockRes = {
        status: (code) => ({
          json: (data) => {
            controllerResult = { statusCode: code, ...data };
            return mockRes;
          }
        }),
        json: (data) => {
          controllerResult = { statusCode: 200, ...data };
          return mockRes;
        }
      };

      await ReceiptController.create(mockReq, mockRes);

      if (controllerResult && controllerResult.success) {
        console.log('✅ Receipt saved via controller:', controllerResult.data._id);
        return controllerResult.data;
      } else {
        console.error('❌ Receipt controller returned error:', controllerResult);
        return null;
      }

    } catch (error) {
      console.error('❌ Error saving receipt via controller:', error);
      return null;
    }
  }

  /**
   * Save tax invoice data using TaxInvoiceController
   * @param {Object} taxInvoiceData - Tax invoice data to save
   * @returns {Promise<Object>} Saved tax invoice result
   */
  async saveTaxInvoiceViaController(taxInvoiceData) {
    try {
      console.log('💾 Saving tax invoice via TaxInvoiceController...');

      // Create a mock request object for the controller
      const mockReq = {
        body: taxInvoiceData
      };

      let controllerResult = null;

      const mockRes = {
        status: (code) => ({
          json: (data) => {
            controllerResult = { statusCode: code, ...data };
            return mockRes;
          }
        }),
        json: (data) => {
          controllerResult = { statusCode: 200, ...data };
          return mockRes;
        }
      };

      await TaxInvoiceController.create(mockReq, mockRes);

      if (controllerResult && controllerResult.success) {
        console.log('✅ Tax invoice saved via controller:', controllerResult.data._id);
        return controllerResult.data;
      } else {
        console.error('❌ Tax invoice controller returned error:', controllerResult);
        return null;
      }

    } catch (error) {
      console.error('❌ Error saving tax invoice via controller:', error);
      return null;
    }
  }

  /**
   * Determine tax type and save appropriate documents
   * @param {Object} orderData - Order data
   * @param {Object} installmentData - Installment data
   * @returns {Promise<Object>} Save results
   */
  async saveReceiptAndTaxInvoiceByTaxType(orderData, installmentData) {
    try {
      console.log('🔍 Determining tax type and saving documents...');

      const taxType = orderData.taxType || installmentData.taxType || 'none';
      const hasVat = orderData.vatAmount > 0 || installmentData.vatAmount > 0;

      console.log('💰 Tax information:', {
        taxType,
        hasVat,
        vatAmount: orderData.vatAmount || installmentData.vatAmount || 0,
        orderTaxType: orderData.taxType,
        installmentTaxType: installmentData.taxType
      });

      const results = {
        receipt: null,
        taxInvoice: null,
        taxType,
        hasVat
      };

      // สร้างข้อมูลพื้นฐานสำหรับเอกสาร - ใช้ข้อมูลจริงจาก localStorage
      const baseCustomerData = this._extractCustomerDataFromLocalStorage(orderData, installmentData);

      // 1. บันทึกใบเสร็จรับเงิน (สำหรับทุกกรณี)
      const receiptNumber = installmentData.receiptVoucherId || `RCP-${installmentData.contractNo || Date.now()}`;

      const receiptData = {
        receiptNumber,
        documentType: 'RECEIPT',
        receiptType: hasVat ? 'down_payment_receipt' : 'full_payment_receipt',
        issueDate: new Date(),
        contractNo: installmentData.contractNo,
        quotationNumber: installmentData.quotationId,
        invoiceNumber: installmentData.invoiceId,
        customer: baseCustomerData,
        items: orderData.items?.map(item => ({
          product: item.id || item.productId || item.name,
          name: item.name || item.description || 'สินค้า',
          description: item.description || item.name || 'สินค้า',
          quantity: item.quantity || 1,
          unitPrice: item.price || item.unitPrice || 0,
          totalPrice: item.totalPrice || (item.price * item.quantity) || 0,
          imei: item.imei || ''
        })) || [],
        subtotal: orderData.totalAmount || installmentData.downPayment || 0,
        vatAmount: hasVat ? (orderData.vatAmount || installmentData.vatAmount || 0) : 0,
        totalAmount: orderData.totalAmount || installmentData.downPayment || 0,
        downPaymentAmount: installmentData.downPayment || 0,
        paymentMethod: 'โอนเงิน',
        taxType,
        branchCode: installmentData.branchCode || '00000',
        salesperson: orderData.salesperson?.name || 'พนักงานขาย',
        status: 'completed',
        metadata: {
          contractNumber: installmentData.contractNo,
          sourceId: installmentData.contractNo,
          quotationId: installmentData.quotationId,
          hasVat,
          taxType
        }
      };

      results.receipt = await this.saveReceiptViaController(receiptData);

      // 2. บันทึกใบกำกับภาษี (เฉพาะกรณีมี VAT)
      if (hasVat && (taxType === 'inclusive' || taxType === 'exclusive' || taxType === 'vat')) {
        console.log('📄 Creating tax invoice for VAT transaction...');

        const taxInvoiceNumber = installmentData.taxInvoiceId || `TAX-${installmentData.contractNo || Date.now()}`;

        const taxInvoiceData = {
          taxInvoiceNumber,
          documentType: 'TAX_INVOICE',
          invoiceType: 'TAX_INVOICE',
          issueDate: new Date(),
          contractNo: installmentData.contractNo,
          quotationNumber: installmentData.quotationId,
          receiptNumber,
          customer: {
            ...baseCustomerData,
            // เพิ่มข้อมูลเฉพาะใบกำกับภาษี
            companyName: baseCustomerData.name,
            taxRegistrationNumber: baseCustomerData.taxId
          },
          items: receiptData.items,
          subtotal: receiptData.subtotal,
          vatAmount: receiptData.vatAmount,
          totalAmount: receiptData.totalAmount,
          beforeTaxAmount: receiptData.subtotal - receiptData.vatAmount,
          taxType,
          vatRate: 7, // VAT 7%
          branchCode: installmentData.branchCode || '00000',
          salesperson: receiptData.salesperson,
          status: 'completed',
          metadata: {
            contractNumber: installmentData.contractNo,
            sourceId: installmentData.contractNo,
            quotationId: installmentData.quotationId,
            receiptNumber,
            vatCalculation: {
              beforeTax: receiptData.subtotal - receiptData.vatAmount,
              vatRate: 7,
              vatAmount: receiptData.vatAmount,
              total: receiptData.totalAmount
            }
          }
        };

        results.taxInvoice = await this.saveTaxInvoiceViaController(taxInvoiceData);
      } else {
        console.log('📄 No tax invoice needed - no VAT or tax type is none');
      }

      console.log('✅ Document saving completed:', {
        receiptSaved: !!results.receipt,
        taxInvoiceSaved: !!results.taxInvoice,
        taxType: results.taxType,
        hasVat: results.hasVat
      });

      return results;

    } catch (error) {
      console.error('❌ Error saving receipt and tax invoice by tax type:', error);
      throw error;
    }
  }
  normalizeDataForPdf(data) {
    if (!data) return {};

    const normalized = { ...data };

    // Normalize customer information
    if (normalized.customer) {
      normalized.customer = {
        ...normalized.customer,
        name: normalized.customer.name || 'ลูกค้า',
        firstName: normalized.customer.firstName || normalized.customer.first_name || '',
        lastName: normalized.customer.lastName || normalized.customer.last_name || '',
        phone: normalized.customer.phone || normalized.customer.phone_number || '',
        email: normalized.customer.email || '',
        taxId: normalized.customer.taxId || normalized.customer.tax_id || '',
        signature: normalized.customer.signature || null
      };
    }

    // Normalize customer info (alternative field)
    if (normalized.customerInfo && !normalized.customer) {
      normalized.customer = this.normalizeDataForPdf({ customer: normalized.customerInfo }).customer;
    }

    // Normalize salesperson information
    if (normalized.salesperson) {
      normalized.salesperson = {
        ...normalized.salesperson,
        name: normalized.salesperson.name || 'พนักงาน',
        signature: normalized.salesperson.signature || normalized.salesperson.signatureUrl || null
      };
    }

    // Normalize document numbers
    if (normalized.invoiceNumber === undefined || normalized.invoiceNumber === null) {
      normalized.invoiceNumber = normalized.invoiceNo || normalized.invoiceId || '';
    }

    if (normalized.quotationNumber === undefined || normalized.quotationNumber === null) {
      normalized.quotationNumber = normalized.quotationNo || normalized.quotationId || '';
    }

    if (normalized.receiptNumber === undefined || normalized.receiptNumber === null) {
      normalized.receiptNumber = normalized.receiptNo || normalized.receiptVoucherId || '';
    }

    return normalized;
  }

  /**
   * Find or create order data for PDF generation
   * @param {Object} installmentData - Installment data
   * @param {string} docType - Document type
   * @returns {Promise<Object>} Order data
   */
  async findOrCreateOrderData(installmentData, docType) {
    try {
      // Try to find existing order
      let order = null;

      if (installmentData.orderId) {
        order = await Order.findById(installmentData.orderId);
      }

      if (!order && installmentData.contractNo) {
        order = await InstallmentOrder.findOne({
          contractNo: installmentData.contractNo
        });
      }

      if (order) {
        console.log(`✅ Found existing order for ${docType}: ${order._id}`);
        return order;
      }

      // Create order data from installment data
      console.log(`⚠️ No existing order found, creating data for ${docType}`);
      return await this.createOrderDataFromInstallment(installmentData, docType);

    } catch (error) {
      console.error(`❌ Error finding/creating order data for ${docType}:`, error);
      throw error;
    }
  }

  /**
   * Create order data from installment data
   * @param {Object} installmentData - Installment data
   * @param {string} docType - Document type
   * @returns {Object} Order data
   */
  async createOrderDataFromInstallment(installmentData, docType) {
    const baseOrderData = {
      _id: installmentData.orderId || installmentData._id,
      contractNo: installmentData.contractNo,
      quotationId: installmentData.quotationId,
      invoiceId: installmentData.invoiceId,
      customerInfo: installmentData.customerInfo || {
        name: 'ลูกค้า',
        displayName: 'ลูกค้า'
      },
      items: installmentData.items || installmentData.cartItems || [],
      totalAmount: installmentData.totalAmount || 0,
      downPayment: installmentData.downPayment || 0,
      monthlyPayment: installmentData.monthlyPayment || 0,
      installmentTerms: installmentData.installmentTerms || 0,
      // 🔧 FIX: เพิ่ม docFee จาก installmentData เพื่อป้องกัน "docFee is not defined" error
      docFee: installmentData.docFee || installmentData.doc_fee || 150, // fallback ค่าเริ่มต้น
      doc_fee: installmentData.docFee || installmentData.doc_fee || 150, // เพิ่มทั้ง 2 format
      vatAmount: installmentData.vatAmount || 0,
      taxType: installmentData.taxType || 'none',
      beforeTaxAmount: installmentData.beforeTaxAmount || 0,
      totalWithTax: installmentData.totalWithTax || installmentData.totalAmount || 0,
      createdAt: new Date(),
      status: 'active'
    };

    // Add document-specific data with fallback number generation
    let DocumentNumberSystem = null;
    try {
      DocumentNumberSystem = require('../utils/DocumentNumberSystem');
    } catch (error) {
      console.warn('⚠️ DocumentNumberSystem not found, using fallback number generation');
    }

    switch (docType) {
      case 'quotation':
        if (DocumentNumberSystem) {
          baseOrderData.quotationNumber = installmentData.quotationId || await DocumentNumberSystem.generateQuotationNumber();
        } else {
          baseOrderData.quotationNumber = installmentData.quotationId || `QUO-${installmentData.contractNo || Date.now()}`;
        }
        baseOrderData.quotationNo = baseOrderData.quotationNumber; // เพิ่มเพื่อให้ QuotationPdfController อ่านได้
        baseOrderData.order_number = baseOrderData.quotationNumber; // เพิ่ม fallback
        baseOrderData.validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        break;

      case 'invoice':
        if (DocumentNumberSystem) {
          baseOrderData.invoiceNumber = installmentData.invoiceId || await DocumentNumberSystem.generateInvoiceNumber();
        } else {
          baseOrderData.invoiceNumber = installmentData.invoiceId || `INV-${installmentData.contractNo || Date.now()}`;
        }
        baseOrderData.invoiceNo = baseOrderData.invoiceNumber; // เพิ่มเพื่อให้ InvoicePdfController อ่านได้
        baseOrderData.order_number = baseOrderData.invoiceNumber; // เพิ่ม fallback
        baseOrderData.dueDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15 days
        break;

      case 'receipt':
        baseOrderData.receiptNumber = installmentData.receiptVoucherId || `RCP-${installmentData.contractNo || Date.now()}`;
        baseOrderData.order_number = baseOrderData.receiptNumber;
        baseOrderData.documentType = 'RECEIPT';
        break;

      case 'taxInvoice':
        baseOrderData.taxInvoiceNumber = installmentData.taxInvoiceId || `TAX-${installmentData.contractNo || Date.now()}`;
        baseOrderData.order_number = baseOrderData.taxInvoiceNumber;
        baseOrderData.documentType = 'TAX_INVOICE';
        baseOrderData.invoiceType = 'TAX_INVOICE';
        if (!baseOrderData.items || baseOrderData.items.length === 0) {
          baseOrderData.items = [
            {
              description: 'เงินดาวน์การผ่อนชำระ',
              name: 'เงินดาวน์การผ่อนชำระ',
              quantity: 1,
              unitPrice: installmentData.downPayment || 0,
              totalPrice: installmentData.downPayment || 0,
              amount: installmentData.downPayment || 0
            }
          ];
        }
        break;
    }

    console.log(`📄 Created ${docType} order data:`, baseOrderData);
    return baseOrderData;
  }

  /**
   * Create receipt data from installment data
   * @param {Object} installmentData - Installment data
   * @returns {Object} Receipt data
   */
  createReceiptDataFromInstallment(installmentData) {
    const receiptData = {
      _id: installmentData.receiptVoucherId || installmentData._id,
      documentNumber: `RV-${installmentData.contractNo}`,
      contractNo: installmentData.contractNo,
      customerInfo: installmentData.customerInfo || {
        name: 'ลูกค้า',
        displayName: 'ลูกค้า'
      },
      items: [
        {
          description: 'เงินดาวน์การผ่อนชำระ',
          amount: installmentData.downPayment || 0,
          quantity: 1
        }
      ],
      totalAmount: installmentData.downPayment || 0,
      paymentMethod: 'cash',
      receiptType: 'down_payment',
      createdAt: new Date(),
      metadata: {
        contractNumber: installmentData.contractNo,
        sourceType: 'installment',
        sourceId: installmentData._id
      }
    };

    console.log('📄 Created receipt data:', receiptData);
    return receiptData;
  }

  /**
   * Generate email content for installment documents
   * @param {Object} config - Configuration object
   * @returns {string} HTML email content
   */
  generateInstallmentEmailContent({ customerInfo, installmentData, documents, customMessage }) {
    const customerName = customerInfo?.name || 'ลูกค้า';
    const contractNo = installmentData?.contractNo || 'N/A';

    const documentList = documents.map(doc => {
      switch (doc) {
        case 'quotation': return 'ใบเสนอราคา';
        case 'invoice': return 'ใบแจ้งหนี้';
        case 'receipt': return 'ใบเสร็จรับเงิน';
        case 'taxInvoice': return 'ใบกำกับภาษี';
        default: return doc;
      }
    }).join(', ');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #1f2937; 
            background-color: #f9fafb;
            margin: 0;
            padding: 0;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }
          .header { 
            background: white; 
            color: #1f2937; 
            padding: 30px; 
            text-align: center; 
            border-bottom: 1px solid #f1f5f9;
          }
          .logo {
            max-width: 120px;
            height: auto;
            margin-bottom: 20px;
          }
          .content { 
            background: #fff; 
            padding: 30px; 
          }
          .footer { 
            background: #f9fafb; 
            padding: 20px; 
            text-align: center; 
            color: #6b7280; 
            border-top: 1px solid #f1f5f9;
          }
          .info-box { 
            background: #f9fafb; 
            padding: 20px; 
            border-radius: 6px; 
            margin: 20px 0; 
            border: 1px solid #f1f5f9;
          }
          .document-list { 
            background: #eff6ff; 
            padding: 20px; 
            border-radius: 6px; 
            margin: 20px 0; 
            border: 1px solid #dbeafe;
          }
          .custom-message { 
            background: #fffbeb; 
            padding: 20px; 
            border-radius: 6px; 
            margin: 20px 0; 
            border-left: 4px solid #fbbf24; 
          }
          h1 { margin: 0 0 10px 0; font-size: 24px; font-weight: 600; }
          h2 { color: #374151; font-size: 20px; margin: 0 0 15px 0; }
          h3 { color: #374151; font-size: 16px; margin: 0 0 10px 0; }
          p { margin: 0 0 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="${process.env.BASE_URL || 'http://localhost:3000'}/uploads/Logo2.png" alt="2 พี่น้อง โมบาย" class="logo">
            <h1>2 พี่น้อง โมบาย จำกัด</h1>
            <p style="color: #6b7280; margin: 0;">เอกสารการผ่อนชำระ</p>
          </div>
          
          <div class="content">
            <h2>เรียน คุณ${customerName}</h2>
            
            <p>ขอบคุณที่ไว้วางใจในการซื้อสินค้าผ่อนชำระกับเรา</p>
            
            <div class="info-box">
              <h3>📋 ข้อมูลสัญญา</h3>
              <p><strong>หมายเลขสัญญา:</strong> ${contractNo}</p>
              <p><strong>วันที่:</strong> ${new Date().toLocaleDateString('th-TH')}</p>
            </div>
            
            <div class="document-list">
              <h3>📎 เอกสารแนบ</h3>
              <p>${documentList}</p>
            </div>
            
            ${customMessage ? `
            <div class="custom-message">
              <h3>💬 ข้อความพิเศษ</h3>
              <p>${customMessage}</p>
            </div>
            ` : ''}
            
            <p>หากมีข้อสงสัยประการใด กรุณาติดต่อเราได้ทันที</p>
            
            <p>ขอบคุณครับ/ค่ะ<br>
            ทีมงานระบบผ่อนชำระ</p>
          </div>
          
          <div class="footer">
            <p>📧 อีเมลนี้ส่งโดยระบบอัตโนมัติ กรุณาอย่าตอบกลับ</p>
            <p>🕒 ${new Date().toLocaleString('th-TH')}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate email subject
   * @param {Object} installmentData - Installment data
   * @returns {string} Email subject
   */
  generateEmailSubject(installmentData) {
    const contractNo = installmentData?.contractNo || 'N/A';
    return `📄 เอกสารการผ่อนชำระ - สัญญาเลขที่ ${contractNo}`;
  }

  /**
   * Send email with attachments using nodemailer
   * @param {Object} emailConfig - Email configuration
   * @returns {Promise<Object>} Send result
   */
  async sendEmailWithAttachments({ to, subject, html, attachments }) {
    try {
      // Use existing email service or nodemailer configuration

      // Create transporter (use existing Gmail configuration)
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASS
        }
      });

      const mailOptions = {
        from: `"${process.env.COMPANY_NAME || 'ระบบผ่อนชำระ'}" <${process.env.GMAIL_USER}>`,
        to,
        subject,
        html,
        attachments: attachments.map(att => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType
        }))
      };

      const result = await transporter.sendMail(mailOptions);

      console.log('✅ Email sent successfully:', result.messageId);
      return result;

    } catch (error) {
      console.error('❌ Email sending failed:', error);
      throw error;
    }
  }

  /**
   * Extract customer data from localStorage and form data
   * @param {Object} orderData - Order data from frontend
   * @param {Object} installmentData - Installment data from frontend
   * @returns {Object} Enhanced customer data
   */
  _extractCustomerDataFromLocalStorage(orderData, installmentData) {
    console.log('🔍 Extracting customer data from localStorage...');

    // ลำดับการหาข้อมูลลูกค้า:
    // 1. จาก orderData.customerInfo/customer (ข้อมูลที่ส่งมาจาก frontend)
    // 2. จาก installmentData.customerInfo/customer
    // 3. Default fallback (กรณีไม่มีข้อมูล)

    let customerData = {};

    // ตรวจสอบ orderData ก่อน
    if (orderData.customerInfo || orderData.customer) {
      const source = orderData.customerInfo || orderData.customer;
      customerData = {
        prefix: source.prefix || '',
        firstName: source.firstName || '',
        lastName: source.lastName || '',
        name: source.name || `${source.prefix || ''} ${source.firstName || ''} ${source.lastName || ''}`.trim(),
        taxId: source.taxId || source.idCard || '',
        phone: source.phone || '',
        email: source.email || '',
        address: source.address || ''
      };
    }
    // ถ้าไม่มีใน orderData ให้ลองดูใน installmentData
    else if (installmentData.customerInfo || installmentData.customer) {
      const source = installmentData.customerInfo || installmentData.customer;
      customerData = {
        prefix: source.prefix || '',
        firstName: source.firstName || '',
        lastName: source.lastName || '',
        name: source.name || `${source.prefix || ''} ${source.firstName || ''} ${source.lastName || ''}`.trim(),
        taxId: source.taxId || source.idCard || '',
        phone: source.phone || '',
        email: source.email || '',
        address: source.address || ''
      };
    }
    // Default fallback
    else {
      customerData = {
        prefix: 'ลูกค้าทั่วไป',
        firstName: '',
        lastName: '',
        name: 'ลูกค้าทั่วไป',
        taxId: '1234567890123',
        phone: '0812345678',
        email: 'customer@example.com',
        address: '123 ถนนทดสอบ ตำบลทดสอบ อำเภอเมือง จังหวัดปัตตานี 94000'
      };
    }

    // สร้างชื่อเต็มถ้าไม่มี
    if (!customerData.name || customerData.name === '  ') {
      customerData.name = `${customerData.prefix} ${customerData.firstName} ${customerData.lastName}`.trim();
      if (!customerData.name) {
        customerData.name = 'ลูกค้าทั่วไป';
      }
    }

    console.log('✅ Extracted customer data:', {
      name: customerData.name,
      prefix: customerData.prefix,
      firstName: customerData.firstName,
      lastName: customerData.lastName
    });

    return customerData;
  }

  /**
   * Format file size for display
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

module.exports = new EnhancedEmailService();
