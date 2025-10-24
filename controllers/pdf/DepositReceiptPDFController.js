/************************************************************
 * DepositReceiptPDFController.js - สำหรับสร้าง PDF ใบรับเงินมัดจำ
 * สร้างเอกสาร PDF A4 สำหรับใบรับเงินมัดจำและเอกสารที่เกี่ยวข้อง
 ************************************************************/
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const mongoose = require('mongoose');

// Import models
const DepositReceipt = require('../../models/DepositReceipt');
const Customer = require('../../models/Customer/Customer');
const Branch = require('../../models/Account/Branch');
const Product = require('../../models/Stock/Product');

// Import A4PDFController เพื่อใช้ฟังก์ชันร่วมกัน
const A4PDFController = require('./A4PDFController');

// Import thai-baht-text library
const bahtText = require('thai-baht-text');

// Import EmailService สำหรับส่งเอกสารทาง Gmail
const EmailService = require('../../services/emailService');

function toThaiBahtText(n) {
  if (n === null || n === undefined || n === '' || isNaN(n)) {
    console.warn('⚠️ Invalid input for toThaiBahtText:', n, 'using default 0');
    return bahtText(0);
  }

  const num = typeof n === 'string' ? parseFloat(n) : n;

  if (isNaN(num)) {
    console.warn('⚠️ Cannot convert to number for toThaiBahtText:', n, 'using default 0');
    return bahtText(0);
  }

  return bahtText(num);
}

// ===== CONFIG เหมือน A4PDFController =====
const CONFIG = {
  page: { size: 'A4', margin: 40 },
  font: {
    name: 'THSarabun', boldName: 'THSarabun-Bold',
    path: path.join(__dirname, '..', '..', 'fonts', 'THSarabunNew.ttf'),
    boldPath: path.join(__dirname, '..', '..', 'fonts', 'THSarabunNew Bold.ttf')
  },
  color: {
    primaryBlue: '#3498DB',
    textHeader: '#FFFFFF',
    textBlack: '#000000',
    textDark: '#222222',
    textLight: '#555555',
    lineLight: '#E0E0E0',
    lineDark: '#CCCCCC',
    sigLine: '#888888',
    bgWhite: '#FFFFFF',
    bgAccent: '#3498DB'
  },
  sizes: {
    logo: { w: 145 },
    heading1: 20,
    heading2: 14,
    heading3: 14,
    textBody: 13,
    textLabel: 11,
    textSmall: 10,
    tableHeader: 12,
    tableRow: 12,
    lineSpacing: 1.4
  },
  layout: {
    tableCols: {
      no: 35,
      desc: 225,
      qty: 45,
      unit: 70,
      disc: 55,
      amt: 85
    }
  }
};

// ===== HELPER FUNCTIONS =====
function ensureNumberData(value, fallback = 0) {
  const num = Number(value);
  return isNaN(num) ? fallback : num;
}

function formatThaiDate(dateString) {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';

    const day = date.getDate();
    const month = date.toLocaleDateString('th-TH', {month: 'long'});
    const thaiYear = date.getFullYear() + 543;

    return `${day} ${month} ${thaiYear}`;
  } catch (e) {
    return '-';
  }
}

class DepositReceiptPDFController {

  /**
   * สร้าง PDF ใบรับเงินมัดจำ
   * @param {Object} depositReceipt - ข้อมูลใบรับเงินมัดจำ
   * @returns {Promise<Object>} ผลลัพธ์ PDF {buffer, fileName}
   */
  static async createDepositReceiptPdf(depositReceipt) {
    console.log('🧾 Creating Deposit Receipt PDF:', {
      _id: depositReceipt?._id,
      receiptNumber: depositReceipt?.receiptNumber,
      customerName: depositReceipt?.customer?.name,
      depositAmount: depositReceipt?.amounts?.depositAmount
    });

    try {
      // Validate input data
      if (!depositReceipt || typeof depositReceipt !== 'object') {
        throw new Error('Missing or invalid deposit receipt data');
      }

      // Normalize data
      const normalizedData = await this._normalizeDepositReceiptData(depositReceipt);

      // Generate PDF
      return await this._generateDepositReceiptPDF(normalizedData);

    } catch (error) {
      console.error('❌ Error creating deposit receipt PDF:', error);
      throw error;
    }
  }

