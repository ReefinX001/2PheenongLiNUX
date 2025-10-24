/**
 * @file DocumentSequenceManager.js
 * @description จัดการลำดับเลขเอกสารแบบ thread-safe และไม่ซ้ำ
 * @version 1.0.0
 * @date 2025-07-28
 */

const mongoose = require('mongoose');

// Schema สำหรับเก็บลำดับเลขเอกสาร
const DocumentSequenceSchema = new mongoose.Schema({
  // ชนิดเอกสาร เช่น QT, INV, TX, RE, INST
  documentType: {
    type: String,
    required: true,
    uppercase: true,
    enum: ['QT', 'INV', 'TX', 'RE', 'INST']
  },

  // วันที่หรือรูปแบบ prefix เช่น 680728 (YYMMDD), 6807 (YYMM)
  datePrefix: {
    type: String,
    required: true
  },

  // เลขลำดับปัจจุบัน
  sequence: {
    type: Number,
    default: 0,
    min: 0
  },

  // วันที่สร้าง
  createdAt: {
    type: Date,
    default: Date.now
  },

  // วันที่อัปเดตล่าสุด
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  // Index compound สำหรับการค้นหาและป้องกันการซ้ำ
  indexes: [
    { documentType: 1, datePrefix: 1 }, // ค้นหา
    { documentType: 1, datePrefix: 1, sequence: 1 } // unique constraint
  ]
});

// ป้องกันการซ้ำของ documentType + datePrefix
DocumentSequenceSchema.index(
  { documentType: 1, datePrefix: 1 },
  { unique: true }
);

// Middleware อัปเดต updatedAt
DocumentSequenceSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const DocumentSequence = mongoose.model('DocumentSequence', DocumentSequenceSchema);

/**
 * ระบบจัดการเลขเอกสารแบบ thread-safe
 */
class DocumentSequenceManager {

  /**
   * สร้างเลขเอกสารใหม่ (พร้อมระบบข้ามเลขซ้ำอัตโนมัติ)
   * @param {string} documentType - ชนิดเอกสาร (QT, INV, TX, RE)
   * @param {string} format - รูปแบบวันที่ ('YYMMDD' หรือ 'YYMM')
   * @returns {Promise<string>} เลขเอกสารใหม่
   */
  static async generateDocumentNumber(documentType, format = 'YYMMDD') {
    const now = new Date();
    let datePrefix;

    // สร้าง prefix ตามรูปแบบ - 🔧 FIX: ใช้ปีพุทธศักราช
    if (format === 'YYMMDD') {
      const year = String(now.getFullYear() + 543).slice(-2); // พ.ศ. 2 หลัก (68)
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      datePrefix = `${year}${month}${day}`;
    } else if (format === 'YYMM') {
      const year = String(now.getFullYear() + 543).slice(-2); // พ.ศ. 2 หลัก (68)
      const month = String(now.getMonth() + 1).padStart(2, '0');
      datePrefix = `${year}${month}`;
    } else {
      throw new Error(`Unsupported date format: ${format}`);
    }

    // วนลูปจนกว่าจะได้เลขที่ไม่ซ้ำ (สูงสุด 100 รอบเพื่อป้องกันการวนไม่สิ้นสุด)
    let documentNumber;
    let attempts = 0;
    const maxAttempts = 100;

    while (attempts < maxAttempts) {
      // ใช้ MongoDB findOneAndUpdate เพื่อ atomic increment
      const result = await DocumentSequence.findOneAndUpdate(
        {
          documentType: documentType.toUpperCase(),
          datePrefix: datePrefix
        },
        {
          $inc: { sequence: 1 },
          $set: { updatedAt: new Date() }
        },
        {
          new: true, // คืนค่า document หลังอัปเดต
          upsert: true, // สร้างใหม่ถ้าไม่มี
          lean: true // คืน plain object
        }
      );

      // สร้างเลขเอกสารเต็ม - 🔧 FIX: เปลี่ยนเป็น 3 หลัก
      const sequenceStr = String(result.sequence).padStart(3, '0');
      documentNumber = `${documentType.toUpperCase()}-${datePrefix}-${sequenceStr}`;

      // ตรวจสอบว่าเลขนี้ซ้ำหรือไม่
      const isDuplicate = await this.isDuplicateNumber(documentNumber);

      if (!isDuplicate) {
        // Only log in debug mode
        if (process.env.DEBUG_DOCUMENTS === 'true') {
          console.log(`✅ Generated unique document number: ${documentNumber} (sequence: ${result.sequence})`);
        }
        return documentNumber;
      }

      // Silently try next number - this is normal operation
      attempts++;
    }

    // ถ้าวนครบ 100 รอบแล้วยังไม่ได้เลขที่ไม่ซ้ำ
    throw new Error(`Unable to generate unique document number after ${maxAttempts} attempts`);
  }

