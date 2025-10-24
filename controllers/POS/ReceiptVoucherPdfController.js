/**
 * @file ReceiptVoucherPdfController.js
 * @description Controller for creating PDF Receipt Vouchers with professional design
 * @version 1.1.0
 * @date 2025-01-15
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// --- Configuration ---
const CONFIG = {
  page: { size: 'A4', margin: 40 },
  font: {
    name: 'THSarabun',
    boldName: 'THSarabun-Bold',
    // แก้ไข path ให้ถูกต้อง - ขึ้น 2 ระดับจาก controllers/POS/
    path: path.join(__dirname, '..', '..', 'fonts', 'THSarabunNew.ttf'),
    boldPath: path.join(__dirname, '..', '..', 'fonts', 'THSarabunNew Bold.ttf') // มีช่องว่างใน Bold
  },
  color: {
    primaryBlue: '#3498DB',
    darkBlue: '#2C3E50',
    textHeader: '#FFFFFF',
    textBlack: '#000000',
    textDark: '#222222',
    textLight: '#555555',
    lineLight: '#E0E0E0',
    lineDark: '#CCCCCC',
    sigLine: '#888888',
    bgWhite: '#FFFFFF',
    bgAccent: '#3498DB',
    bgLight: '#F0F9FF',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444'
  },
  sizes: {
    logo: { w: 145 },
    heading1: 18,
    heading2: 14,
    heading3: 12,
    textBody: 11,
    textLabel: 10,
    textSmall: 9,
    tableHeader: 11,
    tableRow: 11,
    lineSpacing: 1.4
  },
  layout: {
    // Layout สำหรับตารางรายการสินค้า (ปรับใหม่ - ลบคอลัมน์ IMEI)
    itemTableCols: {
      no: 30,
      name: 320,  // เพิ่มความกว้างเพราะรวม IMEI มาแสดงด้วย
      qty: 50,
      price: 70,
      amount: 80
    },
    // Layout สำหรับตารางรายละเอียดบัญชี
    detailTableCols: {
      no: 40,
      desc: 280,
      amount: 90,
      remarks: 105
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
  if (!url) return null;

  // Check local file
  const filePath = path.normalize(url);
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath);
  }

  // Check uploads folder
  const uploadFilePath = path.join(process.cwd(), 'uploads', path.basename(url));
  if (fs.existsSync(uploadFilePath)) {
    return fs.readFileSync(uploadFilePath);
  }

  // Data URI
  if (url.startsWith('data:image')) {
    const base64 = url.split(',')[1];
    return Buffer.from(base64, 'base64');
  }

  // HTTP(S) URL
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

  // Public folder
  const projectRoot = process.cwd();
  const relPath = url.replace(/^\/+/, '');
  const tryPaths = [
    path.join(projectRoot, 'public', relPath),
    path.join(projectRoot, relPath),
  ];

  for (const p of tryPaths) {
    if (fs.existsSync(p)) {
      return fs.readFileSync(p);
    }
  }

  return null;
}

// ฟังก์ชันฟอร์แมตวันที่ภาษาไทย
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
    console.error('Error formatting date:', e);
    return '-';
  }
}

// แปลงตัวเลขเป็นคำอ่านภาษาไทย
const bahtText = require('thai-baht-text');

function toThaiBahtText(n) {
  return bahtText(n);
}

// Map สำหรับประเภทการรับเงิน
const RECEIPT_TYPE_MAP = {
  'cash_sale': 'ขายสินค้า',
  'credit_sale': 'ขายเชื่อ',
  'debt_payment': 'รับชำระหนี้',
  'deposit': 'รับเงินมัดจำ',
  'return': 'รับคืนสินค้า',
  'service': 'รายได้จากการบริการ',
  'installment': 'ขายผ่อน',
  'other': 'อื่นๆ'
};

// Map สำหรับวิธีการชำระเงิน
const PAYMENT_METHOD_MAP = {
  'cash': 'เงินสด',
  'transfer': 'โอนเงิน',
  'cheque': 'เช็ค',
  'credit_card': 'บัตรเครดิต',
  'e_wallet': 'กระเป๋าเงินอิเล็กทรอนิกส์'
};

class ReceiptVoucherPdfController {
  /**
   * สร้างไฟล์ PDF ใบสำคัญรับเงิน
   * @param {object} receiptVoucher ข้อมูลใบสำคัญรับเงิน
   * @returns {Promise<{buffer: Buffer, fileName: string}>} Promise ที่ resolve เป็น buffer ของ PDF และชื่อไฟล์
   */
  static async createReceiptVoucherPdf(receiptVoucher) {
    // Preload data
    receiptVoucher = receiptVoucher || {};
    receiptVoucher.branch = receiptVoucher.branch || {};
    receiptVoucher.createdBy = receiptVoucher.createdBy || {};

    // Load signatures
    const [receiptSignBuf, approvedSignBuf] = await Promise.all([
      loadImageBuffer(receiptVoucher.receiptSignatureUrl),
      loadImageBuffer(receiptVoucher.approvedSignatureUrl)
    ]);

    receiptVoucher.receiptSignature = receiptSignBuf;
    receiptVoucher.approvedSignature = approvedSignBuf;

    return new Promise((resolve, reject) => {
      try {
        // Font Setup
        let boldFontPath = CONFIG.font.boldPath;
        let boldFontName = CONFIG.font.boldName;
        if (!fs.existsSync(CONFIG.font.path)) {
          return reject(new Error(`Font not found: ${CONFIG.font.path}`));
        }
        if (!fs.existsSync(boldFontPath)) {
          console.warn(`Bold font not found: ${boldFontPath}. Using regular.`);
          boldFontName = CONFIG.font.name;
          boldFontPath = CONFIG.font.path;
        }

        // Initialize PDF Document
        const doc = new PDFDocument({
          size: CONFIG.page.size,
          margins: { top: 20, bottom: 40, left: 40, right: 40 },
          autoFirstPage: true
        });

        const { width: W, height: H } = doc.page;
        let margins = doc.page.margins;

        // Validate margins
        if (!margins || typeof margins.top !== 'number') {
          margins = { top: 40, bottom: 40, left: 40, right: 40 };
        }

        const bodyW = W - margins.left - margins.right;

        // Buffer setup
        const chunks = [];
        doc.on('data', chunks.push.bind(chunks));
        doc.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const docNum = receiptVoucher?.documentNumber || receiptVoucher?._id || Date.now();
          const fileName = `RV-${docNum}.pdf`;
          resolve({ buffer, fileName });
        });
        doc.on('error', reject);

        // Register Fonts
        doc.registerFont(CONFIG.font.name, CONFIG.font.path);
        doc.registerFont(boldFontName, boldFontPath);
        doc.font(CONFIG.font.name);

        // Initialize position
        let currentY = margins.top;

        // Normalize data
        receiptVoucher.paymentDateFormatted = formatThaiDate(receiptVoucher.paymentDate);
        receiptVoucher.details = Array.isArray(receiptVoucher.details) ? receiptVoucher.details : [];
        receiptVoucher.items = Array.isArray(receiptVoucher.items) ? receiptVoucher.items : [];
        receiptVoucher.amountInWords = toThaiBahtText(receiptVoucher.totalAmount || 0);

        // 1. Header
        currentY = this._drawHeader(doc, receiptVoucher, margins, W, currentY);
        currentY += 10;

        // 2. Receipt Info
        currentY = this._drawReceiptInfo(doc, receiptVoucher, margins, bodyW, currentY);
        currentY += 10;

        // 3. Items Table (รายการสินค้า) - เพิ่มใหม่
        if (receiptVoucher.items.length > 0) {
          currentY = this._drawItemsTable(doc, receiptVoucher, margins, bodyW, currentY, H);
          currentY += 15;
        }

        // 4. Details Table (รายละเอียดบัญชี)
        if (receiptVoucher.details.length > 0) {
          currentY = this._drawDetailsTable(doc, receiptVoucher, margins, bodyW, currentY, H);
          currentY += 15;
        }

        // 5. Amount in Thai words
        currentY = this._drawAmountInWords(doc, receiptVoucher, margins, bodyW, currentY);
        currentY += 20;

        // 6. Payment Information
        currentY = this._drawPaymentInfo(doc, receiptVoucher, margins, bodyW, currentY);
        currentY += 25;

        // 7. Signatures
        currentY = this._drawSignatures(doc, receiptVoucher, margins, bodyW, currentY);

        // 8. Footer
        this._drawFooter(doc, margins, W, H);

        // End PDF
        doc.end();

      } catch (err) {
        console.error(`Error in createReceiptVoucherPdf: ${err.message}\nStack: ${err.stack}`);
        reject(err);
      }
    });
  }

  /** @private วาดส่วนหัว */
  static _drawHeader(doc, receiptVoucher, margins, pageW, startY) {
    const fullW = pageW - margins.left - margins.right;
    const logoPath = path.join(__dirname, '..', '..', 'Logo', 'Logo2png.png');
    const logoW = CONFIG.sizes.logo.w;
    let logoH = 0;

    // 1) วาดโลโก้ฝั่งซ้าย
    if (fs.existsSync(logoPath)) {
      const img = doc.openImage(logoPath);
      logoH = (img.height * logoW) / img.width;
      doc.image(logoPath, margins.left, startY, { width: logoW });
    } else {
      console.warn('Logo not found at:', logoPath);
    }

    // 2) วาด title "ใบสำคัญรับเงิน" และ "RECEIPT VOUCHER"
    const titleText = 'ใบสำคัญรับเงิน';
    const subtitleText = 'RECEIPT VOUCHER';
    const docNumberText = receiptVoucher.documentNumber || '-';

    const titleFont = CONFIG.font.boldName;
    const titleSize = CONFIG.sizes.heading1;

    // วาด "ใบสำคัญรับเงิน"
    doc.font(titleFont).fontSize(titleSize);
    const titleW = doc.widthOfString(titleText);
    const titleX = margins.left + fullW - titleW;
    doc.fillColor(CONFIG.color.primaryBlue)
       .text(titleText, titleX, startY + 5, { width: titleW, align: 'right' });

    // วาด "RECEIPT VOUCHER"
    doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.textBody);
    const subtitleW = doc.widthOfString(subtitleText);
    doc.fillColor(CONFIG.color.textLight)
       .text(subtitleText, margins.left + fullW - subtitleW, startY + 25,
             { width: subtitleW, align: 'right' });

    // วาดเลขที่เอกสารใต้ RECEIPT VOUCHER
    doc.font(CONFIG.font.boldName).fontSize(CONFIG.sizes.heading3);
    const docNumW = doc.widthOfString(docNumberText);
    doc.fillColor(CONFIG.color.error)
       .text(docNumberText, margins.left + fullW - docNumW, startY + 45,
             { width: docNumW, align: 'right' });

    // 3) ข้อมูลบริษัท
    const padding = 10;
    const compX = margins.left + logoW + padding;
    const compW = fullW - logoW - padding - Math.max(titleW, subtitleW, docNumW) - padding;
    const branch = receiptVoucher.branch || {};

    const lines = [
      { text: receiptVoucher.company?.name || 'บริษัท 2 พี่น้อง โมบาย จำกัด',
        opts: { font: CONFIG.font.boldName, fontSize: CONFIG.sizes.heading2 } },
      ...(branch.name
        ? [{ text: `สาขา: ${branch.name} รหัสสาขา ${branch.code || '-'}`,
             opts: { font: CONFIG.font.name, fontSize: CONFIG.sizes.textBody } }]
        : []),
      ...(branch.address
        ? [{ text: branch.address,
             opts: { font: CONFIG.font.name, fontSize: CONFIG.sizes.textBody } }]
        : []),
      { text: `เลขประจำตัวผู้เสียภาษี: ${branch.taxId || '0945566000616'}`,
        opts: { font: CONFIG.font.name, fontSize: CONFIG.sizes.textBody } },
      { text: `โทร: ${branch.tel || '09-2427-0769'}`,
        opts: { font: CONFIG.font.name, fontSize: CONFIG.sizes.textBody } },
    ];

    let y = startY;
    lines.forEach(({ text, opts }) => {
      doc.font(opts.font)
         .fontSize(opts.fontSize)
         .fillColor(CONFIG.color.textDark)
         .text(text, compX, y, { width: compW, align: 'left' });
      y += doc.currentLineHeight(true) * CONFIG.sizes.lineSpacing;
    });

    return Math.max(startY + logoH, y, startY + 65) + 10;
  }

  /** @private วาดข้อมูลใบสำคัญรับเงิน */
  static _drawReceiptInfo(doc, receiptVoucher, margins, bodyW, startY) {
    const leftColX = margins.left;
    const leftColW = bodyW * 0.6;
    const rightColX = margins.left + bodyW * 0.65;
    const rightColW = bodyW * 0.35;
    let currentY = startY;

    // กรอบรอบข้อมูล
    const boxH = 80;
    doc.rect(margins.left, startY - 5, bodyW, boxH)
       .strokeColor(CONFIG.color.lineLight)
       .stroke();

    // ข้อมูลฝั่งซ้าย
    doc.font(CONFIG.font.boldName).fontSize(CONFIG.sizes.textBody)
       .fillColor(CONFIG.color.textBlack)
       .text('รับเงินจาก / Received From:', leftColX + 10, currentY);

    currentY += 18;
    doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.textBody)
       .fillColor(CONFIG.color.textDark)
       .text(receiptVoucher.receivedFrom || '-', leftColX + 10, currentY);

    currentY += 20;
    doc.font(CONFIG.font.boldName).fontSize(CONFIG.sizes.textBody)
       .fillColor(CONFIG.color.textBlack)
       .text('ประเภทการรับเงิน / Receipt Type:', leftColX + 10, currentY);

    currentY += 18;
    doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.textBody)
       .fillColor(CONFIG.color.textDark)
       .text(RECEIPT_TYPE_MAP[receiptVoucher.receiptType] || receiptVoucher.receiptType || '-',
             leftColX + 10, currentY);

    // ข้อมูลฝั่งขวา
    currentY = startY;

    // เลขที่อ้างอิง (แทนที่ เลขที่ / No.)
    doc.font(CONFIG.font.boldName).fontSize(CONFIG.sizes.textBody)
       .fillColor(CONFIG.color.textBlack)
       .text('เลขที่อ้างอิง / Ref No.:', rightColX, currentY);

    // แสดงเลขที่อ้างอิงจาก reference.invoiceNumber หรือ notes
    const refNumber = receiptVoucher.reference?.invoiceNumber ||
                      receiptVoucher.notes?.match(/Invoice:\s*(\S+)/)?.[1] ||
                      '-';

    doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.textBody)
       .fillColor(CONFIG.color.textDark)
       .text(refNumber, rightColX + 100, currentY);

    currentY += 25;

    // วันที่
    doc.font(CONFIG.font.boldName).fontSize(CONFIG.sizes.textBody)
       .fillColor(CONFIG.color.textBlack)
       .text('วันที่ / Date:', rightColX, currentY);

    doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.textBody)
       .fillColor(CONFIG.color.textDark)
       .text(receiptVoucher.paymentDateFormatted || '-', rightColX + 60, currentY);

    return startY + boxH + 10;
  }

  /** @private วาดตารางรายการสินค้า - เพิ่มใหม่ */
  static _drawItemsTable(doc, receiptVoucher, margins, bodyW, startY, pageH) {
    const leftX = margins.left;
    const headerH = 25;
    const cols = { ...CONFIG.layout.itemTableCols };
    let currentY = startY;

    // หัวตาราง
    doc.font(CONFIG.font.boldName)
       .fontSize(CONFIG.sizes.heading3)
       .fillColor(CONFIG.color.textDark)
       .text('รายการสินค้า / Item List:', leftX, currentY);

    currentY += 20;

    // Header row
    doc.rect(leftX, currentY, bodyW, headerH)
       .fill(CONFIG.color.bgLight);

    const headers = [
      { th: 'ลำดับ', en: 'No', key: 'no', align: 'center' },
      { th: 'รายการ', en: 'Description', key: 'name', align: 'left' },
      { th: 'จำนวน', en: 'Qty', key: 'qty', align: 'center' },
      { th: 'ราคา/หน่วย', en: 'Unit Price', key: 'price', align: 'right' },
      { th: 'จำนวนเงิน', en: 'Amount', key: 'amount', align: 'right' }
    ];

    let currentX = leftX;
    const headerPaddingV = 5;
    const thY = currentY + headerPaddingV;

    doc.fillColor(CONFIG.color.textDark);
    headers.forEach(h => {
      doc.font(CONFIG.font.boldName)
         .fontSize(CONFIG.sizes.tableHeader)
         .text(h.th, currentX + 5, thY, { width: cols[h.key] - 10, align: h.align });
      currentX += cols[h.key];
    });

    currentY += headerH;
    doc.moveTo(leftX, currentY)
       .lineTo(leftX + bodyW, currentY)
       .strokeColor(CONFIG.color.lineDark)
       .lineWidth(0.7)
       .stroke();

    // Data rows
    doc.font(CONFIG.font.name)
       .fontSize(CONFIG.sizes.tableRow)
       .fillColor(CONFIG.color.textDark);

    let subtotal = 0;
    receiptVoucher.items.forEach((item, i) => {
      // คำนวณความสูงของแถวตามจำนวนบรรทัด
      let rowH = 25;

      // เตรียม IMEI text
      let imeiText = '';
      if (item.imeiList && Array.isArray(item.imeiList) && item.imeiList.length > 0) {
        imeiText = 'IMEI: ' + item.imeiList.join(', ');
      } else if (item.imei) {
        imeiText = 'IMEI: ' + item.imei;
      } else if (item.serial || item.serialNumber) {
        imeiText = 'Serial: ' + (item.serial || item.serialNumber);
      } else if (item.sku) {
        imeiText = 'SKU: ' + item.sku;
      }

      // ถ้ามี IMEI ให้เพิ่มความสูงแถว
      if (imeiText) {
        rowH = 35; // เพิ่มความสูงเพื่อรองรับ 2 บรรทัด
      }

      const y = currentY + 8;
      let x = leftX;

      // ลำดับ
      doc.text(i + 1, x, y, { width: cols.no, align: 'center' });
      x += cols.no;

      // ชื่อสินค้า + IMEI
      doc.font(CONFIG.font.name)
         .fontSize(CONFIG.sizes.tableRow)
         .fillColor(CONFIG.color.textDark)
         .text(item.name || '-', x + 5, y, { width: cols.name - 10, align: 'left' });

      // แสดง IMEI ใต้ชื่อสินค้า
      if (imeiText) {
        doc.font(CONFIG.font.name)
           .fontSize(CONFIG.sizes.textSmall)
           .fillColor(CONFIG.color.textLight)
           .text(imeiText, x + 5, y + 14, { width: cols.name - 10, align: 'left' });
      }

      x += cols.name;

      // จำนวน
      const qty = item.quantity || item.qty || 1;
      doc.font(CONFIG.font.name)
         .fontSize(CONFIG.sizes.tableRow)
         .fillColor(CONFIG.color.textDark)
         .text(qty.toString(), x, y, { width: cols.qty, align: 'center' });
      x += cols.qty;

      // ราคา/หน่วย
      const unitPrice = ensureNumberData(item.unitPrice || item.price || item.sellPrice);
      doc.text(unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 }),
               x, y, { width: cols.price - 5, align: 'right' });
      x += cols.price;

      // จำนวนเงิน
      const amount = ensureNumberData(item.amount || (qty * unitPrice));
      subtotal += amount;
      doc.text(amount.toLocaleString('en-US', { minimumFractionDigits: 2 }),
               x, y, { width: cols.amount - 5, align: 'right' });

      currentY += rowH;

      // เส้นใต้แถว
      if (i < receiptVoucher.items.length - 1) {
        doc.moveTo(leftX, currentY)
           .lineTo(leftX + bodyW, currentY)
           .strokeColor(CONFIG.color.lineLight)
           .lineWidth(0.5)
           .stroke();
      }
    });

    // Subtotal row
    currentY += 5;
    doc.moveTo(leftX, currentY)
       .lineTo(leftX + bodyW, currentY)
       .strokeColor(CONFIG.color.lineDark)
       .lineWidth(0.7)
       .stroke();

    currentY += 10;
    const subtotalX = leftX + cols.no + cols.name + cols.qty; // Adjusted: removed cols.imei as it's not a separate column in layout

    doc.font(CONFIG.font.boldName)
       .fontSize(CONFIG.sizes.textBody)
       .fillColor(CONFIG.color.textDark)
       .text('รวมสินค้า:', subtotalX, currentY, { width: cols.price, align: 'right' });

    doc.text(subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 }),
             subtotalX + cols.price, currentY,
             { width: cols.amount - 5, align: 'right' });

    return currentY + 20;
  }

  /** @private วาดตารางรายละเอียดบัญชี */
  static _drawDetailsTable(doc, receiptVoucher, margins, bodyW, startY, pageH) {
    const leftX = margins.left;
    const headerH = 25;
    const cols = { ...CONFIG.layout.detailTableCols };
    let currentY = startY;

    // หัวตาราง
    doc.font(CONFIG.font.boldName)
       .fontSize(CONFIG.sizes.heading3)
       .fillColor(CONFIG.color.textDark)
       .text('รายละเอียดบัญชี / Account Details:', leftX, currentY);

    currentY += 20;

    // Header row
    doc.rect(leftX, currentY, bodyW, headerH)
       .fill(CONFIG.color.bgLight);

    const headers = [
      { th: 'ลำดับ', en: 'No', key: 'no', align: 'center' },
      { th: 'รายการ', en: 'Description', key: 'desc', align: 'left' },
      { th: 'จำนวนเงิน', en: 'Amount', key: 'amount', align: 'right' },
      { th: 'หมายเหตุ', en: 'Remarks', key: 'remarks', align: 'left' }
    ];

    let currentX = leftX;
    const headerPaddingV = 5;
    const thY = currentY + headerPaddingV;

    doc.fillColor(CONFIG.color.textDark);
    headers.forEach(h => {
      doc.font(CONFIG.font.boldName)
         .fontSize(CONFIG.sizes.tableHeader)
         .text(h.th, currentX + 5, thY, { width: cols[h.key] - 10, align: h.align });
      currentX += cols[h.key];
    });

    currentY += headerH;
    doc.moveTo(leftX, currentY)
       .lineTo(leftX + bodyW, currentY)
       .strokeColor(CONFIG.color.lineDark)
       .lineWidth(0.7)
       .stroke();

    // Data rows
    doc.font(CONFIG.font.name)
       .fontSize(CONFIG.sizes.tableRow)
       .fillColor(CONFIG.color.textDark);

    let rowIndex = 0;
    receiptVoucher.details.forEach((detail, i) => {
      const rowH = 25;
      const y = currentY + 8;
      let x = leftX;

      // ลำดับ
      doc.text(i + 1, x, y, { width: cols.no, align: 'center' });
      x += cols.no;

      // รายการ
      doc.text(detail.description || '-', x + 5, y, { width: cols.desc - 10, align: 'left' });
      x += cols.desc;

      // จำนวนเงิน
      const amount = ensureNumberData(detail.amount);
      doc.text(amount.toLocaleString('en-US', { minimumFractionDigits: 2 }),
               x, y, { width: cols.amount - 5, align: 'right' });
      x += cols.amount;

      // หมายเหตุ
      doc.text(detail.remarks || '-', x + 5, y, { width: cols.remarks - 10, align: 'left' });

      currentY += rowH;

      // เส้นใต้แถว
      if (i < receiptVoucher.details.length - 1) {
        doc.moveTo(leftX, currentY)
           .lineTo(leftX + bodyW, currentY)
           .strokeColor(CONFIG.color.lineLight)
           .lineWidth(0.5)
           .stroke();
      }

      rowIndex++;
    });

    // Summary row
    const summaryY = currentY + 10;
    const summaryBoxW = 200;
    const summaryBoxX = leftX + bodyW - summaryBoxW;

    // กรอบสรุป
    doc.rect(summaryBoxX, summaryY, summaryBoxW, 30)
       .fill(CONFIG.color.bgLight);

    doc.font(CONFIG.font.boldName)
       .fontSize(CONFIG.sizes.textBody)
       .fillColor(CONFIG.color.textDark)
       .text('รวมเงินทั้งสิ้น / Total:', summaryBoxX + 10, summaryY + 8);

    doc.font(CONFIG.font.boldName)
       .fontSize(CONFIG.sizes.heading3)
       .fillColor(CONFIG.color.primaryBlue)
       .text(`฿${(receiptVoucher.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
               summaryBoxX + 10, summaryY + 8,
               { width: summaryBoxW - 20, align: 'right' });

    return summaryY + 40;
  }

  /** @private วาดจำนวนเงินเป็นตัวอักษร */
  static _drawAmountInWords(doc, receiptVoucher, margins, bodyW, startY) {
    const boxH = 35;

    // กรอบสีฟ้า
    doc.rect(margins.left, startY, bodyW, boxH)
       .fill(CONFIG.color.bgAccent);

    // ข้อความ
    doc.fillColor(CONFIG.color.textHeader)
       .font(CONFIG.font.boldName)
       .fontSize(CONFIG.sizes.textBody)
       .text(`จำนวนเงิน (ตัวอักษร): ${receiptVoucher.amountInWords}`,
             margins.left + 10,
             startY + (boxH - CONFIG.sizes.textBody) / 2,
             { width: bodyW - 20, align: 'left' });

    return startY + boxH;
  }

  /** @private วาดข้อมูลการชำระเงิน */
  static _drawPaymentInfo(doc, receiptVoucher, margins, bodyW, startY) {
    let currentY = startY;
    const colW = bodyW / 2;

    // บัญชีเดบิต
    doc.font(CONFIG.font.boldName)
       .fontSize(CONFIG.sizes.textBody)
       .fillColor(CONFIG.color.textBlack)
       .text('บัญชีเดบิต / Debit Account:', margins.left, currentY);

    currentY += 15;
    doc.font(CONFIG.font.name)
       .fontSize(CONFIG.sizes.textBody)
       .fillColor(CONFIG.color.textDark)
       .text(`${receiptVoucher.debitAccount?.code || ''} - ${receiptVoucher.debitAccount?.name || '-'}`,
             margins.left, currentY);

    // บัญชีเครดิต
    currentY = startY;
    doc.font(CONFIG.font.boldName)
       .fontSize(CONFIG.sizes.textBody)
       .fillColor(CONFIG.color.textBlack)
       .text('บัญชีเครดิต / Credit Account:', margins.left + colW, currentY);

    currentY += 15;
    doc.font(CONFIG.font.name)
       .fontSize(CONFIG.sizes.textBody)
       .fillColor(CONFIG.color.textDark)
       .text(`${receiptVoucher.creditAccount?.code || ''} - ${receiptVoucher.creditAccount?.name || '-'}`,
             margins.left + colW, currentY);

    currentY += 25;

    // วิธีการชำระเงิน
    doc.font(CONFIG.font.boldName)
       .fontSize(CONFIG.sizes.textBody)
       .fillColor(CONFIG.color.textBlack)
       .text('วิธีการชำระ / Payment Method:', margins.left, currentY);

    doc.font(CONFIG.font.name)
       .fontSize(CONFIG.sizes.textBody)
       .fillColor(CONFIG.color.textDark)
       .text(PAYMENT_METHOD_MAP[receiptVoucher.paymentMethod] || receiptVoucher.paymentMethod || '-',
             margins.left + 140, currentY);

    // ข้อมูลธนาคาร (ถ้ามี)
    if (receiptVoucher.bankAccount && receiptVoucher.paymentMethod !== 'cash') {
      currentY += 15;
      doc.font(CONFIG.font.boldName)
         .fontSize(CONFIG.sizes.textBody)
         .fillColor(CONFIG.color.textBlack)
         .text('บัญชีธนาคาร / Bank Account:', margins.left + colW, currentY - 15);

      doc.font(CONFIG.font.name)
         .fontSize(CONFIG.sizes.textBody)
         .fillColor(CONFIG.color.textDark)
         .text(receiptVoucher.bankAccount, margins.left + colW + 140, currentY - 15);
    }

    // หมายเหตุ
    if (receiptVoucher.notes) {
      currentY += 20;
      doc.font(CONFIG.font.boldName)
         .fontSize(CONFIG.sizes.textBody)
         .fillColor(CONFIG.color.textBlack)
         .text('หมายเหตุ / Notes:', margins.left, currentY);

      currentY += 15;
      doc.font(CONFIG.font.name)
         .fontSize(CONFIG.sizes.textLabel)
         .fillColor(CONFIG.color.textDark)
         .text(receiptVoucher.notes, margins.left, currentY, { width: bodyW });
    }

    return currentY + 20;
  }

  /** @private วาดลายเซ็น */
  static _drawSignatures(doc, receiptVoucher, margins, bodyW, startY) {
    const sigBlockH = 80;
    const colW = bodyW / 3;
    const sigLineW = colW * 0.8;
    const sigLineXOffset = (colW - sigLineW) / 2;
    const lineY = startY + 40;
    const imgH = 50;
    const imgPad = 5;

    const colsData = [
      { label: 'ผู้รับเงิน', labelEn: 'Receiver', signature: receiptVoucher.receiptSignature },
      { label: 'ผู้จ่ายเงิน', labelEn: 'Payer', signature: null },
      { label: 'ผู้อนุมัติ', labelEn: 'Approved By', signature: receiptVoucher.approvedSignature }
    ];

    const currentDate = formatThaiDate(new Date().toISOString());

    colsData.forEach((col, i) => {
      const x0 = margins.left + colW * i;
      const imgX = x0 + sigLineXOffset;
      const imgY = lineY - imgH - imgPad;

      // วาดลายเซ็น (ถ้ามี)
      let signatureDrawn = false;
      if (col.signature && Buffer.isBuffer(col.signature)) {
        try {
          doc.image(col.signature, imgX, imgY, {
            fit: [sigLineW, imgH],
            align: 'center',
            valign: 'bottom'
          });
          signatureDrawn = true;
        } catch (e) {
          console.warn(`Signature draw failed:`, e.message);
        }
      }

      // เส้นลายเซ็น
      if (!signatureDrawn) {
        const lineX = x0 + sigLineXOffset;
        doc.moveTo(lineX, lineY)
           .lineTo(lineX + sigLineW, lineY)
           .dash(2, { space: 2 })
           .strokeColor(CONFIG.color.sigLine)
           .stroke()
           .undash();
      }

      // ข้อความใต้เส้น
      let textY = lineY + 8;

      // ชื่อตำแหน่ง
      doc.font(CONFIG.font.boldName)
         .fontSize(CONFIG.sizes.textLabel)
         .fillColor(CONFIG.color.textDark)
         .text(col.label, x0, textY, { width: colW, align: 'center' });

      textY += 12;
      doc.font(CONFIG.font.name)
         .fontSize(CONFIG.sizes.textSmall)
         .fillColor(CONFIG.color.textLight)
         .text(col.labelEn, x0, textY, { width: colW, align: 'center' });

      // วันที่
      textY += 12;
      doc.font(CONFIG.font.name)
         .fontSize(CONFIG.sizes.textSmall)
         .fillColor(CONFIG.color.textLight)
         .text(`วันที่: ${currentDate}`, x0, textY, { width: colW, align: 'center' });
    });

    // เส้นแบ่งแนวตั้ง
    doc.save()
       .moveTo(margins.left + colW, startY + 5)
       .lineTo(margins.left + colW, startY + sigBlockH - 5)
       .moveTo(margins.left + 2*colW, startY + 5)
       .lineTo(margins.left + 2*colW, startY + sigBlockH - 5)
       .strokeColor(CONFIG.color.lineLight)
       .lineWidth(0.5)
       .stroke()
       .restore();

    return startY + sigBlockH;
  }

  /** @private วาดส่วนท้าย */
  static _drawFooter(doc, margins, pageW, pageH) {
    const footerY = pageH - margins.bottom + 10;
    const lineY = footerY - 12;

    // เส้นแบ่ง
    doc.moveTo(margins.left, lineY)
       .lineTo(pageW - margins.right, lineY)
       .strokeColor(CONFIG.color.primaryBlue)
       .lineWidth(1)
       .stroke();

    // ข้อความท้าย
    const footerText = 'เอกสารนี้ออกโดยระบบอัตโนมัติและมีผลสมบูรณ์';
    doc.font(CONFIG.font.name)
       .fontSize(CONFIG.sizes.textSmall)
       .fillColor(CONFIG.color.textLight)
       .text(footerText,
             margins.left,
             footerY,
             { width: pageW - margins.left - margins.right, align: 'center' });
  }
}

module.exports = ReceiptVoucherPdfController;
