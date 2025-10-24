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
  if (!url) return null;

  // --- 0) ถ้าเป็นไฟล์บนดิสก์ (absolute path หรือ path ในโฟลเดอร์ uploads) ---
  const filePath = path.normalize(url);
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath);
  }

  // --- 0.1) ถ้าเป็นชื่อไฟล์ในโฟลเดอร์ uploads ของโปรเจกต์ ---
  const uploadFilePath = path.join(process.cwd(), 'uploads', path.basename(url));
  if (fs.existsSync(uploadFilePath)) {
    return fs.readFileSync(uploadFilePath);
  }

  // --- 1) Data URI ---
  if (url.startsWith('data:image')) {
    const base64 = url.split(',')[1];
    return Buffer.from(base64, 'base64');
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
   * สร้างไฟล์ PDF ใบเสนอราคา
   * @param {object} order ข้อมูลออเดอร์
   * @returns {Promise<{buffer: Buffer, fileName: string}>} Promise ที่ resolve เป็น buffer ของ PDF และชื่อไฟล์
   */
  static async createQuotationPdf(order) {
      // Preload signatures directly from order
      order.customer    = order.customer    || {};
      order.salesperson = order.salesperson || {}; // Ensure salesperson object exists

      // โหลด signature ทั้ง 3
      const [custBuf, salesBuf, authBuf] = await Promise.all([
        loadImageBuffer(order.customerSignatureUrl),
        loadImageBuffer(order.salespersonSignatureUrl),
        loadImageBuffer(order.authorizedSignatureUrl),
      ]);

      // เก็บลง order เพื่อให้ _drawSignatures อ่านได้เลย
      order.customer.signature    = custBuf;
      order.salesperson.signature = salesBuf;
      order.authorizedSignature   = authBuf;

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
            const qNum = order?.quotationNumber || order?._id || Date.now();
            const fileName = `QT-${qNum}.pdf`;
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

        // --- คำนวณ Subtotal, VAT และ Grand Total ใหม่ ---
        const docFee   = ensureNumberData(order.docFee);
        const shipFee  = ensureNumberData(order.shippingFee);

          // หลังแก้: คำนวณ Grand Total จากยอดสุทธิ + VAT จริง ๆ
order.netSubtotal = ensureNumberData(order.summary.beforeTax) + docFee + shipFee;
order.vatTotal    = ensureNumberData(order.summary.tax);
// ให้ Grand Total = ยอดสุทธิ (ไม่รวม VAT) + VAT
order.grandTotal  = order.netSubtotal + order.vatTotal;

        // แปลงเป็นคำ
        order.amountInWords = toThaiBahtText(order.grandTotal);

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

            // เปลี่ยนบล็อกคำไทยให้ชิดล่างของ summary ฝั่งขวา
            const summaryStartY = currentY;
            const rowH = CONFIG.sizes.textBody * CONFIG.sizes.lineSpacing;
            const padding = 6;

            // คำนวณ height ของกล่อง summary ฝั่งขวาจาก _drawSummary
            const summaryBoxH = rowH * 5 + padding * 2;

            // เพิ่ม offset สำหรับตำแหน่ง summary
            const SUMMARY_OFFSET = 100;                // ลองปรับค่านี้ดูว่าต้องลงมามากแค่ไหน
            const summaryY = summaryStartY + SUMMARY_OFFSET;

            // ปรับตำแหน่งกล่องคำไทยให้สัมพันธ์กับตำแหน่ง summary ใหม่
            const summaryBoxBottomY = summaryY + summaryBoxH;
            const boxW_th = bodyW * 0.6;
            const boxH_th = ensureHeight(rowH * 1.8);
            const pad_th = 5;
            const boxY_th = summaryBoxBottomY - boxH_th;

            // วาดกรอบสีน้ำเงินสำหรับบล็อกคำไทย
            doc.rect(margins.left, boxY_th, boxW_th, boxH_th)
               .fill(CONFIG.color.bgAccent);
            // วาดข้อความคำไทย
            doc.fillColor(CONFIG.color.textHeader)
               .font(CONFIG.font.boldName)
               .fontSize(CONFIG.sizes.textBody)
               .text(
                 order.amountInWords,
                 margins.left + pad_th,
                 boxY_th + (boxH_th - CONFIG.sizes.textBody) / 2,
                 { width: boxW_th - pad_th * 2, align: 'left' }
               );

            // 2) วาดตัวเลข Summary (Subtotal/VAT/Grand Total) ฝั่งขวา
            this._drawSummary(doc, order, margins, bodyW, summaryY);

            // ปรับ currentY ให้ต่อจาก summaryY + ความสูงบล็อก + padding อีกหน่อย
            currentY = summaryY + summaryBoxH + 20;

            // --- คำนวณบล็อก "ลายเซ็น" ---
            const signaturesHeight = 65;
            const pageFooterHeight = 20;
            const termsHeight      = this._getTermsHeight(doc, order, bodyW);
            const paddingBetween   = 5;

            // 2) ตำแหน่ง Y ขั้นต่ำของลายเซ็น ไม่ให้ทับ Summary
            const minSigY = currentY + 10;
            // 3) ตำแหน่ง Y ของลายเซ็น จากขอบล่าง ให้เผื่อ Footer+Terms
            const footerTotalH = pageFooterHeight + termsHeight + paddingBetween + signaturesHeight;
            const bottomSigY   = H - margins.bottom - footerTotalH;
            const signatureY   = Math.max(minSigY, bottomSigY);

            // 4) วาดลายเซ็น
            this._drawSignatures(doc, order, margins, bodyW, signatureY);

            // 5) วาดข้อกำหนด ใต้ลายเซ็นลงมา
            const termsY = signatureY + signaturesHeight + paddingBetween;
            this._drawTerms(doc, order, margins, bodyW, termsY, termsHeight);

            // 6) สุดท้าย วาด Page Footer
            this._drawPageFooter(doc, margins, W, H);

            // 7) ปิด PDF
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
      const img = doc.openImage(logoPath);
      logoH = (img.height * logoW) / img.width;
      doc.image(logoPath, margins.left, startY, { width: logoW });
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
        const valueStr = String(field.value); doc.text(valueStr, valueX, fieldStartY, { width: valueW });
        const valueHeight = ensureHeight(doc.heightOfString(valueStr, { width: valueW }));
        leftY = fieldStartY + Math.max(labelBlockHeight, valueHeight) + (CONFIG.sizes.textBody * lineSpacing * 0.7);
    });

    const quoteFields = [
        {
          label:    'เลขที่',
          labelEn:  'Quotation No.',
          value:    order.quotationNumber || '-'
        },
        {
          label:    'วันที่',
          labelEn:  'Issue Date',
          value:    order.issueDateFormatted
                  || (order.issueDate
                      ? new Date(order.issueDate).toLocaleDateString('th-TH')
                      : '-')
        },
        { label: 'การชำระเงิน', labelEn: 'Credit Term', value: order.creditTerm || '-' },
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

    // --- Document Fee row ---
    const docFee = ensureNumberData(order.docFee);
    if (docFee > 0) {
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
        docFee.toLocaleString('en-US', { minimumFractionDigits: 2 }),
        x, y,
        { width: cols.unit - padH, align: 'right' }
      );
      x += cols.unit;

      // 5. Discount
      doc.text('-', x, y, { width: cols.disc, align: 'right' });
      x += cols.disc;

      // 6. Amount
      doc.text(docFee.toLocaleString('en-US', { minimumFractionDigits: 2 }), x, y, {
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
        doc.text(order.items.length + 1 + (docFee>0?1:0), x, y, { width: cols.no, align: 'center' });
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
    // 1. คำนวณตัวเลขใหม่:
    //    • รวมเงิน           = ผลรวมของ item.amount แต่ละแถว
    //    • ส่วนลด           = ผลรวมของ item.discount
    //    • ยอดรวมหลังหักส่วนลด = รวมเงิน – ส่วนลด
    //    • ภาษีมูลค่าเพิ่ม 7% = order.vatTotal (คำนวณจาก controller)
    //    • ราคารวมทั้งหมด     = order.grandTotal (คำนวณจาก controller)
    const sumAmt     = order.items.reduce((acc, i) => acc + (i.amount || 0), 0);
    const totalDisc  = order.items.reduce((acc, i) => acc + (i.discount || 0), 0);
    const netAmt     = sumAmt - totalDisc;
    const vatVal     = order.vatTotal;
    const grandTotal = order.grandTotal;

    // 2. labels และค่าที่จะ print
    const labels = [
      'รวมเงิน',
      'ส่วนลด',
      'ยอดรวมหลังหักส่วนลด',
      'ภาษีมูลค่าเพิ่ม 7%',
      'ราคารวมทั้งหมด'
    ];
    const values = [ sumAmt, totalDisc, netAmt, vatVal, grandTotal ];

    // 3. คำนวณกรอบกล่อง
    const boxW    = bodyW * 0.4;
    const boxX    = margins.left + (bodyW - boxW);
    const rowH    = CONFIG.sizes.textBody * CONFIG.sizes.lineSpacing;
    const padding = 6;
    const boxH    = rowH * labels.length + padding * 2;

    // 4. วาดพื้นหลังกล่องสีน้ำเงิน
    doc.rect(boxX, startY, boxW, boxH).fill(CONFIG.color.bgAccent);

    // 5. วาด Label ไทย + ค่าตัวเลข (สองตำแหน่งทศนิยม)
    let y = startY + padding;
    labels.forEach((label, i) => {
      doc
        .font(CONFIG.font.boldName)
        .fontSize(CONFIG.sizes.textBody)
        .fillColor(CONFIG.color.textHeader)
        .text(label, boxX + padding, y, { width: boxW - padding*2, align: 'left' });

      doc
        .font(CONFIG.font.boldName)
        .fontSize(CONFIG.sizes.textBody)
        .fillColor(CONFIG.color.textHeader)
        .text(
          values[i].toLocaleString('en-US', { minimumFractionDigits: 2 }),
          boxX + padding, y,
          { width: boxW - padding*2, align: 'right' }
        );

      y += rowH;
    });

    // 6. คืนค่า Y เพื่อให้ส่วนถัดไปวาดใต้กล่องนี้
    return startY + boxH;
   }

  /** @private คำนวณความสูงของส่วนเงื่อนไข */
  static _getTermsHeight(doc, order, bodyW) {
    let height = 0;
    doc.font(CONFIG.font.boldName).fontSize(CONFIG.sizes.textBody);
    height += ensureHeight(doc.currentLineHeight(true) * 1.2);
    doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.textLabel);
    const termsText = order.termsText || 'เงื่อนไขเริ่มต้น...';
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
      { label: 'ผู้อนุมัติสั่งซื้อ',    labelEn: 'Customer Signature',   key: 'customer.signature' },
      { label: 'พนักงานขาย',     labelEn: 'Sale Person',          key: 'salesperson.signature' },
      { label: 'ผู้อนุมัติ',    labelEn: 'Authorized Signature', key: 'authorizedSignature' }
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
        }
      }

      if (!signatureDrawn) {
        const lineX = x0 + sigLineXOffset;
        doc.moveTo(lineX, lineY)
           .lineTo(lineX + sigLineW, lineY)
           .dash(2, { space: 2 }).strokeColor(CONFIG.color.sigLine).stroke().undash();
      }

      let textY = lineY + imgPad;
      doc
        .font(CONFIG.font.boldName)
        .fontSize(CONFIG.sizes.textLabel)
        .fillColor(CONFIG.color.textDark)
        .text(col.label, x0, textY, { width: colW, align: 'center' });
      textY += 10;
      doc
        .font(CONFIG.font.name)
        .fontSize(CONFIG.sizes.textSmall)
        .fillColor(CONFIG.color.textLight)
        .text(col.labelEn, x0, textY, { width: colW, align: 'center' });
      textY += 10; // เพิ่มระยะห่างสำหรับวันที่
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
    doc
      .font(CONFIG.font.boldName)
      .fontSize(CONFIG.sizes.textBody)
      .fillColor(CONFIG.color.textBlack)
      .text('เงื่อนไขและข้อกำหนด', margins.left, currentY);
    currentY += ensureHeight(doc.currentLineHeight(true) * 1.2);

    doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.textLabel).fillColor(CONFIG.color.textDark);
    const termsText = order.termsText ||
`สินค้ามีประกันเครื่อง 1 ปี
หากตรวจสอบสินค้าแล้วพบว่าเกิดจากระบบซอฟต์แวร์ภายในเครื่อง ลูกค้ายินยอมจะรอทางศูนย์ดำเนินการเคลมสินค้า โดยระยะเวลาการเคลมสินค้าขึ้นอยู่กับศูนย์
และหากเกิดความเสียหายจากการกระทำของลูกค้า เช่น ตก แตก โดนน้ำ เป็นต้น ถือว่าประกันสิ้นสุดทันที`;
    const termOpts  = { width: bodyW, lineGap: 3 };
    doc
      .font(CONFIG.font.name)
      .fontSize(CONFIG.sizes.textLabel)
      .fillColor(CONFIG.color.textDark)
      .text(termsText, margins.left, currentY, termOpts);

    // เลื่อน Y ให้พ้นบล็อกข้อความทั้งหมด
    currentY += ensureHeight(
      doc.heightOfString(termsText, termOpts)
    );

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