  /**
   * ดึงเลขลำดับถัดไปโดยไม่เพิ่มค่า (สำหรับ preview)
   * @param {string} documentType - ชนิดเอกสาร
   * @param {string} format - รูปแบบวันที่
   * @returns {Promise<string>} เลขเอกสารถัดไป
   */
  static async getNextDocumentNumber(documentType, format = 'YYMMDD') {
    const now = new Date();
    let datePrefix;

    if (format === 'YYMMDD') {
      const year = String(now.getFullYear() + 543).slice(-2);
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      datePrefix = `${year}${month}${day}`;
    } else if (format === 'YYMM') {
      const year = String(now.getFullYear() + 543).slice(-2);
      const month = String(now.getMonth() + 1).padStart(2, '0');
      datePrefix = `${year}${month}`;
    }

    // หาเลขปัจจุบัน
    const current = await DocumentSequence.findOne({
      documentType: documentType.toUpperCase(),
      datePrefix: datePrefix
    });

    const nextSequence = (current?.sequence || 0) + 1;
    const sequenceStr = String(nextSequence).padStart(3, '0'); // 🔧 FIX: ใช้ 3 หลักเหมือน generateDocumentNumber
    return `${documentType.toUpperCase()}-${datePrefix}-${sequenceStr}`;
  }

  /**
   * ตรวจสอบว่าเลขเอกสารซ้ำหรือไม่
   * @param {string} documentNumber - เลขเอกสารที่ต้องการตรวจสอบ
   * @returns {Promise<boolean>} true ถ้าซ้ำ
   */
  static async isDuplicateNumber(documentNumber) {
    // ตรวจสอบในทุก collection ที่เกี่ยวข้อง
    const Quotation = require('../models/Installment/Quotation');
    const Invoice = require('../models/Installment/Invoice');
    const InvoiceReceipt = require('../models/Installment/InvoiceReceipt');
    const Receipt = require('../models/Receipt');
    const TaxInvoice = require('../models/TaxInvoice');

    try {
      const checks = [];

      // ตรวจสอบ Quotation
      if (documentNumber.startsWith('QT-')) {
        checks.push(Quotation.exists({
          $or: [
            { quotationNumber: documentNumber },
            { number: documentNumber }
          ]
        }));
      }

      // ตรวจสอบ Invoice
      if (documentNumber.startsWith('INV-')) {
        checks.push(Invoice.exists({
          $or: [
            { invoiceNumber: documentNumber },
            { number: documentNumber }
          ]
        }));
      }

      // ตรวจสอบ Receipt
      if (documentNumber.startsWith('RE-')) {
        checks.push(InvoiceReceipt.exists({ receiptNumber: documentNumber }));
        checks.push(Receipt.exists({
          $or: [
            { receiptNumber: documentNumber },
            { documentNumber: documentNumber }
          ]
        }));
      }

      // ตรวจสอบ Tax Invoice
      if (documentNumber.startsWith('TX-')) {
        checks.push(TaxInvoice.exists({
          $or: [
            { taxInvoiceNumber: documentNumber },
            { invoiceNumber: documentNumber },
            { documentNumber: documentNumber }
          ]
        }));
      }

      // ตรวจสอบ Installment Contract
      if (documentNumber.startsWith('INST-')) {
        const Installment = require('../models/Installment');
        checks.push(Installment.exists({ contractNumber: documentNumber }));
      }

      if (checks.length === 0) {
        return false;
      }

      const results = await Promise.all(checks);
      const isDuplicate = results.some(exists => exists);

      // Only log duplicates in debug mode - this is normal when auto-incrementing
      if (isDuplicate && process.env.DEBUG_DOCUMENTS === 'true') {
        console.log(`⚠️ Document ${documentNumber} already exists in database`);
      }

      return isDuplicate;
    } catch (error) {
      console.error('Error checking duplicate document number:', error);
      // ในกรณี error ให้ถือว่าไม่ซ้ำเพื่อให้ระบบทำงานต่อได้
      return false;
    }
  }

  /**
   * รีเซ็ตลำดับเลขเอกสาร (ใช้เฉพาะกรณีจำเป็น)
   * @param {string} documentType - ชนิดเอกสาร
   * @param {string} datePrefix - prefix วันที่
   * @param {number} newSequence - เลขลำดับใหม่
   */
  static async resetSequence(documentType, datePrefix, newSequence = 0) {
    await DocumentSequence.findOneAndUpdate(
      {
        documentType: documentType.toUpperCase(),
        datePrefix: datePrefix
      },
      {
        sequence: newSequence,
        updatedAt: new Date()
      },
      { upsert: true }
    );

    console.log(`🔄 Reset sequence for ${documentType}-${datePrefix} to ${newSequence}`);
  }

  /**
   * ดึงสถิติการใช้งานเลขเอกสาร
   * @param {string} documentType - ชนิดเอกสาร (ไม่บังคับ)
   * @returns {Promise<Array>} รายการสถิติ
   */
  static async getUsageStats(documentType = null) {
    const filter = documentType ? { documentType: documentType.toUpperCase() } : {};

    return await DocumentSequence.find(filter)
      .sort({ documentType: 1, datePrefix: -1 })
      .lean();
  }
}

module.exports = {
  DocumentSequence,
  DocumentSequenceManager
};