  /**
   * สร้าง PDF ใบรับเงินมัดจำจาก ID
   * @param {string} depositReceiptId - ID ของใบรับเงินมัดจำ
   * @returns {Promise<Object>} ผลลัพธ์ PDF
   */
  static async createDepositReceiptPdfById(depositReceiptId) {
    console.log('🔍 Creating deposit receipt PDF by ID:', depositReceiptId);

    try {
      // ดึงข้อมูลใบรับเงินมัดจำจากฐานข้อมูล
      const depositReceipt = await DepositReceipt.findById(depositReceiptId)
        .populate('customer')
        .populate('product')
        .populate('branch')
        .populate('salesperson');

      if (!depositReceipt) {
        throw new Error(`Deposit receipt not found: ${depositReceiptId}`);
      }

      return await this.createDepositReceiptPdf(depositReceipt);

    } catch (error) {
      console.error('❌ Error creating deposit receipt PDF by ID:', error);
      throw error;
    }
  }

  /**
   * สร้างและส่ง PDF ใบรับเงินมัดจำทาง Email
   * @param {string} depositReceiptId - ID ของใบรับเงินมัดจำ
   * @param {Object} emailData - ข้อมูลการส่งอีเมล
   * @returns {Promise<Object>} ผลลัพธ์การส่งอีเมล
   */
  static async generateAndEmailDepositReceipt(depositReceiptId, emailData) {
    try {
      console.log('📧 Generating and emailing deposit receipt:', depositReceiptId);

      // สร้าง PDF
      const pdfResult = await this.createDepositReceiptPdfById(depositReceiptId);

      if (!pdfResult || !pdfResult.buffer) {
        throw new Error('Failed to generate PDF buffer');
      }

      // ส่งอีเมล
      const emailResult = await A4PDFController.sendPDFByEmail(
        emailData,
        pdfResult.buffer,
        pdfResult.fileName
      );

      return {
        success: emailResult.success,
        pdfGenerated: true,
        emailSent: emailResult.success,
        messageId: emailResult.messageId,
        filename: pdfResult.fileName,
        message: emailResult.success ? 'PDF generated and email sent successfully' : emailResult.message,
        error: emailResult.error
      };

    } catch (error) {
      console.error('❌ Error in generateAndEmailDepositReceipt:', error);

      return {
        success: false,
        pdfGenerated: false,
        emailSent: false,
        message: 'Failed to generate PDF or send email',
        error: error.message
      };
    }
  }

  /**
   * สร้างเอกสารที่เกี่ยวข้องทั้งหมด (ใบเสนอราคา, ใบเสร็จ/ใบกำกับภาษี)
   * @param {string} depositReceiptId - ID ของใบรับเงินมัดจำ
   * @param {Object} options - ตัวเลือกการสร้างเอกสาร
   * @returns {Promise<Object>} ผลลัพธ์การสร้างเอกสารทั้งหมด
   */
  static async createRelatedDocuments(depositReceiptId, options = {}) {
    console.log('📄 Creating related documents for deposit receipt:', depositReceiptId);

    try {
      // ดึงข้อมูลใบรับเงินมัดจำ
      const depositReceipt = await DepositReceipt.findById(depositReceiptId)
        .populate('customer')
        .populate('product')
        .populate('branch')
        .populate('salesperson');

      if (!depositReceipt) {
        throw new Error(`Deposit receipt not found: ${depositReceiptId}`);
      }

      const results = {
        depositReceipt: null,
        quotation: null,
        receipt: null,
        taxInvoice: null,
        invoice: null
      };

      // 1. สร้างใบรับเงินมัดจำ
      if (options.createDepositReceipt !== false) {
        results.depositReceipt = await this.createDepositReceiptPdf(depositReceipt);
        console.log('✅ Deposit receipt PDF created');
      }

      // 2. สร้างใบเสนอราคา (สำหรับขายผ่อน)
      if (depositReceipt.saleType === 'installment' && options.createQuotation !== false) {
        const quotationData = await this._convertToQuotationData(depositReceipt);
        // ใช้ QuotationPdfController หรือ A4PDFController
        // results.quotation = await QuotationPdfController.createQuotationPdf(quotationData);
        console.log('✅ Quotation PDF created (placeholder)');
      }

      // 3. สร้างใบเสร็จรับเงิน/ใบกำกับภาษี (สำหรับขายผ่อน)
      if (depositReceipt.saleType === 'installment' && options.createReceipt !== false) {
        const receiptData = await this._convertToReceiptData(depositReceipt);
        results.receipt = await A4PDFController.createReceiptPdf(receiptData);
        console.log('✅ Receipt/Tax Invoice PDF created');
      }

      return {
        success: true,
        results,
        message: 'Related documents created successfully'
      };

    } catch (error) {
      console.error('❌ Error creating related documents:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to create related documents'
      };
    }
  }

