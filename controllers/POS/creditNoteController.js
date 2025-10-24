const Counter = require('../../models/POS/Counter');
const CreditNote = require('../../models/POS/CreditNote');
const DepositReceipt = require('../../models/POS/DepositReceipt');
const CreditNotePdfController = require('./CreditNotePdfController');

exports.createCreditNote = async (req, res) => {
  try {
    // console.log('📥 Received credit note data:', JSON.stringify(req.body, null, 2));
    // ตรวจสอบข้อมูลที่จำเป็น
    const requiredFields = ['depositReceiptNumber', 'reason', 'customerName', 'subtotal', 'totalAmount'];
    const missingFields = requiredFields.filter(field =>
      req.body[field] === undefined || req.body[field] === null || req.body[field] === ''
    );

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `ข้อมูลไม่ครบถ้วน: ${missingFields.join(', ')}`,
        receivedData: Object.keys(req.body)
      });
    }

    // ตรวจสอบว่ามีรายการสินค้าหรือไม่
    if (!req.body.items || !Array.isArray(req.body.items) || req.body.items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุรายการสินค้าที่ต้องการลดหนี้'
      });
    }

    // ตรวจสอบ createdBy และ branch_code
    if (!req.body.createdBy && !req.user?._id) {
      return res.status(400).json({
        success: false,
        error: 'ไม่พบข้อมูลผู้สร้างเอกสาร (createdBy)'
      });
    }

    if (!req.body.branch_code && !req.user?.branch_code) {
      return res.status(400).json({
        success: false,
        error: 'ไม่พบข้อมูลสาขา (branch_code)'
      });
    }

    // 1) สร้าง dateKey เป็น Buddhistic YYMMDD (ใช้ปี 2 หลัก)
    const now = new Date();
    const buddhistYr = now.getFullYear() + 543;
    const YY = String(buddhistYr).slice(-2); // เอาแค่ 2 หลักท้าย
    const MM = String(now.getMonth() + 1).padStart(2, '0');
    const DD = String(now.getDate()).padStart(2, '0');
    const dateKey = `${YY}${MM}${DD}`;

    // 2) อัปเดต Counter และดึง seq ใหม่
    const counter = await Counter.findOneAndUpdate(
      { key: 'CreditNote', reference_value: dateKey },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    // 3) สร้าง creditNoteNumber
    const seqStr = String(counter.seq).padStart(4, '0');
    const creditNoteNumber = `CN-${dateKey}${seqStr}`;
    // 4) หาใบรับเงินมัดจำที่อ้างอิง
    let depositReceipt = null;
    let depositReceiptId = null;

    try {
      depositReceipt = await DepositReceipt.findOne({
        receiptNumber: req.body.depositReceiptNumber,
        branch_code: req.body.branch_code || req.user?.branch_code || '00000'
      });

      if (depositReceipt) {
        depositReceiptId = depositReceipt._id;

        // ตรวจสอบสถานะใบรับเงินมัดจำ
        if (depositReceipt.status === 'cancelled') {
          return res.status(400).json({
            success: false,
            error: 'ไม่สามารถสร้างใบลดหนี้สำหรับใบรับเงินมัดจำที่ถูกยกเลิกแล้ว'
          });
        }

        // ใช้ข้อมูลลูกค้าจากใบรับเงินมัดจำถ้าไม่ได้ส่งมา
        if (!req.body.customerName && depositReceipt.customerName) {
          req.body.customerName = depositReceipt.customerName;
        }
        if (!req.body.customerAddress && depositReceipt.customerAddress) {
          req.body.customerAddress = depositReceipt.customerAddress;
        }
        if (!req.body.customerPhone && depositReceipt.customerPhone) {
          req.body.customerPhone = depositReceipt.customerPhone;
        }
        if (!req.body.customerTaxId && depositReceipt.customerTaxId) {
          req.body.customerTaxId = depositReceipt.customerTaxId;
        }
      } else {
        return res.status(404).json({
          success: false,
          error: 'ไม่พบใบรับเงินมัดจำที่ระบุ'
        });
      }
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: 'เกิดข้อผิดพลาดในการค้นหาใบรับเงินมัดจำ'
      });
    }

    // 5) อ่านข้อมูลจาก req.body
    const {
      creditNoteDate,
      depositReceiptNumber,
      reason, reasonDetail,
      customerId, customerName, customerAddress, customerPhone, customerTaxId,
      items,
      subtotal, discountAmount, afterDiscount,
      vatType, vatRate, vatAmount,
      totalAmount,
      refundMethod, refundDate, refundAmount, refundEvidence,
      status, notes,
      createdBy, branch_code
    } = req.body;

    // 6) จัดการวันที่
    let finalCreditNoteDate = new Date();
    if (creditNoteDate) {
      finalCreditNoteDate = new Date(creditNoteDate);
    }

    // 7) Validate items
    const processedItems = items.map((item, index) => {
      if (!item.productName || !item.quantity || !item.pricePerUnit) {
        throw new Error(`รายการที่ ${index + 1} ข้อมูลไม่ครบถ้วน`);
      }

      return {
        productId: item.productId || undefined,
        productCode: item.productCode || '',
        productName: item.productName,
        quantity: parseFloat(item.quantity) || 0,
        unit: item.unit || 'ชิ้น',
        pricePerUnit: parseFloat(item.pricePerUnit) || 0,
        discount: parseFloat(item.discount) || 0,
        amount: parseFloat(item.amount) || (item.quantity * item.pricePerUnit * (1 - (item.discount || 0) / 100))
      };
    });

    // 8) สร้าง document ใหม่
    const docData = {
      creditNoteNumber,
      creditNoteDate: finalCreditNoteDate,

      // เชื่อมโยงกับใบรับเงินมัดจำ
      depositReceiptId: depositReceiptId,
      depositReceiptNumber: depositReceiptNumber,

      // เหตุผล
      reason,
      reasonDetail,

      // ข้อมูลลูกค้า
      customerId: customerId || depositReceipt.customerId || undefined,
      customerName,
      customerAddress, // ตรวจสอบให้แน่ใจว่ามีการส่งข้อมูลนี้ไป
      customerPhone,
      customerTaxId,

      // รายการสินค้า
      items: processedItems,

      // ยอดเงิน
      subtotal: parseFloat(subtotal) || 0,
      discountAmount: parseFloat(discountAmount) || 0,
      afterDiscount: parseFloat(afterDiscount) || parseFloat(subtotal) - parseFloat(discountAmount || 0),
      vatType: vatType || 'none',
      vatRate: parseFloat(vatRate) || 0,
      vatAmount: parseFloat(vatAmount) || 0,
      totalAmount: parseFloat(totalAmount) || 0,

      // การคืนเงิน - แก้ไขเงื่อนไขให้ชัดเจนขึ้น
      refundMethod: refundMethod && refundMethod !== '' ? refundMethod : undefined,
      refundDate: refundMethod && refundMethod !== '' && refundDate ? new Date(refundDate) : undefined,
      refundAmount: refundMethod && refundMethod !== '' && refundAmount && parseFloat(refundAmount) > 0 ? parseFloat(refundAmount) : undefined,
      refundEvidence: refundMethod && refundMethod !== '' ? refundEvidence : undefined,

      // สถานะและ meta
      status: status || 'approved',
      notes,
      createdBy: createdBy || req.user?._id,
      branch_code: branch_code || req.user?.branch_code || '00000'
    };
    const doc = new CreditNote(docData);
    await doc.save();
    // อัปเดตใบรับเงินมัดจำ
    if (depositReceipt) {
      // เพิ่มข้อมูลใบลดหนี้
      depositReceipt.creditNotes.push({
        creditNoteId: doc._id,
        creditNoteNumber: doc.creditNoteNumber,
        creditNoteDate: doc.creditNoteDate,
        amount: doc.totalAmount,
        status: doc.status
      });

      // อัปเดตสถานะตามยอดคืนเงิน
      // หมายเหตุ: getTotalRefundByDepositReceipt ต้องถูก implement ใน CreditNote model
      let totalCreditAmount = 0;
      try {
        // สมมติว่า CreditNote model มี static method นี้
        // totalCreditAmount = await CreditNote.getTotalRefundByDepositReceipt(depositReceiptId);

        // หรือคำนวณจาก creditNotes array ใน depositReceipt โดยตรง (ถ้า CreditNote.getTotalRefundByDepositReceipt ยังไม่ได้ implement)
        // กรองเฉพาะใบลดหนี้ที่ยังไม่ถูกยกเลิก
        totalCreditAmount = depositReceipt.creditNotes
          .filter(cn => cn.status !== 'cancelled')
          .reduce((sum, cn) => sum + (cn.amount || 0), 0);

      } catch (calcError) {
        // อาจจะ handle error หรือใช้ค่า default
      }

      if (totalCreditAmount >= depositReceipt.depositAmount) {
        depositReceipt.status = 'fully_credited';
      } else if (totalCreditAmount > 0) {
        depositReceipt.status = 'has_credit_note'; // หรือ 'partial_credit' ขึ้นอยู่กับ logic ที่ต้องการ
      }
      // กรณีอื่นๆ status อาจจะไม่เปลี่ยน หรือเปลี่ยนเป็น active ถ้าไม่มี credit note ที่ active

      await depositReceipt.save();
    }

    res.json({ success: true, data: doc });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        error: 'ข้อมูลไม่ถูกต้อง',
        details: errors,
        validationErrors: err.errors
      });
    }

    res.status(500).json({
      success: false,
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

exports.getCreditNotes = async (req, res) => {
  try {
    const { startDate, endDate, status, branch_code, searchType, searchTerm } = req.query;
    const filter = {};

    // Filter by branch_code
    if (branch_code) {
      filter.branch_code = branch_code;
    } else if (req.user?.branch_code) {
      filter.branch_code = req.user.branch_code;
    }

    // Filter by date range
    if (startDate && endDate) {
      try {
        const s = new Date(startDate);
        const e = new Date(endDate);

        if (isNaN(s.getTime()) || isNaN(e.getTime())) {
          return res.status(400).json({
            success: false,
            error: 'Invalid date format'
          });
        }

        s.setHours(0,0,0,0);
        e.setHours(23,59,59,999);
        filter.creditNoteDate = { $gte: s, $lte: e };

        // console.log('📅 Date filter:', {
        //   start: s.toISOString(),
        //   end: e.toISOString()
        // });
      } catch (err) {
        return res.status(400).json({
          success: false,
          error: 'Date parsing error: ' + err.message
        });
      }
    }

    // Filter by status
    if (status) filter.status = status;

    // Search filter - แก้ไขให้ใช้ depositReceiptNumber แทน referenceNumber
    if (searchTerm && searchType) {
      if (searchType === 'customer') {
        filter.customerName = { $regex: searchTerm, $options: 'i' };
      } else if (searchType === 'reference') {
        filter.depositReceiptNumber = { $regex: searchTerm, $options: 'i' };
      } else if (searchType === 'all') {
        filter.$or = [
          { customerName: { $regex: searchTerm, $options: 'i' } },
          { depositReceiptNumber: { $regex: searchTerm, $options: 'i' } },
          { creditNoteNumber: { $regex: searchTerm, $options: 'i' } }
        ];
      }
    }
    const list = await CreditNote.find(filter).limit(100).lean()
      .populate('customerId', 'name')
      .populate('depositReceiptId', 'receiptNumber depositAmount totalAmount')
      .populate('createdBy', 'name email')
      .sort({ creditNoteDate: -1 })
      .lean();
    res.json({ success: true, data: list });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid data format',
        details: err.message
      });
    }

    res.status(500).json({
      success: false,
      error: err.message,
      errorType: err.name,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

// ดึงใบลดหนี้ตาม ID
exports.getCreditNoteById = async (req, res) => {
  try {
    const { id } = req.params;

    const doc = await CreditNote.findById(id).lean()
      .populate('customerId')
      .populate('depositReceiptId')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email');

    if (!doc) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบใบลดหนี้'
      });
    }

    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// ดาวน์โหลดใบลดหนี้ - แก้ไขให้สร้าง PDF จริง
exports.downloadCreditNote = async (req, res) => {
  try {
    const { id } = req.params;

    // เพิ่ม log เพื่อ debug
    const creditNote = await CreditNote.findById(id).lean()
      .populate('customerId')
      .populate('depositReceiptId')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email');
      // ลบ .populate('branch_code') ออกถ้า branch_code เป็น string

    if (!creditNote) {
      return res.status(404).json({ success: false, message: 'ไม่พบใบลดหนี้' });
    }

    // ตรวจสอบว่ามี CreditNotePdfController หรือไม่
    if (!CreditNotePdfController || !CreditNotePdfController.createCreditNotePdf) {
      console.error('❌ CreditNotePdfController.createCreditNotePdf not found');
      return res.status(500).json({
        success: false,
        error: 'PDF generation function not available'
      });
    }
    // สร้าง PDF พร้อม error handling
    let buffer, fileName;
    try {
      const pdfResult = await CreditNotePdfController.createCreditNotePdf(creditNote);
      buffer = pdfResult.buffer;
      fileName = pdfResult.fileName;
    } catch (pdfError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate PDF: ' + pdfError.message
      });
    }

    // ========== เพิ่มส่วนนี้เข้าไป ==========
    // แก้ไขชื่อไฟล์ - ลบ underscore ที่ต่อท้าย
    const cleanFileName = fileName.replace(/\.pdf_$/, '.pdf');
    // ========================================

    // ส่ง PDF กลับไป
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${cleanFileName}"`, // เปลี่ยนจาก fileName เป็น cleanFileName
      'Content-Length': buffer.length
    });

    res.send(buffer);

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

