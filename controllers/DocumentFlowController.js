/**
 * DocumentFlowController.js - จัดการ flow เอกสารจากใบรับเงินมัดจำ
 * ใบเสนอราคา → ใบเสร็จ/ใบกำกับภาษี → ใบแจ้งหนี้
 */

const mongoose = require('mongoose');

// Import models
const DepositReceipt = require('../models/DepositReceipt');
const TaxInvoice = require('../models/TaxInvoice');
const Receipt = require('../models/Receipt');

// Import PDF controllers
const A4PDFController = require('./pdf/A4PDFController');
const DepositReceiptPDFController = require('./pdf/DepositReceiptPDFController');

// Import services
const EmailService = require('../services/emailService');

class DocumentFlowController {

  /**
   * สร้างเอกสารทั้งหมดตาม flow สำหรับขายผ่อน
   * Flow: ใบเสนอราคา → ใบเสร็จ/ใบกำกับภาษี → ใบแจ้งหนี้
   * @param {string} depositReceiptId - ID ของใบรับเงินมัดจำ
   * @param {Object} options - ตัวเลือกการสร้างเอกสาร
   * @returns {Promise<Object>} ผลลัพธ์การสร้างเอกสารทั้งหมด
   */
  static async createInstallmentDocumentFlow(depositReceiptId, options = {}) {
    console.log('📄 Creating installment document flow for:', depositReceiptId);

    try {
      // ดึงข้อมูลใบรับเงินมัดจำ
      const depositReceipt = await DepositReceipt.findById(depositReceiptId)
        .populate('customer._id')
        .populate('product._id')
        .populate('branch._id')
        .populate('salesperson._id');

      if (!depositReceipt) {
        throw new Error(`Deposit receipt not found: ${depositReceiptId}`);
      }

      if (depositReceipt.saleType !== 'installment') {
        throw new Error('Document flow is only available for installment sales');
      }

      const results = {
        success: true,
        documents: {
          quotation: null,
          receipt: null,
          taxInvoice: null,
          invoice: null
        },
        errors: []
      };

      // 1. สร้างใบเสนอราคา (Quotation)
      if (options.createQuotation !== false) {
        try {
          console.log('📋 Creating quotation...');

          const quotationData = await this._createQuotationData(depositReceipt);
          const quotationPDF = await A4PDFController.createReceiptPdf(quotationData);

          // บันทึกข้อมูลใบเสนอราคา
          const quotationNumber = await this._generateDocumentNumber('QT');

          // อัปเดต depositReceipt ด้วยข้อมูลใบเสนอราคา
          depositReceipt.relatedDocuments.quotationNumber = quotationNumber;
          await depositReceipt.save();

          results.documents.quotation = {
            number: quotationNumber,
            pdf: quotationPDF,
            status: 'created'
          };

          console.log('✅ Quotation created:', quotationNumber);

        } catch (error) {
          console.error('❌ Error creating quotation:', error);
          results.errors.push({
            document: 'quotation',
            error: error.message
          });
        }
      }

      // 2. สร้างใบเสร็จรับเงิน (Receipt) สำหรับค่าดาวน์
      if (options.createReceipt !== false) {
        try {
          console.log('🧾 Creating receipt for down payment...');

          const receiptData = await this._createReceiptData(depositReceipt, 'RECEIPT');
          const receiptPDF = await A4PDFController.createReceiptPdf(receiptData);

          // สร้างและบันทึก Receipt model
          const receiptDoc = await this._createReceiptModel(depositReceipt, receiptData);

          results.documents.receipt = {
            id: receiptDoc._id,
            number: receiptDoc.receiptNumber,
            pdf: receiptPDF,
            status: 'created'
          };

          console.log('✅ Receipt created:', receiptDoc.receiptNumber);

        } catch (error) {
          console.error('❌ Error creating receipt:', error);
          results.errors.push({
            document: 'receipt',
            error: error.message
          });
        }
      }

      // 3. สร้างใบกำกับภาษี (Tax Invoice) สำหรับค่าดาวน์
      if (options.createTaxInvoice !== false) {
        try {
          console.log('📄 Creating tax invoice for down payment...');

          const taxInvoiceData = await this._createReceiptData(depositReceipt, 'TAX_INVOICE');
          const taxInvoicePDF = await A4PDFController.createReceiptPdf(taxInvoiceData);

          // สร้างและบันทึก TaxInvoice model
          const taxInvoiceDoc = await this._createTaxInvoiceModel(depositReceipt, taxInvoiceData);

          results.documents.taxInvoice = {
            id: taxInvoiceDoc._id,
            number: taxInvoiceDoc.taxInvoiceNumber,
            pdf: taxInvoicePDF,
            status: 'created'
          };

          console.log('✅ Tax Invoice created:', taxInvoiceDoc.taxInvoiceNumber);

        } catch (error) {
          console.error('❌ Error creating tax invoice:', error);
          results.errors.push({
            document: 'taxInvoice',
            error: error.message
          });
        }
      }

      // 4. สร้างใบแจ้งหนี้ (Invoice) สำหรับยอดคงเหลือ
      if (options.createInvoice !== false && depositReceipt.amounts.remainingAmount > 0) {
        try {
          console.log('📋 Creating invoice for remaining amount...');

          const invoiceData = await this._createInvoiceData(depositReceipt);
          const invoicePDF = await A4PDFController.createReceiptPdf(invoiceData);

          // บันทึกข้อมูลใบแจ้งหนี้
          const invoiceNumber = await this._generateDocumentNumber('INV');

          // อัปเดต depositReceipt ด้วยข้อมูลใบแจ้งหนี้
          depositReceipt.relatedDocuments.invoiceNumber = invoiceNumber;
          await depositReceipt.save();

          results.documents.invoice = {
            number: invoiceNumber,
            pdf: invoicePDF,
            status: 'created'
          };

          console.log('✅ Invoice created:', invoiceNumber);

        } catch (error) {
          console.error('❌ Error creating invoice:', error);
          results.errors.push({
            document: 'invoice',
            error: error.message
          });
        }
      }

      // อัปเดตสถานะ deposit receipt
      if (results.errors.length === 0) {
        depositReceipt.status = 'confirmed';
        await depositReceipt.save();
      }

      return results;

    } catch (error) {
      console.error('❌ Error in createInstallmentDocumentFlow:', error);
      return {
        success: false,
        error: error.message,
        documents: null
      };
    }
  }

