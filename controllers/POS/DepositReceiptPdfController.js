/**
 * @file DepositReceiptPdfController.js
 * @description Controller for creating minimalist luxury-style PDF Deposit Receipts
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
  page: { size: 'A4', margin: 30 }, // ลดจาก 45 เป็น 30
  font: {
    name: 'THSarabun',
    boldName: 'THSarabun-Bold',
    path: path.join(__dirname, '..', '..', 'fonts', 'THSarabunNew.ttf'),
    boldPath: path.join(__dirname, '..', '..', 'fonts', 'THSarabunNew Bold.ttf')
  },
  color: {
    // Luxury color palette - Teal & Gold accent
    primaryTeal: '#008B8B',      // Dark Cyan for headers
    accentGold: '#DAA520',       // Goldenrod for emphasis
    textBlack: '#1A1A1A',        // Almost black for main text
    textDark: '#2C2C2C',         // Dark gray for secondary text
    textLight: '#666666',        // Light gray for labels
    lineLight: '#E8E8E8',        // Very light gray for lines
    lineMedium: '#D0D0D0',       // Medium gray for dividers
    bgTeal: '#008B8B',           // Background teal
    bgLightTeal: '#F0F9F9',      // Very light teal tint
    bgGold: '#FFF8DC',           // Cornsilk gold background
    textWhite: '#FFFFFF'
  },
  sizes: {
    logo: { w: 100 },           // ลดจาก 130
    heading1: 20,               // ลดจาก 24
    heading2: 14,               // ลดจาก 16
    heading3: 12,               // ลดจาก 14
    textBody: 11,               // ลดจาก 12
    textLabel: 10,              // ลดจาก 11
    textSmall: 9,               // ลดจาก 10
    tableHeader: 11,            // ลดจาก 12
    tableRow: 10,               // ลดจาก 11
    lineSpacing: 1.2            // ลดจาก 1.5
  },
  layout: {
    // Simplified table columns for deposit receipt
    tableCols: {
      no: 40,
      desc: 280,    // More space for description
      qty: 50,
      amount: 145   // Just amount, no unit price needed
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

class DepositReceiptPdfController {

  /**
   * สร้างไฟล์ PDF ใบรับเงินมัดจำ
   * @param {object} receipt ข้อมูลใบรับเงินมัดจำ
   * @returns {Promise<{buffer: Buffer, fileName: string}>} Promise ที่ resolve เป็น buffer ของ PDF และชื่อไฟล์
   */
  static async createDepositReceiptPdf(receipt) {
    // Preload signatures
    receipt.customer = receipt.customer || {};
    receipt.salesperson = receipt.salesperson || {};

    const [custBuf, salesBuf, cashierBuf] = await Promise.all([
      loadImageBuffer(receipt.customerSignatureUrl),
      loadImageBuffer(receipt.salespersonSignatureUrl),
      loadImageBuffer(receipt.cashierSignatureUrl),
    ]);

    receipt.customer.signature = custBuf;
    receipt.salesperson.signature = salesBuf;
    receipt.cashierSignature = cashierBuf;

    return new Promise((resolve, reject) => {
      try {
        // Font Setup
        let boldFontPath = CONFIG.font.boldPath;
        let boldFontName = CONFIG.font.boldName;
        if (!fs.existsSync(CONFIG.font.path)) return reject(new Error(`Font not found: ${CONFIG.font.path}`));
        if (!fs.existsSync(boldFontPath)) {
          console.warn(`Bold font not found: ${boldFontPath}. Using regular.`);
          boldFontName = CONFIG.font.name;
          boldFontPath = CONFIG.font.path;
        }

        const doc = new PDFDocument({
          size: CONFIG.page.size,
          margins: { top: 15, bottom: 30, left: 30, right: 30 }, // ลดลงจาก 20,45,45,45
          autoFirstPage: true
        });

        const { width: W, height: H } = doc.page;
        let margins = doc.page.margins;

        // Validate margins
        if (!margins || typeof margins.top !== 'number') {
          margins = { top: 30, bottom: 30, left: 30, right: 30 }; // Adjusted fallback
        }

        const bodyW = W - margins.left - margins.right;

        // Buffer
        const chunks = [];
        doc.on('data', chunks.push.bind(chunks));
        doc.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const receiptNum = receipt?.receiptNumber || receipt?._id || Date.now();
          const fileName = `DR-${receiptNum}.pdf`;
          resolve({ buffer, fileName });
        });
        doc.on('error', reject);

        // Register Fonts
        doc.registerFont(CONFIG.font.name, CONFIG.font.path);
        doc.registerFont(boldFontName, boldFontPath);
        doc.font(CONFIG.font.name);

        // Initialize data
        let currentY = margins.top;
        receipt = receipt || {};
        receipt.customer = receipt.customer || {};
        receipt.branch = receipt.branch || {};
        receipt.items = Array.isArray(receipt.items) ? receipt.items : [];

        // Format dates
        receipt.receiptDateFormatted = receipt.receiptDate ? formatThaiDate(receipt.receiptDate) : '-';
        receipt.paymentDateFormatted = receipt.paymentDate ? formatThaiDate(receipt.paymentDate) : '-';

        // Normalize items
        receipt.items = receipt.items.map(item => ({
          description: item.productName || item.description || '-',
          imei: item.imei,
          quantity: ensureNumberData(item.quantity, 1),
          amount: ensureNumberData(item.productPrice || item.amount, 0)
        }));

        // Calculate totals
        receipt.subtotal = ensureNumberData(receipt.subtotal, 0);
        receipt.discount = ensureNumberData(receipt.discount, 0);
        receipt.vatAmount = ensureNumberData(receipt.vatAmount, 0);
        receipt.documentFee = ensureNumberData(receipt.documentFee, 0);
        receipt.totalAmount = ensureNumberData(receipt.totalAmount, 0);
        receipt.depositAmount = ensureNumberData(receipt.depositAmount, 0);
        receipt.amountInWords = toThaiBahtText(receipt.depositAmount);

        // Drawing sections
        currentY = this._drawHeader(doc, receipt, margins, W, currentY);
        currentY = this._drawReceiptInfo(doc, receipt, margins, bodyW, currentY);
        currentY = this._drawCustomerInfo(doc, receipt, margins, bodyW, currentY);

        if (receipt.items.length > 0 || receipt.depositType === 'preorder') {
          currentY = this._drawItemsTable(doc, receipt, margins, bodyW, currentY);
        }

        currentY = this._drawPaymentDetails(doc, receipt, margins, bodyW, currentY);
        currentY = this._drawSummary(doc, receipt, margins, bodyW, currentY);

        // ตรวจสอบว่าไม่ให้เกินหน้า
        if (currentY > H - margins.bottom - 150) {
          console.warn('Content may exceed page boundary, attempting to adjust currentY');
          currentY = H - margins.bottom - 150; // Ensure there's at least 150px for footer content
        }

        // Signatures at bottom
        // Check available space
        const signaturesHeight = 60;  // ลดจาก 70
        const pageFooterHeight = 20;  // ลดจาก 25
        const termsHeight = 80;  // กำหนดค่าคงที่แทนการคำนวณ
        const totalNeeded = signaturesHeight + termsHeight + pageFooterHeight + 30; // Added padding

        // ตรวจสอบพื้นที่
        const availableSpace = H - currentY - margins.bottom;
        let signatureY;

        if (availableSpace < totalNeeded) {
          // ถ้าพื้นที่ไม่พอ ให้วาดต่อเนื่องจาก currentY
          signatureY = currentY + 15; // Adjusted from 15
          this._drawSignatures(doc, receipt, margins, bodyW, signatureY);

          const termsY = signatureY + signaturesHeight + 10;
          this._drawTerms(doc, receipt, margins, bodyW, termsY, termsHeight);
        } else {
          // ถ้าพื้นที่พอ วาดที่ด้านล่าง
          signatureY = H - margins.bottom - totalNeeded;
          this._drawSignatures(doc, receipt, margins, bodyW, signatureY);

          const termsY = signatureY + signaturesHeight + 10;
          this._drawTerms(doc, receipt, margins, bodyW, termsY, termsHeight);
        }

        this._drawPageFooter(doc, margins, W, H);

        doc.end();

      } catch (err) {
        console.error(`Error in createDepositReceiptPdf: ${err.message}\nStack: ${err.stack}`);
        reject(err);
      }
    });
  }

  /** @private วาดส่วนหัว - Minimal luxury style */
  static _drawHeader(doc, order, margins, pageW, startY) {
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
    const titleText = 'ใบรับเงินมัดจำ';
    const subtitleText = 'DEPOSIT RECEIPT';

    doc.font(CONFIG.font.boldName).fontSize(CONFIG.sizes.heading1);
    const titleW = doc.widthOfString(titleText);

    // Main title
    doc.fillColor(CONFIG.color.primaryTeal)
       .text(titleText, margins.left + fullW - titleW - 80, startY + 10,
             { width: titleW + 80, align: 'right' });

    // Subtitle
    doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.heading3)
       .fillColor(CONFIG.color.textLight)
       .text(subtitleText, margins.left + fullW - titleW - 80, startY + 35,
             { width: titleW + 80, align: 'right' });

    // Company info - centered
    const branch = order.branch || {};
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

    return lineY + 10; // Changed from + 15
  }

  /** @private วาดข้อมูลใบรับเงินมัดจำ */
  static _drawReceiptInfo(doc, receipt, margins, bodyW, startY) {
    const boxH = 40;
    const boxY = startY;

    // Background box with gradient effect (simulated)
    doc.rect(margins.left, boxY, bodyW, boxH)
       .fill(CONFIG.color.bgLightTeal);

    // Receipt number and date in elegant layout
    const infoY = boxY + (boxH - CONFIG.sizes.textBody) / 2;
    const halfW = bodyW / 2;

    // Receipt Number
    doc.font(CONFIG.font.boldName).fontSize(CONFIG.sizes.textBody)
       .fillColor(CONFIG.color.primaryTeal)
       .text('เลขที่ใบรับเงิน: ', margins.left + 15, infoY);

    doc.font(CONFIG.font.name)
       .fillColor(CONFIG.color.textBlack)
       .text(receipt.receiptNumber || '-', margins.left + 110, infoY);

    // Receipt Date
    doc.font(CONFIG.font.boldName)
       .fillColor(CONFIG.color.primaryTeal)
       .text('วันที่: ', margins.left + halfW, infoY);

    doc.font(CONFIG.font.name)
       .fillColor(CONFIG.color.textBlack)
       .text(receipt.receiptDateFormatted, margins.left + halfW + 35, infoY);

    return boxY + boxH + 10; // Changed from + 15
  }

  /** @private วาดข้อมูลลูกค้า */
  static _drawCustomerInfo(doc, receipt, margins, bodyW, startY) {
    // Section header
    doc.font(CONFIG.font.boldName).fontSize(CONFIG.sizes.heading3)
       .fillColor(CONFIG.color.primaryTeal)
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
      { label: 'ชื่อลูกค้า:', value: receipt.customerName || receipt.customer.name || '-' },
      { label: 'ที่อยู่:', value: receipt.customerAddress || receipt.customer.address || '-' },
      { label: 'เลขประจำตัวผู้เสียภาษี:', value: receipt.customerTaxId || receipt.customer.taxId || '-' },
      { label: 'โทรศัพท์:', value: receipt.customerPhone || receipt.customer.phone || '-' }
    ];

    doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.textBody);

    fields.forEach(field => {
      doc.fillColor(CONFIG.color.textLight)
         .text(field.label, margins.left, currentY, { width: labelW });

      doc.fillColor(CONFIG.color.textBlack)
         .text(field.value, valueX, currentY);

      currentY += 18; // ลดจาก 20
    });

    return currentY + 10; // Changed from + 10 (was already 10, no change based on prompt, but keeping consistent with other reductions)
  }

  /** @private วาดตารางรายการ */
  static _drawItemsTable(doc, receipt, margins, bodyW, startY, pageH) {
    const cols = CONFIG.layout.tableCols;
    const headerH = 30; // ลดจาก 35
    let currentY = startY;

    // Table header with luxury style
    doc.rect(margins.left, currentY, bodyW, headerH)
       .fill(CONFIG.color.bgTeal);

    // Header text
    const headers = [
      { text: 'ลำดับ', key: 'no', align: 'center' },
      { text: 'รายการ', key: 'desc', align: 'left' },
      { text: 'จำนวน', key: 'qty', align: 'center' },
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

    if (receipt.depositType === 'preorder') {
      // Pre-order item
      const rowH = 25; // Adjusted from 30, consistent with item.imei false case
      const y = currentY + 8;
      let x = margins.left;

      doc.fillColor(CONFIG.color.textDark);
      doc.text('1', x + 5, y, { width: cols.no - 10, align: 'center' });
      x += cols.no;

      doc.text(receipt.productName || 'สินค้า Pre-order', x + 5, y,
               { width: cols.desc - 10, align: 'left' });
      x += cols.desc;

      doc.text('1', x + 5, y, { width: cols.qty - 10, align: 'center' });
      x += cols.qty;

      const amount = ensureNumberData(receipt.productPrice, 0);
      doc.text(amount.toLocaleString('th-TH', { minimumFractionDigits: 2 }),
               x + 5, y, { width: cols.amount - 10, align: 'right' });

      currentY += rowH;
    } else {
      // Regular items
      receipt.items.forEach((item, idx) => {
        const rowH = item.imei ? 35 : 25;  // ลดจาก 40 : 30
        const y = currentY + 8;
        let x = margins.left;

        // Row number
        doc.fillColor(CONFIG.color.textDark);
        doc.text(idx + 1, x + 5, y, { width: cols.no - 10, align: 'center' });
        x += cols.no;

        // Description with IMEI
        doc.text(item.description, x + 5, y,
                 { width: cols.desc - 10, align: 'left' });

        if (item.imei) {
          doc.fillColor(CONFIG.color.textLight)
             .fontSize(CONFIG.sizes.textSmall)
             .text(`IMEI: ${item.imei}`, x + 5, y + 15,
                   { width: cols.desc - 10, align: 'left' });
          doc.fontSize(CONFIG.sizes.tableRow);
        }
        x += cols.desc;

        // Quantity
        doc.fillColor(CONFIG.color.textDark);
        doc.text(item.quantity, x + 5, y, { width: cols.qty - 10, align: 'center' });
        x += cols.qty;

        // Amount
        doc.text(item.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 }),
                 x + 5, y, { width: cols.amount - 10, align: 'right' });

        currentY += rowH;

        // Row separator
        doc.moveTo(margins.left, currentY)
           .lineTo(margins.left + bodyW, currentY)
           .strokeColor(CONFIG.color.lineLight)
           .lineWidth(0.5)
           .stroke();
      });
    }

    // Document fee if any
    if (receipt.documentFee > 0) {
      const rowH = 25; // Adjusted from 30
      const y = currentY + 8;
      let x = margins.left;

      doc.fillColor(CONFIG.color.textDark);
      doc.text(receipt.items.length + 1, x + 5, y, { width: cols.no - 10, align: 'center' });
      x += cols.no;

      doc.text('ค่าธรรมเนียมเอกสาร', x + 5, y, { width: cols.desc - 10, align: 'left' });
      x += cols.desc;

      doc.text('1', x + 5, y, { width: cols.qty - 10, align: 'center' });
      x += cols.qty;

      doc.text(receipt.documentFee.toLocaleString('th-TH', { minimumFractionDigits: 2 }),
               x + 5, y, { width: cols.amount - 10, align: 'right' });

      currentY += rowH;
    }

    // Final line
    doc.moveTo(margins.left, currentY)
       .lineTo(margins.left + bodyW, currentY)
       .strokeColor(CONFIG.color.lineMedium)
       .lineWidth(1)
       .stroke();

    return currentY + 8; // Changed from + 15
  }

  /** @private วาดรายละเอียดการชำระเงิน */
  static _drawPaymentDetails(doc, receipt, margins, bodyW, startY) {
    doc.font(CONFIG.font.boldName).fontSize(CONFIG.sizes.heading3)
       .fillColor(CONFIG.color.primaryTeal)
       .text('รายละเอียดการชำระเงิน', margins.left, startY);

    const lineY = startY + 20;
    doc.moveTo(margins.left, lineY)
       .lineTo(margins.left + 130, lineY)
       .strokeColor(CONFIG.color.accentGold)
       .lineWidth(1.5)
       .stroke();

    let currentY = lineY + 15;
    const labelW = 120;
    const valueX = margins.left + labelW + 10;

    // Payment type mapping
    const paymentTypeMap = {
      'cash': 'เงินสด',
      'transfer': 'โอนเงิน',
      'check': 'เช็คธนาคาร'
    };

    const purchaseTypeMap = {
      'cash': 'ซื้อสด',
      'installment': 'ซื้อผ่อน'
    };

    const depositTypeMap = {
      'preorder': 'Pre-order',
      'online': 'มัดจำออนไลน์'
    };

    const paymentInfo = [
      { label: 'ประเภทการมัดจำ:', value: depositTypeMap[receipt.depositType] || receipt.depositType || '-' },
      { label: 'ประเภทการซื้อ:', value: purchaseTypeMap[receipt.purchaseType] || receipt.purchaseType || '-' },
      { label: 'วิธีการชำระเงิน:', value: paymentTypeMap[receipt.paymentType] || receipt.paymentType || '-' },
      { label: 'วันที่ชำระเงิน:', value: receipt.paymentDateFormatted || '-' }
    ];

    doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.textBody);

    paymentInfo.forEach(info => {
      doc.fillColor(CONFIG.color.textLight)
         .text(info.label, margins.left, currentY, { width: labelW });

      doc.fillColor(CONFIG.color.textBlack)
         .text(info.value, valueX, currentY);

      currentY += 18; // Adjusted from 20, to be consistent with customer info
    });

    // Installment details if applicable
    if (receipt.purchaseType === 'installment' && receipt.installmentPeriod) {
      doc.fillColor(CONFIG.color.textLight)
         .text('จำนวนงวด:', margins.left, currentY, { width: labelW });

      doc.fillColor(CONFIG.color.textBlack)
         .text(`${receipt.installmentPeriod} งวด`, valueX, currentY);

      currentY += 18; // Adjusted from 20
    }

    return currentY + 10; // Changed from + 10 (was already 10, no change based on prompt)
  }

  /** @private วาดส่วนสรุปยอดเงิน */
  static _drawSummary(doc, receipt, margins, bodyW, startY) {
    const summaryW = bodyW * 0.5;
    const summaryX = margins.left + bodyW - summaryW;
    const padding = 10;
    let rowH = 22; // Adjusted from 25 for tighter spacing

    // Summary items
    const summaryItems = [
      { label: 'ยอดรวม:', value: receipt.subtotal },
      { label: 'ส่วนลด:', value: receipt.discount },
      { label: 'ภาษีมูลค่าเพิ่ม:', value: receipt.vatAmount },
      { label: 'ค่าธรรมเนียมเอกสาร:', value: receipt.documentFee },
      { label: 'ยอดรวมทั้งสิ้น:', value: receipt.totalAmount, bold: true },
      { label: 'ยอดมัดจำ:', value: receipt.depositAmount, highlight: true }
    ];

    let currentY = startY;

    summaryItems.forEach(item => {
      if (item.highlight) {
        // Highlight deposit amount
        const boxH = rowH + 8;  // ลดจาก rowH + 10
        doc.rect(summaryX - 10, currentY - 5, summaryW + 20, boxH)
           .fill(CONFIG.color.bgGold);

        doc.font(CONFIG.font.boldName).fontSize(CONFIG.sizes.textBody + 2)
           .fillColor(CONFIG.color.primaryTeal);
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

      currentY += item.highlight ? rowH + 8 : rowH; // Adjusted from rowH + 10
    });

    // Amount in words
    const wordsBoxY = currentY + 10;
    const wordsBoxH = 35;  // ลดจาก 40

    doc.rect(margins.left, wordsBoxY, bodyW * 0.65, wordsBoxH)
       .fill(CONFIG.color.primaryTeal);

    doc.font(CONFIG.font.boldName).fontSize(CONFIG.sizes.textBody)
       .fillColor(CONFIG.color.textWhite)
       .text(receipt.amountInWords,
             margins.left + padding,
             wordsBoxY + (wordsBoxH - CONFIG.sizes.textBody) / 2,
             { width: bodyW * 0.65 - padding * 2, align: 'center' });

    return wordsBoxY + wordsBoxH + 10; // Changed from + 20
  }

  /** @private คำนวณความสูงของเงื่อนไข */
  static _getTermsHeight(doc, receipt, bodyW) {
    // กำหนดค่าคงที่แทนการคำนวณ
    return 80; // ค่าคงที่ที่เหมาะสม
  }

  /** @private วาดลายเซ็น */
  static _drawSignatures(doc, receipt, margins, bodyW, startY) {
    const sigBlockH = 60; // Adjusted from 70
    const colW = bodyW / 3;
    const sigLineW = colW * 0.75;
    const sigLineXOffset = (colW - sigLineW) / 2;
    const lineY = startY + 25;
    const imgH = 50;
    const imgPad = 5;

    const colsData = [
      { label: 'ผู้ชำระเงิน', labelEn: 'Customer', key: 'customer.signature' },
      { label: 'พนักงานขาย', labelEn: 'Sales Person', key: 'salesperson.signature' },
      { label: 'ผู้รับเงิน', labelEn: 'Cashier', key: 'cashierSignature' }
    ];

    const currentDateThai = formatThaiDate(new Date().toISOString());

    colsData.forEach((col, i) => {
      const x0 = margins.left + colW * i;
      const sigBuffer = col.key.split('.').reduce((o, k) => (o && o[k] != null ? o[k] : null), receipt);

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

  /** @private วาดเงื่อนไข */
  static _drawTerms(doc, receipt, margins, bodyW, startY, maxHeight) {
    let currentY = startY;

    doc.font(CONFIG.font.boldName).fontSize(CONFIG.sizes.textBody)
       .fillColor(CONFIG.color.primaryTeal)
       .text('เงื่อนไขและข้อกำหนด', margins.left, currentY);

    currentY += ensureHeight(doc.currentLineHeight(true) * 1.2);

    const termsText = receipt.termsText ||
`1. เงินมัดจำนี้ไม่สามารถขอคืนได้ ยกเว้นกรณีที่ทางร้านไม่สามารถจัดหาสินค้าตามที่ตกลงได้
2. กรุณาเก็บใบรับเงินมัดจำนี้ไว้เป็นหลักฐาน และนำมาแสดงในวันรับสินค้า
3. หากไม่มารับสินค้าภายใน 30 วัน ทางร้านขอสงวนสิทธิ์ในการยกเลิกการจอง`;

    doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.textSmall)
       .fillColor(CONFIG.color.textDark)
       .text(termsText, margins.left, currentY, { width: bodyW, lineGap: 3 });

    return currentY + doc.heightOfString(termsText, { width: bodyW, lineGap: 3 });
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

module.exports = DepositReceiptPdfController;
