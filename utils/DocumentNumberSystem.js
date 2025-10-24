/**
 * @file DocumentNumberSystem.js
 * @description ระบบจัดการเลขเอกสารแบบครบถ้วนสำหรับ Quotation และ Invoice
 * @version 1.0.0
 * @date 2025-07-28
 */

const { DocumentSequenceManager } = require('./DocumentSequenceManager');

/**
 * ระบบจัดการเลขเอกสารที่รองรับ Quotation และ Invoice แบบเชื่อมโยงกัน
 */
class DocumentNumberSystem {

  /**
   * สร้างเลขใบเสนอราคาใหม่
   * @returns {Promise<string>} เลขใบเสนอราคา รูปแบบ QT-YYMMDD-XXXX
   */
  static async generateQuotationNumber() {
    try {
      return await DocumentSequenceManager.generateDocumentNumber('QT', 'YYMMDD');
    } catch (error) {
      console.error('❌ CRITICAL: Failed to generate quotation number:', error);
      // � NO FALLBACK! Throw error to prevent duplicate keys
      throw new Error(`Document number generation failed: ${error.message}`);
    }
  }

  /**
   * ดึงเลขใบเสนอราคาถัดไปโดยไม่สร้าง (สำหรับ preview)
   * @returns {Promise<string>} เลขใบเสนอราคาถัดไป
   */
  static async getNextQuotationNumber() {
    try {
      return await DocumentSequenceManager.getNextDocumentNumber('QT', 'YYMMDD');
    } catch (error) {
      console.error('❌ CRITICAL: Failed to get next quotation number:', error);
      // 🚨 NO FALLBACK! Throw error to prevent inconsistency
      throw new Error(`Next number generation failed: ${error.message}`);
    }
  }

  /**
   * สร้างเลขใบแจ้งหนี้ใหม่
   * @returns {Promise<string>} เลขใบแจ้งหนี้ รูปแบบ INV-680730-005 (รูปแบบเดียวกับ Quotation)
   */
  static async generateInvoiceNumber() {
    try {
      // 🔧 FIX: ใช้รูปแบบเดียวกับ Quotation (INV-YYMMDD-XXX)
      return await DocumentSequenceManager.generateDocumentNumber('INV', 'YYMMDD');
    } catch (error) {
      console.error('❌ CRITICAL: Failed to generate invoice number:', error);
      // � NO FALLBACK! Throw error to prevent duplicate keys
      throw new Error(`Invoice number generation failed: ${error.message}`);
    }
  }

  /**
   * สร้างเลขใบกำกับภาษี
   * @returns {Promise<string>} เลขใบกำกับภาษี รูปแบบ TX-YYMMDD-XXXX
   */
  static async generateTaxInvoiceNumber() {
    try {
      // สร้างเลขโดยใช้ sequence เดียวกับ Quotation แต่เปลี่ยน prefix
      const quotationNumber = await DocumentSequenceManager.generateDocumentNumber('QT', 'YYMMDD');

      // แปลงจาก QT-680828-004 เป็น TX-680828-004
      return quotationNumber.replace('QT-', 'TX-');
    } catch (error) {
      console.error('❌ CRITICAL: Failed to generate tax invoice number:', error);
      // 🚨 NO FALLBACK! Throw error to prevent duplicate keys
      throw new Error(`Tax invoice number generation failed: ${error.message}`);
    }
  }

  /**
   * สร้างเลขใบเสร็จ
   * @returns {Promise<string>} เลขใบเสร็จ รูปแบบ RE-YYMMDD-XXXX
   */
  static async generateReceiptNumber() {
    try {
      // สร้างเลขโดยใช้ sequence เดียวกับ Quotation แต่เปลี่ยน prefix
      const quotationNumber = await DocumentSequenceManager.generateDocumentNumber('QT', 'YYMMDD');

      // แปลงจาก QT-680828-004 เป็น RE-680828-004
      return quotationNumber.replace('QT-', 'RE-');
    } catch (error) {
      console.error('❌ CRITICAL: Failed to generate receipt number:', error);
      // 🚨 NO FALLBACK! Throw error to prevent duplicate keys
      throw new Error(`Receipt number generation failed: ${error.message}`);
    }
  }

