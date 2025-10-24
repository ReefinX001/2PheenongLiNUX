// controllers/stockTransferController.js
const PDFDocument = require('pdfkit');
const moment     = require('moment');
const Transfer   = require('../models/Stock/Transfer');
const Branch     = require('../models/Account/Branch');
const User       = require('../models/User/User');

exports.printTransferSlip = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const transfer = await Transfer.findById(id).lean()
      .populate('fromBranch', 'branch_code name')
      .populate('toBranch',   'branch_code name')
      .populate('sender',     'name')
      .populate('receiver',   'name')
      .populate('items.product', 'sku name');

    if (!transfer) {
      return res.status(404).json({ success: false, error: 'ไม่พบการโอนนี้' });
    }

    // ตั้ง header ให้ดาวน์โหลด PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=transfer-slip-${id}.pdf`
    );

    // สร้างเอกสารขนาด A4 portrait
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      layout: 'portrait'
    });
    doc.pipe(res);

    // หัวกระดาษ
    doc
      .fontSize(16)
      .text('ใบโอนสินค้า', { align: 'center' })
      .moveDown(1);

    // ข้อมูลหลัก
    doc.fontSize(12)
      .text(`วันที่: ${moment(transfer.date).format('YYYY-MM-DD')}`)
      .text(`ต้นทาง: [${transfer.fromBranch.branch_code}] ${transfer.fromBranch.name}`)
      .text(`ปลายทาง: [${transfer.toBranch.branch_code}] ${transfer.toBranch.name}`)
      .text(`ผู้ส่ง: ${transfer.sender.name}`)
      .text(`ผู้รับ: ${transfer.receiver.name}`)
      .moveDown(1);

    // ตารางรายการสินค้า
    const tableTop = doc.y;
    doc.font('Helvetica-Bold')
      .text('ลำดับ',      50, tableTop)
      .text('SKU',        100, tableTop)
      .text('ชื่อสินค้า',   200, tableTop)
      .text('จำนวน',      400, tableTop)
      .moveTo(50, tableTop + 15)
      .lineTo(550, tableTop + 15)
      .stroke();

    doc.font('Helvetica');
    transfer.items.forEach((it, i) => {
      const y = tableTop + 25 + i * 20;
      doc
        .text(i + 1,           50,  y)
        .text(it.product.sku, 100, y)
        .text(it.product.name,200, y)
        .text(it.qty,         400, y);
    });

    // ลายเซ็นต์
    const footerY = tableTop + 40 + transfer.items.length * 20;
    doc
      .moveDown(2)
      .text('ผู้ส่งลงชื่อ: ____________________', 50, footerY)
      .text('ผู้รับลงชื่อ: ____________________', 50, footerY + 20);

    doc.end();

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'สร้างใบโอนไม่สำเร็จ' });
  }
};

exports.postTransfer = async (req, res, next) => {
  const io = req.app.get('io');
  try {
    const userId    = req.user.userId || req.user.id;
    const { toBranch } = req.body;            // <-- เปลี่ยนให้ตรงกับ payload ของ client
    const transferNo = await generateTransferNo(toBranch);

    const payload    = { ...req.body, transferNo };
    const transfer   = await createTransfer(payload, userId);
    res.status(201).json({ success: true, data: transfer });
  } catch (err) {
    next(err);
  }
};