  /**
   * สร้างเอกสารสำหรับขายสด
   * @param {string} depositReceiptId - ID ของใบรับเงินมัดจำ
   * @returns {Promise<Object>} ผลลัพธ์การสร้างเอกสาร
   */
  static async createCashSaleDocuments(depositReceiptId) {
    console.log('💰 Creating cash sale documents for:', depositReceiptId);

    try {
      // ดึงข้อมูลใบรับเงินมัดจำ
      const depositReceipt = await DepositReceipt.findById(depositReceiptId)
        .populate('customer._id')
        .populate('product._id')
        .populate('branch._id')
        .populate('salesperson._id');

      if (!depositReceipt) {
        throw new Error(`Deposit receipt not found: ${depositReceiptId}`);
      }

      if (depositReceipt.saleType !== 'cash') {
        throw new Error('Cash sale documents are only available for cash sales');
      }

      const results = {
        success: true,
        documents: {
          receipt: null
        },
        errors: []
      };

      // สร้างใบเสร็จรับเงินสำหรับการขายสด
      try {
        console.log('🧾 Creating cash sale receipt...');

        const receiptData = await this._createCashSaleReceiptData(depositReceipt);
        const receiptPDF = await A4PDFController.createReceiptPdf(receiptData);

        // สร้างและบันทึก Receipt model
        const receiptDoc = await this._createReceiptModel(depositReceipt, receiptData);

        results.documents.receipt = {
          id: receiptDoc._id,
          number: receiptDoc.receiptNumber,
          pdf: receiptPDF,
          status: 'created'
        };

        console.log('✅ Cash sale receipt created:', receiptDoc.receiptNumber);

      } catch (error) {
        console.error('❌ Error creating cash sale receipt:', error);
        results.errors.push({
          document: 'receipt',
          error: error.message
        });
      }

      // อัปเดตสถานะ deposit receipt
      if (results.errors.length === 0) {
        depositReceipt.status = 'completed';
        depositReceipt.conversion.converted = true;
        depositReceipt.conversion.convertedAt = new Date();
        depositReceipt.conversion.convertedTo = 'cash_sale';
        await depositReceipt.save();
      }

      return results;

    } catch (error) {
      console.error('❌ Error in createCashSaleDocuments:', error);
      return {
        success: false,
        error: error.message,
        documents: null
      };
    }
  }

