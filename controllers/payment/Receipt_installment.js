/**
 * @file Receipt_installment.js
 * @description Controller for creating PDF ใบเสร็จรับเงิน หรือ ใบกำกับภาษี (อิง STEP3: ยอดดาวน์, ค่างวด, จำนวนงวด, คำนวณจำนวนเงิน และภาษีตามตัวเลือก)
 * @version 1.1.0
 * @date 2025-06-03
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// --- Configuration เปลี่ยนให้ตรงกับ QuotationPdfController ---
const CONFIG = {
  page: { size: 'A4', margin: 40 },
  font: {
    name: 'THSarabun',
    boldName: 'THSarabun-Bold',
    path: path.join(__dirname, '..', 'fonts', 'THSarabunNew.ttf'),
    boldPath: path.join(__dirname, '..', 'fonts', 'THSarabunNew Bold.ttf')
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
    logo: { w: 145 },       // ปรับให้เหมือน Quotation
    heading1: 20,           // ปรับจาก 16 → 20
    heading2: 14,           // ปรับจาก 10 → 14
    heading3: 14,           // ปรับจาก 10 → 14
    textBody: 13,           // ปรับจาก 10 → 13
    textLabel: 11,          // ปรับจาก 10 → 11
    textSmall: 10,          // คงเดิม
    tableHeader: 12,        // ปรับจาก 10 → 12
    tableRow: 12,           // ปรับจาก 10 → 12
    lineSpacing: 1.4
  },
  layout: {
    tableCols: {
      no:   30,    // ลดจาก 35 → 30
      desc: 180,   // ลดจาก 225 → 180
      qty:  45,    // เพิ่มจาก 10 → 45
      unit: 80,    // เพิ่มจาก 70 → 80
      disc: 60,    // เพิ่มจาก 55 → 60
      amt:  90     // เพิ่มจาก 85 → 90
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
    path.join(projectRoot, relPath)
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

function formatThaiDate(dateString) {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    const day = date.getDate();
    const month = date.toLocaleDateString('th-TH', { month: 'long' });
    const thaiYear = date.getFullYear() + 543;
    return `${day} ${month} ${thaiYear}`;
  } catch (e) {
    return '-';
  }
}

const bahtText = require('thai-baht-text');
function toThaiBahtText(n) {
  return bahtText(n);
}

class Receipt_installment {

  /**
   * สร้าง PDF ใบเสร็จรับเงิน หรือ ใบกำกับภาษี (อิง STEP3)
   * @param {object} order ข้อมูลใบเสร็จ/ใบกำกับภาษี
   * @returns {Promise<{buffer: Buffer, fileName: string}>}
   */
  static async createReceiptOrTaxInvoicePdf(order) {
    // ตรวจสอบว่าอย่างน้อยมีรายการสินค้า
    order.items = Array.isArray(order.items) ? order.items : [];
    // preload signatures
    order.customer = order.customer || {};
    order.salesperson = order.salesperson || {};
    const [custBuf, salesBuf, authBuf] = await Promise.all([
      loadImageBuffer(order.customerSignatureUrl),
      loadImageBuffer(order.salespersonSignatureUrl),
      loadImageBuffer(order.authorizedSignatureUrl)
    ]);
    order.customer.signature = custBuf;
    order.salesperson.signature = salesBuf;
    order.authorizedSignature = authBuf;

    return new Promise((resolve, reject) => {
      try {
        // Font setup
        let boldFontPath = CONFIG.font.boldPath;
        let boldFontName = CONFIG.font.boldName;
        if (!fs.existsSync(CONFIG.font.path)) {
          return reject(new Error(`Font not found: ${CONFIG.font.path}`));
        }
        if (!fs.existsSync(boldFontPath)) {
          boldFontName = CONFIG.font.name;
          boldFontPath = CONFIG.font.path;
        }

        const doc = new PDFDocument({
          size: CONFIG.page.size,
          margins: { top: 20, bottom: 40, left: 40, right: 40 },
          autoFirstPage: true
        });

        const { width: W, height: H } = doc.page;
        let margins = doc.page.margins;
        if (!margins || typeof margins.top !== 'number' || typeof margins.bottom !== 'number'
          || typeof margins.left !== 'number' || typeof margins.right !== 'number') {
          margins = { top: 50, bottom: 50, left: 50, right: 50 };
        }
        if (typeof W !== 'number' || typeof H !== 'number' || isNaN(W) || isNaN(H) || W <= 0 || H <= 0) {
          return reject(new Error(`Invalid page dimensions: Width=${W}, Height=${H}`));
        }
        const bodyW = W - margins.left - margins.right;

        const chunks = [];
        doc.on('data', chunks.push.bind(chunks));
        doc.on('end', () => {
          const buffer = Buffer.concat(chunks);
          // ตรวจสอบว่ามี item ที่มีภาษีหรือไม่ (แยกภาษี, รวมภาษี, ภาษีรวมยอดดาวน์, ภาษีรวมยอดค่างวด)
          const anyTax = order.items.some(i =>
            i.taxType && i.taxType !== 'ไม่มี VAT' && i.taxType !== 'ไม่มีภาษี'
          );
          const prefix = anyTax ? 'TI' : 'RC';
          const num = order.documentNumber || order.invoiceNumber || Date.now();
          const fileName = `${prefix}-${num}.pdf`;
          resolve({ buffer, fileName });
        });
        doc.on('error', err => {
          reject(err);
        });

        // Register fonts
        doc.registerFont(CONFIG.font.name, CONFIG.font.path);
        doc.registerFont(boldFontName, boldFontPath);
        doc.font(CONFIG.font.name);

        let currentY = margins.top;
        let previousY = -1;

        // เตรียมข้อมูล order
        order.customer = order.customer || {};
        order.company = order.company || {};
        order.items = order.items.map(i => {
          const qty = ensureNumberData(i.quantity, 1);
          const down = ensureNumberData(i.downAmount ?? i.downPayment ?? i.down_amount);
          const termCount = ensureNumberData(i.termCount ?? i.term_count);
          const instAmount = ensureNumberData(i.installmentAmount ?? i.installment_amount);
          const taxRate = ensureNumberData(i.taxRate, 7);
          const taxType = (typeof i.taxType === 'string' ? i.taxType : 'ไม่มี VAT');

          // แก้ไข: ใช้ค่าที่ส่งมาจาก amount หรือใช้ downAmount เป็น default
          const amount = ensureNumberData(i.amount, down);

          return {
            description: i.description || i.name || '-',
            quantity: qty,
            downAmount: down,
            installmentAmount: instAmount,
            termCount: termCount,
            amount: amount,
            taxRate: taxRate,
            taxType: taxType
          };
        });

        // คำนวณ subtotal และ VAT รวม
        let sumAmt = 0;
        let vatTotal = 0;

        // คำนวณยอดรวมจากทุก item
        order.items.forEach(item => {
          sumAmt += item.amount;
        });

        // คำนวณภาษีตามประเภท - ให้ตรงกับ ReceiptController
        order.items.forEach(item => {
          if (item.taxType === 'ภาษีรวมยอดดาวน์') {
            // หัก VAT จากยอดดาวน์
            const vatDown = item.downAmount * item.taxRate / (100 + item.taxRate);
            vatTotal += vatDown;
          } else if (item.taxType === 'ภาษีรวมยอดค่างวด') {
            // หัก VAT จากยอดค่างวดทั้งหมด
            const totalInst = item.installmentAmount * item.termCount;
            const vatInst = totalInst * item.taxRate / (100 + item.taxRate);
            vatTotal += vatInst;
          } else if (item.taxType === 'แยกภาษี') {
            // VAT คิดจากยอดรวม
            vatTotal += item.amount * item.taxRate / 100;
          } else if (item.taxType === 'รวมภาษี') {
            // หัก VAT จากยอดรวม
            const vatIncluded = item.amount * item.taxRate / (100 + item.taxRate);
            vatTotal += vatIncluded;
          }
        });

        // ปัดเศษภาษี
        vatTotal = Math.round(vatTotal * 100) / 100;

        // คำนวณยอดสุทธิ - ให้สอดคล้องกับ ReceiptController
        let netBeforeTax, grandTotal;

        // ตรวจสอบว่ามี item ที่เป็นภาษีรวมในราคาหรือไม่
        const hasIncludedTax = order.items.some(item =>
          item.taxType === 'รวมภาษี' ||
          item.taxType === 'ภาษีรวมยอดดาวน์' ||
          item.taxType === 'ภาษีรวมยอดค่างวด'
        );

        if (hasIncludedTax) {
          // กรณีภาษีรวมในราคาแล้ว
          grandTotal = sumAmt;  // ยอดชำระ = ยอดรวม (รวมภาษีแล้ว)
          netBeforeTax = sumAmt - vatTotal;  // มูลค่าสินค้า = ยอดรวม - ภาษี
        } else if (order.items.some(item => item.taxType === 'แยกภาษี')) {
          // กรณีแยกภาษี
          netBeforeTax = sumAmt;  // มูลค่าสินค้า = ยอดรวม
          grandTotal = sumAmt + vatTotal;  // ยอดชำระ = ยอดรวม + ภาษี
        } else {
          // กรณีไม่มีภาษี
          netBeforeTax = sumAmt;
          grandTotal = sumAmt;
          vatTotal = 0;
        }

        order.sumAmount = sumAmt;
        order.vatTotal = vatTotal;
        order.netBeforeTax = netBeforeTax;
        order.grandTotal = grandTotal;
        order.amountInWords = toThaiBahtText(grandTotal);
        order.issueDateFormatted = order.issueDate ? formatThaiDate(order.issueDate) : '-';

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

        // 2. Customer & Info
        currentY = this._drawCustomerAndInfo(doc, order, margins, bodyW, currentY);
        currentY = checkYAdvance('Customer/Info', currentY);
        currentY += 5;

        // 3. Items Table
        if (order.items.length > 0) {
          currentY = this._drawItemsTable(doc, order, margins, bodyW, currentY, H);
          currentY += 10;

          // 4. Summary (ยอดก่อนภาษี, VAT, ยอดรวม)
          currentY = this._drawSummary(doc, order, margins, bodyW, currentY) + 20;

          // 5. Signatures
          const signaturesHeight = 65;
          const termsHeight = this._getTermsHeight(doc, order, bodyW);
          const paddingBetween = 5;
          const minSigY = currentY;
          const footerTotalH = termsHeight + paddingBetween + signaturesHeight;
          const bottomSigY = H - margins.bottom - footerTotalH;
          const signatureY = Math.max(minSigY, bottomSigY);
          this._drawSignatures(doc, order, margins, bodyW, signatureY);

          // 6. Terms
          const termsY = signatureY + signaturesHeight + paddingBetween;
          this._drawTerms(doc, order, margins, bodyW, termsY, termsHeight);

          // 7. Page Footer
          this._drawPageFooter(doc, margins, W, H);

          // 8. End PDF
          doc.end();
        } else {
          doc.end();
          return;
        }

      } catch (err) {
        console.error(`Error in createReceiptOrTaxInvoicePdf: ${err.stack}`);
        reject(err);
      }
    });
  }

  // ===========================================
  // Drawing Helper Functions
  // ===========================================

  /** @private วาดส่วนหัว (Header) ตาม Quotation style */
  static _drawHeader(doc, order, margins, pageW, startY) {
    const fullW = pageW - margins.left - margins.right;
    const logoPath = path.join(__dirname, '..', 'Logo', 'Logo2png.png');
    const logoW = CONFIG.sizes.logo.w;
    let logoH = 0;

    // 1) วาดโลโก้
    if (fs.existsSync(logoPath)) {
      const img = doc.openImage(logoPath);
      logoH = (img.height * logoW) / img.width;
      doc.image(logoPath, margins.left, startY, { width: logoW });
    }

    // 2) กำหนด title ตามประเภทภาษี
    const anyTax = order.items.some(i =>
      i.taxType && i.taxType !== 'ไม่มี VAT' && i.taxType !== 'ไม่มีภาษี'
    );
    const titleText = anyTax
      ? 'ใบกำกับภาษี / TAX INVOICE'
      : 'ใบเสร็จรับเงิน / RECEIPT';
    const titleFont = CONFIG.font.boldName;
    const titleSize = CONFIG.sizes.heading1;         // ใช้ heading1 = 20
    doc.font(titleFont).fontSize(titleSize);
    const titleW = doc.widthOfString(titleText);
    const TITLE_OFFSET = 30;

    // วาดกรอบสี่เหลี่ยมรอบ title
    const boxPadding = 8;
    const boxX = margins.left + fullW - titleW - boxPadding * 2;
    const boxY = startY + TITLE_OFFSET - 5;
    const boxW = titleW + boxPadding * 2;
    const boxH = titleSize + 10;

    doc.rect(boxX, boxY, boxW, boxH)
      .strokeColor(CONFIG.color.primaryBlue)
      .lineWidth(1.5)
      .stroke();

    // วาดข้อความ title
    doc.fillColor(CONFIG.color.primaryBlue)
      .text(
        titleText,
        boxX + boxPadding,
        boxY + 5,
        { width: titleW, align: 'center' }
      );

    // 3) ข้อมูลบริษัท / สาขา
    const compX = margins.left + logoW + 10;
    const compW = fullW - logoW - 10 - boxW - 10;  // ปรับให้ไม่ทับกรอบ title
    let y = startY;
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
    lines.forEach(({ text, opts }) => {
      doc.font(opts.font).fontSize(opts.fontSize).fillColor(CONFIG.color.textDark)
        .text(text, compX, y, { width: compW, align: 'left' });
      y += doc.currentLineHeight(true) * CONFIG.sizes.lineSpacing;
    });

    return Math.max(startY + logoH, y) + 10;
  }

  /** @private วาดข้อมูลลูกค้าและข้อมูลเอกสาร ตาม Quotation style */
  static _drawCustomerAndInfo(doc, order, margins, bodyW, startY) {
    const lineSpacing = CONFIG.sizes.lineSpacing;
    const leftColX = margins.left;
    const leftColW = bodyW * 0.55 - 10;
    const rightColX = margins.left + bodyW * 0.55 + 10;
    const rightColW = bodyW * 0.45 - 10;
    const labelW = 75;
    const valueIndent = 5;
    let leftY = startY;
    let rightY = startY;

    // ข้อมูลลูกค้า
    const customerFields = [
      {
        label: 'ชื่อลูกค้า',
        labelEn: 'Customer Name',
        value: order.customer.name || '-'
      },
      {
        label: 'เลขที่ผู้เสียภาษีอากร',
        labelEn: 'Tax ID',
        value: order.customer.taxId || '-'
      },
      {
        label: 'ที่อยู่',
        labelEn: 'Address',
        value: order.customer.address || '-'
      },
      {
        label: 'โทร.',
        labelEn: 'Tel.',
        value: order.customer.phone || '-'
      }
    ];
    customerFields.forEach(field => {
      const fieldStartY = leftY;
      doc.font(CONFIG.font.boldName)
        .fontSize(CONFIG.sizes.textBody)
        .fillColor(CONFIG.color.textBlack)
        .text(field.label, leftColX, leftY, { width: labelW });
      const labelH1 = ensureHeight(doc.heightOfString(field.label, { width: labelW }) * 0.8);
      const currentLabelY = leftY + labelH1;
      doc.font(CONFIG.font.name)
        .fontSize(CONFIG.sizes.textLabel)
        .fillColor(CONFIG.color.textLight)
        .text(field.labelEn, leftColX, currentLabelY, { width: labelW });
      const labelH2 = ensureHeight(doc.heightOfString(field.labelEn, { width: labelW }));
      const labelBlockHeight = (currentLabelY - fieldStartY) + labelH2;

      doc.font(CONFIG.font.name)
        .fontSize(CONFIG.sizes.textBody)
        .fillColor(CONFIG.color.textDark)
        .text(field.value, leftColX + labelW + valueIndent, fieldStartY, {
          width: leftColW - labelW - valueIndent
        });
      const valueHeight = ensureHeight(
        doc.heightOfString(field.value, { width: leftColW - labelW - valueIndent })
      );
      leftY = fieldStartY + Math.max(labelBlockHeight, valueHeight) + (CONFIG.sizes.textBody * lineSpacing * 0.7);
    });

    // ข้อมูลเอกสาร
    const anyTax = order.items.some(i =>
      i.taxType && i.taxType !== 'ไม่มี VAT' && i.taxType !== 'ไม่มีภาษี'
    );
    const docLabel = anyTax ? 'ใบกำกับภาษีเลขที่' : 'เลขที่ใบเสร็จ';
    const dateLabel = anyTax ? 'วันที่ออก (ภาษี)' : 'วันที่ออก';
    const receiptFields = [
      {
        label: docLabel,
        labelEn: anyTax ? 'Tax Invoice No.' : 'Receipt No.',
        value: order.receiptNumber || '-'
      },
      {
        label: dateLabel,
        labelEn: 'Issue Date',
        value: order.issueDateFormatted
      },
      {
       label: 'พนักงานขาย',
       labelEn: 'Salesman',
       // ใช้ข้อมูลจาก order.salesperson.name หรือ order.salespersonName
       value: order.salesperson?.name || order.salespersonName || '(ไม่ระบุชื่อ)'
      }
    ];
    receiptFields.forEach(field => {
      const fieldStartY = rightY;
      const labelText = `${field.label} :`;
      doc.font(CONFIG.font.boldName)
        .fontSize(CONFIG.sizes.textBody)
        .fillColor(CONFIG.color.textBlack)
        .text(labelText, rightColX, rightY, { width: labelW + 5 });
      const labelH1 = ensureHeight(doc.heightOfString(labelText, { width: labelW + 5 }) * 0.8);
      const currentLabelY = rightY + labelH1;
      doc.font(CONFIG.font.name)
        .fontSize(CONFIG.sizes.textLabel)
        .fillColor(CONFIG.color.textLight)
        .text(field.labelEn, rightColX, currentLabelY, { width: labelW });
      const labelH2 = ensureHeight(doc.heightOfString(field.labelEn, { width: labelW }));
      const labelBlockHeight = (currentLabelY - fieldStartY) + labelH2;

      doc.font(CONFIG.font.name)
        .fontSize(CONFIG.sizes.textBody)
        .fillColor(CONFIG.color.textDark)
        .text(field.value, rightColX + labelW + 5 + valueIndent, fieldStartY, {
          width: rightColW - labelW - 5 - valueIndent
        });
      const valueHeight = ensureHeight(
        doc.heightOfString(field.value, { width: rightColW - labelW - 5 - valueIndent })
      );
      rightY = fieldStartY + Math.max(labelBlockHeight, valueHeight) + (CONFIG.sizes.textBody * lineSpacing * 0.7);
    });

    const bottomY = Math.max(leftY, rightY);
    doc.moveTo(margins.left, bottomY + 5)
      .lineTo(margins.left + bodyW, bottomY + 5)
      .strokeColor(CONFIG.color.lineLight)
      .lineWidth(0.5)
      .stroke();
    return bottomY + 10;
  }

  /** @private วาดตารางรายการสินค้า ตามโครงสร้าง Quotation */
  static _drawItemsTable(doc, order, margins, bodyW, startY, pageH) {
    const padH = 10;
    const defaultPadV = 8;
    const lineLight = CONFIG.color.lineLight;

    // ตรวจสอบว่าเป็นใบเสร็จหรือใบกำกับภาษี
    const anyTax = order.items.some(i =>
      i.taxType && i.taxType !== 'ไม่มี VAT' && i.taxType !== 'ไม่มีภาษี'
    );

    // ใช้ CONFIG.layout.tableCols
    const cols = anyTax ? {
      no:   CONFIG.layout.tableCols.no,
      desc: CONFIG.layout.tableCols.desc,
      qty:  CONFIG.layout.tableCols.qty,
      unit: CONFIG.layout.tableCols.unit,
      disc: CONFIG.layout.tableCols.disc,
      tax:  65,  // ลดจาก 70 → 65
      amt:  CONFIG.layout.tableCols.amt
    } : {
      no:   CONFIG.layout.tableCols.no,
      desc: CONFIG.layout.tableCols.desc + 65,  // ปรับให้เหมาะสม
      qty:  CONFIG.layout.tableCols.qty,
      unit: CONFIG.layout.tableCols.unit,
      disc: CONFIG.layout.tableCols.disc,
      amt:  CONFIG.layout.tableCols.amt
    };

    // 1) คำนวนความกว้างรวม
    const tableWidth = Object.values(cols).reduce((sum, w) => sum + w, 0);
    // 2) หาตำแหน่ง X กึ่งกลางใน bodyW
    const tableX = margins.left + (bodyW - tableWidth) / 2;

    // 3) วาด Header Row
    const headerH = 30;
    doc.rect(tableX, startY, tableWidth, headerH)
       .fill(CONFIG.color.bgAccent);
    doc.fillColor(CONFIG.color.textHeader);

    let currentX = tableX;
    const headers = anyTax
      ? [
          { th: 'ลำดับ', en: 'No',           key: 'no',   align: 'center' },
          { th: 'รายการ', en: 'Description',  key: 'desc', align: 'left'   },
          { th: 'จำนวน',  en: 'Qty',          key: 'qty',  align: 'center' },
          { th: 'ราคา/หน่วย', en: 'Unit Price', key: 'unit', align: 'right' },
          { th: 'ส่วนลด',  en: 'Discount',     key: 'disc', align: 'right' },
          { th: 'ภาษี',    en: 'Tax',          key: 'tax',  align: 'right' },
          { th: 'จำนวนเงิน (บาท)', en: 'Amount', key: 'amt',  align: 'right' }
        ]
      : [
          { th: 'ลำดับ', en: 'No',          key: 'no',   align: 'center' },
          { th: 'รายการ', en: 'Description', key: 'desc', align: 'left'   },
          { th: 'จำนวน',  en: 'Qty',         key: 'qty',  align: 'center' },
          { th: 'ราคา/หน่วย', en: 'Unit Price', key: 'unit', align: 'right' },
          { th: 'ส่วนลด',  en: 'Discount',    key: 'disc', align: 'right' },
          { th: 'จำนวนเงิน (บาท)', en: 'Amount', key: 'amt',  align: 'right' }
        ];

    const thY = startY + 5;
    const enY = thY + CONFIG.sizes.tableHeader + 2;

    // ในส่วนวาดข้อความ header
    headers.forEach(h => {
      const w = cols[h.key];
      // วาดข้อความภาษาไทย
      doc.font(CONFIG.font.boldName).fontSize(CONFIG.sizes.tableHeader);
      doc.text(h.th, currentX + padH, thY, { width: w - 2 * padH, align: h.align });

      // วาดข้อความภาษาอังกฤษใต้ข้อความไทย
      doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.textLabel - 1);  // ลดขนาดฟอนต์
      doc.text(h.en, currentX + padH, enY, { width: w - 2 * padH, align: h.align });

      currentX += w;
    });

    // เส้นกั้นล่าง header
    let currentY = startY + headerH;
    doc.moveTo(tableX, currentY)
       .lineTo(tableX + tableWidth, currentY)
       .strokeColor(lineLight)
       .lineWidth(0.5)
       .stroke();

    // 4) วาดแต่ละแถวข้อมูล
    doc.font(CONFIG.font.name)
      .fontSize(CONFIG.sizes.tableRow)
      .fillColor(CONFIG.color.textDark);

    order.items.forEach((item, i) => {
      // ดึงข้อมูลเบื้องต้น
      const qty = ensureNumberData(item.quantity, 1);
      const down = ensureNumberData(item.downAmount);
      const inst = ensureNumberData(item.installmentAmount);
      const terms = ensureNumberData(item.termCount);

      // คำนวณภาษีของแต่ละแถว
      let vatAmount = 0;
      if (item.taxType === 'ภาษีรวมยอดดาวน์') {
        vatAmount = down * item.taxRate / (100 + item.taxRate);
      } else if (item.taxType === 'ภาษีรวมยอดค่างวด') {
        const totalInst = inst * terms;
        vatAmount = totalInst * item.taxRate / (100 + item.taxRate);
      } else if (item.taxType === 'แยกภาษี') {
        vatAmount = item.amount * item.taxRate / 100;
      } else if (item.taxType === 'รวมภาษี') {
        vatAmount = item.amount * item.taxRate / (100 + item.taxRate);
      }
      vatAmount = Math.round(vatAmount * 100) / 100;

      // ใช้ค่าที่ถูกต้องสำหรับแต่ละคอลัมน์
      const unitPrice = item.amount / qty;
      const discount = 0;
      const amount = item.amount;

      // เพิ่ม IMEI ลงในคำอธิบายสินค้า
      const baseDesc = item.description || '-';
      const imeiPart = item.imei ? `\nIMEI: ${item.imei}` : '';
      const descText = baseDesc + imeiPart;

      // วัดความสูงบรรทัด
      doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.tableRow);
      const descW = cols.desc - 2 * padH;
      const descHeight = doc.heightOfString(descText, { width: descW });
      const rowH = Math.max(26, descHeight + defaultPadV * 2);

      // หากเนื้อหาเกินหน้ากระดาษ → สร้างหน้าใหม่
      if (currentY + rowH > pageH - margins.bottom) {
        doc.addPage();
        currentY = margins.top;
      }

      let y = currentY + (rowH - descHeight) / 2;
      let x = tableX;

      // ลำดับ
      doc.text(i + 1, x, y, { width: cols.no, align: 'center' });
      x += cols.no;

      // รายการ
      doc.text(descText, x + padH, y, { width: cols.desc - 2 * padH, align: 'left' });
      x += cols.desc;

      // จำนวน
      doc.text(qty, x, y, { width: cols.qty, align: 'center' });
      x += cols.qty;

      // ราคาต่อหน่วย
      doc.text(
        unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 }),
        x, y,
        { width: cols.unit - padH, align: 'right' }
      );
      x += cols.unit;

      // ส่วนลด
      doc.text(
        discount.toLocaleString('en-US', { minimumFractionDigits: 2 }),
        x, y,
        { width: cols.disc - padH, align: 'right' }
      );
      x += cols.disc;

      // ภาษี (แสดงเฉพาะใบกำกับภาษี)
      if (anyTax) {
        doc.text(
          vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2 }),
          x, y,
          { width: cols.tax - padH, align: 'right' }
        );
        x += cols.tax;
      }

      // จำนวนเงิน
      doc.text(
        amount.toLocaleString('en-US', { minimumFractionDigits: 2 }),
        x, y,
        { width: cols.amt - padH, align: 'right' }
      );

      currentY += rowH;
      // วาดเส้นแบ่งแต่ละแถว
      doc.moveTo(tableX, currentY)
        .lineTo(tableX + tableWidth, currentY)
        .strokeColor(lineLight)
        .lineWidth(0.5)
        .stroke();
    });

    return currentY;
  }

  /** @private วาดกรอบ "Conditions of Payments" (ซ้าย) */
  static _drawPaymentConditions(doc, order, margins, bodyW, startY) {
    const boxW = bodyW * 0.55;        // 55% ฝั่งซ้าย
    const boxH = 70;                  // สูง ~ 70 pt
    const pad = 6;
    const x = margins.left;
    const y = startY;

    doc.rect(x, y, boxW, boxH).fill('#F2F2F2');        // พื้นเทาอ่อน
    doc.fillColor(CONFIG.color.textDark)
      .font(CONFIG.font.boldName).fontSize(CONFIG.sizes.textBody)
      .text('เงื่อนไขการชำระเงิน', x + pad, y + pad);

    const opts = { width: boxW - pad * 2, continued: false };
    const chk = (v) => {
      if (!order.paymentMethod) return '☐';
      const pm = order.paymentMethod.trim().toLowerCase();
      return pm === v.trim().toLowerCase() ? '☑' : '☐';
    };

    doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.textBody)
      .text(`${chk('เงินสด')} เงินสด   ${chk('เช็ค')} เช็ค   ${chk('โอนเงิน')} โอนเงิน   ${chk('อื่นๆ')} อื่นๆ`, x + pad, y + 25, opts);

    return y + boxH;
  }

  /** @private วาดส่วนสรุปยอดรวม ตาม Quotation style */
  static _drawSummary(doc, order, margins, bodyW, startY) {
    /* ── วาดกรอบเงื่อนไขการชำระเงิน (ซ้าย) ─────────────────── */
    const conditionY = this._drawPaymentConditions(doc, order, margins, bodyW, startY);

    /* ── ค่าที่ต้องใช้ ─────────────────── */
    const total = order.sumAmount;                         // รวมเป็นเงิน
    const depositDeduct = ensureNumberData(order.depositDeduct, 0);   // หักเงินมัดจำ
    const netReceive = total - depositDeduct;                   // จำนวนเงินรวมรับชำระ
    const vat = order.vatTotal;                          // ภาษี 7%
    const netOfVat = order.netBeforeTax;                      // รวมมูลค่าสินค้า (ก่อน VAT)
    const grandTotal = order.grandTotal;                        // ยอดชำระ (สุทธิ)

    const anyTax = order.items.some(i =>
      i.taxType && i.taxType !== 'ไม่มี VAT' && i.taxType !== 'ไม่มีภาษี'
    );

    // แสดงภาษีเฉพาะในใบกำกับภาษีเท่านั้น
    const labels = anyTax ? [
      'รวมเป็นเงิน',
      'จำนวนเงินรวมรับชำระ',
      `ภาษีมูลค่าเพิ่ม ${order.items[0]?.taxRate || 7}%`,
      'รวมมูลค่าสินค้า',
      'ยอดชำระ'
    ] : [
      'รวมเป็นเงิน',
      'จำนวนเงินรวมรับชำระ',
      'ยอดชำระ'
    ];

    const vals = anyTax ? [total, netReceive, vat, netOfVat, grandTotal] : [total, netReceive, grandTotal];

    const boxW = bodyW * 0.4, boxX = margins.left + bodyW - boxW;
    const rowH = CONFIG.sizes.textBody * CONFIG.sizes.lineSpacing;
    const pad = 6, boxH = pad * 2 + rowH * labels.length;

    /* พื้นสีน้ำเงิน */
    doc.rect(boxX, startY, boxW, boxH).fill(CONFIG.color.bgAccent);

    let y = startY + pad;
    labels.forEach((lb, i) => {
      doc.font(CONFIG.font.boldName).fontSize(CONFIG.sizes.textBody)
        .fillColor(CONFIG.color.textHeader)
        .text(lb, boxX + pad, y, { width: boxW - pad * 2, align: 'left' })
        .text(vals[i].toLocaleString('en-US', { minimumFractionDigits: 2 }),
          boxX + pad, y, { width: boxW - pad * 2, align: 'right' });
      y += rowH;
    });

    /* บรรทัดข้อความจำนวนเงินภาษาไทย */
    const txtBoxW = bodyW * 0.6, txtBoxH = rowH * 1.8;
    const txtBoxY = Math.max(conditionY, startY + boxH) - txtBoxH;
    doc.rect(margins.left, txtBoxY, txtBoxW, txtBoxH)
      .fill(CONFIG.color.bgAccent);
    doc.fillColor(CONFIG.color.textHeader)
      .font(CONFIG.font.boldName)
      .fontSize(CONFIG.sizes.textBody)
      .text(order.amountInWords, margins.left + pad,
        txtBoxY + (txtBoxH - CONFIG.sizes.textBody) / 2,
        { width: txtBoxW - pad * 2 });

    return Math.max(conditionY, startY + boxH);   // ส่ง Y กลับ
  }

  /** @private คำนวณความสูงของเงื่อนไข */
  static _getTermsHeight(doc, order, bodyW) {
    let height = 0;
    doc.font(CONFIG.font.boldName).fontSize(CONFIG.sizes.textBody);
    height += ensureHeight(doc.currentLineHeight(true) * 1.2);
    doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.textLabel);
    const termsText = order.termsText ||
