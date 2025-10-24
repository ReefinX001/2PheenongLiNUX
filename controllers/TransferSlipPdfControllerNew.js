/************************************************************
 * TransferSlipPdfController.js - Production Ready with A4PDF Layout
 * ระบบสร้าง PDF ใบโอนสินค้าสำหรับโอนย้ายสินค้าระหว่างสาขา
 * รูปแบบเหมือนกับ A4PDFController.js และ QuotationPdfController
 * Version: 3.0 - A4PDF Template Style
 * Updated: 20 สิงหาคม 2568
 *
 * Features:
 * - รูปแบบเหมือน A4PDFController.js
 * - สร้าง PDF ใบโอนสินค้าแบบมืออาชีพ
 * - รองรับฟอนต์ภาษาไทย (THSarabunNew)
 * - ลายเซ็นแบบเส้นขีดมืออาชีพ
 * - รองรับการโหลดรูปภาพและลายเซ็น
 * - รองรับข้อมูลสาขา ผู้ส่ง ผู้รับ และรายการสินค้า
 ************************************************************/
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const http = require('http');
const https = require('https');

// เพิ่ม imports สำหรับโมเดลต่าง ๆ เหมือน A4PDFController
const mongoose = require('mongoose');
const Transfer = require('../models/Stock/Transfer');
const Branch = require('../models/Account/Branch');

// เพิ่ม thai-baht-text library เหมือน A4PDFController
const bahtText = require('thai-baht-text');

// 🔧 เพิ่ม EmailService สำหรับส่งเอกสารทาง Gmail (ถ้าต้องการ)
// const EmailService = require('../services/emailService');

function toThaiBahtText(n) {
  // Validate input เพื่อป้องกัน error
  if (n === null || n === undefined || n === '' || isNaN(n)) {
    console.warn('⚠️ Invalid input for toThaiBahtText:', n, 'using default 0');
    return bahtText(0);
  }

  // Convert to number if it's a string
  const num = typeof n === 'string' ? parseFloat(n) : n;

  if (isNaN(num)) {
    console.warn('⚠️ Cannot convert to number for toThaiBahtText:', n, 'using default 0');
    return bahtText(0);
  }

  return bahtText(num);
}

// ===== CONFIG เหมือน A4PDFController =====
const CONFIG = {
  page: { size: 'A4', margin: 40 },
  font: {
    name: 'THSarabun', boldName: 'THSarabun-Bold',
    path: path.join(__dirname, '..', 'fonts', 'THSarabunNew.ttf'),
    boldPath: path.join(__dirname, '..', 'fonts', 'THSarabunNew Bold.ttf')
  },
  color: {
    primaryBlue: '#3498DB',
    transferGreen: '#16A085', // สีเขียวสำหรับใบโอน
    textHeader: '#FFFFFF',
    textBlack: '#000000',
    textDark: '#222222',
    textLight: '#555555',
    lineLight: '#E0E0E0',
    lineDark: '#CCCCCC',
    sigLine: '#888888',
    bgWhite: '#FFFFFF',
    bgAccent: '#16A085'
  },
  sizes: {
    logo: { w: 145 },
    heading1: 20,
    heading2: 14,
    heading3: 14,
    textBody: 13,
    textLabel: 11,
    textSmall: 10,
    tableHeader: 12,
    tableRow: 12,
    lineSpacing: 1.4
  },
  layout: {
    tableCols: {
      no: 35,
      item: 180,
      imei: 140,
      qty: 45,
      unit: 50,
      note: 65
    }
  }
};

// ===== HELPER FUNCTIONS เหมือน A4PDFController =====
function ensureNumberData(value, fallback = 0) {
    const num = Number(value);
    return isNaN(num) ? fallback : num;
}

function ensureHeight(value, fallback = 10) {
    return value > 0 ? value : fallback;
}