// อนุมัติใบลดหนี้
exports.approveCreditNote = async (req, res) => {
  try {
    const { id } = req.params;

    const doc = await CreditNote.findById(id).lean();

    if (!doc) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบใบลดหนี้'
      });
    }

    if (doc.status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: 'ไม่สามารถอนุมัติใบลดหนี้ที่มีสถานะไม่ใช่ draft'
      });
    }

    await doc.approve(req.user._id);
    res.json({
      success: true,
      message: 'อนุมัติใบลดหนี้เรียบร้อยแล้ว',
      data: doc
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// ยกเลิกใบลดหนี้
exports.cancelCreditNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุเหตุผลในการยกเลิก'
      });
    }

    const doc = await CreditNote.findById(id).lean();

    if (!doc) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบใบลดหนี้'
      });
    }

    if (doc.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'ใบลดหนี้นี้ถูกยกเลิกไปแล้ว'
      });
    }

    await doc.cancel(reason);
    res.json({
      success: true,
      message: 'ยกเลิกใบลดหนี้เรียบร้อยแล้ว',
      data: doc
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// ลบใบลดหนี้
exports.deleteCreditNote = async (req, res) => {
  try {
    const { id } = req.params;

    const doc = await CreditNote.findByIdAndDelete(id);

    if (!doc) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบใบลดหนี้ที่ต้องการลบ'
      });
    }

    // console.log(`🗑️ CreditNote deleted: ${doc.creditNoteNumber} (ID: ${id})`);
    res.json({
      success: true,
      message: 'ลบใบลดหนี้เรียบร้อยแล้ว',
      data: doc
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
