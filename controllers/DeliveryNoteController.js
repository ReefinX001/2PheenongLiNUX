const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const DeliveryNote = require('../models/DeliveryNote');
const DepositReceiptLegacy = require('../models/DepositReceipt');

// Helper functions (reused from QuotationPdfController)
function ensureNumberData(value, fallback = 0) {
  return (typeof value === 'number' && !isNaN(value)) ? value : fallback;
}

function ensureHeight(value, fallback = 10) {
  return (value && value > 0) ? value : fallback;
}

async function loadImageBuffer(url) {
  if (!url) return null;

  try {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return Buffer.from(await response.arrayBuffer());
    } else if (url.startsWith('data:image/')) {
      const base64Data = url.split(',')[1];
      return Buffer.from(base64Data, 'base64');
    } else {
      const fullPath = path.join(__dirname, '..', url);
      if (fs.existsSync(fullPath)) {
        return fs.readFileSync(fullPath);
      }
    }
  } catch (error) {
    console.error('Error loading image:', error);
  }
  return null;
}

function formatThaiDate(dateString) {
  if (!dateString) return '';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const day = date.getDate();
  const month = thaiMonths[date.getMonth()];
  const year = date.getFullYear() + 543;

  return `${day} ${month} ${year}`;
}

function toThaiBahtText(amount) {
  if (!amount || amount === 0) return 'ศูนย์บาทถ้วน';

  const units = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];
  const numbers = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];

  function convertGroup(num) {
    let result = '';
    const digits = num.toString().split('').reverse();

    for (let i = 0; i < digits.length; i++) {
      const digit = parseInt(digits[i]);
      if (digit === 0) continue;

      if (i === 1 && digit === 2) {
        result = 'ยี่สิบ' + result;
      } else if (i === 1 && digit === 1) {
        result = 'สิบ' + result;
      } else if (i === 0 && digit === 1 && digits[1] && parseInt(digits[1]) > 0) {
        result = 'เอ็ด' + result;
      } else {
        result = numbers[digit] + units[i] + result;
      }
    }

    return result;
  }

  const [baht, satang] = amount.toFixed(2).split('.');
  let result = convertGroup(parseInt(baht)) + 'บาท';

  if (parseInt(satang) > 0) {
    result += convertGroup(parseInt(satang)) + 'สตางค์';
  } else {
    result += 'ถ้วน';
  }

  return result;
}

class DeliveryNoteController {

  static async generateDocumentNumber(prefix = 'DN') {
    try {
      const today = new Date();
      // Use Thai Buddhist year (พ.ศ.) - add 543 to Christian year, then take last 2 digits
      const thaiYear = (today.getFullYear() + 543).toString().slice(-2);
      const month = (today.getMonth() + 1).toString().padStart(2, '0');
      const day = today.getDate().toString().padStart(2, '0');

      const datePrefix = `${prefix}-${thaiYear}${month}${day}`;

      // Find the last document number for today
      const lastDoc = await DeliveryNote.findOne({
        documentNumber: { $regex: `^${datePrefix}` }
      }).sort({ documentNumber: -1 });

      let sequence = 1;
      if (lastDoc) {
        const lastSequence = parseInt(lastDoc.documentNumber.slice(-3));
        sequence = lastSequence + 1;
      }

      return `${datePrefix}-${sequence.toString().padStart(3, '0')}`;
    } catch (error) {
      console.error('Error generating document number:', error);
      const timestamp = Date.now().toString().slice(-6);
      return `${prefix}-${timestamp}`;
    }
  }