  /**
   * ส่งเอกสารทั้งหมดทาง Email
   * @param {string} depositReceiptId - ID ของใบรับเงินมัดจำ
   * @param {Object} emailData - ข้อมูลการส่งอีเมล
   * @returns {Promise<Object>} ผลลัพธ์การส่งอีเมล
   */
  static async emailDocuments(depositReceiptId, emailData) {
    console.log('📧 Emailing documents for:', depositReceiptId);

    try {
      // ดึงข้อมูลใบรับเงินมัดจำ
      const depositReceipt = await DepositReceipt.findById(depositReceiptId);

      if (!depositReceipt) {
        throw new Error(`Deposit receipt not found: ${depositReceiptId}`);
      }

      // สร้างเอกสารตาม saleType
      let documentFlow;
      if (depositReceipt.saleType === 'installment') {
        documentFlow = await this.createInstallmentDocumentFlow(depositReceiptId);
      } else {
        documentFlow = await this.createCashSaleDocuments(depositReceiptId);
      }

      if (!documentFlow.success) {
        throw new Error('Failed to create documents for email');
      }

      // เตรียมไฟล์แนบ
      const attachments = [];

      Object.entries(documentFlow.documents).forEach(([docType, docData]) => {
        if (docData && docData.pdf) {
          attachments.push({
            filename: docData.pdf.fileName,
            content: docData.pdf.buffer,
            contentType: 'application/pdf'
          });
        }
      });

      // ส่งอีเมล
      const emailService = new EmailService();
      const mailOptions = {
        to: emailData.to,
        subject: emailData.subject || `เอกสารใบรับเงินมัดจำ ${depositReceipt.receiptNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>เอกสารใบรับเงินมัดจำ</h2>
            <p>เรียน คุณ${depositReceipt.customer.name}</p>
            <p>กรุณาดูเอกสารในไฟล์แนบ</p>
            <ul>
              ${attachments.map(att => `<li>${att.filename}</li>`).join('')}
            </ul>
            <p>ขอบคุณที่ใช้บริการ</p>
            <hr>
            <p style="color: #666; font-size: 12px;">
              บริษัท 2 พี่น้อง โมบาย จำกัด
            </p>
          </div>
        `,
        attachments
      };

      const emailResult = await emailService.sendMail(mailOptions);

      // อัปเดตสถานะการส่งอีเมล
      depositReceipt.printing.emailSent = true;
      depositReceipt.printing.emailSentAt = new Date();
      depositReceipt.printing.emailSentTo = emailData.to;
      await depositReceipt.save();

      return {
        success: true,
        messageId: emailResult.messageId,
        attachmentCount: attachments.length,
        message: 'Documents emailed successfully'
      };

    } catch (error) {
      console.error('❌ Error emailing documents:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to email documents'
      };
    }
  }

  // ===== PRIVATE METHODS =====

  /**
   * สร้างข้อมูลใบเสนอราคา
   * @private
   */
  static async _createQuotationData(depositReceipt) {
    return {
      _id: depositReceipt._id,
      quotationNumber: await this._generateDocumentNumber('QT'),
      issueDate: depositReceipt.depositDate,
      customer: depositReceipt.customer,
      items: [{
        description: depositReceipt.product.name,
        quantity: 1,
        unitPrice: depositReceipt.product.price,
        amount: depositReceipt.product.price,
        imei: depositReceipt.product.imei
      }],
      subTotal: depositReceipt.product.price,
      docFee: 500, // ค่าธรรมเนียมเอกสาร
      grandTotal: depositReceipt.product.price + 500,
      company: depositReceipt.company,
      branch: depositReceipt.branch,
      salesperson: depositReceipt.salesperson,
      documentType: 'QUOTATION',
      notes: depositReceipt.notes
    };
  }