async function loadImageBuffer(url) {
  return new Promise((resolve, reject) => {
    if (!url) {
      resolve(null);
      return;
    }

    // ตรวจสอบว่าเป็น Data URL หรือไม่
    if (typeof url === 'string' && url.startsWith('data:image/')) {
      try {
        const base64Data = url.replace(/^data:image\/[a-z]+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        resolve(buffer);
        return;
      } catch (error) {
        console.warn('⚠️ Error parsing data URL:', error.message);
        resolve(null);
        return;
      }
    }

    // ตรวจสอบว่าเป็นไฟล์ในเครื่องหรือไม่
    if (typeof url === 'string' && !url.startsWith('http')) {
      try {
        const buffer = fs.readFileSync(url);
        resolve(buffer);
        return;
      } catch (error) {
        console.warn('⚠️ Error reading local file:', error.message);
        resolve(null);
        return;
      }
    }

    // โหลดจาก URL
    const client = url.startsWith('https:') ? https : http;
    const request = client.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
    });

    request.on('error', reject);
    request.setTimeout(10000, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

function formatThaiDate(dateString) {
  try {
    if (!dateString) return 'ไม่ระบุวันที่';

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'ไม่ระบุวันที่';

    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];

    const day = date.getDate();
    const month = thaiMonths[date.getMonth()];
    const year = date.getFullYear() + 543;

    return `${day} ${month} ${year}`;
  } catch (error) {
    console.warn('⚠️ Error formatting Thai date:', error);
    return 'ไม่ระบุวันที่';
  }
}

function formatTransferStatus(status) {
  const statusMap = {
    'pending-stock': 'รอการอนุมัติจากฝ่ายสต๊อก',
    'pending-receive': 'รออนุมัติรับสินค้า',
    'completed': 'โอนสำเร็จ',
    'rejected': 'ถูกปฏิเสธ'
  };
  return statusMap[status] || status || 'ไม่ระบุสถานะ';
}

function createSampleTransfer(overrides = {}) {
  return {
    _id: 'sample-transfer-id',
    transferNo: 'DO-680908-001',
    transferDate: new Date(),
    status: 'completed',
    fromBranch: {
      name: 'สำนักงานใหญ่',
      code: '00000',
      address: '148/91 หมู่ที่ 6 ตำบลรูสะมิแล อำเภอปัตตานี จังหวัดปัตตานี 94000',
      taxId: '0945566000616',
      tel: '09-2427-0769'
    },
    toBranch: {
      name: 'สาขาปัตตานี',
      code: '00001',
      address: '123 ถนนปัตตานี อำเภอเมือง จังหวัดปัตตานี 94000',
      taxId: '0945566000616',
      tel: '09-2427-0770'
    },
    sender: {
      firstName: 'อารีฟีน',
      lastName: 'กาซอ'
    },
    receiver: {
      firstName: 'พนักงาน',
      lastName: 'รับสินค้า'
    },
    stockApprover: {
      firstName: 'ผู้จัดการ',
      lastName: 'สต๊อก'
    },
    items: [
      {
        name: 'iPhone 15 Pro',
        brand: 'Apple',
        imei: '123456789012345',
        quantity: 1,
        note: ''
      },
      {
        name: 'Samsung Galaxy S24',
        brand: 'Samsung',
        imei: '987654321098765',
        quantity: 2,
        note: 'สีดำ'
      }
    ],
    note: 'โอนสินค้าเพื่อเติมสต๊อกสาขา',
    createdAt: new Date(),
    stockApprovedAt: new Date(),
    receivedAt: new Date(),
    ...overrides
  };
}

/**
 * คลาสสำหรับสร้าง PDF ใบโอนสินค้าแบบมืออาชีพ
 * รูปแบบเหมือน A4PDFController.js
 * ใช้สำหรับระบบการโอนย้ายสินค้าระหว่างสาขา
 * รองรับการแสดงผลภาษาไทย และลายเซ็นแบบเส้นขีด
 */
class TransferSlipPDFController {

  /**
   * โหลดลายเซ็นจาก Data URL หรือ file path (เหมือน A4PDFController)
   * @param {string} signatureData - Data URL หรือ file path
   * @returns {Promise<Buffer|null>} Buffer ของรูปภาพหรือ null
   */
  static async loadSignatureBuffer(signatureData) {
    if (!signatureData) return null;

    try {
      // ตรวจสอบประเภทข้อมูล
      if (typeof signatureData === 'string' && signatureData.startsWith('data:image/')) {
        // Data URL format
        const base64Data = signatureData.replace(/^data:image\/[a-z]+;base64,/, '');
        return Buffer.from(base64Data, 'base64');
      } else if (typeof signatureData === 'string') {
        // File path หรือ URL
        return await loadImageBuffer(signatureData);
      } else {
        // Buffer หรือข้อมูลประเภทอื่น
        return Buffer.isBuffer(signatureData) ? signatureData : null;
      }
    } catch (error) {
      let displayData;
      if (typeof signatureData === 'string') {
        displayData = signatureData.length > 50 ? signatureData.substring(0, 50) + '...' : signatureData;
      } else if (Buffer.isBuffer(signatureData)) {
        displayData = `Buffer(${signatureData.length} bytes)`;
      } else {
        displayData = typeof signatureData;
      }
      console.warn(`⚠️ Cannot load signature: ${displayData}`, error.message);
      return null;
    }
  }

  /**
   * สร้างเลขที่เอกสารใหม่ตามรูปแบบ A4PDFController
   * @param {string} prefix - คำนำหน้า (DO สำหรับ Delivery Order)
   * @returns {Promise<string>} เลขที่เอกสาร
   */
  static async generateDocumentNumber(prefix = 'DO') {
    try {
      console.log(`📄 Generating document number with prefix: ${prefix}`);

      // ใช้ DocumentNumberSystem สำหรับสร้างเลขที่เอกสาร (ถ้ามี)
      try {
        const DocumentNumberSystem = require('../utils/DocumentNumberSystem');
        const documentNumber = await DocumentNumberSystem.generateTransferNumber();
        console.log(`📄 Generated document number: ${documentNumber} (prefix: ${prefix})`);
        return documentNumber;
      } catch (importError) {
        console.warn('⚠️ DocumentNumberSystem not available, using fallback');
      }

      // Fallback: ใช้รูปแบบเดียวกับ A4PDFController
      const now = new Date();
      const thaiYear = (now.getFullYear() + 543).toString().slice(-2);
      const MM = String(now.getMonth() + 1).padStart(2, '0');
      const DD = String(now.getDate()).padStart(2, '0');
      const randomSeq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');

      const fallbackNumber = `${prefix}-${thaiYear}${MM}${DD}${randomSeq}`;
      console.log(`📄 Fallback document number: ${fallbackNumber}`);
      return fallbackNumber;

    } catch (error) {
      console.error('❌ Error generating document number:', error);
      return `${prefix}-${Date.now()}`;
    }
  }

  /**
   * ฟังก์ชันหลักสำหรับดาวน์โหลดใบโอนสินค้า
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} ส่ง PDF file กลับไปยัง client
   */
  static async downloadTransferSlip(req, res) {
    try {
      const transferId = req.params.id;
      console.log('🚚 TransferSlipPDFController.downloadTransferSlip() called with transferId:', transferId);

      if (!transferId) {
        return res.status(400).json({
          success: false,
          message: 'Transfer ID is required'
        });
      }

      // Import Transfer model conditionally
      const Transfer = require('../models/Stock/Transfer');

      // ดึงข้อมูลการโอนสินค้า
      const transfer = await Transfer.findById(transferId)
        .populate('fromBranch', 'name code address taxId tel phone')
        .populate('toBranch', 'name code address taxId tel phone')
        .populate('sender', 'firstName lastName')
        .populate('stockApprover', 'firstName lastName')
        .populate('receiver', 'firstName lastName')
        .populate('createdBy', 'firstName lastName')
        .populate('rejectedBy', 'firstName lastName')
        .lean();

      if (!transfer) {
        return res.status(404).json({
          success: false,
          message: 'Transfer not found'
        });
      }

      console.log('📦 Transfer data found:', {
        transferNo: transfer.transferNo,
        status: transfer.status,
        fromBranch: transfer.fromBranch?.name,
        toBranch: transfer.toBranch?.name,
        itemsCount: transfer.items?.length || 0
      });

      // สร้าง PDF ใบโอนสินค้า
      const pdfResult = await this.createTransferSlipPdf(transfer);

      if (!pdfResult || !pdfResult.buffer) {
        throw new Error('Failed to generate Transfer Slip PDF');
      }

      // ส่ง PDF กลับไป
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${pdfResult.fileName}"`);
      res.setHeader('Content-Length', pdfResult.buffer.length);

      console.log('✅ Transfer Slip PDF generated successfully:', {
        transferId,
        transferNo: transfer.transferNo,
        fileName: pdfResult.fileName,
        bufferSize: pdfResult.buffer.length
      });

      res.end(pdfResult.buffer);

    } catch (error) {
      console.error('❌ Error in downloadTransferSlip:', error);

      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Internal server error generating Transfer Slip PDF',
          error: error.message
        });
      }
    }
  }

  /**
   * สร้าง PDF ใบโอนสินค้าแบบมืออาชีพ
   * @param {Object} transfer - ข้อมูลการโอนสินค้า
   * @returns {Promise<Object>} ผลลัพธ์ PDF พร้อม buffer และ fileName
   */
  static async createTransferSlipPdf(transfer) {
    console.log('📄 Creating Transfer Slip PDF for:', transfer.transferNo);

    return new Promise((resolve, reject) => {
      try {
        // ตรวจสอบฟอนต์
        const fontPath = CONFIG.font.path;
        const boldFontPath = CONFIG.font.boldPath;

        if (!fs.existsSync(fontPath)) {
          return reject(new Error(`Font not found: ${fontPath}`));
        }

        // สร้าง PDF document
        const doc = new PDFDocument({
          size: CONFIG.page.size,
          margins: { top: 20, bottom: 40, left: 40, right: 40 },
          autoFirstPage: true
        });

        const { width: W, height: H } = doc.page;
        const margins = doc.page.margins || { top: 40, bottom: 40, left: 40, right: 40 };
        const bodyW = W - margins.left - margins.right;

        // Buffer สำหรับเก็บข้อมูล PDF
        const chunks = [];
        doc.on('data', chunks.push.bind(chunks));
        doc.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const fileName = `DO-${transfer.transferNo || transfer._id}.pdf`;
          resolve({ buffer, fileName });
        });
        doc.on('error', reject);

        // ลงทะเบียนฟอนต์
        doc.registerFont(CONFIG.font.name, fontPath);
        if (fs.existsSync(boldFontPath)) {
          doc.registerFont(CONFIG.font.boldName, boldFontPath);
        }
        doc.font(CONFIG.font.name);

        // เริ่มวาด PDF
        let y = margins.top;

        // 1. วาดหัวข้อใบโอนสินค้า
        y = this._drawHeader(doc, transfer, margins, bodyW, y);

        // 2. วาดข้อมูลการโอน
        y = this._drawTransferInfo(doc, transfer, margins, bodyW, y);

        // 3. วาดตารางสินค้า
        y = this._drawItemsTable(doc, transfer, margins, bodyW, y);

        // 4. วาดลายเซ็น
        y = this._drawSignatures(doc, transfer, margins, bodyW, y);

        // 5. วาดหมายเหตุ
        this._drawNotes(doc, transfer, margins, bodyW, y);

        doc.end();

      } catch (error) {
        console.error('❌ Error creating Transfer Slip PDF:', error);
        reject(error);
      }
    });
  }

  /**
   * วาดหัวข้อใบโอนสินค้า
   */
  static _drawHeader(doc, transfer, margins, bodyW, y) {
    const startY = y;

    // วาดชื่อบริษัท
    doc.font(CONFIG.font.boldName)
       .fontSize(CONFIG.sizes.heading2)
       .fillColor(CONFIG.color.textDark)
       .text('บริษัท 2 พี่น้อง โมบาย จำกัด', margins.left, y);

    y += 25;

    // วาดหัวข้อใบโอนสินค้า (ทางขวา)
    doc.font(CONFIG.font.boldName)
       .fontSize(CONFIG.sizes.heading1)
       .fillColor(CONFIG.color.transferGreen)
       .text('ใบโอนสินค้า', margins.left + bodyW - 150, startY);

    doc.font(CONFIG.font.name)
       .fontSize(CONFIG.sizes.textBody)
       .fillColor(CONFIG.color.textDark)
       .text('TRANSFER SLIP', margins.left + bodyW - 150, startY + 25);

    // วาดเส้นแบ่ง
    y += 15;
    doc.strokeColor(CONFIG.color.lineLight)
       .lineWidth(1)
       .moveTo(margins.left, y)
       .lineTo(margins.left + bodyW, y)
       .stroke();

    return y + 15;
  }

  /**
   * วาดข้อมูลการโอน
   */
  static _drawTransferInfo(doc, transfer, margins, bodyW, y) {
    const leftCol = margins.left;
    const rightCol = margins.left + bodyW / 2;
    const lineHeight = 18;

    doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.textBody).fillColor(CONFIG.color.textDark);

    // คอลัมน์ซ้าย
    const leftInfo = [
      { label: 'เลขที่ใบโอน:', value: transfer.transferNo || 'ไม่ระบุ' },
      { label: 'วันที่โอน:', value: formatThaiDate(transfer.transferDate || transfer.createdAt) },
      { label: 'สถานะ:', value: formatTransferStatus(transfer.status) },
      { label: 'ผู้ส่ง:', value: `${transfer.sender?.firstName || ''} ${transfer.sender?.lastName || ''}`.trim() || 'ไม่ระบุ' }
    ];

    // คอลัมน์ขวา
    const rightInfo = [
      { label: 'สาขาต้นทาง:', value: `${transfer.fromBranch?.name || 'ไม่ระบุ'} (${transfer.fromBranch?.code || ''})` },
      { label: 'สาขาปลายทาง:', value: `${transfer.toBranch?.name || 'ไม่ระบุ'} (${transfer.toBranch?.code || ''})` },
      { label: 'ผู้อนุมัติ:', value: `${transfer.stockApprover?.firstName || ''} ${transfer.stockApprover?.lastName || ''}`.trim() || 'ไม่ระบุ' },
      { label: 'ผู้รับ:', value: `${transfer.receiver?.firstName || ''} ${transfer.receiver?.lastName || ''}`.trim() || 'ไม่ระบุ' }
    ];

    // วาดข้อมูลคอลัมน์ซ้าย
    leftInfo.forEach((info, index) => {
      const currentY = y + (index * lineHeight);

      doc.font(CONFIG.font.boldName);
      doc.text(info.label, leftCol, currentY, { width: 80 });

      doc.font(CONFIG.font.name);
      doc.text(info.value, leftCol + 85, currentY, { width: 120 });
    });

    // วาดข้อมูลคอลัมน์ขวา
    rightInfo.forEach((info, index) => {
      const currentY = y + (index * lineHeight);

      doc.font(CONFIG.font.boldName);
      doc.text(info.label, rightCol, currentY, { width: 90 });

      doc.font(CONFIG.font.name);
      doc.text(info.value, rightCol + 95, currentY, { width: 150 });
    });

    return y + (leftInfo.length * lineHeight) + 20;
  }

  /**
   * วาดตารางสินค้า
   */
  static _drawItemsTable(doc, transfer, margins, bodyW, y) {
    const cols = CONFIG.layout.tableCols;
    const startY = y;

    // วาดหัวตาราง
    doc.fillColor(CONFIG.color.transferGreen);
    doc.rect(margins.left, y, bodyW, 25).fill();

    // วาดข้อความหัวตาราง
    doc.font(CONFIG.font.boldName).fontSize(CONFIG.sizes.tableHeader).fillColor(CONFIG.color.textHeader);

    let x = margins.left;
    const headers = [
      { text: 'ลำดับ', width: cols.no },
      { text: 'ชื่อสินค้า', width: cols.item },
      { text: 'IMEI/Serial', width: cols.imei },
      { text: 'จำนวน', width: cols.qty },
      { text: 'หน่วย', width: cols.unit },
      { text: 'หมายเหตุ', width: cols.note }
    ];

    headers.forEach(header => {
      doc.text(header.text, x + 5, y + 8, { width: header.width - 10, align: 'center' });
      x += header.width;
    });

    y += 25;

    // วาดข้อมูลสินค้า
    doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.tableRow).fillColor(CONFIG.color.textDark);

    const items = transfer.items || [];
    items.forEach((item, index) => {
      const rowHeight = 20;
      const isEven = index % 2 === 0;

      // วาดพื้นหลังแถว
      if (isEven) {
        doc.fillColor('#F8F9FA');
        doc.rect(margins.left, y, bodyW, rowHeight).fill();
      }

      doc.fillColor(CONFIG.color.textDark);

      x = margins.left;
      const rowData = [
        { text: (index + 1).toString(), width: cols.no, align: 'center' },
        { text: item.name || 'ไม่ระบุสินค้า', width: cols.item, align: 'left' },
        { text: item.imei || '-', width: cols.imei, align: 'center' },
        { text: item.quantity?.toString() || '0', width: cols.qty, align: 'center' },
        { text: 'ชิ้น', width: cols.unit, align: 'center' },
        { text: item.note || '-', width: cols.note, align: 'left' }
      ];

      rowData.forEach(cell => {
        doc.text(cell.text, x + 5, y + 5, {
          width: cell.width - 10,
          align: cell.align,
          ellipsis: true
        });
        x += cell.width;
      });

      y += rowHeight;
    });

    // วาดเส้นขอบตาราง
    doc.strokeColor(CONFIG.color.lineDark).lineWidth(1);

    // เส้นแนวนอน
    for (let i = 0; i <= items.length + 1; i++) {
      const lineY = startY + (i === 0 ? 0 : 25) + (i > 1 ? (i - 1) * 20 : 0);
      doc.moveTo(margins.left, lineY).lineTo(margins.left + bodyW, lineY).stroke();
    }

    // เส้นแนวตั้ง
    x = margins.left;
    headers.forEach(header => {
      doc.moveTo(x, startY).lineTo(x, y).stroke();
      x += header.width;
    });
    doc.moveTo(x, startY).lineTo(x, y).stroke(); // เส้นขวาสุด

    return y + 20;
  }

  /**
   * วาดลายเซ็นแบบเส้นขีด (มืออาชีพ) เหมือน A4PDFController
   * รูปแบบเดียวกับ A4PDFController.js
   * @param {Object} doc - PDFKit document
   * @param {Object} transfer - ข้อมูลการโอนสินค้า
   * @param {Object} margins - ขอบกระดาษ
   * @param {number} bodyW - ความกว้างเนื้อหา
   * @param {number} y - ตำแหน่ง Y เริ่มต้น
   * @returns {number} ตำแหน่ง Y หลังจากวาดเสร็จ
   */
  static _drawSignatures(doc, transfer, margins, bodyW, y) {
    const sigBlockH = 68;
    const colW = bodyW / 3;
    const sigLineW = colW * 0.8;
    const sigLineXOffset = (colW - sigLineW) / 2;
    const lineY = y + 18;
    const imgH = 45;
    const imgPad = 6;

    const colsData = [
      { label: 'ผู้ส่ง', labelEn: 'Sender Signature', key: 'sender.signature' },
      { label: 'ผู้อนุมัติ', labelEn: 'Approved By', key: 'stockApprover.signature' },
      { label: 'ผู้รับ', labelEn: 'Receiver Signature', key: 'receiver.signature' }
    ];

    const currentDateThai = formatThaiDate(transfer.transferDate || transfer.createdAt || new Date());

    colsData.forEach((col, i) => {
      const x0 = margins.left + colW * i;

      // ลองดึงลายเซ็นจากข้อมูล (ถ้ามี)
      const sigBuffer = col.key.split('.').reduce((o, k) => (o && o[k] != null ? o[k] : null), transfer);

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

      // วาดเส้นขีดถ้าไม่มีลายเซ็น
      if (!signatureDrawn) {
        const lineX = x0 + sigLineXOffset;
        doc.moveTo(lineX, lineY)
           .lineTo(lineX + sigLineW, lineY)
           .strokeColor(CONFIG.color.sigLine)
           .stroke();
      }

      // วาดข้อความใต้ลายเซ็น
      let textY = lineY + imgPad + 3;
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

      textY += 10;

      // แสดงชื่อผู้ลงนาม
      const personName = this._getPersonName(transfer, col.key);
      if (personName) {
        doc
          .font(CONFIG.font.name)
          .fontSize(CONFIG.sizes.textSmall)
          .fillColor(CONFIG.color.textLight)
          .text(personName, x0, textY, { width: colW, align: 'center' });
        textY += 10;
      }

      doc
        .font(CONFIG.font.name)
        .fontSize(CONFIG.sizes.textSmall)
        .fillColor(CONFIG.color.textLight)
        .text(currentDateThai, x0, textY, { width: colW, align: 'center' });
    });

    // วาดเส้นคั่นระหว่างคอลัมน์
    doc.save()
       .moveTo(margins.left + colW, y + 5)
       .lineTo(margins.left + colW, y + sigBlockH - 5)
       .moveTo(margins.left + 2*colW, y + 5)
       .lineTo(margins.left + 2*colW, y + sigBlockH - 5)
       .strokeColor(CONFIG.color.lineLight)
       .lineWidth(0.5)
       .stroke()
       .restore();

    return y + sigBlockH;
  }

  /**
   * ดึงชื่อผู้ลงนาม
   * @param {Object} transfer - ข้อมูลการโอน
   * @param {string} key - คีย์สำหรับดึงข้อมูล
   * @returns {string} ชื่อผู้ลงนาม
   */
  static _getPersonName(transfer, key) {
    if (key === 'sender.signature' && transfer.sender) {
      return `${transfer.sender.firstName || ''} ${transfer.sender.lastName || ''}`.trim() || 'ไม่ระบุ';
    } else if (key === 'stockApprover.signature' && transfer.stockApprover) {
      return `${transfer.stockApprover.firstName || ''} ${transfer.stockApprover.lastName || ''}`.trim() || 'ไม่ระบุ';
    } else if (key === 'receiver.signature' && transfer.receiver) {
      return `${transfer.receiver.firstName || ''} ${transfer.receiver.lastName || ''}`.trim() || 'ไม่ระบุ';
    }
    return '';
  }

  /**
   * จัดรูปแบบที่อยู่ (เหมือน A4PDFController)
   * @param {Object} address - ข้อมูลที่อยู่
   * @returns {string} ที่อยู่ที่จัดรูปแบบแล้ว
   */
  static _formatAddress(address) {
    if (!address) return '-';
    if (typeof address === 'string') return address;

    // รองรับฟิลด์ที่อาจมีชื่อต่างกัน
    const parts = [
      address.houseNo || address.house_no || address.address_no,
      address.moo || address.village_no ? `หมู่ ${address.moo || address.village_no}` : '',
      address.lane || address.soi ? `ซอย ${address.lane || address.soi}` : '',
      address.road || address.street ? `ถนน ${address.road || address.street}` : '',
      address.subDistrict || address.sub_district || address.tambon ? `ตำบล ${address.subDistrict || address.sub_district || address.tambon}` : '',
      address.district || address.amphoe ? `อำเภอ ${address.district || address.amphoe}` : '',
      address.province || address.changwat ? `จังหวัด ${address.province || address.changwat}` : '',
      address.zipcode || address.zip_code || address.postal_code
    ].filter(part => part && part.toString().trim());

    return parts.length > 0 ? parts.join(' ') : '-';
  }

  /**
   * วาดหมายเหตุ
   */
  static _drawNotes(doc, transfer, margins, bodyW, y) {
    if (transfer.note) {
      doc.font(CONFIG.font.boldName).fontSize(CONFIG.sizes.textBody).fillColor(CONFIG.color.textDark);
      doc.text('หมายเหตุ:', margins.left, y);

      doc.font(CONFIG.font.name);
      doc.text(transfer.note, margins.left + 60, y, { width: bodyW - 60 });
    }

    return y + 30;
  }

  /**
   * สร้างข้อมูลจำลองสำหรับทดสอบ
   */
  static createSampleTransfer() {
    return createSampleTransfer();
  }
}

module.exports = TransferSlipPDFController;