`สินค้ามีประกันเครื่อง 1 ปี
หากตรวจสอบสินค้าแล้วพบว่าเกิดจากระบบซอฟต์แวร์ภายในเครื่อง ลูกค้ายินยอมจะรอทางศูนย์ดำเนินการเคลมสินค้า โดยระยะเวลาการเคลมสินค้าขึ้นอยู่กับศูนย์
และหากเกิดความเสียหายจากการกระทำของลูกค้า เช่น ตก แตก โดนน้ำ เป็นต้น ถือว่าประกันสิ้นสุดทันที`;
    height += ensureHeight(doc.heightOfString(termsText, { width: bodyW, lineGap: 3 }));
    return height;
  }

  /** @private วาดส่วนลายเซ็น */
  static _drawSignatures(doc, order, margins, bodyW, startY) {
    const sigBlockH = 65;
    const colW = bodyW / 3;
    const sigLineW = colW * 0.8;
    const sigLineXOffset = (colW - sigLineW) / 2;
    const lineY = startY + 15;
    const imgH = 50;
    const imgPad = 5;

    const colsData = [
      { label: 'ลงนามผู้สั่งซื้อ', labelEn: 'Customer Signature', key: 'customer.signature' },
      { label: 'พนักงานขาย', labelEn: 'Sale Person', key: 'salesperson.signature' },
      { label: 'ผู้อนุมัติ', labelEn: 'Authorized Signature', key: 'authorizedSignature' }
    ];

    const currentDateThai = formatThaiDate(new Date().toISOString());

    colsData.forEach((col, i) => {
      const x0 = margins.left + colW * i;
      const sigBuffer = col.key.split('.').reduce((o, k) => (o && o[k] != null ? o[k] : null), order);

      let signatureDrawn = false;
      if (Buffer.isBuffer(sigBuffer)) {
        try {
          const imgX = x0 + sigLineXOffset;
          const imgY = lineY - imgH - imgPad;
          doc.image(sigBuffer, imgX, imgY, { fit: [sigLineW, imgH], align: 'center', valign: 'bottom' });
          signatureDrawn = true;
        } catch (e) {
        }
      }
      if (!signatureDrawn) {
        const lineX = x0 + sigLineXOffset;
        doc.moveTo(lineX, lineY)
          .lineTo(lineX + sigLineW, lineY)
          .dash(2, { space: 2 })
          .strokeColor(CONFIG.color.sigLine)
          .stroke()
          .undash();
      }
      let textY = lineY + imgPad;
      doc.font(CONFIG.font.boldName).fontSize(CONFIG.sizes.textLabel).fillColor(CONFIG.color.textDark)
        .text(col.label, x0, textY, { width: colW, align: 'center' });
      textY += 10;
      doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.textSmall).fillColor(CONFIG.color.textLight)
        .text(col.labelEn, x0, textY, { width: colW, align: 'center' });
      textY += 10;
      doc.text(currentDateThai, x0, textY, { width: colW, align: 'center' });
    });

    doc.save()
      .moveTo(margins.left + colW, startY + 5)
      .lineTo(margins.left + colW, startY + sigBlockH - 5)
      .moveTo(margins.left + 2 * colW, startY + 5)
      .lineTo(margins.left + 2 * colW, startY + sigBlockH - 5)
      .strokeColor(CONFIG.color.lineLight)
      .lineWidth(0.5)
      .stroke()
      .restore();
  }

  /** @private วาดเงื่อนไขและข้อกำหนด */
  static _drawTerms(doc, order, margins, bodyW, startY, maxHeight) {
    let currentY = startY;
    doc.font(CONFIG.font.boldName).fontSize(CONFIG.sizes.textBody).fillColor(CONFIG.color.textBlack)
      .text('เงื่อนไขและข้อกำหนด', margins.left, currentY);
    currentY += ensureHeight(doc.currentLineHeight(true) * 1.2);

    doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.textLabel).fillColor(CONFIG.color.textDark);
    const termsText = order.termsText ||