  /**
   * สร้างข้อมูลใบเสร็จ/ใบกำกับภาษี
   * @private
   */
  static async _createReceiptData(depositReceipt, documentType = 'RECEIPT') {
    const isReceipt = documentType === 'RECEIPT';

    // สำหรับใบเสร็จใช้ยอดเต็ม, สำหรับใบกำกับภาษีใช้ยอดมัดจำเท่านั้น
    const baseAmount = isReceipt ? depositReceipt.amounts.totalAmount : depositReceipt.amounts.depositAmount;

    // คำนวณ VAT อย่างถูกต้อง
    let vatAmount = 0;
    let totalWithVat = baseAmount;

    if (!isReceipt) { // ใบกำกับภาษีต้องมี VAT
      // สำหรับ VAT แยกนอกราคา (exclusive)
      vatAmount = Math.round(baseAmount * 0.07 * 100) / 100;
      totalWithVat = baseAmount + vatAmount;
    }

    return {
      _id: depositReceipt._id,
      order_number: await this._generateDocumentNumber(isReceipt ? 'RE' : 'TX'),
      invoiceNo: await this._generateDocumentNumber(isReceipt ? 'RE' : 'TX'),
      documentType: documentType,
      saleDate: depositReceipt.depositDate,
      customer: depositReceipt.customer,
      items: [{
        description: isReceipt ? depositReceipt.product.name : `ค่าดาวน์ - ${depositReceipt.product.name}`,
        quantity: 1,
        unitPrice: baseAmount,
        amount: baseAmount,
        imei: depositReceipt.product.imei
      }],
      subTotal: baseAmount,
      docFee: 0,
      vatTotal: vatAmount,
      grandTotal: totalWithVat,
      company: depositReceipt.company,
      branch: depositReceipt.branch,
      salesperson: depositReceipt.salesperson,
      taxType: isReceipt ? 'no_vat' : 'exclusive',
      notes: depositReceipt.notes
    };
  }

  /**
   * สร้างข้อมูลใบแจ้งหนี้
   * @private
   */
  static async _createInvoiceData(depositReceipt) {
    return {
      _id: depositReceipt._id,
      order_number: await this._generateDocumentNumber('INV'),
      invoiceNo: await this._generateDocumentNumber('INV'),
      documentType: 'INVOICE',
      issueDate: new Date(),
      customer: depositReceipt.customer,
      items: [{
        description: `ยอดคงเหลือ - ${depositReceipt.product.name}`,
        quantity: 1,
        unitPrice: depositReceipt.amounts.remainingAmount,
        amount: depositReceipt.amounts.remainingAmount,
        imei: depositReceipt.product.imei
      }],
      subTotal: depositReceipt.amounts.remainingAmount,
      docFee: 0,
      grandTotal: depositReceipt.amounts.remainingAmount,
      company: depositReceipt.company,
      branch: depositReceipt.branch,
      salesperson: depositReceipt.salesperson,
      quotationNumber: depositReceipt.relatedDocuments.quotationNumber,
      notes: depositReceipt.notes
    };
  }

  /**
   * สร้างข้อมูลใบเสร็จสำหรับขายสด
   * @private
   */
  static async _createCashSaleReceiptData(depositReceipt) {
    return {
      _id: depositReceipt._id,
      order_number: await this._generateDocumentNumber('RE'),
      invoiceNo: await this._generateDocumentNumber('RE'),
      documentType: 'RECEIPT',
      saleDate: new Date(),
      customer: depositReceipt.customer,
      items: [{
        description: depositReceipt.product.name,
        quantity: 1,
        unitPrice: depositReceipt.amounts.totalAmount,
        amount: depositReceipt.amounts.totalAmount,
        imei: depositReceipt.product.imei
      }],
      subTotal: depositReceipt.amounts.totalAmount,
      docFee: 0,
      vatTotal: 0,
      grandTotal: depositReceipt.amounts.totalAmount,
      company: depositReceipt.company,
      branch: depositReceipt.branch,
      salesperson: depositReceipt.salesperson,
      taxType: 'no_vat',
      notes: depositReceipt.notes
    };
  }

