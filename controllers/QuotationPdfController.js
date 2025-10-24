/**
 * @file QuotationPdfController.js
 * @description Controller for creating minimalist-style PDF Quotations with a blue theme, including installment details.
 * @version 1.3.8
 * @date 2025-05-04
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// เพิ่ม import models เพื่อแก้ไขปัญหา Schema registration
try {
  require('../models/HR/Employee');
  require('../models/POS/BranchStock');
  require('../models/POS/BranchStockHistory');
} catch (err) {
  console.warn('⚠️ Model import failed:', err.message);
}

// --- Configuration ---
const CONFIG = {
  page: { size: 'A4', margin: 40 },
  font: {
    name: 'THSarabun', boldName: 'THSarabun-Bold',
    path: path.join(__dirname, '..', 'fonts', 'THSarabunNew.ttf'),
    boldPath: path.join(__dirname, '..', 'fonts', 'THSarabunNew Bold.ttf')
  },
  color: {
    primaryBlue: '#3498DB', textHeader: '#FFFFFF', textBlack: '#000000', // เปลี่ยนจาก #2C3E50 เป็น #000000 เพื่อให้เข้มขึ้น
    textDark: '#222222', // เปลี่ยนจาก #444444 เป็น #222222 เพื่อให้เข้มขึ้น
    textLight: '#555555', lineLight: '#E0E0E0', // เปลี่ยนจาก #777777 เป็น #555555 เพื่อให้เข้มขึ้น
    lineDark: '#CCCCCC', sigLine: '#888888', bgWhite: '#FFFFFF', bgAccent: '#3498DB', // เปลี่ยนจาก #AAAAAA เป็น #888888
   },
  sizes: {
    logo: { w: 145 }, // ลดลง 10% จาก 170
    heading1: 16, // เพิ่มจาก 16 เป็น 20
    heading2: 10, // เพิ่มจาก 12 เป็น 14
    heading3: 10, // เพิ่มจาก 12 เป็น 14
    textBody: 10, // เพิ่มจาก 11 เป็น 13
    textLabel: 10, // เพิ่มจาก 9 เป็น 11
    textSmall: 10, // เพิ่มจาก 8 เป็น 10
    tableHeader: 10, // เพิ่มจาก 10 เป็น 12
    tableRow: 10, // เพิ่มจาก 10 เป็น 12
    lineSpacing: 1.4 // เพิ่มจาก 1.3 เป็น 1.4 เพื่อให้ข้อความไม่แน่นเกินไป
  },
  layout: {
    tableCols: {
      no: 35,
      desc: 225,  // เพิ่มความกว้างเพื่อรวม IMEI ไว้ด้วย (ลดจาก 125 + 100)
      qty: 45,
      unit: 70,
      disc: 55,
      amt: 85
    }
  }
};

// --- Helpers ---
function ensureNumberData(value, fallback = 0) {
    const num = Number(value);
    return isNaN(num) ? fallback : num;
}
function ensureHeight(value, fallback = 10) {
    const num = Number(value);
    return isNaN(num) || num <= 0 ? fallback : num;
}

async function loadImageBuffer(url) {
  if (!url) {
    console.log('🖼️ loadImageBuffer: No URL provided');
    return null;
  }

  console.log('🖼️ loadImageBuffer called with:', typeof url, url.substring(0, 100) + (url.length > 100 ? '...' : ''));

  // --- 0) ถ้าเป็นไฟล์บนดิสก์ (absolute path หรือ path ในโฟลเดอร์ uploads) ---
  const filePath = path.normalize(url);
  if (fs.existsSync(filePath)) {
    console.log('🖼️ Found local file:', filePath);
    return fs.readFileSync(filePath);
  }

  // --- 0.1) ถ้าเป็นชื่อไฟล์ในโฟลเดอร์ uploads ของโปรเจกต์ ---
  const uploadFilePath = path.join(process.cwd(), 'uploads', path.basename(url));
  if (fs.existsSync(uploadFilePath)) {
    console.log('🖼️ Found upload file:', uploadFilePath);
    return fs.readFileSync(uploadFilePath);
  }

  // --- 1) Data URI ---
  if (url.startsWith('data:image')) {
    console.log('🖼️ Processing data URI, size:', url.length);
    try {
      const base64 = url.split(',')[1];
      if (!base64) {
        console.error('🖼️ Invalid data URI: no base64 data found');
        return null;
      }
      const buffer = Buffer.from(base64, 'base64');
      console.log('🖼️ Data URI converted to buffer, size:', buffer.length);
      return buffer;
    } catch (error) {
      console.error('🖼️ Error processing data URI:', error.message);
      return null;
    }
  }

  // --- 2) HTTP(S) URL ---
  if (/^https?:\/\//.test(url)) {
    const client = url.startsWith('https://') ? https : http;
    return new Promise(resolve => {
      client.get(url, res => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      }).on('error', () => resolve(null));
    });
  }

  // --- 3) โฟลเดอร์ public ใน project root ---
  const projectRoot = process.cwd();
  const relPath     = url.replace(/^\/+/, '');
  const tryPaths    = [
    path.join(projectRoot, 'public', relPath),
    path.join(projectRoot,         relPath),
  ];
  for (const p of tryPaths) {
    if (fs.existsSync(p)) {
      return fs.readFileSync(p);
    }
  }

  console.warn('loadImageBuffer: file not found at any of:\n' +
    tryPaths.map(p => `  • ${p}`).join('\n'));
  return null;
}

// สร้างฟังก์ชันช่วยสำหรับฟอร์แมตวันที่แบบไทยให้เป็นมาตรฐานเดียวกัน
function formatThaiDate(dateString) {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';

    // วัน เดือน พ.ศ.
    const day = date.getDate();
    const month = date.toLocaleDateString('th-TH', {month: 'long'});
    // ปี พ.ศ. (เพิ่ม 543 จาก ค.ศ.)
    const thaiYear = date.getFullYear() + 543;

    return `${day} ${month} ${thaiYear}`;
  } catch (e) {
    return '-';
  }
}

// ใช้ไลบรารี thai-baht-text (npm install thai-baht-text)
const bahtText = require('thai-baht-text');

function toThaiBahtText(n) {
  // จะคืนเป็น 'สามหมื่นแปดพันบาทถ้วน'
  return bahtText(n);
}

class QuotationPdfController {

  /**
   * สร้างเลขที่เอกสารใหม่ตามรูปแบบ (ใช้ฟังก์ชันจาก InvoiceReceiptController)
   * @param {string} prefix - คำนำหน้า (QT, INV, TX, RE)
   * @returns {Promise<string>} เลขที่เอกสาร
   */
  static async generateDocumentNumber(prefix = 'QT') {
    const DocumentNumberSystem = require('../utils/DocumentNumberSystem');

    switch (prefix) {
      case 'QT':
        return await DocumentNumberSystem.generateQuotationNumber();
      default:
        return await DocumentNumberSystem.generateQuotationNumber();
    }
  }

  /**
   * สร้างไฟล์ PDF ใบเสนอราคา
   * @param {object} order ข้อมูลออเดอร์
   * @returns {Promise<{buffer: Buffer, fileName: string}>} Promise ที่ resolve เป็น buffer ของ PDF และชื่อไฟล์
   */
  static async createQuotationPdf(order) {
      // Preload signatures directly from order
      order.customer    = order.customer    || {};
      order.salesperson = order.salesperson || {}; // Ensure salesperson object exists

      // โหลด signature ทั้ง 3 และโลโก้ประทับตรา
        console.log('🖋️ QuotationPDF Signature Data (Enhanced Debug):', {
    customer: order.customerSignature ? 'Data URL (' + order.customerSignature.substring(0, 50) + '...)' : (order.customerSignatureUrl ? 'URL (' + order.customerSignatureUrl.substring(0, 50) + '...)' : 'None'),
    salesperson: order.employeeSignature ? 'Data URL (' + order.employeeSignature.substring(0, 50) + '...)' : (order.salespersonSignatureUrl ? 'URL (' + order.salespersonSignatureUrl.substring(0, 50) + '...)' : 'None'),
    authorized: order.authorizedSignature ? 'Data URL (' + order.authorizedSignature.substring(0, 50) + '...)' : (order.authorizedSignatureUrl ? 'URL (' + order.authorizedSignatureUrl.substring(0, 50) + '...)' : 'None'),
    // เพิ่มการตรวจสอบ order structure
    hasCustomer: !!order.customer,
    hasSalesperson: !!order.salesperson,
    hasEmployee: !!order.employee,
    orderKeys: Object.keys(order || {})
  });

      // โหลด signatures พร้อม error handling
      let custBuf = null, salesBuf = null, authBuf = null, companyStampBuf = null;

      try {
        const [custResult, salesResult, authResult, stampResult] = await Promise.allSettled([
          loadImageBuffer(order.customerSignature || order.customerSignatureUrl).catch(() => null),
          loadImageBuffer(order.employeeSignature || order.salespersonSignatureUrl).catch(() => null),
          loadImageBuffer(order.authorizedSignature || order.authorizedSignatureUrl).catch(() => null),
          loadImageBuffer('/uploads/S__15892486-Photoroom.png').catch(() => null)
        ]);

        custBuf = custResult.status === 'fulfilled' ? custResult.value : null;
        salesBuf = salesResult.status === 'fulfilled' ? salesResult.value : null;
        authBuf = authResult.status === 'fulfilled' ? authResult.value : null;
        companyStampBuf = stampResult.status === 'fulfilled' ? stampResult.value : null;

        console.log('🖋️ Signature loading results:', {
          customer: custBuf ? 'OK' : 'Failed',
          salesperson: salesBuf ? 'OK' : 'Failed',
          authorized: authBuf ? 'OK' : 'Failed',
          companyStamp: companyStampBuf ? 'OK' : 'Failed'
        });

        // 🔍 Debug: แสดงข้อมูลลายเซ็นที่ส่งมาจาก Frontend
        console.log('🔍 QuotationPDF Raw signature data received:', {
          customerSignature: order.customerSignature ? order.customerSignature.substring(0, 100) + '...' : 'EMPTY',
          customerSignatureUrl: order.customerSignatureUrl || 'EMPTY',
          employeeSignature: order.employeeSignature ? order.employeeSignature.substring(0, 100) + '...' : 'EMPTY',
          salespersonSignatureUrl: order.salespersonSignatureUrl || 'EMPTY',
          authorizedSignature: order.authorizedSignature ? order.authorizedSignature.substring(0, 100) + '...' : 'EMPTY',
          authorizedSignatureUrl: order.authorizedSignatureUrl || 'EMPTY'
        });
      } catch (signatureError) {
        console.warn('⚠️ Error loading signatures (continuing without signatures):', signatureError.message);
        // ดำเนินการต่อแม้ว่าจะโหลด signature ไม่ได้
      }

      console.log('🖋️ QuotationPDF Signature Buffers:', {
        customer: custBuf ? 'OK' : 'NULL',
        salesperson: salesBuf ? 'OK' : 'NULL',
        authorized: authBuf ? 'OK' : 'NULL',
        companyStamp: companyStampBuf ? 'OK' : 'NULL'
      });

      // เก็บลง order เพื่อให้ _drawSignatures อ่านได้เลย
      order.customer.signature    = custBuf;
      order.salesperson.signature = salesBuf;
      order.authorizedSignature   = authBuf;
      order.companyStamp          = companyStampBuf;

    // ✅ FIX: ใช้ quotationNumber ที่ส่งมาจาก quotationController หรือสร้างใหม่
    const existingQuotationNo = order.quotationNumber || order.quotationNo || order.order_number;
    if (existingQuotationNo && existingQuotationNo !== 'undefined' && !existingQuotationNo.includes('undefined')) {
      order.quotationNo = existingQuotationNo;
      order.order_number = existingQuotationNo;
      order.quotationNumber = existingQuotationNo;
      console.log('📄 Using existing quotation number:', existingQuotationNo);
    } else {
      // 🔧 สร้างเลขเอกสารใหม่เมื่อไม่มี existing หรือเป็น undefined
      console.log('📄 No valid quotation number found, generating new one...');
      const newQuotationNo = await this.generateDocumentNumber('QT');
      order.quotationNo = newQuotationNo;
      order.order_number = newQuotationNo;
      order.quotationNumber = newQuotationNo;
      console.log('📄 Generated new quotation number:', newQuotationNo);
    }

    // 2.3 จากนั้นค่อยเข้าสู่ Promise เดิม
    return new Promise((resolve, reject) => {
      try {
        // --- Font Setup ---
        let boldFontPath = CONFIG.font.boldPath;
        let boldFontName = CONFIG.font.boldName;
        if (!fs.existsSync(CONFIG.font.path)) return reject(new Error(`Font not found: ${CONFIG.font.path}`));
        if (!fs.existsSync(boldFontPath)) {
          boldFontName = CONFIG.font.name; boldFontPath = CONFIG.font.path;
        }

        // // console.log("Initializing PDFDocument...");
        const doc = new PDFDocument({
          size: CONFIG.page.size,
          margins: { top: 20, bottom: 40, left: 40, right: 40 },
          autoFirstPage: true
        });
        // // console.log("PDFDocument initialized.");

        const { width: W, height: H } = doc.page;
        let margins = doc.page.margins;

        // Check margins object
        if (!margins || typeof margins.top !== 'number' || typeof margins.bottom !== 'number' || typeof margins.left !== 'number' || typeof margins.right !== 'number') {
             const defaultMargins = { top: 50, bottom: 50, left: 50, right: 50 };
             margins = {
                top: typeof margins?.top === 'number' ? margins.top : defaultMargins.top, bottom: typeof margins?.bottom === 'number' ? margins.bottom : defaultMargins.bottom,
                left: typeof margins?.left === 'number' ? margins.left : defaultMargins.left, right: typeof margins?.right === 'number' ? margins.right : defaultMargins.right,
             };
             if (typeof margins.top !== 'number' || typeof margins.bottom !== 'number' || typeof margins.left !== 'number' || typeof margins.right !== 'number') {
                return reject(new Error('Invalid page margins received and failed to construct valid margins.'));
             }
        }
        // Check W, H
        if (typeof W !== 'number' || typeof H !== 'number' || isNaN(W) || isNaN(H) || W <= 0 || H <= 0) {
             return reject(new Error(`Invalid page dimensions: Width=${W}, Height=${H}`));
        }
        const bodyW = W - margins.left - margins.right;
        if (isNaN(bodyW) || bodyW <= 0) {
            return reject(new Error(`Calculated invalid body width: ${bodyW}`));
        }

        // --- Buffer ---
        const chunks = [];
        doc.on('data', chunks.push.bind(chunks));
        doc.on('end', () => {
            const buffer = Buffer.concat(chunks);
            const qNum = order?.quotationNo || order?.order_number || order?._id || Date.now();
            // ถ้า qNum มี QT- อยู่แล้วให้ใช้เลย ถ้าไม่มีให้เพิ่ม QT-
            const fileName = qNum.toString().startsWith('QT-') ? `${qNum}.pdf` : `QT-${qNum}.pdf`;
            resolve({ buffer, fileName });
        });
        doc.on('error', (err) => { console.error('PDFKit stream error:', err); reject(err); });

        // --- Register Fonts ---
        doc.registerFont(CONFIG.font.name, CONFIG.font.path);
        doc.registerFont(boldFontName, boldFontPath);
        doc.font(CONFIG.font.name); // Set default

        // --- Drawing ---
        let currentY = margins.top;
        let previousY = -1;
        order = order || {};
        order.customer = order.customer || {};
        order.company = order.company || {};
        order.items = Array.isArray(order.items) ? order.items : [];

        // เลขที่เอกสารถูกสร้างไว้แล้วข้างนอก Promise
        // แปลงวันที่เป็นสตริงไทย
        order.issueDateFormatted = order.issueDate ? formatThaiDate(order.issueDate) : '-';
        // normalize items เพื่อให้มี description, quantity, unitPrice, discount, amount
        const rawItems = order.items;
        order.items = rawItems.map(i => {
  // จำนวน
  const qty = ensureNumberData(i.quantity, 1);

  // รองรับชื่อ field หลายแบบที่อาจลูกค้าส่งมา
  const down = ensureNumberData(
    i.downAmount    ??
    i.downPayment   ??
    i.down_amount
  );
  const termCount = ensureNumberData(
    i.termCount     ??
    i.term_count
  );
  const instAmount = ensureNumberData(
    i.installmentAmount     ??
    i.installment_amount
  );

  // ✅ FIX: ใช้ price จาก item โดยตรง (ไม่รวม docFee ในราคาสินค้า)
  const isDocumentFee = (i.name || i.description || '').toLowerCase().includes('ธรรมเนียม');

  let displayUnitPrice = 0;

  if (isDocumentFee) {
    // ถ้าเป็นค่าธรรมเนียมเอกสาร ใช้ราคาตามที่ระบุ
    displayUnitPrice = ensureNumberData(i.price) || ensureNumberData(i.unitPrice) || ensureNumberData(i.amount);
  } else {
    // ✅ FIX: สำหรับสินค้าปกติ ใช้ price หรือ sale_price โดยตรง (ไม่ใช้ราคาที่คำนวณแล้ว)
    displayUnitPrice = ensureNumberData(i.price) || ensureNumberData(i.sale_price) || ensureNumberData(i.unitPrice);

    // ✅ FIX: ถ้าไม่มีราคาสินค้า ให้คำนวณจาก down + installment แต่ไม่รวม docFee
    if (!displayUnitPrice) {
      displayUnitPrice = (down + termCount * instAmount) || 0;

      console.warn('⚠️ QuotationPDF: No item price found, calculated from installment:', {
        itemName: i.name,
        down: down,
        termCount: termCount,
        instAmount: instAmount,
        calculatedPrice: displayUnitPrice
      });
    }
  }

  const discount = ensureNumberData(i.discount);
  const amount   = displayUnitPrice * qty - discount;

  console.log('💰 QuotationPDF Item Price Debug (FIXED):', {
    itemName: i.name,
    price: i.price,        // ✅ ใช้ price เป็นหลัก
    sale_price: i.sale_price,
    unitPrice: i.unitPrice,
    displayUnitPrice: displayUnitPrice,
    isDocumentFee: isDocumentFee,
    finalAmount: amount,
    priorityOrder: 'price -> sale_price -> unitPrice'  // ✅ เปลี่ยนลำดับให้ price มาก่อน
  });

  return {
    description:       i.description    || i.name || '-',
    imei:              i.imei,
    quantity:          qty,
    unitPrice:         displayUnitPrice,
    totalPrice:        displayUnitPrice,
    downAmount:        down,
    termCount:         termCount,
    installmentAmount: instAmount,
    discount:          discount,
    amount:            amount,
   // ← เพิ่ม 2 ฟิลด์นี้ให้ PDFController คำนวณ VAT ได้
   taxRate:           ensureNumberData(i.taxRate, 0),
   taxType:           (typeof i.taxType === 'string' ? i.taxType : 'ไม่มี VAT')
  };
        });

        // --- คำนวณ Subtotal, VAT และ Grand Total ใหม่ตาม taxType ---

        // ฟังก์ชันดึงค่าธรรมเนียมเอกสารแบบเดียวกับ step4.html
        function getDocumentFee(order) {
          try {
            // 🔧 ใช้ค่า docFee จาก order โดยตรง (รองรับ 0 บาท)
            if (order.docFee !== undefined && order.docFee !== null) {
              return ensureNumberData(order.docFee);
            }

            // ดึงจาก step3Data (ถ้าส่งมาใน order)
            if (order.step3Data?.docFee !== undefined) {
              return ensureNumberData(order.step3Data.docFee);
            }

            // ⚠️ ไม่มี fallback - แสดง warning และใช้ค่า default 0
            console.warn('⚠️ QuotationPDF: DocFee not provided! Please ensure user enters document fee in step3.');
            return 0;
          } catch (error) {
            console.warn('⚠️ Error getting document fee, using default 500:', error);
            return 500;
          }
        }

        const docFee = getDocumentFee(order);
        const shipFee = ensureNumberData(order.shippingFee);

        console.log('💰 QuotationPDF Document Fee Calculation:', {
          orderDocFee: order.docFee,
          step3DocFee: order.step3Data?.docFee,
          fallbackDocFee: typeof localStorage !== 'undefined' ? localStorage.getItem('globalDocumentFee') : 'N/A',
          finalDocFee: docFee,
          orderType: 'QUOTATION',
          quotationNumber: order.quotationNo || order.order_number || order.quotationNumber,
          invoiceNumber: order.invoiceNumber || 'N/A'
        });

        // Debug: ตรวจสอบข้อมูล taxType ที่ได้รับ
        console.log('🔍 QuotationPDF Tax Debug:', {
          taxType: order.taxType,
          documentType: order.documentType,
          docFee: order.docFee,
          originalData: {
            taxType: order.taxType,
            vatAmount: order.vatAmount,
            docFee: order.docFee
          }
        });

        // คำนวณยอดเริ่มต้นจากรายการสินค้า
        let itemsSubtotal = order.items.reduce((sum, item) => sum + (item.amount || 0), 0);

        let vatTotal = 0;

        if (order.taxType === 'inclusive') {
          // ภาษีรวมในราคาแล้ว
          const totalBeforeTax = itemsSubtotal + docFee + shipFee;
          vatTotal = totalBeforeTax * 0.07 / 1.07;

          order.summary = order.summary || {};
          order.summary.beforeTax = totalBeforeTax - vatTotal;
          order.summary.tax = vatTotal;
          order.summary.netTotal = totalBeforeTax;
        } else if (order.taxType === 'exclusive' || order.taxType === 'vat') {
          // ภาษีแยกจากราคา
          vatTotal = (itemsSubtotal + docFee + shipFee) * 0.07;
          const totalBeforeTax = itemsSubtotal + docFee + shipFee;

          order.summary = order.summary || {};
          order.summary.beforeTax = totalBeforeTax;
          order.summary.tax = vatTotal;
          order.summary.netTotal = totalBeforeTax + vatTotal;
        } else {
          // ไม่มีภาษี
          vatTotal = 0;
          order.summary = order.summary || {};
          order.summary.beforeTax = itemsSubtotal + docFee + shipFee;
          order.summary.tax = vatTotal;
          order.summary.netTotal = order.summary.beforeTax;
        }

        order.vatTotal = vatTotal;
        order.grandTotal = order.summary.netTotal;

        console.log('💰 QuotationPDF Price Calculation (updated to match InvoicePDF):', {
          itemsSubtotal,
          docFee,
          shipFee,
          vatTotal,
          taxType: order.taxType,
          summary: order.summary,
          grandTotal: order.grandTotal
        });

        // เก็บค่า docFee ที่คำนวณแล้วเข้าไปใน order เพื่อให้ _drawItemsTable ใช้ได้
        order.docFee = docFee;

        // แปลงเป็นคำ - ✅ FIX: ตรวจสอบว่าไม่ใช่ NaN ก่อนแปลง
        if (!isNaN(order.summary.netTotal) && isFinite(order.summary.netTotal)) {
          order.amountInWords = toThaiBahtText(order.summary.netTotal);
        } else {
          console.error('⚠️ QuotationPDF: Cannot convert NaN to Thai Baht Text, using default');
          order.amountInWords = toThaiBahtText(0); // หรือใช้ค่า default อื่น
        }

        // Function to check Y advancement (moved inside for scope, but could be a static helper)
        function checkYAdvance(sectionName, newY) {
             if (typeof newY !== 'number' || isNaN(newY)) throw new Error(`Invalid Y value (NaN) from ${sectionName}.`);
             if (newY < previousY) console.error(`${sectionName} Y went backwards! Prev: ${previousY}, New: ${newY}`);
             else if (newY === previousY && sectionName !== 'Terms') console.warn(`${sectionName} did not advance Y. Prev: ${previousY}, New: ${newY}`);
             previousY = newY;
             return newY;
        }

        // // console.log(`Starting PDF Draw. Initial Y: ${currentY}`);

        // 1. Header
        currentY = this._drawHeader(doc, order, margins, W, currentY);
        currentY = checkYAdvance('Header', currentY);

        // 2. Customer/Quote Info (เพิ่มระยะห่างให้น้อยลง)
        currentY = this._drawCustomerAndQuoteInfo(doc, order, margins, bodyW, currentY);
        currentY = checkYAdvance('Customer/Quote Info', currentY); currentY += 5;

        // 3. Items Table
        if (order.items.length > 0) {
            currentY = this._drawItemsTable(doc, order, margins, bodyW, currentY, H);
            currentY += 10;

            // วาดส่วนสรุปยอดเงินทันทีหลังจากตาราง
            currentY += 10;
            const summaryY = currentY;

            // วาดตัวเลข Summary (Subtotal/VAT/Grand Total) ฝั่งขวา
            currentY = this._drawSummary(doc, order, margins, bodyW, summaryY);
            currentY += 10;

            // วาดกล่องคำไทยใต้ summary
            const boxW_th = bodyW * 0.6;
            const boxH_th = 25;
            const pad_th = 5;

            // วาดกรอบสีน้ำเงินสำหรับบล็อกคำไทย
            doc.rect(margins.left, currentY, boxW_th, boxH_th)
               .fill(CONFIG.color.bgAccent);
            // วาดข้อความคำไทย
            doc.fillColor(CONFIG.color.textHeader)
               .font(CONFIG.font.boldName)
               .fontSize(CONFIG.sizes.textBody)
               .text(
                 order.amountInWords,
                 margins.left + pad_th,
                 currentY + (boxH_th - CONFIG.sizes.textBody) / 2,
                 { width: boxW_th - pad_th * 2, align: 'left' }
               );

            currentY += boxH_th + 20;

            // --- คำนวณบล็อก "ลายเซ็น" แบบกระชับ ---
            const signaturesHeight = 50; // ลดจาก 65 เป็น 50
            const pageFooterHeight = 15; // ลดจาก 20 เป็น 15
            const termsHeight = 25; // ใช้ความสูงคงที่แบบกระชับ

            // 2) วาดลายเซ็นก่อน (ปรับเลื่อนลงให้พ้น summary)
            const signatureOffset = 40;   // ขยับบล็อก signature ลงอีก 40pt
            const sigY             = currentY + signatureOffset;
            this._drawSignatures(doc, order, margins, bodyW, sigY);

            // 3) หลัง signature เลื่อนลงเพิ่มอีกเพื่อเงื่อนไขไม่ชน
            const sigBlockH      = 68;    // ตรงกับ height ใน _drawSignatures
            const paddingBetween = 10;    // ระยะห่างมาตรฐาน
            const termsOffset    = 20;    // ขยับเงื่อนไขลงอีก 20pt
            const termsY         = sigY + sigBlockH + paddingBetween + termsOffset;
            this._drawTerms(doc, order, margins, bodyW, termsY);

            // 4) สุดท้าย วาด Page Footer และปิด PDF
            this._drawPageFooter(doc, margins, W, H);
            doc.end();

    } else {
      previousY = currentY;
    }

      } catch (err) {
        console.error(`Error in createQuotationPdf: ${err.message}\nStack: ${err.stack}`);
        reject(err);
      }
    });
  }

  // ===========================================
  // Drawing Helper Functions
  // ===========================================

  /** @private วาดส่วนหัว */
  static _drawHeader(doc, order, margins, pageW, startY) {
    const fullW    = pageW - margins.left - margins.right;
    const logoPath = path.join(__dirname, '..', 'Logo', 'Logo2png.png');
    const logoW    = CONFIG.sizes.logo.w;
    let   logoH    = 0;

    // 1) วาดโลโก้ฝั่งซ้ายสุด
    if (fs.existsSync(logoPath)) {
      try {
        const img = doc.openImage(logoPath);
        if (img && img.width && img.height) {
          logoH = (img.height * logoW) / img.width;
        } else {
          logoH = logoW * 0.6; // สัดส่วนประมาณ
        }
        doc.image(logoPath, margins.left, startY, { width: logoW });
      } catch (logoError) {
        console.warn('⚠️ ไม่สามารถโหลดโลโก้ได้:', logoError.message);
        logoH = 60; // ความสูงสำรอง
      }
    }

    // 2) วาด title "ใบเสนอราคา / QUOTATION" ชิดขวาสุด (เลื่อนลง 10px)
const titleText = 'ใบเสนอราคา / QUOTATION';
const titleFont = CONFIG.font.boldName;
const titleSize = CONFIG.sizes.heading1 + 2;
doc.font(titleFont).fontSize(titleSize);
const titleW = doc.widthOfString(titleText);

// เลื่อนลงอีก 10
const TITLE_OFFSET = 30;

doc.fillColor(CONFIG.color.primaryBlue)
   .text(
     titleText,
     margins.left + fullW - titleW,
     startY + TITLE_OFFSET,           // <-- ปรับตรงนี้
     { width: titleW, align: 'right' }
   );

    // 3) คำนวณพื้นที่ตรงกลาง ระหว่างโลโก้กับ title
    const padding = 10;
    const compX    = margins.left + logoW + padding;
    const compW    = fullW - logoW - padding - titleW - padding;

    // 4) สร้างบรรทัดข้อมูลบริษัท
    const branch = order.branch || {};
    const lines = [
      { text: order.company?.name || 'บริษัท 2 พี่น้อง โมบาย จำกัด',
        opts: { font: CONFIG.font.boldName, fontSize: CONFIG.sizes.heading1 - 2 } },
      ...(branch.name
        ? [{ text: `สาขา: ${branch.name} รหัสสาขา ${branch.code || '-'}`,
             opts: { font: CONFIG.font.name, fontSize: CONFIG.sizes.textBody } }]
        : []),
      ...(branch.address
        ? [{ text: branch.address, opts: { font: CONFIG.font.name, fontSize: CONFIG.sizes.textBody } }]
        : []),
      { text: `เลขประจำตัวผู้เสียภาษีอากร ${branch.taxId || '0945566000616'}`,
        opts: { font: CONFIG.font.name, fontSize: CONFIG.sizes.textBody } },
      { text: `โทร: ${branch.tel || '09-2427-0769'}`,
        opts: { font: CONFIG.font.name, fontSize: CONFIG.sizes.textBody } },
    ];

    // 5) วาดแต่ละบรรทัดในคอลัมน์ตรงกลาง ให้ชิดซ้าย (align:'left')
    let y = startY;
    lines.forEach(({ text, opts }) => {
      doc
        .font(opts.font)
        .fontSize(opts.fontSize)
        .fillColor(CONFIG.color.textDark)
        .text(text, compX, y, { width: compW, align: 'left' });
      y += doc.currentLineHeight(true) * CONFIG.sizes.lineSpacing;
    });

    // 6) คืนค่า Y ให้ส่วนถัดไปเริ่มใต้บล็อกนี้
    return Math.max(startY + logoH, y) + 10;
  }

  /** @private วาดข้อมูลลูกค้าและใบเสนอราคา */
  static _drawCustomerAndQuoteInfo(doc, order, margins, bodyW, startY) {
    const lineSpacing = CONFIG.sizes.lineSpacing; const leftColX = margins.left;
    const leftColW = bodyW * 0.55 - 10; const rightColX = margins.left + bodyW * 0.55 + 10;
    const rightColW = bodyW * 0.45 - 10; const labelW = 75;
    const valueIndent = 5;
    let leftY = startY; let rightY = startY;

// ใช้โครงสร้าง order.customer: name, taxId, address, phone
    const customerFields = [
      { label: 'ชื่อลูกค้า',       labelEn: 'Customer Name', value: order.customer.name    || '-' },
      { label: 'เลขที่ผู้เสียภาษีอากร', labelEn: 'Tax ID',        value: order.customer.taxId  || '-' },
      { label: 'ที่อยู่',           labelEn: 'Address',       value: order.customer.address|| '-' },
      { label: 'โทร.',             labelEn: 'Tel.',          value: order.customer.phone  || '-' }
    ];

    customerFields.forEach(field => {
        const fieldStartY = leftY;
        doc.font(CONFIG.font.boldName).fontSize(CONFIG.sizes.textBody).fillColor(CONFIG.color.textBlack);
        doc.text(field.label, leftColX, leftY, { width: labelW });
        let labelH1 = ensureHeight(doc.heightOfString(field.label, { width: labelW }) * 0.8);
        let currentLabelY = leftY + labelH1;
        doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.textLabel).fillColor(CONFIG.color.textLight);
        doc.text(field.labelEn, leftColX, currentLabelY, { width: labelW });
        let labelH2 = ensureHeight(doc.heightOfString(field.labelEn, { width: labelW }));
        const labelBlockHeight = (currentLabelY - fieldStartY) + labelH2;

        doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.textBody).fillColor(CONFIG.color.textDark);
        const valueX = leftColX + labelW + valueIndent; const valueW = leftColW - labelW - valueIndent;
        // ✅ FIX: แสดงข้อมูลที่ไม่ใช่ '-' หรือ empty
        const valueStr = field.value && field.value !== '-' ? String(field.value) : '-';
        doc.text(valueStr, valueX, fieldStartY, { width: valueW });
        const valueHeight = ensureHeight(doc.heightOfString(valueStr, { width: valueW }));
        leftY = fieldStartY + Math.max(labelBlockHeight, valueHeight) + (CONFIG.sizes.textBody * lineSpacing * 0.7);
    });

    const quoteFields = [
        {
          label:    'เลขที่',
          labelEn:  'Quotation No.',
          value:    (() => {
            // ✅ FIX: Debug และบังคับใช้ quotationNumber จาก backend เท่านั้น
            const quotationNum = order.quotationNumber || order.quotationNo;
            const orderNum = order.order_number || order.number;
            const contractId = order._id;

            console.log('🔍 QuotationPDF Debug - Number fields received:', {
              quotationNumber: order.quotationNumber,
              quotationNo: order.quotationNo,
              order_number: order.order_number,
              number: order.number,
              _id: order._id,
              selectedValue: quotationNum || orderNum || contractId || '-'
            });

            // ✅ FIX: ใช้เฉพาะ quotationNumber และ quotationNo เท่านั้น
            // ห้ามใช้ order.number หรือ order._id ที่อาจเป็น INST
            if (!quotationNum) {
              console.error('❌ QuotationPDF: Missing quotationNumber! Expected QT-YYMMDD-XXXX format');
              console.error('❌ Received order data:', {
                quotationNumber: order.quotationNumber,
                quotationNo: order.quotationNo,
                fallbackOrderNumber: orderNum,
                contractId: contractId
              });
            }
            return quotationNum || 'QT-ERROR-MISSING';
          })()
        },
        {
          label:    'วันที่',
          labelEn:  'Issue Date',
          value:    order.issueDateFormatted
                  || (order.issueDate
                      ? new Date(order.issueDate).toLocaleDateString('th-TH')
                      : '-')
        },
        { label: 'การชำระเงิน', labelEn: 'Credit Term', value: order.creditTerm || order.paymentMethod || 'เงินสด' },
        { label: 'พนักงานขาย',  labelEn: 'Salesman',    value: order.salesperson?.name || '-' }
    ];
    quoteFields.forEach(field => {
        const fieldStartY = rightY; const labelText = field.label + ' :';
        doc.font(CONFIG.font.boldName).fontSize(CONFIG.sizes.textBody).fillColor(CONFIG.color.textBlack);
        doc.text(labelText, rightColX, rightY, { width: labelW + 5 });
        let labelH1 = ensureHeight(doc.heightOfString(labelText, { width: labelW + 5 }) * 0.8);
        let currentLabelY = rightY + labelH1;
        doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.textLabel).fillColor(CONFIG.color.textLight);
        doc.text(field.labelEn, rightColX, currentLabelY, { width: labelW });
        let labelH2 = ensureHeight(doc.heightOfString(field.labelEn, { width: labelW }));
        const labelBlockHeight = (currentLabelY - fieldStartY) + labelH2;

        doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.textBody).fillColor(CONFIG.color.textDark);
        const valueX = rightColX + labelW + 5 + valueIndent; const valueW = rightColW - labelW - 5 - valueIndent;
        const valueStr = String(field.value); doc.text(valueStr, valueX, fieldStartY, { width: valueW });
        const valueHeight = ensureHeight(doc.heightOfString(valueStr, { width: valueW }));
        rightY = fieldStartY + Math.max(labelBlockHeight, valueHeight) + (CONFIG.sizes.textBody * lineSpacing * 0.7);
    });

    const bottomY = Math.max(leftY, rightY);
    if (isNaN(bottomY)) { console.error('bottomY in Customer/Quote Info is NaN!'); return startY + 120; }
    doc.moveTo(margins.left, bottomY + 5).lineTo(margins.left + bodyW, bottomY + 5).strokeColor(CONFIG.color.lineLight).lineWidth(0.5).stroke();
    return bottomY + 10;
  }

  /** @private วาดตารางรายการสินค้า */
  static _drawItemsTable(doc, order, margins, bodyW, startY, pageH) {
    const leftX = margins.left;
    const headerH = 30;
    // เอา rowH ตายตัวออก (ใช้คำนวณไดนามิกแทน)
    const cols = { ...CONFIG.layout.tableCols };
    let currentY = startY;

    // เอา padV/padH มาไว้ที่เดียว เพื่อใช้ทั้งใน header และ data rows
    const padH = 5;
    const defaultPadV = 4; // padding แนวตั้งขั้นต่ำ

    // --- Header row ---
    doc.rect(leftX, currentY, bodyW, headerH).fill(CONFIG.color.bgAccent);
    const headers = [
      { th: 'ลำดับ',            en: 'No',           key: 'no',    align: 'center' },
      { th: 'รายการ',           en: 'Description',  key: 'desc',  align: 'left'   },
      { th: 'จำนวน',            en: 'Quantity',     key: 'qty',   align: 'center' },
      { th: 'ราคา/หน่วย',       en: 'Unit Price',   key: 'unit',  align: 'right'  },
      { th: 'ส่วนลด',           en: 'Discount',     key: 'disc',  align: 'right'  },
      { th: 'จำนวนเงิน (บาท)',  en: 'Amount',       key: 'amt',   align: 'right'  }
    ];
    let currentX = leftX;
    const headerPaddingV = 5;
    const thY = currentY + headerPaddingV;
    const enY = thY + CONFIG.sizes.tableHeader * 0.9 + 2;
    doc.fillColor(CONFIG.color.textHeader);

    headers.forEach(h => {
      // วาดหัวตารางแถวบน (ไทย) เลื่อนเข้า padH แล้วลด width ลง 2*padH
      doc
        .font(CONFIG.font.boldName).fontSize(CONFIG.sizes.textBody)
        .text(
          h.th,
          currentX + padH,
          thY,
          { width: cols[h.key] - 2*padH, align: h.align }
        );
      // วาดหัวตารางแถวล่าง (Eng) เหมือนกัน
      doc
        .font(CONFIG.font.name).fontSize(CONFIG.sizes.textLabel)
        .text(
          h.en,
          currentX + padH,
          enY,
          { width: cols[h.key] - 2*padH, align: h.align }
        );
      currentX += cols[h.key];
    });

    currentY += headerH;
    doc.moveTo(leftX, currentY).lineTo(leftX + bodyW, currentY).strokeColor(CONFIG.color.lineDark).lineWidth(0.7).stroke();

    // --- Data rows ---
    doc.font(CONFIG.font.name)
       .fontSize(CONFIG.sizes.tableRow)
       .fillColor(CONFIG.color.textDark);

    order.items.forEach((item, i) => {
      // การคำนวณราคาที่แสดงในตาราง
      const qty = ensureNumberData(item.quantity, 1);
      const unitPrice = ensureNumberData(item.unitPrice || item.price || item.sale_price, 0);
      const discount = ensureNumberData(item.discount, 0);

      // ✅ FIX: แสดงราคาต่อหน่วยที่ถูกต้อง ไม่รวมค่าธรรมเนียมเอกสาร
      // ถ้าเป็นรายการค่าธรรมเนียมเอกสาร ให้แสดงราคาตามที่เป็น
      // ถ้าเป็นสินค้าทั่วไป ให้แสดงราคาจริงของสินค้า
      const displayUnitPrice = item.isDocumentFee ? unitPrice : (item.sale_price || item.price || unitPrice);
      const amount = (displayUnitPrice * qty) - discount;

      // ข้อความของรายการ
      const itemDescription = item.description || item.name || '-';
      const itemNo = (i + 1).toString();

      // 1. วัดความสูงของข้อความสินค้า + IMEI
      const desc = itemDescription;

      // วัดความสูงบรรทัดชื่อสินค้า
      doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.tableRow);
      const descW = cols.desc - 2 * padH; // คำนวณความกว้างแต่ยังไม่ตำแหน่ง X
      const descHeight = doc.heightOfString(desc, { width: descW });

      // วัดความสูง IMEI ถ้ามี
      let imeiHeight = 0;
      if (item.imei) {
        doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.textLabel);
        imeiHeight = doc.heightOfString(`IMEI: ${item.imei}`, { width: descW });
      }

      // รวมความสูง และเผื่อช่องว่างบน–ล่าง
      const contentH = descHeight + imeiHeight;
      const rowH = Math.max(26, contentH + defaultPadV * 2);

      // 2. วาดข้อมูล
      const y = currentY + (rowH - contentH) / 2;  // จัดกึ่งกลางแนวตั้ง

      let x = leftX;
      // วาดลำดับก่อน แล้วเลื่อนไปยังคอลัมน์ Description
      doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.tableRow).fillColor(CONFIG.color.textDark);
      doc.text(itemNo, x, y, { width: cols.no, align: 'center' });
      x += cols.no;

      // คำนวณตำแหน่งและความกว้างของ Description/IMEI หลังเลื่อนคอลัมน์ No แล้ว
      const descX = x + padH;

      // รายการ + IMEI ใต้ชื่อสินค้า
      // 1) วาดชื่อสินค้า
      doc
        .font(CONFIG.font.name)
        .fontSize(CONFIG.sizes.tableRow)
        .fillColor(CONFIG.color.textDark)
        .text(desc, descX, y, {
          width: descW,
          align: 'left'
        });

      // 2) ถ้ามี imei ให้ขึ้นบรรทัดใหม่ใต้ชื่อ
      if (item.imei) {
        const imeiY = y + descHeight;
        doc
          .font(CONFIG.font.name)
          .fontSize(CONFIG.sizes.textLabel)
          .fillColor(CONFIG.color.textLight)
          .text(`IMEI: ${item.imei}`, descX, imeiY, {
            width: descW,
            align: 'left'
          });
      }
      x += cols.desc;

      // จำนวน
      doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.tableRow).fillColor(CONFIG.color.textDark);
      doc.text(qty, x, y, { width: cols.qty, align: 'center' });
      x += cols.qty;

      // ราคา/หน่วย
      doc.text(displayUnitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 }), x, y, {
        width: cols.unit - padH, align: 'right'
      });
      x += cols.unit;

      // ส่วนลด
      doc.text(discount.toLocaleString('en-US', { minimumFractionDigits: 2 }), x, y, {
        width: cols.disc - padH, align: 'right'
      });
      x += cols.disc;

      // จำนวนเงิน
      doc.text(amount.toLocaleString('en-US', { minimumFractionDigits: 2 }), x, y, {
        width: cols.amt - padH, align: 'right'
      });

      // 3. เลื่อน currentY ตาม rowH และวาดเส้นขอบใต้
      currentY += rowH;
      doc.moveTo(leftX, currentY)
         .lineTo(leftX + bodyW, currentY)
         .strokeColor(CONFIG.color.lineLight)
         .lineWidth(0.5)
         .stroke();

      // ตรวจสอบการขึ้นหน้าใหม่
      if (currentY > pageH - 150) {
        currentY = this._checkPageBreak(doc, currentY, pageH, margins);
        // Note: _redrawTableHeader method doesn't exist, so we'll skip it for now
        // This means table headers won't be redrawn on new pages, but the PDF will still work
      }
    });

        // --- Document Fee row ---
    const docFeeForTable = ensureNumberData(order.docFee) || 0; // 🔧 ไม่มี fallback 500 - ใช้ 0 ถ้าไม่มีข้อมูล
    if (docFeeForTable > 0) {
      let x = leftX;
      const rowH = 26; // ใช้ความสูงปกติสำหรับแถวค่าธรรมเนียม
      const y = currentY + defaultPadV;

      // 1. No
      doc.text(order.items.length + 1, x, y, { width: cols.no, align: 'center' });
      x += cols.no;

      // 2. Description
      doc.text('ค่าธรรมเนียมเอกสาร', x + padH, y, {
        width: cols.desc - 2 * padH, align: 'left'
      });
      x += cols.desc;

      // 3. Quantity
      doc.text('1', x, y, { width: cols.qty, align: 'center' });
      x += cols.qty;

      // 4. Unit Price
      doc.text(
        docFeeForTable.toLocaleString('en-US', { minimumFractionDigits: 2 }),
        x, y,
        { width: cols.unit - padH, align: 'right' }
      );
      x += cols.unit;

      // 5. Discount
      doc.text('-', x, y, { width: cols.disc, align: 'right' });
      x += cols.disc;

      // 6. Amount
      doc.text(docFeeForTable.toLocaleString('en-US', { minimumFractionDigits: 2 }), x, y, {
        width: cols.amt - padH, align: 'right'
      });
      currentY += rowH;
      doc.moveTo(leftX, currentY)
         .lineTo(leftX + bodyW, currentY)
       .strokeColor(CONFIG.color.lineLight)
         .lineWidth(0.5)
       .stroke();
    }

    // --- Shipping Fee row (เฉพาะออนไลน์) ---
    const shipFee = ensureNumberData(order.shippingFee);
    if (order.pickupMethod === 'online' && shipFee > 0) {
        let x = leftX;
        const rowH = 26; // ใช้ความสูงปกติสำหรับแถวค่าจัดส่ง
        const y = currentY + defaultPadV;

        // 1. ลำดับ
        doc.text(order.items.length + 1 + (docFeeForTable>0?1:0), x, y, { width: cols.no, align: 'center' });
        x += cols.no;

        // 2. คำอธิบาย
        doc.text('ค่าจัดส่ง', x + padH, y, { width: cols.desc - 2*padH, align: 'left' });
        x += cols.desc;

        // 3. จำนวน
        doc.text('1', x, y, { width: cols.qty, align: 'center' });
        x += cols.qty;

        // 4. ราคา/หน่วย
        doc.text(shipFee.toLocaleString('en-US', { minimumFractionDigits: 2 }), x, y, {
          width: cols.unit - padH, align: 'right'
        });
        x += cols.unit;

        // 5. ส่วนลด
        doc.text('-', x, y, { width: cols.disc, align: 'right' });
        x += cols.disc;

        // 6. จำนวนเงิน (บาท)
        doc.text(shipFee.toLocaleString('en-US', { minimumFractionDigits: 2 }), x, y, {
          width: cols.amt - padH, align: 'right'
        });

        currentY += rowH;
        doc.moveTo(leftX, currentY)
           .lineTo(leftX + bodyW, currentY)
           .strokeColor(CONFIG.color.lineLight)
           .lineWidth(0.5)
           .stroke();
      }

    return currentY;
  }

   /** @private วาดส่วนสรุปยอดรวม */
  static _drawSummary(doc, order, margins, bodyW, startY) {
    console.log('📊 Drawing summary section...');

    const rightAlign = margins.left + bodyW;
    const lineHeight = 18;
    const summaryWidth = 200;
    let currentY = startY;

    // 🔧 FIX: ใช้ข้อมูลจาก order.summary ที่คำนวณแล้วแทนการคำนวณใหม่
    console.log('💰 Using pre-calculated summary data:', {
      orderSummary: order.summary,
      orderVatTotal: order.vatTotal,
      orderGrandTotal: order.grandTotal
    });

    // ✅ FIX: แยกคำนวณสินค้าและค่าธรรมเนียมเอกสาร
    const regularItems = order.items.filter(item => !item.isDocumentFee);
    const docFeeItems = order.items.filter(item => item.isDocumentFee);

    // คำนวณยอดรวมสินค้าจริง (ไม่รวมค่าธรรมเนียม)
    const subtotal = Array.isArray(regularItems)
      ? regularItems.reduce((sum, item) => sum + (parseFloat(item.totalPrice) || parseFloat(item.amount) || 0), 0)
      : 0;

    // ค่าธรรมเนียมเอกสาร - ใช้จาก items แทนการ double count
    const docFee = docFeeItems.length > 0
      ? docFeeItems.reduce((sum, item) => sum + (parseFloat(item.totalPrice) || parseFloat(item.amount) || 0), 0)
      : (parseFloat(order.docFee) || 0);

    // ส่วนลด
    const discount = parseFloat(order.summary?.discount) || 0;

    // ยอดหลังหักส่วนลด
    const afterDiscount = subtotal + docFee - discount;

    console.log('💰 QuotationPDF Price Calculation (updated to fix double docFee):', {
      regularItemsCount: regularItems.length,
      docFeeItemsCount: docFeeItems.length,
      itemsSubtotal: subtotal,
      docFee: docFee,
      afterDiscount: afterDiscount,
      regularItems: regularItems.map(i => ({ name: i.description || i.name, amount: i.totalPrice || i.amount })),
      docFeeItems: docFeeItems.map(i => ({ name: i.description || i.name, amount: i.totalPrice || i.amount }))
    });

    // 🔧 FIX: ใช้ข้อมูลจาก order.summary หรือ step3 data แทนการคำนวณใหม่
    let vatAmount = parseFloat(order.summary?.tax) || parseFloat(order.vatAmount) || parseFloat(order.vatTotal) || 0;
    let finalTotal = parseFloat(order.summary?.netTotal) || parseFloat(order.totalWithTax) || parseFloat(order.grandTotal) || afterDiscount;

    // 🔧 FIX: ปัดเศษ VAT ให้แสดง 2 ตำแหน่งเท่านั้น
    vatAmount = Math.round(vatAmount * 100) / 100;
    finalTotal = Math.round(finalTotal * 100) / 100;

    // 🔧 FIX: หากไม่มี summary และไม่มี step3 data ให้คำนวณตามเดิม (fallback)
    if (!order.summary?.netTotal && !order.totalWithTax && !order.grandTotal && !order.vatAmount) {
      console.warn('⚠️ No pre-calculated summary or step3 tax data found, calculating manually...');
      if (order.taxType === 'inclusive') {
        // ราคารวมภาษีแล้ว - แยกภาษีออก
        vatAmount = Math.round((afterDiscount / 1.07) * 0.07 * 100) / 100;
        finalTotal = afterDiscount; // ราคาเดิมคือราคารวมภาษีแล้ว
      } else if (order.taxType === 'exclusive' || order.taxType === 'vat') {
        // ราคาไม่รวมภาษี - เพิ่มภาษี 7%
        vatAmount = Math.round(afterDiscount * 0.07 * 100) / 100;
        finalTotal = Math.round((afterDiscount + vatAmount) * 100) / 100;
      } else {
        // ไม่มีภาษี
        vatAmount = 0;
        finalTotal = afterDiscount;
      }
    }

    // 🔧 FIX: ตรวจสอบว่า finalTotal รวม VAT แล้วหรือยัง
    if (vatAmount > 0 && order.taxType === 'exclusive') {
      // ถ้าเป็น exclusive และมี VAT แต่ finalTotal ยังไม่รวม VAT
      const expectedTotal = Math.round((afterDiscount + vatAmount) * 100) / 100;
      if (Math.abs(finalTotal - expectedTotal) > 0.01) {
        console.log('🔧 Adjusting finalTotal to include VAT:', {
          originalFinalTotal: finalTotal,
          afterDiscount,
          vatAmount,
          adjustedFinalTotal: expectedTotal
        });
        finalTotal = expectedTotal;
      }
    }

    // สร้าง summary data
    const summaryItems = [
      { label: 'รวมเงิน', value: subtotal, format: 'currency' },
      { label: 'ค่าธรรมเนียมเอกสาร', value: docFee, format: 'currency' },
      { label: 'ส่วนลด', value: discount, format: 'currency' },
      { label: 'ยอดรวมหลังหักส่วนลด', value: afterDiscount, format: 'currency', separator: true }
    ];

    // เพิ่มภาษีถ้ามี
    if (vatAmount > 0) {
      summaryItems.push({
        label: 'ภาษีมูลค่าเพิ่ม 7%',
        value: vatAmount,
        format: 'currency'
      });
    }

    // ราคารวมทั้งหมด (สุดท้าย)
    summaryItems.push({
      label: 'ราคารวมทั้งหมด',
      value: finalTotal,
      format: 'currency',
      bold: true,
      separator: true
    });

    console.log('💰 Summary calculation:', {
      subtotal,
      docFee,
      discount,
      afterDiscount,
      vatAmount,
      finalTotal,
      taxType: order.taxType
    });

    // วาดรายการสรุป
    summaryItems.forEach((item, index) => {
      if (item.separator && index > 0) {
        currentY += 5;
        doc.moveTo(rightAlign - summaryWidth, currentY)
           .lineTo(rightAlign, currentY)
           .stroke();
        currentY += 10;
      }

      const fontSize = item.bold ? 12 : 10;
      const fontWeight = item.bold ? 'bold' : 'normal';

      // ป้ายกำกับ
      doc.font('./fonts/THSarabunNew.ttf')
         .fontSize(fontSize)
         .text(item.label, rightAlign - summaryWidth, currentY, {
           width: summaryWidth - 80,
           align: 'left'
         });

      // จำนวนเงิน
      const valueText = item.format === 'currency'
        ? `฿${item.value.toLocaleString('th-TH', {minimumFractionDigits: 2})}`
        : item.value.toString();

      doc.font(fontWeight === 'bold' ? './fonts/THSarabunNew Bold.ttf' : './fonts/THSarabunNew.ttf')
         .text(valueText, rightAlign - 75, currentY, {
           width: 75,
           align: 'right'
         });

      currentY += lineHeight;
    });

    // เส้นขีดใต้สุดท้าย
    currentY += 5;
    doc.moveTo(rightAlign - summaryWidth, currentY)
       .lineTo(rightAlign, currentY)
       .lineWidth(2)
       .stroke()
       .lineWidth(1);

    return currentY + 20;
  }

  /** @private คำนวณความสูงของส่วนเงื่อนไข */
  static _getTermsHeight(doc, order, bodyW) {
    // คืนค่าความสูงคงที่แบบกระชับ
    return 25; // ความสูงคงที่สำหรับข้อความเงื่อนไขแบบใหม่
  }

  /** @private วาดส่วนลายเซ็น */
  static _drawSignatures(doc, order, margins, bodyW, startY) {
    const sigBlockH = 68; // ลดจาก 70 เป็น 68 เพื่อไม่ให้หลุดหน้า
    const colW = bodyW / 3;
    const sigLineW = colW * 0.8;
    const sigLineXOffset = (colW - sigLineW) / 2;
    const lineY = startY + 18; // ลดจาก 20 เป็น 18
    const imgH = 45; // คงเดิม
    const imgPad = 6; // ลดจาก 8 เป็น 6

    const colsData = [
      { label: 'ลูกค้า',        labelEn: 'Customer Signature',   key: 'customer.signature' },
      { label: 'พนักงานขาย',     labelEn: 'Salesperson',          key: 'salesperson.signature' },
      { label: 'ผู้อนุมัติ',      labelEn: 'Authorized Signature', key: 'companyStamp' }
    ];

    const currentDateThai = formatThaiDate(new Date().toISOString()); // วันที่ปัจจุบัน

    colsData.forEach((col, i) => {
      const x0 = margins.left + colW * i;
      const sigBuffer = col.key.split('.').reduce((o, k) => (o && o[k] != null ? o[k] : null), order);

      const imgX = x0 + sigLineXOffset;
      const imgY = lineY - imgH - imgPad;

      let signatureDrawn = false;
      if (Buffer.isBuffer(sigBuffer)) {
        try {
          doc.image(sigBuffer, imgX, imgY, { fit: [sigLineW, imgH], align: 'center', valign: 'bottom' });
          signatureDrawn = true;
        } catch (e) {
          console.warn(`⚠️ Error drawing signature ${col.label}:`, e.message);
        }
      }

      if (!signatureDrawn) {
        const lineX = x0 + sigLineXOffset;
        doc.moveTo(lineX, lineY)
           .lineTo(lineX + sigLineW, lineY)
           .strokeColor(CONFIG.color.sigLine)
           .stroke();
      }

      let textY = lineY + imgPad + 3; // ลดระยะห่างจากเส้นเป็น 3
      doc
        .font(CONFIG.font.boldName)
        .fontSize(CONFIG.sizes.textLabel)
        .fillColor(CONFIG.color.textDark)
        .text(col.label, x0, textY, { width: colW, align: 'center' });
      textY += 10; // ลดกลับเป็น 10
      doc
        .font(CONFIG.font.name)
        .fontSize(CONFIG.sizes.textSmall)
        .fillColor(CONFIG.color.textLight)
        .text(col.labelEn, x0, textY, { width: colW, align: 'center' });
      textY += 10; // ลดกลับเป็น 10
      doc
        .font(CONFIG.font.name)
        .fontSize(CONFIG.sizes.textSmall)
        .fillColor(CONFIG.color.textLight)
        .text(currentDateThai, x0, textY, { width: colW, align: 'center' });
    });

    doc.save()
       .moveTo(margins.left + colW,   startY + 5)
       .lineTo(margins.left + colW,   startY + sigBlockH - 5)
       .moveTo(margins.left + 2*colW, startY + 5)
       .lineTo(margins.left + 2*colW, startY + sigBlockH - 5)
       .strokeColor(CONFIG.color.lineLight)
       .lineWidth(0.5)
       .stroke()
       .restore();
  }

  /** @private วาดเงื่อนไขและข้อกำหนด */
  static _drawTerms(doc, order, margins, bodyW, startY, maxHeight) {
    let currentY = startY;

    // ข้อความเงื่อนไขแบบใหม่ (ข้อความเดียวแบบกระชับ)
    doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.textLabel).fillColor(CONFIG.color.textDark);
    const termsText = order.termsText ||
