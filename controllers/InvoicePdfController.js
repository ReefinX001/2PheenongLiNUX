/**
 * @file InvoicePdfController.js
 * @description Controller for creating minimalist-style PDF Invoices with a blue theme, including installment details. (Based on QuotationPdfController)
 * @version 1.4.0
 * @date 2025-05-04
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// เพิ่ม import Employee model เพื่อแก้ไขปัญหา Schema registration
try {
  require('../models/HR/Employee');
} catch (err) {
  console.warn('⚠️ Employee model import failed:', err.message);
}

// --- Configuration (Same as QuotationPdfController) ---
const CONFIG = {
  page: { size: 'A4', margin: 40 },
  font: {
    name: 'THSarabun', boldName: 'THSarabun-Bold',
    path: path.join(__dirname, '..', 'fonts', 'THSarabunNew.ttf'),
    boldPath: path.join(__dirname, '..', 'fonts', 'THSarabunNew Bold.ttf')
  },
  color: {
    primaryBlue: '#3498DB', textHeader: '#FFFFFF', textBlack: '#000000',
    textDark: '#222222',
    textLight: '#555555', lineLight: '#E0E0E0',
    lineDark: '#CCCCCC', sigLine: '#888888', bgWhite: '#FFFFFF', bgAccent: '#3498DB',
   },
  sizes: {
    logo: { w: 145 },
    heading1: 16,
    heading2: 10,
    heading3: 10,
    textBody: 10,
    textLabel: 10,
    textSmall: 10,
    tableHeader: 10,
    tableRow: 10,
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

class InvoicePdfController {

  /**
   * สร้างเลขที่เอกสารใหม่ตามรูปแบบ (ใช้ฟังก์ชันจาก InvoiceReceiptController)
   * @param {string} prefix - คำนำหน้า (QT, INV, TX, RE)
   * @returns {Promise<string>} เลขที่เอกสาร
   */
  static async generateDocumentNumber(prefix = 'INV') {
    try {
      const DocumentNumberSystem = require('../utils/DocumentNumberSystem');

      switch (prefix) {
        case 'INV':
          return await DocumentNumberSystem.generateInvoiceNumber();
        case 'QT':
          // const { generateQuotationNumber } = require('./InvoiceReceiptController'); // ลบแล้ว
          return await DocumentNumberSystem.generateQuotationNumber();
        default:
          return await DocumentNumberSystem.generateInvoiceNumber();
      }
    } catch (error) {
      console.warn('⚠️ Could not generate document number from InvoiceReceiptController, using fallback');
      // Fallback สำหรับกรณีที่ไม่มี InvoiceReceiptController
      const timestamp = Date.now();
      return `${prefix}-${timestamp}`;
    }
  }

  /**
   * สร้างไฟล์ PDF ใบแจ้งหนี้
   * @param {object} order ข้อมูลออเดอร์
   * @returns {Promise<{buffer: Buffer, fileName: string}>} Promise ที่ resolve เป็น buffer ของ PDF และชื่อไฟล์
   */
  static async createInvoicePdf(order) {
      console.log('🧾 InvoicePdfController.createInvoicePdf() called with order:', {
        _id: order?._id,
        order_number: order?.order_number,
        quotationData: !!order?.quotationData,
        quotationNumber: order?.quotationNumber,
        hasCustomer: !!order?.customer,
        hasItems: Array.isArray(order?.items) && order?.items.length > 0,
        documentType: order?.documentType || 'invoice'
      });

      // === อิงข้อมูลจากใบเสนอราคา ===
      // ถ้ามี quotationData ให้ใช้ข้อมูลจากใบเสนอราคาทั้งหมด (แก้ปัญหาข้อมูลไม่ตรงกัน)
      if (order.quotationData) {
        console.log('🧾 Fully syncing data from quotation:', {
          quotationNumber: order.quotationData.quotationNumber || order.quotationData.number,
          hasCustomer: !!order.quotationData.customer,
          hasItems: Array.isArray(order.quotationData.items) && order.quotationData.items.length > 0,
          hasSummary: !!order.quotationData.summary
        });

        // 🔧 FIX: อิงข้อมูลลูกค้าจากใบเสนอราคาอย่างสมบูรณ์
        if (order.quotationData.customer) {
          const quotationCustomer = order.quotationData.customer;
          order.customer = {
            name: quotationCustomer.name || `${quotationCustomer.first_name || ''} ${quotationCustomer.last_name || ''}`.trim(),
            firstName: quotationCustomer.firstName || quotationCustomer.first_name,
            lastName: quotationCustomer.lastName || quotationCustomer.last_name,
            taxId: quotationCustomer.taxId || quotationCustomer.tax_id,
            // 🔧 FIX: แก้ปัญหา address แสดงเป็น [object Object] ให้ถูกต้อง
            address: typeof quotationCustomer.address === 'string'
              ? quotationCustomer.address
              : typeof quotationCustomer.address === 'object' && quotationCustomer.address
                ? [
                    quotationCustomer.address.houseNo || quotationCustomer.address.house_no || '',
                    quotationCustomer.address.village ? `หมู่ ${quotationCustomer.address.village}` : '',
                    quotationCustomer.address.subDistrict || quotationCustomer.address.sub_district ? `ตำบล ${quotationCustomer.address.subDistrict || quotationCustomer.address.sub_district}` : '',
                    quotationCustomer.address.district ? `อำเภอ ${quotationCustomer.address.district}` : '',
                    quotationCustomer.address.province ? `จังหวัด ${quotationCustomer.address.province}` : '',
                    quotationCustomer.address.zipcode || quotationCustomer.address.postal_code || ''
                  ].filter(part => part.trim() !== '').join(' ')
                : quotationCustomer.fullAddress || '-',
            phone: quotationCustomer.phone || quotationCustomer.phone_number,
            email: quotationCustomer.email,
            citizenId: quotationCustomer.citizenId
          };
          console.log('✅ Synced customer data:', order.customer);
        }

        // 🔧 FIX: อิงรายการสินค้าจากใบเสนอราคาทั้งหมด (กรองค่าธรรมเนียมเอกสารออก)
        if (order.quotationData.items && order.quotationData.items.length > 0) {
          order.items = order.quotationData.items
            .filter(item => {
              // 🔧 Filter out docFee items to prevent duplication
              const desc = (item.description || item.name || '').toLowerCase();
              return !desc.includes('ค่าธรรมเนียมเอกสาร') &&
                     !desc.includes('document fee') &&
                     !desc.includes('doc fee') &&
                     !desc.includes('ค่าธรรมเนียม') &&
                     item.type !== 'fee'; // กรณีมี type field
            })
            .map(item => ({
              ...item,
              description: item.description || item.name,
              quantity: item.quantity || 1,
              unitPrice: item.unitPrice || item.totalPrice,
              totalPrice: item.totalPrice || item.unitPrice,
              amount: item.amount || item.totalPrice || item.unitPrice,
              discount: item.discount || 0,
              imei: item.imei || ''
            }));
          console.log('✅ Synced items from quotation (filtered):', order.items.length, 'items');
        }

        // 🔧 FIX: อิงข้อมูลการเงินจากใบเสนอราคาทั้งหมด
        if (order.quotationData.summary) {
          console.log('🔍 Quotation summary data:', order.quotationData.summary);
          order.summary = { ...order.quotationData.summary };
          order.vatTotal = order.summary.tax || order.quotationData.summary.vatAmount || order.quotationData.vatAmount || 0;
          order.grandTotal = order.summary.netTotal || order.quotationData.summary.grandTotal || 0;

          // 🔧 FIX: ตรวจสอบและคัดลอกค่า docFee จาก summary ด้วย
          if (!order.summary.docFee && order.quotationData.docFee !== undefined) {
            order.summary.docFee = order.quotationData.docFee;
          }

          console.log('✅ Synced financial summary from quotation:', {
            summary: order.summary,
            vatTotal: order.vatTotal,
            grandTotal: order.grandTotal,
            taxType: order.quotationData.taxType
          });
        } else {
          console.warn('⚠️ No summary data in quotationData');
          // สร้าง summary จากข้อมูลที่มี
          order.summary = {
            beforeTax: order.quotationData.subTotal || order.quotationData.itemsSubtotal || 0,
            docFee: order.quotationData.docFee || order.docFee || 0,
            discount: order.quotationData.discount || 0,
            tax: order.quotationData.vatAmount || order.quotationData.vatTotal || 0,
            netTotal: order.quotationData.grandTotal || order.quotationData.totalAmount || 0
          };
          console.log('✅ Created summary from quotationData fields:', order.summary);
        }

        // 🔧 FIX: แก้ไขการดึงเลข Quotation Number ให้ครอบคลุมทุกกรณี
        console.log('🔍 DEBUG: Complete quotationData structure:', {
          quotationData: order.quotationData,
          possibleKeys: order.quotationData ? Object.keys(order.quotationData) : 'null'
        });

        const quotationNumber = order.quotationData?.quotationNumber ||
                               order.quotationData?.quotationNo ||
                               order.quotationData?.number ||
                               order.quotationData?.order_number ||
                               order.quotationData?.contract_number ||
                               order.quotationData?.quotation_id ||
                               order.quotationNumber ||
                               order.quotationNo ||
                               order.quotationRef ||
                               order.quotation_number;

        if (quotationNumber) {
          order.quotationNumber = quotationNumber;
          order.quotationNo = quotationNumber;
          order.quotationRef = quotationNumber;
          console.log('✅ Synced quotation number for invoice:', quotationNumber);
        } else {
          console.warn('⚠️ No quotation number found in order data');
          console.warn('🔍 Available quotationData keys:', order.quotationData ? Object.keys(order.quotationData) : 'null');
          console.warn('🔍 Full order keys:', Object.keys(order));

          // Try to get from session storage as last resort
          const sessionQuotationNumber = (typeof window !== 'undefined' && window.sessionStorage)
            ? (sessionStorage.getItem('currentQuotationNumber') || sessionStorage.getItem('actualQuotationNumber'))
            : null;

          if (sessionQuotationNumber) {
            console.log('🔄 Using quotation number from session storage:', sessionQuotationNumber);
            order.quotationNumber = sessionQuotationNumber;
            order.quotationNo = sessionQuotationNumber;
            order.quotationRef = sessionQuotationNumber;
          }
        }

        // 🔧 FIX: อิงข้อมูล tax และ fees จากใบเสนอราคา
        if (order.quotationData.taxType) {
          order.taxType = order.quotationData.taxType;
        }
        if (order.quotationData.docFee !== undefined) {
          order.docFee = order.quotationData.docFee;
        }
        if (order.quotationData.shippingFee !== undefined) {
          order.shippingFee = order.quotationData.shippingFee;
        }
        if (order.quotationData.creditTerm) {
          order.creditTerm = order.quotationData.creditTerm;
        }

        // 🔧 FIX: อิงข้อมูลพนักงานขายจากใบเสนอราคา
        if (order.quotationData.salesperson) {
          order.salesperson = order.quotationData.salesperson;
        }

        console.log('✅ Fully synced all data from quotation to invoice');
      } else {
        console.warn('⚠️ No quotationData found in order');
      }

      // Preload signatures directly from order
      order.customer    = order.customer    || {};
      order.salesperson = order.salesperson || {}; // Ensure salesperson object exists

      // โหลด signature ทั้ง 3 และโลโก้ประทับตรา
          console.log('🖋️ InvoicePDF Signature Data (Enhanced Debug):', {
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

        console.log('🖋️ InvoicePDF Signature loading results:', {
          customer: custBuf ? 'OK' : 'Failed',
          salesperson: salesBuf ? 'OK' : 'Failed',
          authorized: authBuf ? 'OK' : 'Failed',
          companyStamp: companyStampBuf ? 'OK' : 'Failed'
        });
      } catch (signatureError) {
        console.warn('⚠️ Error loading signatures (continuing without signatures):', signatureError.message);
        // ดำเนินการต่อแม้ว่าจะโหลด signature ไม่ได้
      }

      // เก็บลง order เพื่อให้ _drawSignatures อ่านได้เลย
      order.customer.signature    = custBuf;
      order.salesperson.signature = salesBuf;
      order.authorizedSignature   = authBuf;
      order.companyStamp          = companyStampBuf;

    // Generate invoice number outside Promise to use await
    if (!order.invoiceNumber && !order.invoiceNo) {
      order.invoiceNumber = await this.generateDocumentNumber('INV');
      order.invoiceNo = order.invoiceNumber;
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

        const doc = new PDFDocument({
          size: CONFIG.page.size,
          margins: { top: 20, bottom: 40, left: 40, right: 40 },
          autoFirstPage: true
        });

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
            const invNum = order?.invoiceNumber || order?.invoiceNo || order?._id || Date.now();
            // ถ้า invNum มี INV- อยู่แล้วให้ใช้เลย ถ้าไม่มีให้เพิ่ม INV-
            const fileName = invNum.toString().startsWith('INV-') ? `${invNum}.pdf` : `INV-${invNum}.pdf`;
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

  // === fallback unitPrice ครอบคลุมทุกแบบ ===
  let unitPrice = ensureNumberData(i.unitPrice);
  if (!unitPrice) {
    unitPrice =
        ensureNumberData(i.pricePayOff)
     || ensureNumberData(i.totalPrice)
     || (down + termCount * instAmount)
     || ensureNumberData(i.price)
     || ensureNumberData(i.amount);
  }

  const discount = ensureNumberData(i.discount);
  const amount   = unitPrice * qty - discount;

  return {
    description:       i.description    || i.name || '-',
    imei:              i.imei,
    quantity:          qty,
    unitPrice:         i.unitPrice      || i.totalPrice || unitPrice,
    totalPrice:        i.totalPrice     || i.unitPrice  || unitPrice,
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

        // --- คำนวณ Subtotal, VAT และ Grand Total ใหม่ตาม taxType (เหมือน QuotationPdfController) ---

        // ฟังก์ชันดึงค่าธรรมเนียมเอกสารแบบเดียวกับ step4.html และ QuotationPdfController
        function getDocumentFee(order) {
          try {
            // 🔧 ใช้ค่า docFee จาก order โดยตรง (รองรับ 0 บาท)
            if (order.docFee !== undefined && order.docFee !== null) {
              return ensureNumberData(order.docFee);
            }

            if (order.documentFee !== undefined && order.documentFee !== null) {
              return ensureNumberData(order.documentFee);
            }

            // ดึงจาก step3Data (ถ้าส่งมาใน order)
            if (order.step3Data?.docFee !== undefined) {
              return ensureNumberData(order.step3Data.docFee);
            }

            // ⚠️ ไม่มี fallback - แสดง warning
            console.warn('⚠️ InvoicePDF: DocFee not provided! Please ensure user enters document fee in step3.');
            return 0; // เปลี่ยนจาก undefined เป็น 0
          } catch (error) {
            console.warn('⚠️ Error getting document fee, using default 500:', error);
            return 500;
          }
        }

        const docFee = getDocumentFee(order);
        const shipFee = ensureNumberData(order.shippingFee);

        console.log('💰 InvoicePDF Document Fee Calculation:', {
          orderDocFee: order.docFee,
          step3DocFee: order.step3Data?.docFee,
          fallbackDocFee: typeof localStorage !== 'undefined' ? localStorage.getItem('globalDocumentFee') : 'N/A',
          finalDocFee: docFee,
          orderType: 'INVOICE',
          quotationNumber: order.quotationNumber || order.number,
          invoiceNumber: order.invoiceNumber
        });

        // Debug: ตรวจสอบข้อมูล taxType ที่ได้รับ
        console.log('🔍 InvoicePDF Tax Debug:', {
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
        // คำนวณยอดสินค้าจาก items (ไม่รวม docFee)
        let itemsSubtotal = order.items
          .filter(item => !item.description?.includes('ค่าธรรมเนียม') && !item.name?.includes('ค่าธรรมเนียม'))
          .reduce((sum, item) => {
            // ใช้ totalPrice แทน amount เพื่อป้องกันการรวม docFee ซ้ำ
            const itemTotal = parseFloat(item.totalPrice || item.amount || item.unitPrice * item.quantity || 0);
            return sum + itemTotal;
          }, 0);
        let vatTotal = 0;

        // 🔧 FIX: ใช้ข้อมูลจากใบเสนอราคาโดยตรง (ไม่คำนวณใหม่)
        if (order.quotationData && order.summary && order.summary.netTotal) {
          console.log('💰 InvoicePDF: ใช้ข้อมูลการเงินจากใบเสนอราคาโดยตรง');

          // 🔧 FIX: ดึงค่า VAT จากหลายที่ที่เป็นไปได้
          vatTotal = order.summary.tax ||
                     order.summary.vatAmount ||
                     order.quotationData.vatAmount ||
                     order.quotationData.vatTotal ||
                     order.vatTotal ||
                     0;

          // 🔧 FIX: ตรวจสอบว่าถ้า VAT = 0 แต่มี taxType ที่ควรมี VAT ให้คำนวณเอง
          if (vatTotal === 0 && (order.taxType === 'inclusive' || order.taxType === 'exclusive' || order.taxType === 'vat')) {
            console.log('⚠️ VAT is 0 but taxType indicates VAT should exist, recalculating...');
            const beforeTax = order.summary.beforeTax || (order.summary.netTotal / 1.07);
            vatTotal = order.summary.netTotal - beforeTax;
          }

          // ใช้ summary ที่ sync มาจากใบเสนอราคาแล้ว - ไม่เปลี่ยนแปลง

          // 🔧 FIX: ปรับ itemsSubtotal ให้ตรงกับใบเสนอราคา (ไม่รวม docFee)
          itemsSubtotal = order.items
            .filter(item => !item.description?.includes('ค่าธรรมเนียม') && !item.name?.includes('ค่าธรรมเนียม'))
            .reduce((sum, item) => {
              // ใช้ totalPrice แทน amount เพื่อป้องกันการรวม docFee ซ้ำ
              const itemTotal = parseFloat(item.totalPrice || item.amount || item.unitPrice * item.quantity || 0);
              return sum + itemTotal;
            }, 0);

        } else {
          console.log('💰 InvoicePDF: คำนวณ VAT ใหม่ (กรณีไม่มีใบเสนอราคา)');
          // คำนวณภาษีตาม taxType ที่เลือกใน step3 (เฉพาะกรณีไม่มีใบเสนอราคา)
          if (order.taxType === 'inclusive') {
            // ราคารวมภาษีแล้ว (สินค้า + ค่าธรรมเนียม) - แยกภาษีออก
            const totalWithVat = itemsSubtotal + docFee + shipFee;
            const totalBeforeTax = totalWithVat / 1.07;
            vatTotal = totalWithVat - totalBeforeTax;
            // ปรับ itemsSubtotal ให้เป็นยอดก่อนภาษี (ไม่รวมค่าธรรมเนียม)
            itemsSubtotal = totalBeforeTax - docFee - shipFee;
            order.summary = order.summary || {};
            order.summary.beforeTax = totalBeforeTax;
            order.summary.tax = vatTotal;
            order.summary.netTotal = totalWithVat;
          } else if (order.taxType === 'exclusive') {
            // 🔧 ใช้ค่าจาก step3 แทนการคำนวณ hardcode
            if (order.vatAmount !== undefined && order.totalWithTax !== undefined) {
              vatTotal = order.vatAmount;
              order.summary = order.summary || {};
              order.summary.beforeTax = order.beforeTaxAmount || (itemsSubtotal + docFee + shipFee);
              order.summary.tax = vatTotal;
              order.summary.netTotal = order.totalWithTax;
            } else {
              // Fallback: คำนวณแบบเดิม (เมื่อไม่มีค่าจาก step3)
              const totalBeforeTax = itemsSubtotal + docFee + shipFee;
              vatTotal = totalBeforeTax * 0.07;
              order.summary = order.summary || {};
              order.summary.beforeTax = totalBeforeTax;
              order.summary.tax = vatTotal;
              order.summary.netTotal = totalBeforeTax + vatTotal;
            }
          } else {
            // ไม่มีภาษี
            vatTotal = 0;
            order.summary = order.summary || {};
            order.summary.beforeTax = itemsSubtotal + docFee + shipFee;
            order.summary.tax = vatTotal;
            order.summary.netTotal = order.summary.beforeTax;
          }
        }

        order.vatTotal = vatTotal;
        order.grandTotal = order.summary.netTotal;

        console.log('💰 InvoicePDF Price Calculation:', {
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

        // แปลงเป็นคำ
        order.amountInWords = toThaiBahtText(order.summary.netTotal);

        // Function to check Y advancement (moved inside for scope, but could be a static helper)
        function checkYAdvance(sectionName, newY) {
             if (typeof newY !== 'number' || isNaN(newY)) throw new Error(`Invalid Y value (NaN) from ${sectionName}.`);
             if (newY < previousY) console.error(`${sectionName} Y went backwards! Prev: ${previousY}, New: ${newY}`);
             else if (newY === previousY && sectionName !== 'Terms') console.warn(`${sectionName} did not advance Y. Prev: ${previousY}, New: ${newY}`);
             previousY = newY;
             return newY;
        }

        // 1. Header
        currentY = this._drawHeader(doc, order, margins, W, currentY);
        currentY = checkYAdvance('Header', currentY);

        // 2. Customer/Invoice Info (เพิ่มระยะห่างให้น้อยลง)
        currentY = this._drawCustomerAndInvoiceInfo(doc, order, margins, bodyW, currentY);
        currentY = checkYAdvance('Customer/Invoice Info', currentY); currentY += 5;

        // 3. Items Table
        if (order.items.length > 0) {
            currentY = this._drawItemsTable(doc, order, margins, bodyW, currentY, H);
            currentY += 10;

            // วาดส่วนสรุปยอดเงินทันทีหลังจากตาราง
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
            const signaturesHeight = 50;
            const pageFooterHeight = 15;
            const termsHeight = 25;

            // 6) วาดลายเซ็นก่อน (ปรับเลื่อนลงให้พ้น summary)
            const signatureOffset = 40;
            const sigY = currentY + signatureOffset;
            this._drawSignatures(doc, order, margins, bodyW, sigY);

            // 7) คำนวณ Y ใหม่ให้ Terms อยู่ใต้บล็อกลายเซ็น (เลื่อนเพิ่มอีกนิด)
            const sigBlockH      = 68;
            const paddingBetween = 10;
            const termsOffset    = 20;
            const termsY = sigY + sigBlockH + paddingBetween + termsOffset;

            // 8) วาดข้อกำหนดและเงื่อนไขใต้ลายเซ็น
            this._drawTerms(doc, order, margins, bodyW, termsY);

            // 9) สุดท้าย วาด Page Footer
            this._drawPageFooter(doc, margins, W, H);

            // 10) ปิด PDF
            doc.end();

    } else {
      previousY = currentY;
    }

      } catch (err) {
        console.error(`Error in createInvoicePdf: ${err.message}\nStack: ${err.stack}`);
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

    // 2) วาด Title
    const titleText = 'ใบแจ้งหนี้ / INVOICE';
    const titleFont = CONFIG.font.boldName;
    const titleSize = CONFIG.sizes.heading1 + 2;
    doc.font(titleFont).fontSize(titleSize);
    const titleW = doc.widthOfString(titleText);
    const TITLE_OFFSET = 30;
    doc.fillColor(CONFIG.color.primaryBlue)
       .text(
         titleText,
         margins.left + fullW - titleW,
         startY + TITLE_OFFSET,
         { align: 'right' }
       );

    // ————————— เพิ่มบรรทัด "เลขที่ใบแจ้งหนี้" —————————
    doc
      .font(CONFIG.font.name)
      .fontSize(CONFIG.sizes.heading2)
      .fillColor(CONFIG.color.textDark)
      .text(
        `เลขที่: ${order.invoiceNumber}`,
        margins.left + fullW - titleW,
        startY + TITLE_OFFSET + CONFIG.sizes.heading1,
        { width: titleW, align: 'right' }
      );
    // ———————————————————————————————————————

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

    return Math.max(startY + logoH, y) + 10;
  }

  /** @private วาดข้อมูลลูกค้าและใบแจ้งหนี้ */
  static _drawCustomerAndInvoiceInfo(doc, order, margins, bodyW, startY) {
    const lineSpacing = CONFIG.sizes.lineSpacing; const leftColX = margins.left;
    const leftColW = bodyW * 0.55 - 10; const rightColX = margins.left + bodyW * 0.55 + 10;
    const rightColW = bodyW * 0.45 - 10; const labelW = 75;
    const valueIndent = 5;
    let leftY = startY; let rightY = startY;

    // Helper function to format address
    const formatAddress = (address) => {
      if (!address) return '-';
      if (typeof address === 'string') return address;
      if (typeof address === 'object') {
        return [
          address.houseNo || address.house_no || '',
          address.village ? `หมู่ ${address.village}` : '',
          address.moo ? `หมู่ ${address.moo}` : '',
          address.subDistrict || address.sub_district ? `ตำบล ${address.subDistrict || address.sub_district}` : '',
          address.district ? `อำเภอ ${address.district}` : '',
          address.province ? `จังหวัด ${address.province}` : '',
          address.zipcode || address.postal_code || address.postalCode || ''
        ].filter(part => part && part.trim() !== '').join(' ');
      }
      return '-';
    };

    // ใช้โครงสร้าง order.customer: name, taxId, address, phone
    const customerFields = [
      { label: 'ชื่อลูกค้า',       labelEn: 'Customer Name', value: order.customer?.name    || '-' },
      { label: 'เลขที่ผู้เสียภาษีอากร', labelEn: 'Tax ID',        value: order.customer?.taxId  || '-' },
      { label: 'ที่อยู่',           labelEn: 'Address',       value: formatAddress(order.customer?.address) },
      { label: 'โทร.',             labelEn: 'Tel.',          value: order.customer?.phone  || '-' }
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
        const valueStr = String(field.value); doc.text(valueStr, valueX, fieldStartY, { width: valueW });
        const valueHeight = ensureHeight(doc.heightOfString(valueStr, { width: valueW }));
        leftY = fieldStartY + Math.max(labelBlockHeight, valueHeight) + (CONFIG.sizes.textBody * lineSpacing * 0.7);
    });

    const invoiceFields = [
        {
          label:    'เลขที่ใบเสนอราคา',
          labelEn:  'Quotation No.',
          value:    (() => {
            // ✅ FIX: ให้ใช้ตำแหน่งง่ายๆ เพื่อหาเลขใบเสนอราคา
            let quotationNum = null;

            // 1. ลองจาก order properties ที่ส่งมาจาก invoiceController ก่อน
            quotationNum = order.quotationNumber || order.quotationNo || order.quotationRef;

            // 2. ถ้าไม่มี ลองจาก quotationData
            if (!quotationNum && order.quotationData) {
              quotationNum = order.quotationData.quotationNumber ||
                           order.quotationData.quotationNo ||
                           order.quotationData.number;
            }

            console.log('🔍 InvoicePDF Quotation Number Debug:', {
              found: quotationNum || 'NOT FOUND',
              orderQuotationNumber: order.quotationNumber,
              orderQuotationNo: order.quotationNo,
              orderQuotationRef: order.quotationRef,
              quotationDataNumber: order.quotationData?.quotationNumber,
              quotationDataNo: order.quotationData?.quotationNo,
              sessionNumber: typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('currentQuotationNumber') : 'N/A'
            });

            return quotationNum || '-';
          })()
        },
        {
          label:    'วันที่ออกใบแจ้งหนี้',
          labelEn:  'Issue Date',
          value:    order.issueDateFormatted
                  || (order.issueDate
                      ? new Date(order.issueDate).toLocaleDateString('th-TH')
                      : '-')
        },
        { label: 'เงื่อนไขการชำระ', labelEn: 'Credit Term', value: order.creditTerm || 'เงินสด' },
        { label: 'พนักงานขาย',  labelEn: 'Salesman',    value: order.salesperson?.name || '-' }
    ];
    invoiceFields.forEach(field => {
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
        const valueStr = String(field.value);

        // 🔍 Debug: ถ้าเป็น quotation number ให้แสดง debug
        if (field.label === 'เลขที่ใบเสนอราคา') {
          console.log('🔍 InvoicePDF Writing Quotation Number to PDF:', {
            label: field.label,
            value: field.value,
            valueStr: valueStr,
            quotationNumber: order.quotationNumber,
            orderData: {
              quotationNo: order.quotationNo,
              quotationRef: order.quotationRef
            }
          });
        }

        doc.text(valueStr, valueX, fieldStartY, { width: valueW });
        const valueHeight = ensureHeight(doc.heightOfString(valueStr, { width: valueW }));
        rightY = fieldStartY + Math.max(labelBlockHeight, valueHeight) + (CONFIG.sizes.textBody * lineSpacing * 0.7);
    });

    const bottomY = Math.max(leftY, rightY);
    if (isNaN(bottomY)) { console.error('bottomY in Customer/Invoice Info is NaN!'); return startY + 120; }
    doc.moveTo(margins.left, bottomY + 5).lineTo(margins.left + bodyW, bottomY + 5).strokeColor(CONFIG.color.lineLight).lineWidth(0.5).stroke();
    return bottomY + 10;
  }

  /** @private วาดตารางรายการสินค้า - เหมือน QuotationPdfController */
  static _drawItemsTable(doc, order, margins, bodyW, startY, pageH) {
    const leftX = margins.left;
    const headerH = 30;
    // เอา rowH ตายตัวออก (ใช้คำนวณไดนามิกแทน)
    const cols = { ...CONFIG.layout.tableCols };
    let currentY = startY;

    // เอา padV/padH มาไว้ที่เดียว เพื่อใช้ทั้งใน header และ data rows
    const padH = 5;
    const defaultPadV = 4; // padding แนวตั้งขั้นต่ำ

    // 🔧 FIX: ดึง docFee จาก order object เพื่อแก้ไข "docFee is not defined" error
    const docFee = parseFloat(order.docFee || order.doc_fee || 0);
    const docFeeForTable = docFee; // ใช้ค่าเดียวกัน

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
      // 1. วัดความสูงของข้อความสินค้า + IMEI
      const desc = item.description || '-';

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

      const qty   = ensureNumberData(item.quantity);
      const unit  = ensureNumberData(item.unitPrice);
      const disc  = ensureNumberData(item.discount);
      const amt   = ensureNumberData(item.amount);

      // 2. วาดข้อมูล
      const y = currentY + (rowH - contentH) / 2;  // จัดกึ่งกลางแนวตั้ง

      let x = leftX;
      // วาดลำดับก่อน แล้วเลื่อนไปยังคอลัมน์ Description
      doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.tableRow).fillColor(CONFIG.color.textDark);
      doc.text(i + 1, x, y, { width: cols.no, align: 'center' });
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
      doc.text(unit.toLocaleString('en-US', { minimumFractionDigits: 2 }), x, y, {
        width: cols.unit - padH, align: 'right'
      });
      x += cols.unit;

      // ส่วนลด
      doc.text(disc.toLocaleString('en-US', { minimumFractionDigits: 2 }), x, y, {
        width: cols.disc - padH, align: 'right'
      });
      x += cols.disc;

      // จำนวนเงิน
      doc.text(amt.toLocaleString('en-US', { minimumFractionDigits: 2 }), x, y, {
        width: cols.amt - padH, align: 'right'
      });

      // 3. เลื่อน currentY ตาม rowH และวาดเส้นขอบใต้
      currentY += rowH;
      doc.moveTo(leftX, currentY)
         .lineTo(leftX + bodyW, currentY)
         .strokeColor(CONFIG.color.lineLight)
         .lineWidth(0.5)
         .stroke();
    });

    // --- Document Fee row (ใช้ค่าเดียวกับที่คำนวณใน main function) ---
    // 🔧 FIX: แสดงค่าธรรมเนียมเอกสารในตารางเหมือน Quotation (ถ้าไม่มีในรายการ items แล้ว)
    const hasDocFeeInItems = order.items.some(item =>
      item.description?.includes('ค่าธรรมเนียม') ||
      item.isDocumentFee === true
    );
    const showDocFeeInTable = !hasDocFeeInItems && docFee > 0; // แสดงถ้ายังไม่มีในรายการ items


    if (showDocFeeInTable) {
      let x = leftX;
      const rowH = 26; // ใช้ความสูงปกติสำหรับแถวค่าธรรมเนียม
      const y = currentY + defaultPadV;

      // 1. No
      doc.text(order.items.length + 1, x, y, { width: cols.no, align: 'center' });
      x += cols.no;

      // 2. Description
      doc.text('ค่าธรรมเนียมเอกสาร', x + padH, y, {
        width: cols.desc - 2 * padH, align: 'left' }
      );
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
        doc.text(order.items.length + 1 + (showDocFeeInTable?1:0), x, y, { width: cols.no, align: 'center' });
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

   /** @private วาดส่วนสรุปยอดรวม - เหมือน QuotationPdfController */
  static _drawSummary(doc, order, margins, bodyW, startY) {
    console.log('📊 Drawing invoice summary section...');

    const rightAlign = margins.left + bodyW;
    const lineHeight = 18;
    const summaryWidth = 200;
    let currentY = startY;

    // 🔧 FIX: ใช้ข้อมูลจากใบเสนอราคาโดยตรง (ไม่คำนวณใหม่)
    let summaryItems = [];

    if (order.quotationData && order.summary) {
      console.log('💰 Invoice: ใช้ summary จากใบเสนอราคาโดยตรง');

      // 🔧 FIX: คำนวณ subtotal จาก items จริงๆ แทนการใช้ summary.subtotal ที่อาจไม่ถูกต้อง
      const subtotal = Array.isArray(order.items)
        ? order.items
            .filter(item => !item.description?.includes('ค่าธรรมเนียม') && !item.name?.includes('ค่าธรรมเนียม'))
            .reduce((sum, item) => sum + (parseFloat(item.totalPrice) || parseFloat(item.amount) || 0), 0)
        : parseFloat(order.summary.subtotal || 0);
      const docFee = parseFloat(order.summary.docFee || order.docFee || 0);
      const discount = parseFloat(order.summary.discount || 0);
      const afterDiscount = subtotal + docFee - discount; // คำนวณใหม่

      // 🔧 FIX: คำนวณ VAT และ finalTotal ใหม่ให้ตรงกับ afterDiscount ที่คำนวณใหม่
      let vatAmount, finalTotal;

      if (order.taxType === 'inclusive') {
        // ภาษีรวมในราคา: ยอดสุดท้าย = afterDiscount, VAT = (afterDiscount / 1.07) * 0.07
        finalTotal = afterDiscount;
        vatAmount = Math.round((afterDiscount / 1.07) * 0.07 * 100) / 100;
      } else if (order.taxType === 'exclusive' || order.taxType === 'vat') {
        // ภาษีแยกนอกราคา: VAT = afterDiscount * 0.07, ยอดสุดท้าย = afterDiscount + VAT
        vatAmount = Math.round(afterDiscount * 0.07 * 100) / 100;
        finalTotal = Math.round((afterDiscount + vatAmount) * 100) / 100;
      } else {
        // ไม่มีภาษี
        vatAmount = 0;
        finalTotal = afterDiscount;
      }

      console.log('💰 Invoice VAT recalculation:', {
        subtotal, docFee, discount, afterDiscount, vatAmount, finalTotal, taxType: order.taxType
      });

      // สร้าง summary data จากใบเสนอราคา
      summaryItems = [
        { label: 'รวมเงิน', value: subtotal, format: 'currency' }
      ];

      // แสดงค่าธรรมเนียมเอกสารเฉพาะเมื่อมีค่า
      if (docFee > 0) {
        summaryItems.push({ label: 'ค่าธรรมเนียมเอกสาร', value: docFee, format: 'currency' });
      }

      // แสดงส่วนลดเฉพาะเมื่อมีค่า
      if (discount > 0) {
        summaryItems.push({ label: 'ส่วนลด', value: discount, format: 'currency' });
      }

      summaryItems.push({ label: 'ยอดรวมหลังหักส่วนลด', value: afterDiscount, format: 'currency', separator: true });

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

      console.log('💰 Invoice summary from quotation:', {
        subtotal, docFee, discount, afterDiscount, vatAmount, finalTotal
      });

    } else {
      console.log('💰 Invoice: คำนวณ summary ใหม่ (ไม่มีใบเสนอราคา)');

      // คำนวณยอดรวมสินค้า (ไม่รวม docFee)
      const subtotal = Array.isArray(order.items)
        ? order.items
            .filter(item => !item.description?.includes('ค่าธรรมเนียม') && !item.name?.includes('ค่าธรรมเนียม'))
            .reduce((sum, item) => sum + (parseFloat(item.totalPrice) || parseFloat(item.amount) || 0), 0)
        : 0;

      // ค่าธรรมเนียมเอกสาร
      const docFee = parseFloat(order.docFee) || 0;

      // ส่วนลด
      const discount = parseFloat(order.summary?.discount) || 0;

      // ยอดหลังหักส่วนลด
      const afterDiscount = subtotal + docFee - discount;

      // 🔧 ใช้ค่า VAT จาก step3 หรือ summary แทนการคำนวณ hardcode
      console.log('🔍 Invoice VAT calculation debug:', {
        'order.summary?.tax': order.summary?.tax,
        'order.vatAmount': order.vatAmount,
        'order.taxType': order.taxType,
        'order.quotationData?.vatAmount': order.quotationData?.vatAmount,
        'order.quotationData?.summary?.vatAmount': order.quotationData?.summary?.vatAmount
      });

      let vatAmount = parseFloat(order.summary?.tax) || parseFloat(order.vatAmount) || 0;
      let finalTotal = parseFloat(order.summary?.netTotal) || parseFloat(order.totalWithTax) || afterDiscount;

      // Fallback: คำนวณเฉพาะเมื่อไม่มีข้อมูลจาก step3
      if (!vatAmount && !order.totalWithTax && order.taxType) {
        console.warn('⚠️ No step3 tax data found, calculating manually...');
        if (order.taxType === 'inclusive') {
          vatAmount = Math.round((afterDiscount / 1.07) * 0.07 * 100) / 100;
          finalTotal = afterDiscount;
        } else if (order.taxType === 'exclusive' || order.taxType === 'vat') {
          vatAmount = Math.round(afterDiscount * 0.07 * 100) / 100;
          finalTotal = Math.round((afterDiscount + vatAmount) * 100) / 100;
        }
      }

             // สร้าง summary data
       summaryItems = [
        { label: 'รวมเงิน', value: subtotal, format: 'currency' },
        { label: 'ค่าธรรมเนียมเอกสาร', value: docFee, format: 'currency' },
        { label: 'ส่วนลด', value: discount, format: 'currency' },
        { label: 'ยอดรวมหลังหักส่วนลด', value: afterDiscount, format: 'currency', separator: true }
      ];

      // เพิ่มภาษีถ้ามี หรือถ้า taxType ไม่ใช่ 'none'
      if (vatAmount > 0 || (order.taxType && order.taxType !== 'none')) {
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

      console.log('💰 Invoice summary calculation:', {
        subtotal, docFee, discount, afterDiscount, vatAmount, finalTotal, taxType: order.taxType
      });
    }

    // วาดรายการสรุป (ใช้ summaryItems ที่สร้างใน if-else block ข้างบน)
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

  /** @private วาดส่วนลายเซ็น - เหมือน QuotationPdfController */
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

  /** @private วาดเงื่อนไขและข้อกำหนด - เหมือน QuotationPdfController */
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

  /** @private วาดส่วนท้ายหน้า - เหมือน QuotationPdfController */
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
} // <-- End of InvoicePdfController class

module.exports = InvoicePdfController;
