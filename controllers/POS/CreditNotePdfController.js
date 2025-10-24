/**
 * @file CreditNotePdfController.js
 * @description Controller for creating minimalist luxury-style PDF Credit Notes
 * @version 1.0.0
 * @date 2025-01-12
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// --- Configuration ---
const CONFIG = {
  page: { size: 'A4', margin: 45 },
  font: {
    name: 'THSarabun',
    boldName: 'THSarabun-Bold',
    path: path.join(__dirname, '..', '..', 'fonts', 'THSarabunNew.ttf'),
    boldPath: path.join(__dirname, '..', '..', 'fonts', 'THSarabunNew Bold.ttf')
  },
  color: {
    // Luxury color palette - Red accent for Credit Note
    primaryRed: '#DC143C',       // Crimson for headers
    accentGold: '#DAA520',       // Goldenrod for emphasis
    textBlack: '#1A1A1A',        // Almost black for main text
    textDark: '#2C2C2C',         // Dark gray for secondary text
    textLight: '#666666',        // Light gray for labels
    lineLight: '#E8E8E8',        // Very light gray for lines
    lineMedium: '#D0D0D0',       // Medium gray for dividers
    bgRed: '#DC143C',            // Background red
    bgLightRed: '#FFF0F0',       // Very light red tint
    bgGold: '#FFF8DC',           // Cornsilk gold background
    textWhite: '#FFFFFF'
  },
  sizes: {
    logo: { w: 130 },           // Smaller for minimal look
    heading1: 24,               // Main title
    heading2: 16,               // Section headers
    heading3: 14,               // Subsection headers
    textBody: 12,               // Body text
    textLabel: 11,              // Labels
    textSmall: 10,              // Small text
    tableHeader: 12,
    tableRow: 11,
    lineSpacing: 1.5
  },
  layout: {
    // Table columns for credit note
    tableCols: {
      no: 40,
      desc: 220,
      qty: 60,
      unit: 60,
      price: 75,
      amount: 80
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

  const filePath = path.normalize(url);
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath);
  }

  const uploadFilePath = path.join(process.cwd(), 'uploads', path.basename(url));
  if (fs.existsSync(uploadFilePath)) {
    return fs.readFileSync(uploadFilePath);
  }

  if (url.startsWith('data:image')) {
    const base64 = url.split(',')[1];
    return Buffer.from(base64, 'base64');
  }

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

  console.warn('loadImageBuffer: file not found');
  return null;
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
    console.error('Error formatting date:', e);
    return '-';
  }
}

const bahtText = require('thai-baht-text');

function toThaiBahtText(n) {
  return bahtText(n);
}

// Map reason codes to Thai descriptions
const reasonMap = {
  'cancelled_order': 'ยกเลิกการสั่งซื้อ',
  'defective_product': 'สินค้าชำรุด/มีปัญหา',
  'wrong_product': 'ส่งสินค้าผิด',
  'price_adjustment': 'ปรับปรุงราคา',
  'other': 'อื่นๆ'
};

class CreditNotePdfController {

  /**
   * สร้างไฟล์ PDF ใบลดหนี้
   * @param {object} creditNote ข้อมูลใบลดหนี้
   * @returns {Promise<{buffer: Buffer, fileName: string}>} Promise ที่ resolve เป็น buffer ของ PDF และชื่อไฟล์
   */
  static async createCreditNotePdf(creditNote) {
    // ตรวจสอบข้อมูล
    if (!creditNote) {
      throw new Error('Credit note data is required');
    }

    // Clone object
    const data = JSON.parse(JSON.stringify(creditNote));

    // Initialize
    data.customer = data.customer || {};
    data.issuedBy = data.issuedBy || {};
    data.approvedBy = data.approvedBy || {};
    data.branch = data.branch || {}; // Ensure branch is initialized
    data.items = Array.isArray(data.items) ? data.items : []; // Ensure items is an array

    // Preload signatures
    try {
      const [custBuf, issuedBuf, approvedBuf] = await Promise.all([
        loadImageBuffer(data.customerSignatureUrl),
        loadImageBuffer(data.issuedBySignatureUrl),
        loadImageBuffer(data.approvedBySignatureUrl),
      ]);

      if (custBuf) data.customer.signature = custBuf;
      if (issuedBuf) data.issuedBy.signature = issuedBuf;
      if (approvedBuf) data.approvedBy.signature = approvedBuf;
    } catch (sigError) {
      console.warn('Warning: Could not load signatures:', sigError.message);
      // Continue without signatures
    }

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: CONFIG.page.size,
          margins: { top: 20, bottom: 45, left: 45, right: 45 },
          autoFirstPage: true,
          compress: false // ปิด compression ช่วยแก้ปัญหาบางครั้ง
        });

        const chunks = [];
        let errorOccurred = false;

        doc.on('error', (err) => {
          console.error('PDFDocument error:', err);
          errorOccurred = true;
          if (!doc.writableEnded) { // Prevent multiple rejections if error occurs after end
            reject(err);
          }
        });

        doc.on('data', chunk => {
          if (!errorOccurred) {
            chunks.push(chunk);
          }
        });

        doc.on('end', () => {
          if (errorOccurred) return;

          try {
            const buffer = Buffer.concat(chunks);

            if (buffer.length === 0) {
              reject(new Error('Generated PDF buffer is empty'));
              return;
            }

            // แก้ไขชื่อไฟล์ - ตรวจสอบว่ามี CN- อยู่แล้วหรือไม่
            let fileName = data.creditNoteNumber || `TEMP-${Date.now()}`;

            // ถ้าชื่อไฟล์ยังไม่มี .pdf ให้เพิ่ม
            if (!fileName.endsWith('.pdf')) {
              // ถ้าไม่มี CN- ในชื่อไฟล์ให้เพิ่ม
              if (!fileName.includes('CN-')) {
                fileName = `CN-${fileName}.pdf`;
              } else {
                fileName = `${fileName}.pdf`;
              }
            }

            // console.log(`✅ PDF generated: ${fileName}, Size: ${buffer.length} bytes`);
            resolve({ buffer, fileName });
          } catch (bufErr) {
            console.error('Error processing PDF buffer on end:', bufErr);
            reject(bufErr);
          }
        });

        // ใช้ default font ถ้าไม่พบ Thai font
        try {
          if (fs.existsSync(CONFIG.font.path)) {
            doc.registerFont(CONFIG.font.name, CONFIG.font.path);
            if (fs.existsSync(CONFIG.font.boldPath)) {
              doc.registerFont(CONFIG.font.boldName, CONFIG.font.boldPath);
            }
            doc.font(CONFIG.font.name);
          } else {
            console.warn('Thai font not found, using Helvetica');
            doc.font('Helvetica');
          }
        } catch (fontErr) {
          console.error('Font error:', fontErr);
          doc.font('Helvetica');
        }

        // --- เริ่มสร้าง PDF content ---
        const { width: W, height: H } = doc.page;
        let margins = doc.page.margins;
        if (!margins || typeof margins.top !== 'number') {
          margins = { top: 45, bottom: 45, left: 45, right: 45 };
        }
        const bodyW = W - margins.left - margins.right;
        let currentY = margins.top;

        // Format dates
        data.creditNoteDateFormatted = data.creditNoteDate ? formatThaiDate(data.creditNoteDate) : '-';
        data.refundDateFormatted = data.refundDate ? formatThaiDate(data.refundDate) : '-' ;

        // Normalize items
        data.items = data.items.map(item => ({
          productCode: item.productCode || '',
          productName: item.productName || item.description || '-',
          quantity: ensureNumberData(item.quantity, 1),
          unit: item.unit || 'ชิ้น',
          pricePerUnit: ensureNumberData(item.pricePerUnit, 0),
          discount: ensureNumberData(item.discount, 0),
          amount: ensureNumberData(item.amount, 0)
        }));

        // Calculate totals
        data.subtotal = ensureNumberData(data.subtotal, 0);
        data.discountAmount = ensureNumberData(data.discountAmount, 0);
        data.afterDiscount = ensureNumberData(data.afterDiscount, data.subtotal - data.discountAmount);
        data.vatAmount = ensureNumberData(data.vatAmount, 0);
        data.totalAmount = ensureNumberData(data.totalAmount, 0);
        data.amountInWords = toThaiBahtText(data.totalAmount);

        // Drawing sections (using 'data' object)
        currentY = this._drawHeader(doc, data, margins, W, currentY);
        currentY = this._drawCreditNoteInfo(doc, data, margins, bodyW, currentY);
        currentY = this._drawCustomerInfo(doc, data, margins, bodyW, currentY);
        currentY = this._drawReasonSection(doc, data, margins, bodyW, currentY);
        currentY = this._drawItemsTable(doc, data, margins, bodyW, currentY);
        currentY = this._drawSummary(doc, data, margins, bodyW, currentY);

        if (data.refundMethod) {
          currentY = this._drawRefundDetails(doc, data, margins, bodyW, currentY);
        }

        const signaturesHeight = 70;
        const pageFooterHeight = 25;
        const notesHeight = this._getNotesHeight(doc, data, bodyW);
        const paddingBetween = 10;

        const minSigY = currentY + 20;
        const footerTotalH = pageFooterHeight + notesHeight + paddingBetween + signaturesHeight;
        const bottomSigY = H - margins.bottom - footerTotalH;
        const signatureY = Math.max(minSigY, bottomSigY);

        this._drawSignatures(doc, data, margins, bodyW, signatureY);

        if (data.notes) {
          const notesY = signatureY + signaturesHeight + paddingBetween;
          this._drawNotes(doc, data, margins, bodyW, notesY, notesHeight);
        }

        this._drawPageFooter(doc, margins, W, H);
        // --- จบการสร้าง PDF content ---

        // จบการสร้าง PDF
        if (!errorOccurred) {
            doc.end();
        }

      } catch (err) {
        console.error(`Error in createCreditNotePdf (outer try-catch): ${err.message}\nStack: ${err.stack}`);
        reject(err);
      }
    });
  }

  /** @private วาดส่วนหัว - Minimal luxury style */
  static _drawHeader(doc, creditNote, margins, pageW, startY) {
    const fullW = pageW - margins.left - margins.right;
    const logoPath = path.join(__dirname, '..', '..', 'Logo', 'Logo2png.png');
    const logoW = CONFIG.sizes.logo.w;
    let logoH = 0;

    // Logo
    if (fs.existsSync(logoPath)) {
      const img = doc.openImage(logoPath);
      logoH = (img.height * logoW) / img.width;
      doc.image(logoPath, margins.left, startY, { width: logoW });
    }

    // Title with elegant styling
    const titleText = 'ใบลดหนี้';
    const subtitleText = 'CREDIT NOTE';

    doc.font(CONFIG.font.boldName).fontSize(CONFIG.sizes.heading1);
    const titleW = doc.widthOfString(titleText);

    // Main title
    doc.fillColor(CONFIG.color.primaryRed)
       .text(titleText, margins.left + fullW - titleW - 80, startY + 10,
             { width: titleW + 80, align: 'right' });

    // Subtitle
    doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.heading3)
       .fillColor(CONFIG.color.textLight)
       .text(subtitleText, margins.left + fullW - titleW - 80, startY + 35,
             { width: titleW + 80, align: 'right' });

    // Company info - centered
    const branch = creditNote.branch || {};
    const companyY = startY + 5;
    const companyX = margins.left + logoW + 20;
    const companyW = fullW - logoW - titleW - 100;

    doc.font(CONFIG.font.boldName).fontSize(CONFIG.sizes.heading2)
       .fillColor(CONFIG.color.textBlack)
       .text(branch.name || 'บริษัท 2 พี่น้อง โมบาย จำกัด', companyX, companyY,
             { width: companyW, align: 'left' });

    let infoY = companyY + 25;
    const companyInfo = [
      branch.address || 'ที่อยู่บริษัท',
      `เลขประจำตัวผู้เสียภาษี: ${branch.taxId || '0945566000616'}`,
      `โทร: ${branch.tel || '09-2427-0769'}`
    ];

    doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.textLabel)
       .fillColor(CONFIG.color.textDark);

    companyInfo.forEach(info => {
      doc.text(info, companyX, infoY, { width: companyW, align: 'left' });
      infoY += 15;
    });

    // Elegant line separator
    const lineY = Math.max(startY + logoH, infoY) + 15;
    doc.moveTo(margins.left, lineY)
       .lineTo(margins.left + fullW, lineY)
       .strokeColor(CONFIG.color.accentGold)
       .lineWidth(2)
       .stroke();

    return lineY + 10;
  }

  /** @private วาดข้อมูลใบลดหนี้ */
  static _drawCreditNoteInfo(doc, creditNote, margins, bodyW, startY) {
    const boxH = 60;
    const boxY = startY;

    // Background box
    doc.rect(margins.left, boxY, bodyW, boxH)
       .fill(CONFIG.color.bgLightRed);

    // Credit Note info in elegant layout
    const infoY = boxY + 10;
    const halfW = bodyW / 2;

    // Left column
    let leftY = infoY;
    doc.font(CONFIG.font.boldName).fontSize(CONFIG.sizes.textBody)
       .fillColor(CONFIG.color.primaryRed)
       .text('เลขที่ใบลดหนี้: ', margins.left + 15, leftY);

    doc.font(CONFIG.font.name)
       .fillColor(CONFIG.color.textBlack)
       .text(creditNote.creditNoteNumber || '-', margins.left + 100, leftY);

    leftY += 20;
    doc.font(CONFIG.font.boldName)
       .fillColor(CONFIG.color.primaryRed)
       .text('อ้างอิงใบรับเงินมัดจำ: ', margins.left + 15, leftY);

    doc.font(CONFIG.font.name)
       .fillColor(CONFIG.color.textBlack)
       .text(creditNote.depositReceiptNumber || '-', margins.left + 130, leftY);

    // Right column
    let rightY = infoY;
    doc.font(CONFIG.font.boldName)
       .fillColor(CONFIG.color.primaryRed)
       .text('วันที่: ', margins.left + halfW, rightY);

    doc.font(CONFIG.font.name)
       .fillColor(CONFIG.color.textBlack)
       .text(creditNote.creditNoteDateFormatted, margins.left + halfW + 35, rightY);

    rightY += 20;
    doc.font(CONFIG.font.boldName)
       .fillColor(CONFIG.color.primaryRed)
       .text('สถานะ: ', margins.left + halfW, rightY);

    const statusMap = {
      'draft': 'ฉบับร่าง',
      'approved': 'อนุมัติแล้ว',
      'cancelled': 'ยกเลิก'
    };

    doc.font(CONFIG.font.name)
       .fillColor(creditNote.status === 'cancelled' ? CONFIG.color.primaryRed : CONFIG.color.textBlack)
       .text(statusMap[creditNote.status] || creditNote.status || '-', margins.left + halfW + 40, rightY);

    return boxY + boxH + 15;
  }

  /** @private วาดข้อมูลลูกค้า */
  static _drawCustomerInfo(doc, creditNote, margins, bodyW, startY) {
    // Section header
    doc.font(CONFIG.font.boldName).fontSize(CONFIG.sizes.heading3)
       .fillColor(CONFIG.color.primaryRed)
       .text('ข้อมูลลูกค้า', margins.left, startY);

    const lineY = startY + 20;
    doc.moveTo(margins.left, lineY)
       .lineTo(margins.left + 100, lineY)
       .strokeColor(CONFIG.color.accentGold)
       .lineWidth(1.5)
       .stroke();

    let currentY = lineY + 15;
    const labelW = 100;
    const valueX = margins.left + labelW + 10;

    // Customer fields
    const fields = [
      { label: 'ชื่อลูกค้า:', value: creditNote.customerName || creditNote.customer.name || '-' },
      { label: 'ที่อยู่:', value: creditNote.customerAddress || creditNote.customer.address || '-' },
      { label: 'เลขประจำตัวผู้เสียภาษี:', value: creditNote.customerTaxId || creditNote.customer.taxId || '-' },
      { label: 'โทรศัพท์:', value: creditNote.customerPhone || creditNote.customer.phone || '-' }
    ];

    doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.textBody);

    fields.forEach(field => {
      doc.fillColor(CONFIG.color.textLight)
         .text(field.label, margins.left, currentY, { width: labelW });

      doc.fillColor(CONFIG.color.textBlack)
         .text(field.value, valueX, currentY);

      currentY += 20;
    });

    return currentY + 10;
  }

  /** @private วาดส่วนเหตุผล */
  static _drawReasonSection(doc, creditNote, margins, bodyW, startY) {
    doc.font(CONFIG.font.boldName).fontSize(CONFIG.sizes.heading3)
       .fillColor(CONFIG.color.primaryRed)
       .text('เหตุผลในการลดหนี้', margins.left, startY);

    const lineY = startY + 20;
    doc.moveTo(margins.left, lineY)
       .lineTo(margins.left + 120, lineY)
       .strokeColor(CONFIG.color.accentGold)
       .lineWidth(1.5)
       .stroke();

    let currentY = lineY + 15;

    // Reason
    const reasonText = reasonMap[creditNote.reason] || creditNote.reason || '-';
    doc.font(CONFIG.font.boldName).fontSize(CONFIG.sizes.textBody)
       .fillColor(CONFIG.color.textDark)
       .text('เหตุผล: ', margins.left, currentY);

    doc.font(CONFIG.font.name)
       .fillColor(CONFIG.color.textBlack)
       .text(reasonText, margins.left + 50, currentY);

    currentY += 20;

    // Reason detail if any
    if (creditNote.reasonDetail) {
      doc.font(CONFIG.font.boldName)
         .fillColor(CONFIG.color.textDark)
         .text('รายละเอียด: ', margins.left, currentY);

      currentY += 15;
      doc.font(CONFIG.font.name)
         .fillColor(CONFIG.color.textBlack)
         .text(creditNote.reasonDetail, margins.left, currentY, { width: bodyW });

      currentY += doc.heightOfString(creditNote.reasonDetail, { width: bodyW });
    }

    return currentY + 15;
  }

  /** @private วาดตารางรายการ */
  static _drawItemsTable(doc, creditNote, margins, bodyW, startY) {
    const cols = CONFIG.layout.tableCols;
    const headerH = 35;
    let currentY = startY;

    // Table header with luxury style
    doc.rect(margins.left, currentY, bodyW, headerH)
       .fill(CONFIG.color.bgRed);

    // Header text
    const headers = [
      { text: 'ลำดับ', key: 'no', align: 'center' },
      { text: 'รายการ', key: 'desc', align: 'left' },
      { text: 'จำนวน', key: 'qty', align: 'center' },
      { text: 'หน่วย', key: 'unit', align: 'center' },
      { text: 'ราคา/หน่วย', key: 'price', align: 'right' },
      { text: 'จำนวนเงิน', key: 'amount', align: 'right' }
    ];

    let headerX = margins.left;
    const headerY = currentY + (headerH - CONFIG.sizes.tableHeader) / 2;

    doc.font(CONFIG.font.boldName).fontSize(CONFIG.sizes.tableHeader)
       .fillColor(CONFIG.color.textWhite);

    headers.forEach(h => {
      doc.text(h.text, headerX + 5, headerY,
               { width: cols[h.key] - 10, align: h.align });
      headerX += cols[h.key];
    });

    currentY += headerH;

    // Data rows
    doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.tableRow);

    creditNote.items.forEach((item, idx) => {
      const rowH = 30;
      const y = currentY + 8;
      let x = margins.left;

      // Alternate row background
      if (idx % 2 === 0) {
        doc.rect(margins.left, currentY, bodyW, rowH)
           .fill('#FAFAFA');
      }

      // Row number
      doc.fillColor(CONFIG.color.textDark);
      doc.text(idx + 1, x + 5, y, { width: cols.no - 10, align: 'center' });
      x += cols.no;

      // Description with product code
      let descText = item.productName;
      if (item.productCode) {
        descText = `${item.productCode} - ${item.productName}`;
      }
      doc.text(descText, x + 5, y, { width: cols.desc - 10, align: 'left' });
      x += cols.desc;

      // Quantity
      doc.text(item.quantity, x + 5, y, { width: cols.qty - 10, align: 'center' });
      x += cols.qty;

      // Unit
      doc.text(item.unit, x + 5, y, { width: cols.unit - 10, align: 'center' });
      x += cols.unit;

      // Price per unit
      doc.text(item.pricePerUnit.toLocaleString('th-TH', { minimumFractionDigits: 2 }),
               x + 5, y, { width: cols.price - 10, align: 'right' });
      x += cols.price;

      // Amount
      doc.text(item.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 }),
               x + 5, y, { width: cols.amount - 10, align: 'right' });

      currentY += rowH;
    });

    // Final line
    doc.moveTo(margins.left, currentY)
       .lineTo(margins.left + bodyW, currentY)
       .strokeColor(CONFIG.color.lineMedium)
       .lineWidth(1)
       .stroke();

    return currentY + 15;
  }

  /** @private วาดส่วนสรุปยอดเงิน */
  static _drawSummary(doc, creditNote, margins, bodyW, startY) {
    const summaryW = bodyW * 0.5;
    const summaryX = margins.left + bodyW - summaryW;
    const padding = 10;
    const rowH = 25;

    // Summary items
    const summaryItems = [
      { label: 'ยอดรวม:', value: creditNote.subtotal },
      { label: 'ส่วนลด:', value: creditNote.discountAmount },
      { label: 'ยอดหลังหักส่วนลด:', value: creditNote.afterDiscount }
    ];

    // Add VAT if applicable
    if (creditNote.vatType !== 'none' && creditNote.vatAmount > 0) {
      summaryItems.push({
        label: `ภาษีมูลค่าเพิ่ม ${creditNote.vatRate || 7}%:`,
        value: creditNote.vatAmount
      });
    }

    summaryItems.push({
      label: 'ยอดลดหนี้ทั้งสิ้น:',
      value: creditNote.totalAmount,
      bold: true,
      highlight: true
    });

    let currentY = startY;

    summaryItems.forEach(item => {
      if (item.highlight) {
        // Highlight total amount
        const boxH = rowH + 10;
        doc.rect(summaryX - 10, currentY - 5, summaryW + 20, boxH)
           .fill(CONFIG.color.bgGold);

        doc.font(CONFIG.font.boldName).fontSize(CONFIG.sizes.textBody + 2)
           .fillColor(CONFIG.color.primaryRed);
      } else if (item.bold) {
        doc.font(CONFIG.font.boldName).fontSize(CONFIG.sizes.textBody)
           .fillColor(CONFIG.color.textBlack);
      } else {
        doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.textBody)
           .fillColor(CONFIG.color.textDark);
      }

      doc.text(item.label, summaryX, currentY, { width: summaryW/2, align: 'left' });
      doc.text(item.value.toLocaleString('th-TH', { minimumFractionDigits: 2 }) + ' บาท',
               summaryX, currentY, { width: summaryW - padding, align: 'right' });

      currentY += item.highlight ? rowH + 10 : rowH;
    });

    // Amount in words
    const wordsBoxY = currentY + 10;
    const wordsBoxH = 40;

    doc.rect(margins.left, wordsBoxY, bodyW * 0.65, wordsBoxH)
       .fill(CONFIG.color.primaryRed);

    doc.font(CONFIG.font.boldName).fontSize(CONFIG.sizes.textBody)
       .fillColor(CONFIG.color.textWhite)
       .text(creditNote.amountInWords,
             margins.left + padding,
             wordsBoxY + (wordsBoxH - CONFIG.sizes.textBody) / 2,
             { width: bodyW * 0.65 - padding * 2, align: 'center' });

    return wordsBoxY + wordsBoxH + 20;
  }

  /** @private วาดรายละเอียดการคืนเงิน */
  static _drawRefundDetails(doc, creditNote, margins, bodyW, startY) {
    doc.font(CONFIG.font.boldName).fontSize(CONFIG.sizes.heading3)
       .fillColor(CONFIG.color.primaryRed)
       .text('รายละเอียดการคืนเงิน', margins.left, startY);

    const lineY = startY + 20;
    doc.moveTo(margins.left, lineY)
       .lineTo(margins.left + 130, lineY)
       .strokeColor(CONFIG.color.accentGold)
       .lineWidth(1.5)
       .stroke();

    let currentY = lineY + 15;
    const labelW = 120;
    const valueX = margins.left + labelW + 10;

    // Refund method mapping
    const refundMethodMap = {
      'cash': 'เงินสด',
      'transfer': 'โอนเงิน',
      'check': 'เช็คธนาคาร',
      'credit_card': 'บัตรเครดิต'
    };

    const refundInfo = [
      { label: 'วิธีการคืนเงิน:', value: refundMethodMap[creditNote.refundMethod] || creditNote.refundMethod || '-' },
      { label: 'วันที่คืนเงิน:', value: creditNote.refundDateFormatted || '-' },
      { label: 'จำนวนเงินที่คืน:', value: creditNote.refundAmount ? creditNote.refundAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 }) + ' บาท' : '-' }
    ];

    doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.textBody);

    refundInfo.forEach(info => {
      doc.fillColor(CONFIG.color.textLight)
         .text(info.label, margins.left, currentY, { width: labelW });

      doc.fillColor(CONFIG.color.textBlack)
         .text(info.value, valueX, currentY);

      currentY += 20;
    });

    // Refund evidence if any
    if (creditNote.refundEvidence) {
      doc.fillColor(CONFIG.color.textLight)
         .text('หลักฐานการคืนเงิน:', margins.left, currentY, { width: labelW });

      doc.fillColor(CONFIG.color.textBlack)
         .text(creditNote.refundEvidence, valueX, currentY);

      currentY += 20;
    }

    return currentY + 10;
  }

  /** @private คำนวณความสูงของหมายเหตุ */
  static _getNotesHeight(doc, creditNote, bodyW) {
    if (!creditNote.notes) return 0;

    let height = 0;
    doc.font(CONFIG.font.boldName).fontSize(CONFIG.sizes.textBody);
    height += ensureHeight(doc.currentLineHeight(true) * 1.2);

    doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.textSmall);
    height += ensureHeight(doc.heightOfString(creditNote.notes, { width: bodyW, lineGap: 3 }));

    return height;
  }

  /** @private วาดลายเซ็น */
  static _drawSignatures(doc, creditNote, margins, bodyW, startY) {
    const sigBlockH = 70;
    const colW = bodyW / 3;
    const sigLineW = colW * 0.75;
    const sigLineXOffset = (colW - sigLineW) / 2;
    const lineY = startY + 25;
    const imgH = 50;
    const imgPad = 5;

    const colsData = [
      { label: 'ผู้รับใบลดหนี้', labelEn: 'Received By', key: 'customer.signature' },
      { label: 'ผู้จัดทำ', labelEn: 'Issued By', key: 'issuedBy.signature' },
      { label: 'ผู้อนุมัติ', labelEn: 'Approved By', key: 'approvedBy.signature' }
    ];

    const currentDateThai = formatThaiDate(new Date().toISOString());

    colsData.forEach((col, i) => {
      const x0 = margins.left + colW * i;
      const sigBuffer = col.key.split('.').reduce((o, k) => (o && o[k] != null ? o[k] : null), creditNote);

      const imgX = x0 + sigLineXOffset;
      const imgY = lineY - imgH - imgPad;

      let signatureDrawn = false;
      if (Buffer.isBuffer(sigBuffer)) {
        try {
          doc.image(sigBuffer, imgX, imgY, { fit: [sigLineW, imgH], align: 'center', valign: 'bottom' });
          signatureDrawn = true;
        } catch (e) {
          console.warn(`Signature Buffer draw failed for ${col.key}:`, e.message);
        }
      }

      if (!signatureDrawn) {
        const lineX = x0 + sigLineXOffset;
        doc.moveTo(lineX, lineY)
           .lineTo(lineX + sigLineW, lineY)
           .dash(2, { space: 2 })
           .strokeColor(CONFIG.color.textLight)
           .stroke()
           .undash();
      }

      let textY = lineY + 8;
      doc.font(CONFIG.font.boldName).fontSize(CONFIG.sizes.textLabel)
         .fillColor(CONFIG.color.textDark)
         .text(col.label, x0, textY, { width: colW, align: 'center' });

      textY += 12;
      doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.textSmall)
         .fillColor(CONFIG.color.textLight)
         .text(col.labelEn, x0, textY, { width: colW, align: 'center' });

      textY += 12;
      doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.textSmall)
         .fillColor(CONFIG.color.textLight)
         .text(currentDateThai, x0, textY, { width: colW, align: 'center' });
    });

    // Vertical separators
    doc.save()
       .moveTo(margins.left + colW, startY + 10)
       .lineTo(margins.left + colW, startY + sigBlockH - 10)
       .moveTo(margins.left + 2*colW, startY + 10)
       .lineTo(margins.left + 2*colW, startY + sigBlockH - 10)
       .strokeColor(CONFIG.color.lineLight)
       .lineWidth(0.5)
       .stroke()
       .restore();
  }

  /** @private วาดหมายเหตุ */
  static _drawNotes(doc, creditNote, margins, bodyW, startY, maxHeight) {
    if (!creditNote.notes) return;

    let currentY = startY;

    doc.font(CONFIG.font.boldName).fontSize(CONFIG.sizes.textBody)
       .fillColor(CONFIG.color.primaryRed)
       .text('หมายเหตุ', margins.left, currentY);

    currentY += ensureHeight(doc.currentLineHeight(true) * 1.2);

    doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.textSmall)
       .fillColor(CONFIG.color.textDark)
       .text(creditNote.notes, margins.left, currentY, { width: bodyW, lineGap: 3 });

    return currentY + doc.heightOfString(creditNote.notes, { width: bodyW, lineGap: 3 });
  }

  /** @private วาดส่วนท้ายหน้า */
  static _drawPageFooter(doc, margins, pageW, pageH) {
    const footerY = pageH - margins.bottom + 15;
    const lineY = footerY - 10;

    doc.moveTo(margins.left, lineY)
       .lineTo(pageW - margins.right, lineY)
       .strokeColor(CONFIG.color.accentGold)
       .lineWidth(1)
       .stroke();

    const footerText = '*** เอกสารนี้ออกโดยระบบอิเล็กทรอนิกส์ ***';
    doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.textSmall)
       .fillColor(CONFIG.color.textLight)
       .text(footerText, margins.left, footerY,
             { width: pageW - margins.left - margins.right, align: 'center' });
  }
}

module.exports = CreditNotePdfController;