  static async createDeliveryNotePdf(deliveryNote) {
    return new Promise((resolve, reject) => {
      try {
        console.log('🚚 Starting delivery note PDF generation...');

        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => {
          console.log('✅ Delivery note PDF generation completed');
          resolve(Buffer.concat(chunks));
        });
        doc.on('error', error => {
          console.error('❌ PDF generation error:', error);
          reject(error);
        });

        // Page setup
        const pageW = 595.28; // A4 width
        const pageH = 841.89; // A4 height
        const margins = { top: 50, bottom: 50, left: 50, right: 50 };
        const bodyW = pageW - margins.left - margins.right;

        let startY = margins.top;

        // Load logo
        const logoPath = path.join(__dirname, '..', 'public', 'images', 'logo.png');

        // Company info (mock data - replace with actual company data)
        const company = {
          name: 'บริษัท พีนงค์ แอคเคาน์ติ้ง จำกัด',
          address: '123 ถนนราชดำเนิน กรุงเทพมหานคร 10200',
          phone: '02-123-4567',
          email: 'info@pheenong.com',
          taxId: '0123456789012'
        };

        // Branch info (from delivery note)
        const branch = {
          name: deliveryNote.branchName || 'สาขาหลัก',
          code: deliveryNote.branchCode || 'MAIN'
        };

        // Draw content
        startY = this._drawHeader(doc, deliveryNote, margins, pageW, startY, logoPath, company, branch);
        startY = this._drawDeliveryAndCustomerInfo(doc, deliveryNote, margins, bodyW, startY);
        startY = this._drawItemsTable(doc, deliveryNote, margins, bodyW, startY, pageH);
        startY = this._drawSummary(doc, deliveryNote, margins, bodyW, startY);
        startY = this._drawSignatures(doc, deliveryNote, margins, bodyW, startY);
        this._drawPageFooter(doc, margins, pageW, pageH);

        doc.end();

      } catch (error) {
        console.error('❌ Error creating delivery note PDF:', error);
        reject(error);
      }
    });
  }

  static _drawHeader(doc, deliveryNote, margins, pageW, startY, logoPath, company, branch) {
    const leftX = margins.left;
    const rightX = pageW - margins.right;
    const bodyW = rightX - leftX;

    // Company header
    doc.fontSize(18).font('Helvetica-Bold')
       .text(company.name, leftX, startY, { width: bodyW, align: 'center' });

    startY += 25;
    doc.fontSize(10).font('Helvetica')
       .text(`${company.address} | โทร: ${company.phone} | อีเมล: ${company.email}`,
             leftX, startY, { width: bodyW, align: 'center' });

    startY += 20;
    doc.fontSize(10)
       .text(`เลขประจำตัวผู้เสียภาษี: ${company.taxId}`,
             leftX, startY, { width: bodyW, align: 'center' });

    startY += 30;

    // Document title
    doc.fontSize(16).font('Helvetica-Bold')
       .text('ใบส่งของ / DELIVERY NOTE', leftX, startY, { width: bodyW, align: 'center' });

    startY += 30;

    // Document info box
    const boxHeight = 60;
    doc.rect(leftX, startY, bodyW, boxHeight).stroke();

    // Left side - Document details
    const colW = bodyW / 2;
    doc.fontSize(10).font('Helvetica-Bold')
       .text('เลขที่เอกสาร:', leftX + 10, startY + 10)
       .font('Helvetica')
       .text(deliveryNote.documentNumber, leftX + 80, startY + 10);

    doc.font('Helvetica-Bold')
       .text('วันที่:', leftX + 10, startY + 25)
       .font('Helvetica')
       .text(formatThaiDate(deliveryNote.documentDate), leftX + 80, startY + 25);

    doc.font('Helvetica-Bold')
       .text('สาขา:', leftX + 10, startY + 40)
       .font('Helvetica')
       .text(`${branch.name} (${branch.code})`, leftX + 80, startY + 40);

    // Right side - Related documents
    const rightCol = leftX + colW;
    if (deliveryNote.relatedDocuments.depositReceiptId) {
      doc.font('Helvetica-Bold')
         .text('อ้างอิงใบมัดจำ:', rightCol + 10, startY + 10)
         .font('Helvetica')
         .text(deliveryNote.relatedDocuments.depositReceiptId.toString().slice(-8), rightCol + 90, startY + 10);
    }

    if (deliveryNote.relatedDocuments.orderId) {
      doc.font('Helvetica-Bold')
         .text('เลขที่ออเดอร์:', rightCol + 10, startY + 25)
         .font('Helvetica')
         .text(deliveryNote.relatedDocuments.orderId.toString().slice(-8), rightCol + 90, startY + 25);
    }

    doc.font('Helvetica-Bold')
       .text('สถานะ:', rightCol + 10, startY + 40)
       .font('Helvetica')
       .text(this._getStatusText(deliveryNote.status), rightCol + 90, startY + 40);

    return startY + boxHeight + 20;
  }

  static _drawDeliveryAndCustomerInfo(doc, deliveryNote, margins, bodyW, startY) {
    const leftX = margins.left;
    const colW = bodyW / 2 - 10;

    // Customer section
    doc.fontSize(12).font('Helvetica-Bold')
       .text('ข้อมูลลูกค้า', leftX, startY);

    startY += 20;
    const customerBoxHeight = 80;
    doc.rect(leftX, startY, colW, customerBoxHeight).stroke();

    doc.fontSize(10).font('Helvetica-Bold')
       .text('ชื่อ:', leftX + 10, startY + 10)
       .font('Helvetica')
       .text(deliveryNote.customer.name, leftX + 35, startY + 10, { width: colW - 45 });

    if (deliveryNote.customer.address) {
      doc.font('Helvetica-Bold')
         .text('ที่อยู่:', leftX + 10, startY + 25)
         .font('Helvetica')
         .text(deliveryNote.customer.address, leftX + 40, startY + 25, { width: colW - 50 });
    }

    if (deliveryNote.customer.phone) {
      doc.font('Helvetica-Bold')
         .text('โทร:', leftX + 10, startY + 55)
         .font('Helvetica')
         .text(deliveryNote.customer.phone, leftX + 35, startY + 55);
    }

    // Delivery section
    const rightCol = leftX + colW + 20;
    doc.fontSize(12).font('Helvetica-Bold')
       .text('ข้อมูลการส่ง', rightCol, startY - 20);

    doc.rect(rightCol, startY, colW, customerBoxHeight).stroke();

    doc.fontSize(10).font('Helvetica-Bold')
       .text('ที่อยู่จัดส่ง:', rightCol + 10, startY + 10)
       .font('Helvetica')
       .text(deliveryNote.delivery.address, rightCol + 60, startY + 10, { width: colW - 70 });

    if (deliveryNote.delivery.contactPerson) {
      doc.font('Helvetica-Bold')
         .text('ผู้รับ:', rightCol + 10, startY + 35)
         .font('Helvetica')
         .text(deliveryNote.delivery.contactPerson, rightCol + 40, startY + 35);
    }

    if (deliveryNote.delivery.contactPhone) {
      doc.font('Helvetica-Bold')
         .text('โทรผู้รับ:', rightCol + 10, startY + 50)
         .font('Helvetica')
         .text(deliveryNote.delivery.contactPhone, rightCol + 50, startY + 50);
    }

    doc.font('Helvetica-Bold')
       .text('วันที่ส่ง:', rightCol + 10, startY + 65)
       .font('Helvetica')
       .text(formatThaiDate(deliveryNote.delivery.deliveryDate), rightCol + 50, startY + 65);

    return startY + customerBoxHeight + 30;
  }

  static _drawItemsTable(doc, deliveryNote, margins, bodyW, startY, pageH) {
    const leftX = margins.left;

    // Table header
    doc.fontSize(12).font('Helvetica-Bold')
       .text('รายการสินค้า', leftX, startY);

    startY += 25;

    const tableHeaders = ['ลำดับ', 'รายการ', 'รุ่น', 'IMEI/Serial', 'จำนวน', 'ราคาต่อหน่วย', 'รวม'];
    const colWidths = [40, 150, 80, 100, 50, 80, 90];

    let currentX = leftX;
    const headerHeight = 25;

    // Draw header background
    doc.rect(leftX, startY, bodyW, headerHeight).fill('#f5f5f5').stroke();

    // Draw header text
    doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold');
    currentX = leftX;
    tableHeaders.forEach((header, index) => {
      doc.text(header, currentX + 5, startY + 8, { width: colWidths[index] - 10, align: 'center' });
      currentX += colWidths[index];
    });

    startY += headerHeight;

    // Draw items
    deliveryNote.items.forEach((item, index) => {
      const rowHeight = 30;

      // Check if we need a new page
      if (startY + rowHeight > pageH - margins.bottom - 100) {
        doc.addPage();
        startY = margins.top;
      }

      // Draw row background (alternating)
      if (index % 2 === 0) {
        doc.rect(leftX, startY, bodyW, rowHeight).fill('#fafafa').stroke();
      } else {
        doc.rect(leftX, startY, bodyW, rowHeight).stroke();
      }

      // Draw cell data
      doc.fillColor('#000000').fontSize(9).font('Helvetica');
      currentX = leftX;

      const cellData = [
        (index + 1).toString(),
        item.name,
        item.model || '',
        item.imei || item.serialNumber || '',
        item.quantity.toString(),
        ensureNumberData(item.unitPrice, 0).toLocaleString('th-TH', { minimumFractionDigits: 2 }),
        ensureNumberData(item.totalPrice, 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })
      ];

      cellData.forEach((data, colIndex) => {
        const align = [3, 4, 5, 6].includes(colIndex) ? 'right' : 'left';
        doc.text(data, currentX + 5, startY + 10, {
          width: colWidths[colIndex] - 10,
          align: align,
          height: rowHeight - 5
        });
        currentX += colWidths[colIndex];
      });

      startY += rowHeight;
    });

    return startY + 20;
  }

  static _drawSummary(doc, deliveryNote, margins, bodyW, startY) {
    const leftX = margins.left;
    const summaryWidth = 200;
    const summaryX = leftX + bodyW - summaryWidth;

    // Summary box
    const summaryHeight = 80;
    doc.rect(summaryX, startY, summaryWidth, summaryHeight).stroke();

    let currentY = startY + 10;
    doc.fontSize(10);

    // Subtotal
    doc.font('Helvetica-Bold')
       .text('ยอดรวม:', summaryX + 10, currentY)
       .font('Helvetica')
       .text(`${ensureNumberData(deliveryNote.summary.subtotal, 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`,
             summaryX + 10, currentY, { width: summaryWidth - 20, align: 'right' });

    currentY += 15;

    // Tax (if applicable)
    if (deliveryNote.summary.taxAmount > 0) {
      doc.font('Helvetica-Bold')
         .text('ภาษีมูลค่าเพิ่ม:', summaryX + 10, currentY)
         .font('Helvetica')
         .text(`${ensureNumberData(deliveryNote.summary.taxAmount, 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`,
               summaryX + 10, currentY, { width: summaryWidth - 20, align: 'right' });
      currentY += 15;
    }

    // Deposit applied
    if (deliveryNote.summary.depositApplied > 0) {
      doc.font('Helvetica-Bold')
         .text('หักเงินมัดจำ:', summaryX + 10, currentY)
         .font('Helvetica')
         .text(`${ensureNumberData(deliveryNote.summary.depositApplied, 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`,
               summaryX + 10, currentY, { width: summaryWidth - 20, align: 'right' });
      currentY += 15;
    }

    // Total
    doc.font('Helvetica-Bold')
       .text('รวมทั้งสิ้น:', summaryX + 10, currentY)
       .text(`${ensureNumberData(deliveryNote.summary.totalAmount, 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`,
             summaryX + 10, currentY, { width: summaryWidth - 20, align: 'right' });

    // Amount in words
    startY += summaryHeight + 20;
    doc.fontSize(10).font('Helvetica-Bold')
       .text('จำนวนเงิน (ตัวอักษร):', leftX, startY);

    startY += 15;
    doc.font('Helvetica')
       .text(toThaiBahtText(deliveryNote.summary.totalAmount), leftX, startY, { width: bodyW });

    return startY + 30;
  }

  static _drawSignatures(doc, deliveryNote, margins, bodyW, startY) {
    const leftX = margins.left;
    const signatureWidth = bodyW / 3 - 20;

    // Signature sections
    const sections = [
      { title: 'ผู้จัดส่ง', name: deliveryNote.staff.deliveredBy?.name || '', position: 'พนักงานจัดส่ง' },
      { title: 'ผู้รับของ', name: '', position: 'ลูกค้า' },
      { title: 'ผู้อนุมัติ', name: '', position: 'ผู้จัดการ' }
    ];

    sections.forEach((section, index) => {
      const sectionX = leftX + (index * (signatureWidth + 30));

      doc.fontSize(10).font('Helvetica-Bold')
         .text(section.title, sectionX, startY, { width: signatureWidth, align: 'center' });

      // Signature line
      doc.moveTo(sectionX, startY + 50)
         .lineTo(sectionX + signatureWidth, startY + 50)
         .stroke();

      if (section.name) {
        doc.font('Helvetica')
           .text(section.name, sectionX, startY + 60, { width: signatureWidth, align: 'center' });
      }

      doc.text(section.position, sectionX, startY + 75, { width: signatureWidth, align: 'center' });

      // Date line
      doc.text('วันที่ ................', sectionX, startY + 90, { width: signatureWidth, align: 'center' });
    });

    return startY + 120;
  }

  static _drawPageFooter(doc, margins, pageW, pageH) {
    const footerY = pageH - margins.bottom + 10;
    const footerText = 'หมายเหตุ: กรุณาตรวจสอบสินค้าให้ครบถ้วนก่อนรับของ';

    doc.fontSize(8).font('Helvetica')
       .text(footerText, margins.left, footerY, {
         width: pageW - margins.left - margins.right,
         align: 'center'
       });
  }

  static _getStatusText(status) {
    const statusMap = {
      'pending': 'รอดำเนินการ',
      'preparing': 'กำลังเตรียม',
      'out_for_delivery': 'ส่งแล้ว',
      'delivered': 'ส่งมอบแล้ว',
      'failed': 'ส่งไม่สำเร็จ',
      'cancelled': 'ยกเลิก'
    };
    return statusMap[status] || status;
  }

  // API methods
  static async createDeliveryNote(req, res) {
    try {
      const deliveryNoteData = req.body;

      // Generate document number if not provided
      if (!deliveryNoteData.documentNumber) {
        deliveryNoteData.documentNumber = await DeliveryNoteController.generateDocumentNumber();
      }

      const deliveryNote = new DeliveryNote(deliveryNoteData);
      await deliveryNote.save();

      res.status(201).json({
        success: true,
        data: deliveryNote,
        message: 'สร้างใบส่งของสำเร็จ'
      });
    } catch (error) {
      console.error('Error creating delivery note:', error);
      res.status(500).json({
        success: false,
        error: 'เกิดข้อผิดพลาดในการสร้างใบส่งของ',
        message: error.message
      });
    }
  }

  static async getDeliveryNotes(req, res) {
    try {
      const { branchCode, status, page = 1, limit = 10 } = req.query;

      const filter = {};
      if (branchCode) filter.branchCode = branchCode;
      if (status) filter.status = status;

      const deliveryNotes = await DeliveryNote.find(filter)
        .populate('relatedDocuments.depositReceiptId')
        .populate('relatedDocuments.orderId')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      const total = await DeliveryNote.countDocuments(filter);

      res.json({
        success: true,
        data: deliveryNotes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error getting delivery notes:', error);
      res.status(500).json({
        success: false,
        error: 'เกิดข้อผิดพลาดในการโหลดใบส่งของ',
        message: error.message
      });
    }
  }

  static async getDeliveryNoteById(req, res) {
    try {
      const { id } = req.params;

      const deliveryNote = await DeliveryNote.findById(id)
        .populate('relatedDocuments.depositReceiptId')
        .populate('relatedDocuments.orderId');

      if (!deliveryNote) {
        return res.status(404).json({
          success: false,
          error: 'ไม่พบใบส่งของที่ระบุ'
        });
      }

      res.json({
        success: true,
        data: deliveryNote
      });
    } catch (error) {
      console.error('Error getting delivery note:', error);
      res.status(500).json({
        success: false,
        error: 'เกิดข้อผิดพลาดในการโหลดใบส่งของ',
        message: error.message
      });
    }
  }

  static async printDeliveryNote(req, res) {
    try {
      const { id } = req.params;

      const deliveryNote = await DeliveryNote.findById(id)
        .populate('relatedDocuments.depositReceiptId')
        .populate('relatedDocuments.orderId');

      if (!deliveryNote) {
        return res.status(404).json({
          success: false,
          error: 'ไม่พบใบส่งของที่ระบุ'
        });
      }

      const pdfBuffer = await DeliveryNoteController.createDeliveryNotePdf(deliveryNote);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="DeliveryNote_${deliveryNote.documentNumber}.pdf"`);
      res.send(pdfBuffer);

    } catch (error) {
      console.error('Error printing delivery note:', error);
      res.status(500).json({
        success: false,
        error: 'เกิดข้อผิดพลาดในการพิมพ์ใบส่งของ',
        message: error.message
      });
    }
  }

  static async createFromDepositReceipt(req, res) {
    try {
      const { depositReceiptId } = req.params;
      const deliveryInfo = req.body;

      const depositReceipt = await DepositReceiptLegacy.findById(depositReceiptId);
      if (!depositReceipt) {
        return res.status(404).json({
          success: false,
          error: 'ไม่พบใบรับเงินมัดจำที่ระบุ'
        });
      }

      const deliveryNote = await DeliveryNote.createFromDepositReceipt(depositReceipt, deliveryInfo);
      await deliveryNote.save();

      // Update deposit receipt to mark as having delivery note
      depositReceipt.progress.delivered = true;
      await depositReceipt.save();

      res.status(201).json({
        success: true,
        data: deliveryNote,
        message: 'สร้างใบส่งของจากใบรับเงินมัดจำสำเร็จ'
      });
    } catch (error) {
      console.error('Error creating delivery note from deposit receipt:', error);
      res.status(500).json({
        success: false,
        error: 'เกิดข้อผิดพลาดในการสร้างใบส่งของจากใบรับเงินมัดจำ',
        message: error.message
      });
    }
  }

  static async updateDeliveryStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, deliveredBy, receivedBy, signature } = req.body;

      const deliveryNote = await DeliveryNote.findById(id);
      if (!deliveryNote) {
        return res.status(404).json({
          success: false,
          error: 'ไม่พบใบส่งของที่ระบุ'
        });
      }

      deliveryNote.status = status;

      if (status === 'delivered') {
        deliveryNote.tracking.deliveredAt = new Date();
        if (deliveredBy) deliveryNote.tracking.deliveredBy = deliveredBy;
        if (receivedBy) deliveryNote.tracking.receivedBy = receivedBy;
        if (signature) deliveryNote.tracking.signature = signature;
      }

      await deliveryNote.save();

      res.json({
        success: true,
        data: deliveryNote,
        message: 'อัปเดตสถานะการส่งสำเร็จ'
      });
    } catch (error) {
      console.error('Error updating delivery status:', error);
      res.status(500).json({
        success: false,
        error: 'เกิดข้อผิดพลาดในการอัปเดตสถานะการส่ง',
        message: error.message
      });
    }
  }
}

module.exports = DeliveryNoteController;