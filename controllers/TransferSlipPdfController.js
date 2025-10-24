/************************************************************
 * TransferSlipPdfController.js - Transfer Slip PDF Generator
 * สร้าง PDF ใบโอนสินค้าสำหรับระบบโอนย้ายสินค้าระหว่างสาขา
 * ปรับจาก A4PDFController.js เฉพาะสำหรับใบโอนสินค้า
 ************************************************************/
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');

// ===== CONFIG สำหรับใบโอนสินค้า =====
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
    heading1: 22,
    heading2: 16,
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

// ===== HELPER FUNCTIONS =====
function formatThaiDate(date) {
  try {
    if (!date) return 'ไม่ระบุวันที่';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'ไม่ระบุวันที่';

    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];

    const day = d.getDate();
    const month = thaiMonths[d.getMonth()];
    const year = d.getFullYear() + 543;

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
 * คลาสสำหรับสร้าง PDF ใบโอนสินค้า
 */
class TransferSlipPDFController {

  /**
   * ฟังก์ชันหลักสำหรับดาวน์โหลดใบโอนสินค้า
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
      const pdfResult = await TransferSlipPDFController.createTransferSlipPdf(transfer);

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
   * สร้าง PDF ใบโอนสินค้า
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
   * วาดลายเซ็นแบบเส้นขีด (มืออาชีพ) พร้อมรูปลายเซ็นถ้ามี
   */
  static _drawSignatures(doc, transfer, margins, bodyW, y) {
    const signatureLineLength = 150;
    const signatureY = y;

    // กำหนดข้อมูลลายเซ็น 2 คน (ผู้จัดเตรียม/ผู้ส่ง และ ผู้รับ)
    const signatures = [
      {
        title: 'ผู้จัดเตรียม',
        name: `${transfer.sender?.firstName || ''} ${transfer.sender?.lastName || ''}`.trim() || 'ไม่ระบุ',
        signatureData: transfer.senderSignature?.data,
        signedAt: transfer.senderSignature?.signedAt
      },
      {
        title: 'ผู้รับสินค้า',
        name: `${transfer.receiver?.firstName || ''} ${transfer.receiver?.lastName || ''}`.trim() || 'ไม่ระบุ',
        signatureData: transfer.receiverSignature?.data,
        signedAt: transfer.receiverSignature?.signedAt || transfer.receivedAt
      }
    ];

    // คำนวณตำแหน่ง X สำหรับ 2 คอลัมน์ให้กระจายเท่าๆ กัน
    const spacing = (bodyW - (signatureLineLength * 2)) / 3;
    const signaturePositions = [
      margins.left + spacing,                                    // ผู้จัดเตรียม
      margins.left + spacing * 2 + signatureLineLength          // ผู้รับสินค้า
    ];

    doc.font(CONFIG.font.boldName).fontSize(CONFIG.sizes.textBody).fillColor(CONFIG.color.textDark);

    signatures.forEach((sig, index) => {
      const x = signaturePositions[index];

      // 1. วาดชื่อตำแหน่งด้านบน
      doc.text(sig.title, x, signatureY, { width: signatureLineLength, align: 'center' });

      // 2. วาดลายเซ็นถ้ามีข้อมูล หรือวาดเส้นขีดถ้าไม่มี
      if (sig.signatureData) {
        try {
          // แปลง base64 เป็น buffer และวาดลายเซ็น
          const signatureImage = Buffer.from(sig.signatureData.replace(/^data:image\/\w+;base64,/, ''), 'base64');
          doc.image(signatureImage, x + 25, signatureY + 15, {
            width: 100,
            height: 30,
            align: 'center'
          });
        } catch (err) {
          console.warn('Failed to draw signature image:', err);
          // ถ้าวาดรูปไม่ได้ ให้วาดเส้นขีดแทน
          doc.strokeColor(CONFIG.color.lineDark).lineWidth(1);
          doc.moveTo(x, signatureY + 40)
             .lineTo(x + signatureLineLength, signatureY + 40)
             .stroke();
        }
      } else {
        // วาดเส้นขีดสำหรับลายเซ็น (แบบมืออาชีพ) - ไม่ใช่กรอบสี่เหลี่ยม
        doc.strokeColor(CONFIG.color.lineDark).lineWidth(1);
        doc.moveTo(x, signatureY + 40)
           .lineTo(x + signatureLineLength, signatureY + 40)
           .stroke();
      }

      // 3. วาดข้อความใต้เส้น "(ลายเซ็นผู้...)"
      doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.textSmall);
      doc.text(`(ลายเซ็น${sig.title})`, x, signatureY + 50, { width: signatureLineLength, align: 'center' });

      // 4. วาดชื่อผู้ลงนาม
      doc.text(sig.name, x, signatureY + 65, { width: signatureLineLength, align: 'center' });

      // 5. วาดวันที่ลงนามถ้ามี
      if (sig.signedAt) {
        doc.text(`วันที่: ${formatThaiDate(sig.signedAt)}`, x, signatureY + 80, { width: signatureLineLength, align: 'center' });
      }

      doc.font(CONFIG.font.boldName);
    });

    // 5. วาดวันที่ด้านล่างกลางหน้า
    doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.textSmall);
    doc.text(`วันที่: ${formatThaiDate(transfer.transferDate || transfer.createdAt)}`,
             margins.left, signatureY + 85, { width: bodyW, align: 'center' });

    return signatureY + 110;
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
