// assetsPDFController.js
// Controller สำหรับสร้าง Payment Voucher PDF ตามรูปแบบต้นฉบับจากภาพ S__5439491.jpg
// ใช้รูปแบบเอกสารเหมือนต้นฉบับทุกรายละเอียด

const PDFDocument = require('pdfkit');
const path = require('path');
const dayjs = require('dayjs');
const fs = require('fs');

// ===== CONFIG =====
const CONFIG = {
  page: {
    size: 'A4',
    margins: {
      top: 25,
      bottom: 25,
      left: 30,
      right: 30
    }
  },
  font: {
    name: 'THSarabun',
    boldName: 'THSarabun-Bold',
    path: path.join(__dirname, '..', 'fonts', 'THSarabunNew.ttf'),
    boldPath: path.join(__dirname, '..', 'fonts', 'THSarabunNew Bold.ttf'),
    fallbackPath: path.join(__dirname, '..', 'assets', 'fonts', 'NotoSansThai-Regular.ttf'),
    fallbackBoldPath: path.join(__dirname, '..', 'assets', 'fonts', 'NotoSansThai-Bold.ttf')
  },
  colors: {
    blue: '#6B8AC4',         // สีฟ้าตามภาพต้นฉบับ
    lightBlue: '#EBF0F8',    // สีฟ้าอ่อนมากสำหรับแถวรวม
    textWhite: '#FFFFFF',    // สีขาว
    textBlack: '#000000',    // สีดำ
    lineGray: '#000000',     // เส้นตารางสีดำ
  }
};

