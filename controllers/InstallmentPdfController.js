/**
 * @file InvoicePdfController.js
 * @description Controller for creating minimalist-style PDF Invoices with a blue theme, including installment details.
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
    primaryBlue: '#3498DB', textHeader: '#FFFFFF', textBlack: '#2C3E50', // Darker Black/Blue
    textDark: '#444444', // Slightly darker grey for body text
    textLight: '#777777', lineLight: '#E0E0E0',
    lineDark: '#CCCCCC', sigLine: '#AAAAAA', bgWhite: '#FFFFFF', bgAccent: '#3498DB',
   },
  sizes: {
    logo: { w: 70, h: 45 },
    heading1: 16, // Increased
    heading2: 12,
    heading3: 12, // Increased
    textBody: 11, // Increased
    textLabel: 9,
    textSmall: 8,
    tableHeader: 10,
    tableRow: 10, // Increased
    lineSpacing: 1.3 // Slightly Increased
  },
  layout: { tableCols: { no: 35, desc: 225, qty: 45, unit: 70, disc: 55, amt: 85 } }
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

  // 1) Data URI
  if (url.startsWith('data:image')) {
    const base64 = url.split(',')[1];
    return Buffer.from(base64, 'base64');
  }

  // 2) HTTP(S) URL
  if (/^https?:\/\//.test(url)) {
    // เลือกไคลเอนต์ให้ตรงกับโปรโตคอล
    const client = url.startsWith('https://') ? https : http;
    return new Promise(resolve => {
      client.get(url, res => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      }).on('error', () => resolve(null));
    });
  }

  // 3) ถ้า URL เริ่มด้วย /uploads/ (static path) ให้เรียกกลับมาเป็น HTTP
  if (url.startsWith('/uploads/')) {
    const host = process.env.HOST || 'localhost';
    const port = process.env.PORT || '3000';
    const fullUrl = `http://${host}:${port}${url}`;
    return loadImageBuffer(fullUrl);
  }

  // 4) สุดท้ายลองอ่านจากไฟล์ซิสเต็ม (projectRoot/public หรือ projectRoot)
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

class InvoicePdfController {

  /**
   * สร้างไฟล์ PDF ใบแจ้งหนี้
   * @param {object} invoice ข้อมูลใบแจ้งหนี้
   * @returns {Promise<{buffer: Buffer, fileName: string}>} Promise ที่ resolve เป็น buffer ของ PDF และชื่อไฟล์
   */
  static async createInvoicePdf(invoice) {
      // Preload signatures directly from invoice
      invoice.customer    = invoice.customer    || {};
      invoice.salesperson = invoice.salesperson || {}; // Ensure salesperson object exists

      // โหลด signature ทั้ง 3
      const [custBuf, salesBuf, authBuf] = await Promise.all([
        loadImageBuffer(invoice.customerSignatureUrl),
        loadImageBuffer(invoice.salespersonSignatureUrl),
        loadImageBuffer(invoice.authorizedSignatureUrl),
      ]);

      // เก็บลง invoice เพื่อให้ _drawSignatures อ่านได้เลย
      invoice.customer.signature    = custBuf;
      invoice.salesperson.signature = salesBuf;
      invoice.authorizedSignature   = authBuf;

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
        const doc = new PDFDocument({ size: CONFIG.page.size, margin: CONFIG.page.margin, autoFirstPage: true });
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
            const invNum  = invoice?.invoiceNumber   || invoice?._id || Date.now();
            const fileName = `INV-${invNum}.pdf`;
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
        invoice = invoice || {};
        invoice.customer = invoice.customer || {};
        invoice.company = invoice.company || {};
        invoice.items = Array.isArray(invoice.items) ? invoice.items : [];

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
        currentY = this._drawHeader(doc, invoice, margins, W, currentY);
        currentY = checkYAdvance('Header', currentY); currentY += 10;

        // 2. Customer/Quote Info
        currentY = this._drawCustomerAndInvoiceInfo(doc, invoice, margins, bodyW, currentY);
        currentY = checkYAdvance('Customer/Quote Info', currentY); currentY += 15;

        // 3. Items Table
        if (invoice.items.length > 0) {
            currentY = this._drawItemsTable(doc, invoice, margins, bodyW, currentY, H);
            currentY = checkYAdvance('Items Table', currentY); currentY += 10;
        } else {
            previousY = currentY; // Update previousY even if skipping
        }

        // 4. Summary Section & Installment Plan
        const currentYForSummaryCalc = currentY;
        const remainingHeight = H - currentYForSummaryCalc - margins.bottom;
        if (isNaN(remainingHeight)) throw new Error('remainingHeight NaN.');

        const signaturesHeight = 65;
        const pageFooterHeight = 20;
        const termsHeightEstimate = 50; // Rough estimate for terms height
        const estimatedFooterHeight = signaturesHeight + pageFooterHeight + termsHeightEstimate + 20; // Total estimated footer space needed

        let summaryStartY = currentY + 15; // Default start Y for summary

        // Try to push summary and installment plan towards the bottom if enough space
        // ** NOTE: Removed installmentHeightEstimate from calculation as the section is removed **
        const summaryHeightEstimate = 80; // Rough estimate for summary height
        const totalSummaryInstallmentHeight = summaryHeightEstimate + 15; // Only summary height + spacing

        // Calculate available space above the signature area
        const spaceBeforeSignatures = H - margins.bottom - pageFooterHeight - signaturesHeight - (currentYForSummaryCalc + 15);

        if (spaceBeforeSignatures > totalSummaryInstallmentHeight + 20) { // Check if there's ample space
            // Calculate starting Y from the bottom, leaving space for signatures/footer
            let calculatedBottomStartY = H - margins.bottom - pageFooterHeight - signaturesHeight - totalSummaryInstallmentHeight;
             if (!isNaN(calculatedBottomStartY)) {
                summaryStartY = Math.max(calculatedBottomStartY, currentYForSummaryCalc + 15); // Ensure it doesn't overlap previous section
             }
        } else {
             summaryStartY = currentYForSummaryCalc + 15; // Default placement if space is tight
        }

        if (isNaN(summaryStartY)) throw new Error('summaryStartY NaN.');

        // Draw Summary (Installment Plan drawing is removed)
        if (invoice.items.length > 0) {
          let summaryEndY = this._drawSummary(doc, invoice, margins, bodyW, summaryStartY);
          if (typeof summaryEndY !== 'number' || isNaN(summaryEndY)) {
              console.error(`Invalid Y returned from _drawSummary.`);
              summaryEndY = summaryStartY + summaryHeightEstimate; // Fallback
          } else if (summaryEndY <= summaryStartY) {
          }

          currentY = summaryEndY; // currentY is now the end of the summary section

          previousY = Math.max(previousY, currentY); // Update previousY to the bottom of the summary
        } else {
          // If no items, still update previousY in case summary was skipped
          previousY = currentY;
        }

        // 5. Footer Sections (Terms, Signatures, Page Footer)
        const signatureStartY = H - margins.bottom - pageFooterHeight - signaturesHeight; // Y for signatures starts here
        const termsMaxHeight = signatureStartY - (previousY + 15) - 10; // Max height available for terms
        let termsStartY = previousY + 15; // Terms start after the last drawn element

        // Draw Terms
        currentY = this._drawTerms(doc, invoice, margins, bodyW, termsStartY, termsMaxHeight);
        previousY = Math.max(previousY, currentY); // Ensure previousY reflects the bottom after terms

        // Draw Signatures (using the correct final one)
        this._drawSignatures(doc, invoice, margins, bodyW, signatureStartY); // Draw at calculated position

        // Draw Page Footer (at fixed position from bottom)
        this._drawPageFooter(doc, margins, W, H);

        // // console.log("Finalizing PDF document.");
        doc.end();

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
  static _drawHeader(doc, invoice, margins, pageW, startY) {
    let currentY = startY;
    const logoW = CONFIG.sizes.logo.w; const logoH = CONFIG.sizes.logo.h;
    const headerContentHeight = Math.max(logoH, 60);
    const headerBottomY = currentY + headerContentHeight;

    const logoPath = path.join(__dirname, '..', 'Logo', 'Logo2png.png');
    if (fs.existsSync(logoPath)) {
      const logoDrawY = currentY + (headerContentHeight - logoH) / 2;
      if (!isNaN(logoDrawY)) doc.image(logoPath, margins.left, logoDrawY, { width: logoW, height: logoH });
    } else console.warn(`Logo not found: ${logoPath}`);

    const companyX = margins.left + logoW + 20; const qBoxW = 150;
    const companyW = pageW - margins.right - companyX - qBoxW - 15; let companyInfoY = currentY + 5;

    doc.font(CONFIG.font.boldName).fontSize(CONFIG.sizes.heading1).fillColor(CONFIG.color.textBlack);
    const companyName = invoice.company?.name || 'บริษัท Default Name';
    doc.text(companyName, companyX, companyInfoY, { width: companyW, lineGap: 2 });
    companyInfoY += ensureHeight(doc.heightOfString(companyName, { width: companyW, lineGap: 2 }) * CONFIG.sizes.lineSpacing * 0.8);

    doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.textBody).fillColor(CONFIG.color.textDark);
    const address = invoice.company?.address || 'Default Address';
    doc.text(address, companyX, companyInfoY, { width: companyW });
    companyInfoY += ensureHeight(doc.heightOfString(address, { width: companyW }) * CONFIG.sizes.lineSpacing * 0.8);
    const taxIdText = `เลขที่ผู้เสียภาษี ${invoice.company?.taxId || '-'} | สาขาทีทํางาน/Branch: ${invoice.company?.branch || '-'}`;
    doc.text(taxIdText, companyX, companyInfoY, { width: companyW });
    companyInfoY += ensureHeight(doc.heightOfString(taxIdText, { width: companyW }) * CONFIG.sizes.lineSpacing * 0.8);
    const telText = `โทร./Tel.: ${invoice.company?.tel || '-'}`;
    doc.text(telText, companyX, companyInfoY, { width: companyW });

    const qBoxX = pageW - margins.right - qBoxW; const qBoxH = headerContentHeight;
    doc.rect(qBoxX, startY, qBoxW, qBoxH).fill(CONFIG.color.bgAccent);
    const textPadding = 10; let qTextY = startY + textPadding;

    doc.font(CONFIG.font.boldName).fontSize(CONFIG.sizes.heading3).fillColor(CONFIG.color.textHeader);
    doc.text('Invoice', qBoxX + textPadding, qTextY, { width: qBoxW - 2*textPadding, align: 'center' });
    qTextY += ensureHeight(doc.currentLineHeight(true) * 0.9);
    doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.textLabel);
    doc.text('ใบแจ้งหนี้', qBoxX + textPadding, qTextY, { width: qBoxW - 2*textPadding, align: 'center' });
    qTextY += ensureHeight(doc.currentLineHeight(true) * 1.5);
    doc.fontSize(CONFIG.sizes.textLabel -1);
    const qTypeText = invoice.invoiceType || 'ต้นฉบับ / Original';
    doc.text(qTypeText, qBoxX + textPadding, qTextY, { width: qBoxW - 2 * textPadding, align: 'left'});
    qTextY += ensureHeight(doc.currentLineHeight(true) * 1.1);
    doc.font(CONFIG.font.boldName).fontSize(CONFIG.sizes.textBody).fillColor(CONFIG.color.textHeader);
    const qNumber = invoice.invoiceNumber || 'INV-XXXXXX';
    doc.text(qNumber, qBoxX + textPadding, qTextY, { width: qBoxW - 2 * textPadding, align: 'right'});
    if (isNaN(headerBottomY)) { console.error('headerBottomY is NaN!'); return startY + 65; }
    return headerBottomY;
  }

  /** @private วาดข้อมูลลูกค้าและใบแจ้งหนี้ */
  static _drawCustomerAndInvoiceInfo(doc, invoice, margins, bodyW, startY) {
    const lineSpacing = CONFIG.sizes.lineSpacing; const leftColX = margins.left;
    const leftColW = bodyW * 0.55 - 10; const rightColX = margins.left + bodyW * 0.55 + 10;
    const rightColW = bodyW * 0.45 - 10; const labelW = 75;
    const valueIndent = 5;
    let leftY = startY; let rightY = startY;

    // 3.2.1 สร้างชื่อเต็ม
const fullName = `${invoice.customer.first_name || ''} ${invoice.customer.last_name || ''}`.trim() || '-';
// 3.2.2 สร้างสตริงที่อยู่
const addr = invoice.customer.address || {};
const addressStr = `${addr.houseNo||''} หมู่${addr.moo||''} ต.${addr.subDistrict||''} อ.${addr.district||''} จ.${addr.province||''} ${addr.zipcode||''}`.trim() || '-';

const customerFields = [
  { label: 'ชื่อลูกค้า',       labelEn: 'Customer Name', value: fullName },
  { label: 'เลขที่ผู้เสียภาษี', labelEn: 'Tax ID',        value: invoice.customer.tax_id       || '-' },
  { label: 'ที่อยู่',           labelEn: 'Address',       value: addressStr                  },
  { label: 'โทร.',             labelEn: 'Tel.',          value: invoice.customer.phone_number || '-' }
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
        { label: 'วันที่', labelEn: 'Issue Date', value: invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString('th-TH') : '-' },
        { label: 'การชำระเงิน', labelEn: 'Credit Term', value: invoice.creditTerm || '-' },
        { label: 'พนักงานขาย', labelEn: 'Salesman', value: invoice.salesman?.name || invoice.salesPerson?.name || '-' },
        { label: 'ผู้ติดต่อ', labelEn: 'Contact Name', value: invoice.contactPerson?.name || '-' },
        { label: 'ชื่อโปรเจกต์', labelEn: 'Project Name', value: invoice.projectName || '-' }
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
  static _drawItemsTable(doc, invoice, margins, bodyW, startY, pageH) {
    const leftX = margins.left; const headerH = 30; const rowH = 26;
    const cols = { ...CONFIG.layout.tableCols }; let currentY = startY;

    doc.rect(leftX, currentY, bodyW, headerH).fill(CONFIG.color.bgAccent);
    const headers = [
        { th: 'ลำดับ', en: 'No', key: 'no', align: 'center' },
        { th: 'รายการ', en: 'Description', key: 'desc', align: 'left' },
        { th: 'จำนวน', en: 'Quantity', key: 'qty', align: 'center' },
        { th: 'ราคา/หน่วย', en: 'Unit Price', key: 'unit', align: 'right' },
        { th: 'ส่วนลด', en: 'Discount', key: 'disc', align: 'right' },
        { th: 'จำนวนเงิน (บาท)', en: 'Amount', key: 'amt', align: 'right' }
    ];
    let currentX = leftX; const headerPaddingV = 5;
    const headerTextY_TH = currentY + headerPaddingV; const headerTextY_EN = headerTextY_TH + CONFIG.sizes.tableHeader * 0.9 + 2;
    doc.fillColor(CONFIG.color.textHeader);
    headers.forEach(header => {
        const colW = cols[header.key]; let textX = currentX;
        if (header.align === 'center') textX += colW / 2; else if (header.align === 'right') textX += colW - 5; else textX += 5; const textW = colW - 10;
        doc.font(CONFIG.font.boldName).fontSize(CONFIG.sizes.tableHeader);
        if (header.align === 'center' || header.align === 'right') { doc.text(header.th, currentX, headerTextY_TH, { width: colW, align: header.align }); }
        else { doc.text(header.th, textX, headerTextY_TH, { width: textW, align: 'left' }); }
        doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.textLabel);
        if (header.align === 'center' || header.align === 'right') { doc.text(header.en, currentX, headerTextY_EN, { width: colW, align: header.align }); }
        else { doc.text(header.en, textX, headerTextY_EN, { width: textW, align: 'left' }); }
        currentX += colW;
    });
    currentY += headerH;

    doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.tableRow).fillColor(CONFIG.color.textDark);
    const contentPaddingV = (rowH - CONFIG.sizes.tableRow) / 2;
    doc.moveTo(leftX, currentY).lineTo(leftX + bodyW, currentY).strokeColor(CONFIG.color.lineDark).lineWidth(0.7).stroke();

    (invoice.items || []).forEach((item, i) => {
        const rowStartY = currentY; if (rowStartY + rowH > pageH - margins.bottom - 150) console.warn('Table row overflow - Item:', i + 1);
        const textY = rowStartY + contentPaddingV; currentX = leftX; const colPaddingH = 5;
        const itemQty = ensureNumberData(item?.quantity); const itemUnitPrice = ensureNumberData(item?.unitPrice);
        const itemDiscount = ensureNumberData(item?.discount); const calculatedAmount = (itemQty * itemUnitPrice) - itemDiscount;
        const itemAmount = ensureNumberData(item?.amount, calculatedAmount);

        doc.text(i + 1, currentX, textY, { width: cols.no, align: 'center' }); currentX += cols.no;
        doc.text(item?.description || '', currentX + colPaddingH, textY, { width: cols.desc - 2*colPaddingH, align: 'left' }); currentX += cols.desc;
        doc.text(itemQty, currentX, textY, { width: cols.qty, align: 'center' }); currentX += cols.qty;
        doc.text(itemUnitPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), currentX, textY, { width: cols.unit - colPaddingH, align: 'right' }); currentX += cols.unit;
        doc.text(itemDiscount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), currentX, textY, { width: cols.disc - colPaddingH, align: 'right' }); currentX += cols.disc;
        doc.text(itemAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), currentX, textY, { width: cols.amt - colPaddingH, align: 'right' });

        currentY += rowH;
        doc.moveTo(leftX, currentY).lineTo(leftX + bodyW, currentY).strokeColor(CONFIG.color.lineLight).lineWidth(0.5).stroke();
    });
    if (isNaN(currentY)) { console.error('currentY in Items Table is NaN!'); return startY + 50; }
    return currentY;
  }

   /** @private วาดส่วนสรุปยอดรวม */
  static _drawSummary(doc, invoice, margins, bodyW, startY) {
    const amountWordsW = bodyW * 0.6; const totalsW = bodyW * 0.4; const totalsX = margins.left + amountWordsW;
    const lineH = CONFIG.sizes.textBody * CONFIG.sizes.lineSpacing; const padding = 5;
    let currentY = startY; let totalsCurrentY = startY;

    // --- Amount in Words ---
    let textY = currentY;
    doc.font(CONFIG.font.boldName).fontSize(CONFIG.sizes.textBody).fillColor(CONFIG.color.textBlack);
    doc.text('จำนวนเงิน', margins.left, textY);
    textY += ensureHeight(doc.currentLineHeight(true) * 0.8);
    doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.textLabel).fillColor(CONFIG.color.textLight);
    doc.text('(Amount)', margins.left, textY);
    const amountLabelWidth = 70;
    const amountTextX = margins.left + amountLabelWidth; const amountTextW = amountWordsW - amountLabelWidth - padding;
    doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.textBody).fillColor(CONFIG.color.textDark);
    const amountText = invoice.amountInWords || ' - ';
    doc.text(amountText, amountTextX, currentY, { width: amountTextW, lineGap: 2 });
    const amountWordsHeight = ensureHeight(doc.heightOfString(amountText, { width: amountTextW, lineGap: 2 }));
    const amountWordsEndY = currentY + amountWordsHeight;

    // --- Totals ---
    const totalLabelYOffset = 0; const totalValueYOffset = 0; const totalSubLabelYOffset = totalLabelYOffset + CONFIG.sizes.textBody * 0.8 + 1;
    const subTotal = ensureNumberData(invoice.subTotal); const grandTotal = ensureNumberData(invoice.grandTotal);

    doc.fillColor(CONFIG.color.textBlack); doc.font(CONFIG.font.boldName).fontSize(CONFIG.sizes.textBody);
    doc.text('รวมเป็นเงิน', totalsX + padding, totalsCurrentY + totalLabelYOffset);
    doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.textLabel).fillColor(CONFIG.color.textLight);
    doc.text('Subtotal', totalsX + padding, totalsCurrentY + totalSubLabelYOffset);
    doc.font(CONFIG.font.boldName).fontSize(CONFIG.sizes.textBody).fillColor(CONFIG.color.textDark);
    doc.text(subTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), totalsX, totalsCurrentY + totalValueYOffset, { width: totalsW - padding*2, align: 'right' });
    totalsCurrentY += ensureHeight(lineH * 1.5);

    const grandTotalBoxH = ensureHeight(lineH * 1.8);
    doc.rect(totalsX, totalsCurrentY, totalsW, grandTotalBoxH).fill(CONFIG.color.bgAccent);
    const gtLabelY = totalsCurrentY + (grandTotalBoxH - (CONFIG.sizes.textBody + CONFIG.sizes.textLabel)) / 2 - 2;
    const gtValueY = totalsCurrentY + (grandTotalBoxH - (CONFIG.sizes.textBody + 1)) / 2;
    doc.fillColor(CONFIG.color.textHeader);
    doc.font(CONFIG.font.boldName).fontSize(CONFIG.sizes.textBody);
    doc.text('จำนวนเงินรวมทั้งสิ้น', totalsX + padding, gtLabelY);
    doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.textLabel);
    doc.text('Grand Total', totalsX + padding, gtLabelY + CONFIG.sizes.textBody * 0.9);
    doc.font(CONFIG.font.boldName).fontSize(CONFIG.sizes.textBody + 2);
    doc.text(grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), totalsX, gtValueY, { width: totalsW - padding*2, align: 'right' });
    totalsCurrentY += grandTotalBoxH;

    const finalY = Math.max(amountWordsEndY, totalsCurrentY);
    if (isNaN(finalY)) { console.error('finalY in Summary is NaN!'); return startY + 60; }
    // Return Y position *after* drawing the summary totals.
    return finalY;
   }

  /** @private วาดเงื่อนไขและข้อกำหนด */
  static _drawTerms(doc, invoice, margins, bodyW, startY, maxHeight) {
    let currentY = startY;
    doc.font(CONFIG.font.boldName).fontSize(CONFIG.sizes.textBody).fillColor(CONFIG.color.textBlack);
    doc.text('เงื่อนไขและข้อกำหนด', margins.left, currentY);
    currentY += ensureHeight(doc.currentLineHeight(true) * 1.2);

    doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.textLabel).fillColor(CONFIG.color.textDark);
    const termsText = invoice.termsText || '1. ราคาดังกล่าวยังไม่รวมภาษีมูลค่าเพิ่ม 7%\n2. ยืนราคา 30 วันนับจากวันที่เสนอราคา\n3. กำหนดส่งมอบสินค้าภายใน 7-15 วัน หลังจากได้รับใบสั่งซื้อ\n4. การชำระเงิน: ตามเงื่อนไขที่ตกลงกัน\n5. สินค้ารับประกัน 1 ปี ตามเงื่อนไขผู้ผลิต';
    const termsOptions = { width: bodyW, lineGap: 3 };
    const termsHeight = ensureHeight(doc.heightOfString(termsText, termsOptions));

    if (termsHeight > maxHeight) {
      termsOptions.height = maxHeight;
      termsOptions.ellipsis = true;
    }
    doc.text(termsText, margins.left, currentY, termsOptions);
    currentY += Math.min(termsHeight, maxHeight); // Advance Y by the actual drawn height

    if (isNaN(currentY)) { console.error('currentY in Terms is NaN!'); return startY + 50; }
    return currentY;
  }

  /** @private คำนวณความสูงของส่วนเงื่อนไข */
  static _getTermsHeight(doc, invoice, bodyW) {
    let height = 0;
    doc.font(CONFIG.font.boldName).fontSize(CONFIG.sizes.textBody);
    height += ensureHeight(doc.currentLineHeight(true) * 1.2);
    doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.textLabel);
    const termsText = invoice.termsText || 'เงื่อนไขเริ่มต้น...';
    height += ensureHeight(doc.heightOfString(termsText, { width: bodyW, lineGap: 3 }));
    return height;
  }

  /** @private วาดส่วนลายเซ็น */
  static _drawSignatures(doc, invoice, margins, bodyW, startY) {
    const sigBlockH = 65;
    const colW = bodyW / 3;
    const sigLineW = colW * 0.6;
    const sigLineXOffset = (colW - sigLineW) / 2;
    const lineY = startY + 15;
    const imgH = 30;
    const imgPad = 5;

    const colsData = [
      {
        label: 'ผู้สั่งซื้อ',
        labelEn: 'Customer Signature',
        key: 'customer.signature',
        nameKey: 'customer.name' // ชื่อลูกค้า
      },
      {
        label: 'พนักงานขาย',
        labelEn: 'Sales Person',
        key: 'salesperson.signature',
        nameKey: 'salesperson.name' // ชื่อพนักงานขาย
      },
      {
        label: 'ผู้อนุมัติ',
        labelEn: 'Authorized Signature',
        key: 'authorizedSignature',
        nameKey: 'authorizedName' // ชื่อผู้อนุมัติ
      }
    ];

    colsData.forEach((col, i) => {
      const x0 = margins.left + colW * i;
      const sigBuffer = col.key.split('.').reduce((o, k) => (o && o[k] != null ? o[k] : null), invoice);

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

      const textY1 = lineY + imgPad;

      // แสดงชื่อบุคคล (หากมี)
      const personName = col.nameKey ? col.nameKey.split('.').reduce((o, k) => (o && o[k] != null ? o[k] : null), invoice) : null;

      if (personName) {
        doc
          .font(CONFIG.font.boldName)
          .fontSize(CONFIG.sizes.textLabel)
          .fillColor(CONFIG.color.textDark)
          .text(`(${personName})`, x0, textY1, { width: colW, align: 'center' });

        doc
          .font(CONFIG.font.name)
          .fontSize(CONFIG.sizes.textSmall)
          .fillColor(CONFIG.color.textLight)
          .text(col.label, x0, textY1 + 12, { width: colW, align: 'center' });

        doc
          .font(CONFIG.font.name)
          .fontSize(CONFIG.sizes.textSmall - 1)
          .fillColor(CONFIG.color.textLight)
          .text(col.labelEn, x0, textY1 + 24, { width: colW, align: 'center' });
      } else {
        // ไม่มีชื่อ - แสดงแค่ป้ายกำกับ
        doc
          .font(CONFIG.font.boldName)
          .fontSize(CONFIG.sizes.textLabel)
          .fillColor(CONFIG.color.textDark)
          .text(col.label, x0, textY1, { width: colW, align: 'center' });
        doc
          .font(CONFIG.font.name)
          .fontSize(CONFIG.sizes.textSmall)
          .fillColor(CONFIG.color.textLight)
          .text(col.labelEn, x0, textY1 + 12, { width: colW, align: 'center' });
      }
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
} // <-- End of InvoicePdfController class

module.exports = InvoicePdfController;