  /**
   * สร้างเลขสัญญาผ่อนชำระ
   * @returns {Promise<string>} เลขสัญญาผ่อนชำระ รูปแบบ INST-YYMMDD-XXXX
   */
  static async generateInstallmentContractNumber() {
    try {
      // สร้างเลขโดยใช้ sequence เดียวกับ Quotation แต่เปลี่ยน prefix
      const quotationNumber = await DocumentSequenceManager.generateDocumentNumber('QT', 'YYMMDD');

      // แปลงจาก QT-680828-004 เป็น INST-680828-004
      const contractNumber = quotationNumber.replace('QT-', 'INST-');

      console.log('✅ Generated installment contract number sharing sequence with quotation:', {
        quotation: quotationNumber,
        contract: contractNumber
      });

      return contractNumber;
    } catch (error) {
      console.error('❌ CRITICAL: Failed to generate installment contract number:', error);
      // 🚨 NO FALLBACK! Throw error to prevent duplicate keys
      throw new Error(`Installment contract number generation failed: ${error.message}`);
    }
  }

  /**
   * สร้างเลขใบกำกับภาษี/ใบเสร็จ (เก่า - deprecated)
   * @param {string} type - ชนิดเอกสาร ('TX' สำหรับใบกำกับภาษี, 'RE' สำหรับใบเสร็จ)
   * @returns {Promise<string>} เลขเอกสาร
   * @deprecated ใช้ generateTaxInvoiceNumber() หรือ generateReceiptNumber() แทน
   */
  static async generateReceiptNumber_Old(type = 'RE') {
    try {
      return await DocumentSequenceManager.generateDocumentNumber(type, 'YYMMDD');
    } catch (error) {
      console.error(`❌ CRITICAL: Failed to generate ${type} number:`, error);
      // 🚨 NO FALLBACK! Throw error to prevent duplicate keys
      throw new Error(`${type} number generation failed: ${error.message}`);
    }
  }

  /**
   * ตรวจสอบความถูกต้องของเลขเอกสาร
   * @param {string} documentNumber - เลขเอกสารที่ต้องการตรวจสอบ
   * @returns {object} ผลการตรวจสอบ
   */
  static validateDocumentNumber(documentNumber) {
    if (!documentNumber || typeof documentNumber !== 'string') {
      return { valid: false, error: 'Document number is required and must be a string' };
    }

    // Pattern สำหรับเลขเอกสาร
    const patterns = {
      QT: /^QT-\d{6}-\d{4}$/,     // QT-YYMMDD-XXXX
      INV: /^INV-\d{4}-\d{4}$/,   // INV-YYMM-XXXX
      TX: /^TX-\d{6}-\d{4}$/,     // TX-YYMMDD-XXXX
      RE: /^RE-\d{6}-\d{4}$/      // RE-YYMMDD-XXXX
    };

    const prefix = documentNumber.split('-')[0];
    const pattern = patterns[prefix];

    if (!pattern) {
      return { valid: false, error: `Unknown document type: ${prefix}` };
    }

    const matches = pattern.test(documentNumber);
    if (!matches) {
      return { valid: false, error: `Invalid format for ${prefix} document number` };
    }

    return { valid: true, type: prefix, pattern: pattern.toString() };
  }

  /**
   * แปลงเลขเอกสารเป็นข้อมูลโครงสร้าง
   * @param {string} documentNumber - เลขเอกสาร
   * @returns {object} ข้อมูลโครงสร้างของเลขเอกสาร
   */
  static parseDocumentNumber(documentNumber) {
    const validation = this.validateDocumentNumber(documentNumber);
    if (!validation.valid) {
      return { error: validation.error };
    }

    const parts = documentNumber.split('-');
    const [type, datePrefix, sequence] = parts;

    let year, month, day;
    if (type === 'INV') {
      // INV-YYMM-XXXX
      year = parseInt(datePrefix.substring(0, 2)) + 2500; // แปลงเป็น พ.ศ.
      month = parseInt(datePrefix.substring(2, 4));
      day = null;
    } else {
      // QT/TX/RE-YYMMDD-XXXX
      year = parseInt(datePrefix.substring(0, 2)) + 2500; // แปลงเป็น พ.ศ.
      month = parseInt(datePrefix.substring(2, 4));
      day = parseInt(datePrefix.substring(4, 6));
    }

    return {
      type: type,
      year: year,
      month: month,
      day: day,
      sequence: parseInt(sequence),
      datePrefix: datePrefix,
      fullNumber: documentNumber
    };
  }