// ===== HELPER FUNCTIONS =====
function toBaht(n) {
  if (n === null || n === undefined || isNaN(n)) return '';
  return Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function safe(text) {
  return (text ?? '').toString();
}

function registerFonts(doc) {
  try {
    if (fs.existsSync(CONFIG.font.path) && fs.existsSync(CONFIG.font.boldPath)) {
      doc.registerFont(CONFIG.font.name, CONFIG.font.path);
      doc.registerFont(CONFIG.font.boldName, CONFIG.font.boldPath);
      doc._thai = CONFIG.font.name;
      doc._thaiBold = CONFIG.font.boldName;
      doc.font(CONFIG.font.name);
    } else if (fs.existsSync(CONFIG.font.fallbackPath) && fs.existsSync(CONFIG.font.fallbackBoldPath)) {
      doc.registerFont('thai', CONFIG.font.fallbackPath);
      doc.registerFont('thaib', CONFIG.font.fallbackBoldPath);
      doc._thai = 'thai';
      doc._thaiBold = 'thaib';
      doc.font('thai');
    } else {
      doc._thai = 'Helvetica';
      doc._thaiBold = 'Helvetica-Bold';
      doc.font('Helvetica');
    }
  } catch (e) {
    doc._thai = 'Helvetica';
    doc._thaiBold = 'Helvetica-Bold';
    doc.font('Helvetica');
  }
}

function checkbox(doc, x, y, checked=false) {
  const box = 8;
  doc.rect(x, y, box, box).stroke();
  if (checked) {
    doc.save();
    doc.strokeColor(CONFIG.colors.textBlack);
    doc.lineWidth(1.5);
    doc.moveTo(x + 2, y + 4);
    doc.lineTo(x + 3.5, y + 6);
    doc.lineTo(x + 6, y + 2);
    doc.stroke();
    doc.restore();
  }
}

// ===== Main Controller =====
function generateAssetsListPDF(req, res) {
  try {
    const data = (req.body && Object.keys(req.body).length) ? req.body : {};

    const doc = new PDFDocument(CONFIG.page);
    registerFonts(doc);

    res.setHeader('Content-Type', 'application/pdf');
    const filename = `payment-voucher-${dayjs().format('YYYYMMDD')}.pdf`;
    if (req.query.download === '1') {
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    } else {
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    }
    doc.pipe(res);

    const pageWidth = doc.page.width;
    const contentWidth = pageWidth - 60; // 30px margins
    const leftX = 30;
    let y = 25;

    // ======= HEADER SECTION (ตามภาพต้นฉบับ) =======
    // Company name - Phoenix Print (ซ้ายบน)
    doc.font(doc._thaiBold || 'Helvetica-Bold');
    doc.fontSize(13);
    doc.fillColor(CONFIG.colors.textBlack);
    doc.text('ฟีนิกซ์ พริ้นท์ (ประเทศไทย)', leftX, y);
    doc.font(doc._thai || 'Helvetica');
    doc.fontSize(9);
    doc.text('Phoenix Print (Thailand)', leftX, y + 14);

    // Payment Voucher title box (ขวาบน) - พื้นหลังสีฟ้า
    const titleBoxW = 160;
    const titleBoxH = 35;
    const titleBoxX = leftX + contentWidth - titleBoxW;

    doc.save();
    doc.rect(titleBoxX, y, titleBoxW, titleBoxH)
       .fillAndStroke(CONFIG.colors.blue, CONFIG.colors.blue);
    doc.fillColor(CONFIG.colors.textWhite);
    doc.font(doc._thaiBold || 'Helvetica-Bold');
    doc.fontSize(16);
    doc.text('ใบสำคัญจ่าย', titleBoxX, y + 6, { width: titleBoxW, align: 'center' });
    doc.fontSize(10);
    doc.text('Payment Voucher', titleBoxX, y + 21, { width: titleBoxW, align: 'center' });
    doc.restore();

    // Document number box (ใต้กล่องหัวเรื่อง)
    const docNoY = y + titleBoxH + 2;
    doc.rect(titleBoxX, docNoY, titleBoxW, 20).stroke();
    doc.fillColor(CONFIG.colors.textBlack);
    doc.font(doc._thai || 'Helvetica');
    doc.fontSize(9);
    doc.text('เลขที่เอกสาร / Doc No.', titleBoxX + 5, docNoY + 6);
    doc.font(doc._thaiBold || 'Helvetica-Bold');
    doc.text('_________________', titleBoxX + 80, docNoY + 6);

    // Name and Address section (ตามภาพ)
    y = 80;
    doc.font(doc._thai || 'Helvetica');
    doc.fontSize(9);

    // ชื่อ / Name
    doc.text('ชื่อ', leftX, y);
    doc.text('Name', leftX, y + 10);
    doc.moveTo(leftX + 40, y + 8).lineTo(leftX + 320, y + 8).stroke();

    // วันที่ / Date
    doc.text('วันที่', leftX + 350, y);
    doc.text('Date', leftX + 350, y + 10);
    doc.moveTo(leftX + 380, y + 8).lineTo(leftX + contentWidth, y + 8).stroke();

    // ที่อยู่ / Address
    y += 25;
    doc.text('ที่อยู่', leftX, y);
    doc.text('Address', leftX, y + 10);
    doc.moveTo(leftX + 40, y + 8).lineTo(leftX + contentWidth, y + 8).stroke();

    // ======= MAIN TABLE (ตามภาพต้นฉบับ) =======
    y = 135;

    // Table columns (adjusted to match image)
    const cols = [25, 70, 85, 195, 70, 70]; // Total 515
    const headerH = 28;
    const rowH = 18;

    // Table header - พื้นหลังสีฟ้า
    doc.save();
    doc.rect(leftX, y, contentWidth, headerH)
       .fillAndStroke(CONFIG.colors.blue, CONFIG.colors.blue);

    // Draw vertical lines in header
    doc.strokeColor(CONFIG.colors.textBlack);
    doc.lineWidth(0.5);
    let cx = leftX;
    for (let i = 0; i <= cols.length; i++) {
      doc.moveTo(cx, y).lineTo(cx, y + headerH).stroke();
      if (i < cols.length) cx += cols[i];
    }

    // Header text
    doc.fillColor(CONFIG.colors.textWhite);
    doc.font(doc._thaiBold || 'Helvetica-Bold');

    cx = leftX;
    const headers = [
      { th: 'เลขที่', en: 'No.', align: 'center' },
      { th: 'วันที่', en: 'Date', align: 'center' },
      { th: 'เลขที่เอกสาร', en: 'Invoice No.', align: 'center' },
      { th: 'รายการ', en: 'Description', align: 'left' },
      { th: 'ลูกหนี้', en: 'Debit', align: 'center' },
      { th: 'จำนวนเงิน', en: 'Amount', align: 'center' }
    ];

    headers.forEach((h, i) => {
      const padding = h.align === 'left' ? 5 : 0;
      doc.fontSize(9);
      doc.text(h.th, cx + padding, y + 5, {
        width: cols[i] - padding * 2,
        align: h.align
      });
      doc.fontSize(8);
      doc.text(h.en, cx + padding, y + 16, {
        width: cols[i] - padding * 2,
        align: h.align
      });
      cx += cols[i];
    });
    doc.restore();

    // Data rows - 12 rows (ตามภาพ)
    let rowY = y + headerH;
    doc.strokeColor(CONFIG.colors.lineGray);
    doc.lineWidth(0.5);

    for (let row = 0; row < 12; row++) {
      cx = leftX;
      for (let i = 0; i <= cols.length; i++) {
        doc.moveTo(cx, rowY).lineTo(cx, rowY + rowH).stroke();
        if (i < cols.length) cx += cols[i];
      }
      doc.moveTo(leftX, rowY + rowH).lineTo(leftX + contentWidth, rowY + rowH).stroke();
      rowY += rowH;
    }

    // Total row - พื้นหลังสีฟ้าอ่อน
    doc.rect(leftX, rowY, cols[0] + cols[1] + cols[2] + cols[3], rowH)
       .fillAndStroke(CONFIG.colors.lightBlue, CONFIG.colors.lineGray);
    doc.rect(leftX + cols[0] + cols[1] + cols[2] + cols[3], rowY, cols[4], rowH).stroke();
    doc.rect(leftX + cols[0] + cols[1] + cols[2] + cols[3] + cols[4], rowY, cols[5], rowH).stroke();

    doc.fillColor(CONFIG.colors.textBlack);
    doc.font(doc._thaiBold || 'Helvetica-Bold');
    doc.fontSize(9);
    doc.text('รวม / Total', leftX + (cols[0] + cols[1] + cols[2] + cols[3])/2 - 20, rowY + 5);

    // ======= AMOUNT IN WORDS & SUMMARY (ตามภาพ) =======
    y = rowY + rowH + 12;

    // Amount in words box (ซ้าย)
    const wordBoxW = 315;
    const wordBoxH = 25;
    doc.rect(leftX, y, wordBoxW, wordBoxH).stroke();
    doc.font(doc._thai || 'Helvetica');
    doc.fontSize(8);
    doc.text('จำนวนเงิน (ตัวอักษร) / Amount in Words:', leftX + 5, y + 8);

    // Summary section (ขวา)
    const summaryX = leftX + wordBoxW + 10;
    const summaryW = contentWidth - wordBoxW - 10;

    // Summary items
    const summaryItems = [
      { label: 'รวมเงิน / Sub Total' },
      { label: 'ส่วนลด / Discount' },
      { label: 'ภาษี VAT / VAT' },
      { label: 'รวมทั้งสิ้น / Grand Total', bold: true }
    ];

    let summaryY = y;
    summaryItems.forEach((item, index) => {
      const itemH = 18;

      if (item.bold) {
        // Grand Total - พื้นหลังสีฟ้า
        doc.rect(summaryX, summaryY, summaryW, itemH)
           .fillAndStroke(CONFIG.colors.blue, CONFIG.colors.lineGray);
        doc.fillColor(CONFIG.colors.textWhite);
      } else {
        doc.rect(summaryX, summaryY, summaryW, itemH).stroke();
        doc.fillColor(CONFIG.colors.textBlack);
      }

      // Draw middle line for value
      doc.moveTo(summaryX + summaryW * 0.6, summaryY)
         .lineTo(summaryX + summaryW * 0.6, summaryY + itemH).stroke();

      doc.font(item.bold ? (doc._thaiBold || 'Helvetica-Bold') : (doc._thai || 'Helvetica'));
      doc.fontSize(8);
      doc.text(item.label, summaryX + 3, summaryY + 5);

      summaryY += itemH;
    });

    // ======= PAYMENT METHOD (ตามภาพ) =======
    y += 80;
    doc.fillColor(CONFIG.colors.textBlack);
    doc.font(doc._thai || 'Helvetica');
    doc.fontSize(9);
    doc.text('วิธีการชำระเงิน / Payment Method', leftX, y);

    y += 12;
    checkbox(doc, leftX + 10, y);
    doc.text('เงินสด / Cash', leftX + 25, y - 1);

    checkbox(doc, leftX + 110, y);
    doc.text('เช็ค / Cheque', leftX + 125, y - 1);

    checkbox(doc, leftX + 210, y);
    doc.text('โอนเงิน / Transfer', leftX + 225, y - 1);

    checkbox(doc, leftX + 320, y);
    doc.text('อื่นๆ / Other', leftX + 335, y - 1);

    // Bank details
    y += 18;
    doc.fontSize(8);
    doc.text('ธนาคาร / Bank', leftX + 20, y);
    doc.moveTo(leftX + 75, y + 8).lineTo(leftX + 180, y + 8).stroke();

    doc.text('สาขา / Branch', leftX + 200, y);
    doc.moveTo(leftX + 250, y + 8).lineTo(leftX + 350, y + 8).stroke();

    y += 15;
    doc.text('เลขที่เช็ค / Cheque No.', leftX + 20, y);
    doc.moveTo(leftX + 95, y + 8).lineTo(leftX + 180, y + 8).stroke();

    doc.text('วันที่ / Date', leftX + 200, y);
    doc.moveTo(leftX + 240, y + 8).lineTo(leftX + 350, y + 8).stroke();

    // ======= GL TABLE (ตามภาพ) =======
    y += 30;
    const glCols = [90, 255, 85, 85]; // Total 515
    const glHeaderH = 22;

    // GL header - พื้นหลังสีฟ้า
    doc.save();
    doc.rect(leftX, y, contentWidth, glHeaderH)
       .fillAndStroke(CONFIG.colors.blue, CONFIG.colors.blue);

    // GL header borders
    doc.strokeColor(CONFIG.colors.textBlack);
    cx = leftX;
    for (let i = 0; i <= glCols.length; i++) {
      doc.moveTo(cx, y).lineTo(cx, y + glHeaderH).stroke();
      if (i < glCols.length) cx += glCols[i];
    }

    doc.fillColor(CONFIG.colors.textWhite);
    doc.font(doc._thaiBold || 'Helvetica-Bold');
    doc.fontSize(9);

    cx = leftX;
    const glHeaders = [
      'รหัสบัญชี / GL',
      'รายการ / List',
      'เดบิต / DR',
      'เครดิต / CR'
    ];

    glHeaders.forEach((h, i) => {
      doc.text(h, cx + 3, y + 7, { width: glCols[i] - 6, align: 'center' });
      cx += glCols[i];
    });
    doc.restore();

    // GL rows - 5 rows
    let glY = y + glHeaderH;
    for (let row = 0; row < 5; row++) {
      cx = leftX;
      for (let i = 0; i <= glCols.length; i++) {
        doc.moveTo(cx, glY).lineTo(cx, glY + rowH).stroke();
        if (i < glCols.length) cx += glCols[i];
      }
      doc.moveTo(leftX, glY + rowH).lineTo(leftX + contentWidth, glY + rowH).stroke();
      glY += rowH;
    }

    // GL Total row - พื้นหลังสีฟ้าอ่อน
    doc.rect(leftX, glY, glCols[0] + glCols[1], rowH)
       .fillAndStroke(CONFIG.colors.lightBlue, CONFIG.colors.lineGray);
    doc.rect(leftX + glCols[0] + glCols[1], glY, glCols[2], rowH).stroke();
    doc.rect(leftX + glCols[0] + glCols[1] + glCols[2], glY, glCols[3], rowH).stroke();

    doc.fillColor(CONFIG.colors.textBlack);
    doc.font(doc._thaiBold || 'Helvetica-Bold');
    doc.fontSize(9);
    doc.text('รวม / Total', leftX + (glCols[0] + glCols[1])/2 - 20, glY + 5);

    // ======= SIGNATURE SECTION (ตามภาพ) =======
    y = glY + rowH + 25;
    const sigW = 140;
    const sigSpacing = (contentWidth - (sigW * 3)) / 2;

    const signatures = [
      { title: 'ผู้จัดทำ', subtitle: 'Prepared By' },
      { title: 'ผู้ตรวจสอบ', subtitle: 'Reviewed By' },
      { title: 'ผู้อนุมัติ', subtitle: 'Approved By' }
    ];

    signatures.forEach((sig, i) => {
      const sigX = leftX + (sigW + sigSpacing) * i;

      // Signature line
      doc.moveTo(sigX + 15, y + 25).lineTo(sigX + sigW - 15, y + 25).stroke();

      // Parentheses for name
      doc.font(doc._thai || 'Helvetica');
      doc.fontSize(8);
      doc.text('(', sigX + 10, y + 28);
      doc.text(')', sigX + sigW - 15, y + 28);

      // Title
      doc.fontSize(9);
      doc.text(sig.title, sigX, y + 40, { width: sigW, align: 'center' });
      doc.fontSize(8);
      doc.text(sig.subtitle, sigX, y + 50, { width: sigW, align: 'center' });

      // Date
      doc.text('วันที่/Date _____/_____/_____', sigX + 20, y + 62);
    });

    doc.end();

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการสร้าง PDF' });
  }
}

function generateSingleAssetPDF(req, res) {
  generateAssetsListPDF(req, res);
}

module.exports = {
  generateAssetsListPDF,
  generateSingleAssetPDF
};