`สินค้ามีประกันเครื่อง 1 ปี
หากตรวจสอบสินค้าแล้วพบว่าเกิดจากระบบซอฟต์แวร์ภายในเครื่อง ลูกค้ายินยอมจะรอทางศูนย์ดำเนินการเคลมสินค้า โดยระยะเวลาการเคลมสินค้าขึ้นอยู่กับศูนย์
และหากเกิดความเสียหายจากการกระทำของลูกค้า เช่น ตก แตก โดนน้ำ เป็นต้น ถือว่าประกันสิ้นสุดทันที`;
    doc.text(termsText, margins.left, currentY, { width: bodyW, lineGap: 3 });
    currentY += ensureHeight(doc.heightOfString(termsText, { width: bodyW, lineGap: 3 }));
    return currentY;
  }

  /** @private วาดส่วนท้ายหน้า */
  static _drawPageFooter(doc, margins, pageW, pageH) {
    const footerY = pageH - margins.bottom + 10;
    const lineY = footerY - 12;
    doc.moveTo(margins.left, lineY)
      .lineTo(pageW - margins.right, lineY)
      .strokeColor(CONFIG.color.primaryBlue)
      .lineWidth(1)
      .stroke();
    const pageText = 'หน้า 1 / 1';
    doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.textSmall).fillColor(CONFIG.color.textLight)
      .text(pageText, margins.left, footerY, {
        width: pageW - margins.left - margins.right,
        align: 'left'
      });
  }

}

module.exports = Receipt_installment;