  /**
   * สร้างปุ่มนำทางไปหน้าขายสด/ขายผ่อน พร้อม sync ข้อมูล
   * @param {string} depositReceiptId - ID ของใบรับเงินมัดจำ
   * @param {string} saleType - ประเภทการขาย ('cash' หรือ 'installment')
   * @returns {Promise<Object>} ข้อมูลสำหรับ redirect และ sync
   */
  static async prepareNavigationData(depositReceiptId, saleType) {
    console.log('🔄 Preparing navigation data:', { depositReceiptId, saleType });

    try {
      // ดึงข้อมูลใบรับเงินมัดจำ (ไม่ต้อง populate เพราะเป็น embedded object)
      const depositReceipt = await DepositReceipt.findById(depositReceiptId);

      if (!depositReceipt) {
        throw new Error(`Deposit receipt not found: ${depositReceiptId}`);
      }

      console.log('🔍 Raw deposit receipt data:', {
        id: depositReceipt._id,
        receiptNumber: depositReceipt.receiptNumber,
        customer: depositReceipt.customer,
        product: depositReceipt.product,
        amounts: depositReceipt.amounts,
        saleType: depositReceipt.saleType,
        depositType: depositReceipt.depositType
      });

      const navigationData = {
        depositReceiptId: depositReceiptId,
        saleType: saleType,
        customer: {
          _id: depositReceipt.customer?._id || `customer_${depositReceiptId}`,
          name: depositReceipt.customer?.name,
          firstName: depositReceipt.customer?.firstName || depositReceipt.customer?.name?.split(' ')[1],
          lastName: depositReceipt.customer?.lastName || depositReceipt.customer?.name?.split(' ').slice(2).join(' '),
          prefix: depositReceipt.customer?.prefix || depositReceipt.customer?.name?.split(' ')[0],
          phone: depositReceipt.customer?.phone,
          email: depositReceipt.customer?.email,
          taxId: depositReceipt.customer?.taxId,
          address: depositReceipt.customer?.address,
          customerType: depositReceipt.customer?.customerType || 'individual'
        },
        product: {
          _id: depositReceipt.product?._id || `product_${depositReceiptId}`,
          id: depositReceipt.product?.id || depositReceipt.product?._id || `product_${depositReceiptId}`,
          name: depositReceipt.product?.name,
          brand: depositReceipt.product?.brand,
          model: depositReceipt.product?.model,
          price: depositReceipt.product?.price,
          imei: depositReceipt.product?.imei,
          category: depositReceipt.product?.category || 'mobile',
          inStock: depositReceipt.product?.inStock,
          branchCode: depositReceipt.product?.branchCode || depositReceipt.branchCode
        },
        amounts: {
          totalAmount: depositReceipt.amounts?.totalAmount || 0,
          depositAmount: depositReceipt.amounts?.depositAmount || 0,
          remainingAmount: depositReceipt.amounts?.remainingAmount || 0,
          shippingCost: depositReceipt.amounts?.shippingCost || 0
        },
        depositDate: depositReceipt.depositDate,
        receiptNumber: depositReceipt.receiptNumber || depositReceipt.documentNumber,
        notes: depositReceipt.notes,
        salesperson: {
          _id: depositReceipt.salesperson?._id,
          id: depositReceipt.salesperson?.id,
          name: depositReceipt.salesperson?.name
        },
        branch: {
          _id: depositReceipt.branch?._id,
          name: depositReceipt.branch?.name || depositReceipt.branchName,
          code: depositReceipt.branch?.code || depositReceipt.branchCode
        }
      };

      // กำหนด URL สำหรับ redirect
      let redirectUrl;
      if (saleType === 'cash') {
        redirectUrl = '/views/pattani/frontstore_pattani.html';
      } else if (saleType === 'installment') {
        redirectUrl = '/views/pattani/installment/step2/step2.html';
      } else {
        throw new Error('Invalid sale type');
      }

      console.log('🔗 Redirect URL:', redirectUrl);
      console.log('📤 Final navigation data being sent:', navigationData);

      return {
        success: true,
        redirectUrl,
        navigationData,
        message: 'Navigation data prepared successfully'
      };

    } catch (error) {
      console.error('❌ Error preparing navigation data:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to prepare navigation data'
      };
    }
  }