  /**
   * สร้าง Receipt model
   * @private
   */
  static async _createReceiptModel(depositReceipt, receiptData) {
    const receiptDoc = new Receipt({
      receiptNumber: receiptData.invoiceNo,
      issueDate: receiptData.saleDate,
      customer: depositReceipt.customer,
      items: receiptData.items,
      summary: {
        subtotal: receiptData.subTotal,
        vatAmount: receiptData.vatTotal,
        totalAmount: receiptData.grandTotal
      },
      company: depositReceipt.company,
      branch: depositReceipt.branch,
      employeeName: depositReceipt.salesperson.name,
      notes: receiptData.notes
    });

    await receiptDoc.save();

    // อัปเดต depositReceipt
    depositReceipt.relatedDocuments.receiptId = receiptDoc._id;
    depositReceipt.relatedDocuments.receiptNumber = receiptDoc.receiptNumber;
    await depositReceipt.save();

    return receiptDoc;
  }

  /**
   * สร้าง TaxInvoice model
   * @private
   */
  static async _createTaxInvoiceModel(depositReceipt, taxInvoiceData) {
    const taxInvoiceDoc = new TaxInvoice({
      taxInvoiceNumber: taxInvoiceData.invoiceNo,
      issueDate: taxInvoiceData.saleDate,
      customer: depositReceipt.customer,
      items: taxInvoiceData.items.map(item => ({
        ...item,
        unitPrice: item.unitPrice,
        totalPrice: item.amount,
        product: item.description,
        name: item.description,
        hasVat: true,
        vatRate: 7
      })),
      summary: {
        subtotal: taxInvoiceData.subTotal,
        beforeTax: taxInvoiceData.subTotal,
        vatAmount: taxInvoiceData.vatTotal,
        totalWithTax: taxInvoiceData.grandTotal,
        netTotal: taxInvoiceData.grandTotal,
        total: taxInvoiceData.grandTotal
      },
      calculation: {
        subtotal: taxInvoiceData.subTotal,
        beforeTax: taxInvoiceData.subTotal,
        vatRate: 7,
        vatAmount: taxInvoiceData.vatTotal,
        totalAmount: taxInvoiceData.grandTotal,
        taxType: 'exclusive' // VAT แยกนอกราคา
      },
      downPaymentAmount: taxInvoiceData.subTotal,
      receiptType: 'down_payment_tax_invoice',
      company: depositReceipt.company,
      branch: depositReceipt.branch,
      employeeName: depositReceipt.salesperson.name,
      notes: taxInvoiceData.notes
    });

    await taxInvoiceDoc.save();

    // อัปเดต depositReceipt
    depositReceipt.relatedDocuments.taxInvoiceId = taxInvoiceDoc._id;
    depositReceipt.relatedDocuments.taxInvoiceNumber = taxInvoiceDoc.taxInvoiceNumber;
    await depositReceipt.save();

    return taxInvoiceDoc;
  }

  /**
   * สร้างเลขที่เอกสาร
   * @private
   */
  static async _generateDocumentNumber(prefix) {
    const DocumentNumberSystem = require('../utils/DocumentNumberSystem');

    switch (prefix) {
      case 'QT':
        return await DocumentNumberSystem.generateQuotationNumber();
      case 'INV':
        return await DocumentNumberSystem.generateInvoiceNumber();
      case 'TX':
        return await DocumentNumberSystem.generateTaxInvoiceNumber();
      case 'RE':
      default:
        return await DocumentNumberSystem.generateReceiptNumber();
    }
  }
}

module.exports = DocumentFlowController;