`สินค้ามีประกันเครื่อง 1 ปี หากตรวจสอบสินค้าแล้ว พบว่าเกิดจากระบบซอฟแวร์ภายในเครื่อง ลูกค้ายินยอมจะรอทางศูนย์ดำเนินการเคลมสินค้า โดยระยะเวลาการเคลมสินค้าขึ้นอยู่กับศูนย์ และหากเกิดความเสียหายจากการกระทำของลูกค้า เช่น ตก แตก โดนน้ำ เป็นต้น ถือว่าประกันสิ้นสุดทันที`;

    const termOpts = {
      width: bodyW,
      lineGap: 2,
      align: 'justify' // จัดเนื้อหาให้เรียบร้อย
    };

    doc
      .font(CONFIG.font.name)
      .fontSize(CONFIG.sizes.textSmall) // ใช้ฟอนต์เล็กลง
      .fillColor(CONFIG.color.textDark)
      .text(termsText, margins.left, currentY, termOpts);

    // คำนวณความสูงที่ใช้จริง (แบบกระชับ)
    const termsHeight = doc.heightOfString(termsText, termOpts);
    currentY += Math.min(termsHeight, 30); // จำกัดความสูงไม่เกิน 30 point

    return currentY;
  }

  /** @private วาดส่วนท้ายหน้า */
  static _drawPageFooter(doc, margins, pageW, pageH) {
    const footerY = pageH - margins.bottom + 10;
    const lineY   = footerY - 12;
    doc
      .moveTo(margins.left, lineY)
      .lineTo(pageW - margins.right, lineY)
      .strokeColor(CONFIG.color.primaryBlue)
      .lineWidth(1)
      .stroke();
    const pageText = 'หน้า 1 / 1';
    doc
      .font(CONFIG.font.name)
      .fontSize(CONFIG.sizes.textSmall)
      .fillColor(CONFIG.color.textLight)
      .text(pageText,
            margins.left,
            footerY,
            { width: pageW - margins.left - margins.right, align: 'left' });
  }
} // <-- End of QuotationPdfController class

module.exports = QuotationPdfController;