  // ===== PRIVATE METHODS =====

  /**
   * Normalize ข้อมูลใบรับเงินมัดจำ
   * @private
   */
  static async _normalizeDepositReceiptData(depositReceipt) {
    return {
      _id: depositReceipt._id,
      receiptNumber: depositReceipt.receiptNumber || 'ไม่ระบุ',
      depositDate: depositReceipt.depositDate || new Date(),
      saleType: depositReceipt.saleType || 'cash',
      depositType: depositReceipt.depositType || 'online',

      // ข้อมูลลูกค้า
      customer: {
        name: depositReceipt.customer?.name || 'ไม่ระบุ',
        phone: depositReceipt.customer?.phone || '',
        taxId: depositReceipt.customer?.taxId || '',
        address: depositReceipt.customer?.address || '',
        customerType: depositReceipt.customer?.customerType || 'individual'
      },

      // ข้อมูลสินค้า
      product: {
        name: depositReceipt.product?.name || 'ไม่ระบุ',
        brand: depositReceipt.product?.brand || '',
        model: depositReceipt.product?.model || '',
        price: depositReceipt.product?.price || 0,
        imei: depositReceipt.product?.imei || '',
        category: depositReceipt.product?.category || ''
      },

      // ข้อมูลจำนวนเงิน
      amounts: {
        totalAmount: depositReceipt.amounts?.totalAmount || 0,
        depositAmount: depositReceipt.amounts?.depositAmount || 0,
        remainingAmount: depositReceipt.amounts?.remainingAmount || 0
      },

      // ข้อมูลบริษัท
      company: {
        name: 'บริษัท 2 พี่น้อง โมบาย จำกัด'
      },

      // ข้อมูลสาขา
      branch: depositReceipt.branch || {
        name: 'สำนักงานใหญ่',
        code: '00000',
        address: '148/91 หมู่ที่ 6 ตำบลรูสะมิแล อำเภอปัตตานี จังหวัดปัตตานี 94000',
        taxId: '0945566000616',
        phone: '09-2427-0769'
      },

      // ข้อมูลพนักงานขาย
      salesperson: {
        name: depositReceipt.salesperson?.name || ''
      },

      notes: depositReceipt.notes || '',
      status: depositReceipt.status || 'pending'
    };
  }