  /**
   * เชื่อมโยงใบเสนอราคากับใบแจ้งหนี้
   * @param {string} quotationNumber - เลขใบเสนอราคา
   * @param {string} invoiceNumber - เลขใบแจ้งหนี้
   * @returns {Promise<boolean>} ผลการเชื่อมโยง
   */
  static async linkQuotationToInvoice(quotationNumber, invoiceNumber) {
    try {
      const Quotation = require('../models/Installment/Quotation');
      const Invoice = require('../models/Installment/Invoice');

      // อัปเดตใบเสนอราคาให้มี reference ไปยังใบแจ้งหนี้
      await Quotation.findOneAndUpdate(
        {
          $or: [
            { quotationNumber: quotationNumber },
            { number: quotationNumber }
          ]
        },
        {
          linkedInvoiceNumber: invoiceNumber,
          status: 'CONVERTED_TO_INVOICE',
          updatedAt: new Date()
        }
      );

      // อัปเดตใบแจ้งหนี้ให้มี reference ไปยังใบเสนอราคา
      await Invoice.findOneAndUpdate(
        { invoiceNumber: invoiceNumber },
        {
          quotationNumber: quotationNumber,
          linkedQuotationNumber: quotationNumber,
          sourceDocument: 'QUOTATION',
          updatedAt: new Date()
        }
      );

      console.log('✅ Successfully linked documents:', {
        quotation: quotationNumber,
        invoice: invoiceNumber
      });

      return true;
    } catch (error) {
      console.error('❌ Error linking quotation to invoice:', error);
      return false;
    }
  }

  /**
   * ค้นหาเอกสารที่เชื่อมโยงกัน
   * @param {string} documentNumber - เลขเอกสาร
   * @returns {Promise<object>} เอกสารที่เชื่อมโยง
   */
  static async findLinkedDocuments(documentNumber) {
    try {
      const documentInfo = this.parseDocumentNumber(documentNumber);
      if (documentInfo.error) {
        return { error: documentInfo.error };
      }

      const Quotation = require('../models/backup/Installment/Quotation');
      const Invoice = require('../models/backup/Installment/Invoice');

      let linkedDocuments = {};

      if (documentInfo.type === 'QT') {
        // หาใบแจ้งหนี้ที่เชื่อมโยงกับใบเสนอราคานี้
        const quotation = await Quotation.findOne({
          $or: [
            { quotationNumber: documentNumber },
            { number: documentNumber }
          ]
        });

        if (quotation?.linkedInvoiceNumber) {
          const invoice = await Invoice.findOne({
            invoiceNumber: quotation.linkedInvoiceNumber
          });
          linkedDocuments.invoice = invoice;
        }

        linkedDocuments.quotation = quotation;

      } else if (documentInfo.type === 'INV') {
        // หาใบเสนอราคาที่เชื่อมโยงกับใบแจ้งหนี้นี้
        const invoice = await Invoice.findOne({
          invoiceNumber: documentNumber
        });

        if (invoice?.quotationNumber) {
          const quotation = await Quotation.findOne({
            $or: [
              { quotationNumber: invoice.quotationNumber },
              { number: invoice.quotationNumber }
            ]
          });
          linkedDocuments.quotation = quotation;
        }

        linkedDocuments.invoice = invoice;
      }

      return linkedDocuments;

    } catch (error) {
      console.error('❌ Error finding linked documents:', error);
      return { error: error.message };
    }
  }

  /**
   * รีพอร์ตสถิติการใช้งานเลขเอกสาร
   * @returns {Promise<object>} สถิติการใช้งาน
   */
  static async getUsageReport() {
    try {
      const stats = await DocumentSequenceManager.getUsageStats();

      // จัดกลุ่มตามประเภทเอกสาร
      const report = {
        summary: {
          totalDocumentTypes: 0,
          totalSequences: 0,
          generatedToday: 0
        },
        byType: {},
        recent: []
      };

      const today = new Date().toISOString().slice(0, 10);

      stats.forEach(stat => {
        if (!report.byType[stat.documentType]) {
          report.byType[stat.documentType] = {
            sequences: 0,
            totalGenerated: 0,
            latestSequence: 0
          };
          report.summary.totalDocumentTypes++;
        }

        report.byType[stat.documentType].sequences++;
        report.byType[stat.documentType].totalGenerated += stat.sequence;
        report.byType[stat.documentType].latestSequence = Math.max(
          report.byType[stat.documentType].latestSequence,
          stat.sequence
        );

        report.summary.totalSequences += stat.sequence;

        // นับเอกสารที่สร้างวันนี้
        if (stat.updatedAt && stat.updatedAt.toISOString().slice(0, 10) === today) {
          report.summary.generatedToday++;
        }

        // เก็บข้อมูลล่าสุด
        report.recent.push({
          type: stat.documentType,
          prefix: stat.datePrefix,
          sequence: stat.sequence,
          updatedAt: stat.updatedAt
        });
      });

      // จัดเรียงข้อมูลล่าสุด
      report.recent.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      report.recent = report.recent.slice(0, 20); // เอา 20 รายการล่าสุด

      return report;

    } catch (error) {
      console.error('❌ Error generating usage report:', error);
      return { error: error.message };
    }
  }
}

module.exports = DocumentNumberSystem;