  /**
   * สร้าง PDF ใบรับเงินมัดจำ
   * @private
   */
  static async _generateDepositReceiptPDF(data) {
    console.log('📄 Generating deposit receipt PDF...');

    return new Promise((resolve, reject) => {
      try {
        // ตรวจสอบฟอนต์
        if (!fs.existsSync(CONFIG.font.path)) {
          console.error(`❌ Font not found: ${CONFIG.font.path}`);
          return reject(new Error(`Font not found: ${CONFIG.font.path}`));
        }

        // สร้าง PDF document
        const doc = new PDFDocument({
          size: CONFIG.page.size,
          margins: { top: 20, bottom: 40, left: 40, right: 40 },
          autoFirstPage: true
        });

        const { width: W, height: H } = doc.page;
        const margins = doc.page.margins;
        const bodyW = W - margins.left - margins.right;

        // Buffer
        const chunks = [];
        doc.on('data', chunks.push.bind(chunks));
        doc.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const fileName = `deposit-receipt-${data.receiptNumber || Date.now()}.pdf`;
          resolve({ buffer, fileName });
        });
        doc.on('error', (err) => {
          console.error('Deposit Receipt PDF stream error:', err);
          reject(err);
        });

        // ลงทะเบียนฟอนต์
        doc.registerFont(CONFIG.font.name, CONFIG.font.path);
        if (fs.existsSync(CONFIG.font.boldPath)) {
          doc.registerFont(CONFIG.font.boldName, CONFIG.font.boldPath);
        }
        doc.font(CONFIG.font.name);

        // วาด PDF
        let y = margins.top;

        // 1. Header
        y = this._drawHeader(doc, data, margins, W, y);

        // 2. Document Info
        y = this._drawDocumentInfo(doc, data, margins, bodyW, y + 10);

        // 3. Customer Info
        y = this._drawCustomerInfo(doc, data, margins, bodyW, y + 15);

        // 4. Product Info
        y = this._drawProductInfo(doc, data, margins, bodyW, y + 15);

        // 5. Amount Summary
        y = this._drawAmountSummary(doc, data, margins, bodyW, y + 15);

        // 6. Amount in Words
        y = this._drawAmountInWords(doc, data, margins, bodyW, y + 15);

        // 7. Notes
        if (data.notes) {
          y = this._drawNotes(doc, data, margins, bodyW, y + 15);
        }

        // 8. Signatures
        y = this._drawSignatures(doc, data, margins, bodyW, y + 30);

        // 9. Footer
        this._drawFooter(doc, margins, W, H);

        doc.end();

      } catch (err) {
        console.error('Error generating deposit receipt PDF:', err);
        reject(err);
      }
    });
  }

  /**
   * วาดหัวเอกสาร
   * @private
   */
  static _drawHeader(doc, data, margins, pageW, startY) {
    const fullW = pageW - margins.left - margins.right;
    const logoW = CONFIG.sizes.logo.w;
    let logoH = 60;

    // โลโก้
    const logoPath = path.join(__dirname, '..', '..', 'Logo', 'Logo2png.png');
    if (fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, margins.left, startY, { width: logoW });
      } catch (logoError) {
        console.warn('⚠️ Cannot load logo:', logoError.message);
      }
    }

    // ชื่อเอกสาร
    const titleText = 'ใบรับเงินมัดจำ';
    const titleSize = CONFIG.sizes.heading1;

    doc.font(CONFIG.font.boldName || CONFIG.font.name)
       .fontSize(titleSize)
       .fillColor(CONFIG.color.primaryBlue);

    const titleW = doc.widthOfString(titleText) || titleText.length * 10;
    doc.text(titleText, margins.left + fullW - titleW, startY + 30);

    // ข้อมูลบริษัท
    const compX = margins.left + logoW + 10;
    const compW = fullW - logoW - titleW - 20;

    const lines = [
      { text: data.company?.name || 'บริษัท 2 พี่น้อง โมบาย จำกัด',
        opts: { font: CONFIG.font.boldName || CONFIG.font.name, fontSize: CONFIG.sizes.heading2 } },
      { text: `สาขา: ${data.branch.name} รหัสสาขา ${data.branch.code || '-'}`,
        opts: { font: CONFIG.font.name, fontSize: CONFIG.sizes.textBody } },
      { text: data.branch.address,
        opts: { font: CONFIG.font.name, fontSize: CONFIG.sizes.textBody } },
      { text: `เลขประจำตัวผู้เสียภาษีอากร ${data.branch.taxId || '0945566000616'}`,
        opts: { font: CONFIG.font.name, fontSize: CONFIG.sizes.textBody } },
      { text: `โทร: ${data.branch.phone || '09-2427-0769'}`,
        opts: { font: CONFIG.font.name, fontSize: CONFIG.sizes.textBody } }
    ];

    let y = startY;
    lines.forEach(({ text, opts }) => {
      doc.font(opts.font).fontSize(opts.fontSize).fillColor(CONFIG.color.textDark)
         .text(text, compX, y, { width: compW, align: 'left' });
      y += doc.currentLineHeight(true) * CONFIG.sizes.lineSpacing;
    });

    return Math.max(startY + logoH, y) + 10;
  }

  /**
   * วาดข้อมูลเอกสาร
   * @private
   */
  static _drawDocumentInfo(doc, data, margins, bodyW, startY) {
    const leftColX = margins.left;
    const leftColW = bodyW * 0.5;
    const rightColX = margins.left + bodyW * 0.5 + 10;
    const rightColW = bodyW * 0.5 - 10;

    let y = startY;

    // วาดข้อมูลเอกสาร
    const docFields = [
      { label: 'เลขที่ใบรับเงินมัดจำ:', value: data.receiptNumber },
      { label: 'วันที่:', value: formatThaiDate(data.depositDate) },
      { label: 'ประเภทการมัดจำ:', value: data.depositType === 'preorder' ? 'Pre-order' : 'มัดจำออนไลน์' },
      { label: 'ประเภทการขาย:', value: data.saleType === 'cash' ? 'ขายสด' : 'ขายผ่อน' }
    ];

    docFields.forEach((field, index) => {
      const colX = index % 2 === 0 ? leftColX : rightColX;
      const colW = index % 2 === 0 ? leftColW : rightColW;
      const fieldY = y + Math.floor(index / 2) * 20;

      doc.font(CONFIG.font.boldName || CONFIG.font.name)
         .fontSize(CONFIG.sizes.textBody)
         .fillColor(CONFIG.color.textDark)
         .text(field.label, colX, fieldY, { width: 120 });

      doc.font(CONFIG.font.name)
         .text(field.value, colX + 120, fieldY, { width: colW - 120 });
    });

    return y + Math.ceil(docFields.length / 2) * 20 + 10;
  }

  /**
   * วาดข้อมูลลูกค้า
   * @private
   */
  static _drawCustomerInfo(doc, data, margins, bodyW, startY) {
    let y = startY;

    // หัวข้อ
    doc.font(CONFIG.font.boldName || CONFIG.font.name)
       .fontSize(CONFIG.sizes.heading3)
       .fillColor(CONFIG.color.textDark)
       .text('ข้อมูลลูกค้า', margins.left, y);

    y += 25;

    // ข้อมูลลูกค้า
    const customerFields = [
      { label: 'ชื่อลูกค้า:', value: data.customer.name },
      { label: 'เบอร์โทรศัพท์:', value: data.customer.phone || '-' },
      { label: 'เลขประจำตัวผู้เสียภาษี:', value: data.customer.taxId || '-' },
      { label: 'ที่อยู่:', value: data.customer.address || '-' }
    ];

    customerFields.forEach(field => {
      doc.font(CONFIG.font.name)
         .fontSize(CONFIG.sizes.textBody)
         .fillColor(CONFIG.color.textDark)
         .text(field.label, margins.left, y, { width: 150 });

      doc.text(field.value, margins.left + 150, y, { width: bodyW - 150 });
      y += 20;
    });

    return y;
  }

  /**
   * วาดข้อมูลสินค้า
   * @private
   */
  static _drawProductInfo(doc, data, margins, bodyW, startY) {
    let y = startY;

    // หัวข้อ
    doc.font(CONFIG.font.boldName || CONFIG.font.name)
       .fontSize(CONFIG.sizes.heading3)
       .fillColor(CONFIG.color.textDark)
       .text('ข้อมูลสินค้า', margins.left, y);

    y += 25;

    // ข้อมูลสินค้า
    const productFields = [
      { label: 'ชื่อสินค้า:', value: data.product.name },
      { label: 'ยี่ห้อ:', value: data.product.brand || '-' },
      { label: 'รุ่น:', value: data.product.model || '-' },
      { label: 'IMEI:', value: data.product.imei || '-' },
      { label: 'ราคา:', value: `${ensureNumberData(data.product.price).toLocaleString()} บาท` }
    ];

    productFields.forEach(field => {
      doc.font(CONFIG.font.name)
         .fontSize(CONFIG.sizes.textBody)
         .fillColor(CONFIG.color.textDark)
         .text(field.label, margins.left, y, { width: 100 });

      doc.text(field.value, margins.left + 100, y, { width: bodyW - 100 });
      y += 20;
    });

    return y;
  }

  /**
   * วาดสรุปจำนวนเงิน
   * @private
   */
  static _drawAmountSummary(doc, data, margins, bodyW, startY) {
    let y = startY;

    // กรอบสรุปยอด
    const summaryW = 250;
    const summaryX = margins.left + bodyW - summaryW;
    const summaryH = 80;

    doc.rect(summaryX, y, summaryW, summaryH).stroke();

    // หัวข้อ
    doc.font(CONFIG.font.boldName || CONFIG.font.name)
       .fontSize(CONFIG.sizes.heading3)
       .fillColor(CONFIG.color.textDark)
       .text('สรุปจำนวนเงิน', summaryX + 10, y + 8);

    y += 25;

    // รายละเอียดยอด
    const amountFields = [
      { label: 'ราคารวม:', value: `${ensureNumberData(data.amounts.totalAmount).toLocaleString()} บาท` },
      { label: 'เงินมัดจำ:', value: `${ensureNumberData(data.amounts.depositAmount).toLocaleString()} บาท` },
      { label: 'คงเหลือ:', value: `${ensureNumberData(data.amounts.remainingAmount).toLocaleString()} บาท` }
    ];

    amountFields.forEach(field => {
      doc.font(CONFIG.font.name)
         .fontSize(CONFIG.sizes.textBody)
         .fillColor(CONFIG.color.textDark)
         .text(field.label, summaryX + 10, y, { width: 80 });

      doc.text(field.value, summaryX + 90, y, { width: 150, align: 'right' });
      y += 15;
    });

    return startY + summaryH + 10;
  }

  /**
   * วาดจำนวนเงินตัวอักษร
   * @private
   */
  static _drawAmountInWords(doc, data, margins, bodyW, startY) {
    const boxH = 25;
    const boxY = startY;

    // กรอบ
    doc.rect(margins.left, boxY, bodyW, boxH).stroke();

    // ข้อความ
    const amountInWords = toThaiBahtText(data.amounts.depositAmount);
    doc.font(CONFIG.font.name)
       .fontSize(CONFIG.sizes.textBody)
       .fillColor(CONFIG.color.textDark)
       .text(`จำนวนเงิน (ตัวหนังสือ): ${amountInWords}`, margins.left + 10, boxY + 8);

    return boxY + boxH + 10;
  }

  /**
   * วาดหมายเหตุ
   * @private
   */
  static _drawNotes(doc, data, margins, bodyW, startY) {
    let y = startY;

    doc.font(CONFIG.font.boldName || CONFIG.font.name)
       .fontSize(CONFIG.sizes.textBody)
       .fillColor(CONFIG.color.textDark)
       .text('หมายเหตุ:', margins.left, y);

    y += 20;

    doc.font(CONFIG.font.name)
       .fontSize(CONFIG.sizes.textBody)
       .fillColor(CONFIG.color.textDark)
       .text(data.notes, margins.left, y, { width: bodyW });

    return y + 30;
  }

  /**
   * วาดลายเซ็น
   * @private
   */
  static _drawSignatures(doc, data, margins, bodyW, startY) {
    const sigBlockH = 60;
    const colW = bodyW / 2;
    const sigLineW = colW * 0.7;
    const sigLineXOffset = (colW - sigLineW) / 2;
    const lineY = startY + 40;

    // ลายเซ็นลูกค้า
    const customerX = margins.left;
    doc.moveTo(customerX + sigLineXOffset, lineY)
       .lineTo(customerX + sigLineXOffset + sigLineW, lineY)
       .strokeColor(CONFIG.color.sigLine)
       .stroke();

    doc.font(CONFIG.font.boldName || CONFIG.font.name)
       .fontSize(CONFIG.sizes.textLabel)
       .fillColor(CONFIG.color.textDark)
       .text('ลายเซ็นผู้รับเงิน', customerX, lineY + 10, { width: colW, align: 'center' });

    doc.font(CONFIG.font.name)
       .fontSize(CONFIG.sizes.textSmall)
       .fillColor(CONFIG.color.textLight)
       .text('Customer Signature', customerX, lineY + 25, { width: colW, align: 'center' });

    // ลายเซ็นพนักงาน
    const salespersonX = margins.left + colW;
    doc.moveTo(salespersonX + sigLineXOffset, lineY)
       .lineTo(salespersonX + sigLineXOffset + sigLineW, lineY)
       .strokeColor(CONFIG.color.sigLine)
       .stroke();

    doc.font(CONFIG.font.boldName || CONFIG.font.name)
       .fontSize(CONFIG.sizes.textLabel)
       .fillColor(CONFIG.color.textDark)
       .text('ลายเซ็นพนักงานขาย', salespersonX, lineY + 10, { width: colW, align: 'center' });

    doc.font(CONFIG.font.name)
       .fontSize(CONFIG.sizes.textSmall)
       .fillColor(CONFIG.color.textLight)
       .text('Salesperson', salespersonX, lineY + 25, { width: colW, align: 'center' });

    return startY + sigBlockH;
  }

  /**
   * วาดส่วนท้าย
   * @private
   */
  static _drawFooter(doc, margins, pageW, pageH) {
    const footerY = pageH - margins.bottom + 10;
    const footerText = 'ขอบคุณที่ใช้บริการ - Thank you for your business';

    doc.font(CONFIG.font.name)
       .fontSize(CONFIG.sizes.textSmall)
       .fillColor(CONFIG.color.textLight)
       .text(footerText, margins.left, footerY, {
         width: pageW - margins.left - margins.right,
         align: 'center'
       });
  }

  /**
   * แปลงข้อมูลใบรับเงินมัดจำเป็นข้อมูลใบเสนอราคา
   * @private
   */
  static async _convertToQuotationData(depositReceipt) {
    return {
      _id: depositReceipt._id,
      quotationNumber: `QT-${depositReceipt.receiptNumber}`,
      issueDate: depositReceipt.depositDate,
      customer: depositReceipt.customer,
      items: [{
        description: depositReceipt.product?.name || 'สินค้า',
        quantity: 1,
        unitPrice: depositReceipt.product?.price || 0,
        amount: depositReceipt.product?.price || 0,
        imei: depositReceipt.product?.imei
      }],
      subTotal: depositReceipt.product?.price || 0,
      docFee: 500,
      grandTotal: (depositReceipt.product?.price || 0) + 500,
      company: depositReceipt.company,
      branch: depositReceipt.branch,
      salesperson: depositReceipt.salesperson,
      documentType: 'QUOTATION'
    };
  }

  /**
   * แปลงข้อมูลใบรับเงินมัดจำเป็นข้อมูลใบเสร็จ/ใบกำกับภาษี
   * @private
   */
  static async _convertToReceiptData(depositReceipt) {
    return {
      _id: depositReceipt._id,
      order_number: `RE-${depositReceipt.receiptNumber}`,
      invoiceNo: `RE-${depositReceipt.receiptNumber}`,
      documentType: 'RECEIPT',
      saleDate: depositReceipt.depositDate,
      customer: depositReceipt.customer,
      items: [{
        description: `ค่าดาวน์ - ${depositReceipt.product?.name || 'สินค้า'}`,
        quantity: 1,
        unitPrice: depositReceipt.amounts?.depositAmount || 0,
        amount: depositReceipt.amounts?.depositAmount || 0,
        imei: depositReceipt.product?.imei
      }],
      subTotal: depositReceipt.amounts?.depositAmount || 0,
      docFee: 0,
      vatTotal: 0,
      grandTotal: depositReceipt.amounts?.depositAmount || 0,
      company: depositReceipt.company,
      branch: depositReceipt.branch,
      salesperson: depositReceipt.salesperson,
      taxType: 'no_vat'
    };
  }
}

module.exports = DepositReceiptPDFController;
