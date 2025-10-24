// utils/documentNumberGenerator.js
// ระบบสร้างเลขที่เอกสาร Receipt และ Tax Invoice แบบต่อเนื่อง
const { getNextSequence } = require('./counterUtil');

/**
 * สร้างเลขที่ใบเสร็จรับเงิน RE-YYMMDD-001
 * @param {string} branchCode - รหัสสาขา (เช่น '680731')
 * @returns {Promise<string>} เลขที่ใบเสร็จ เช่น RE-680731-001
 */
async function generateReceiptNumber(branchCode = '680731') {
  try {
    console.log('📄 Generating Receipt Number (RE-)...');

    // สร้าง counter key แยกตามสาขาและวันที่
    const today = new Date();
    const year = (today.getFullYear() + 543).toString().slice(-2); // ปี พ.ศ. 2 หลัก
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateKey = `${year}${month}${day}`;

    // Counter key: receipt_BRANCH_YYMMDD
    const counterKey = `receipt_${branchCode}_${dateKey}`;

    // ดึงหมายเลขลำดับถัดไป (เริ่มจาก 001)
    const sequenceNumber = await getNextSequence(counterKey, branchCode);

    // Format เป็น 3 หลัก: 001, 002, 003...
    const formattedSequence = String(sequenceNumber).padStart(3, '0');

    // สร้างเลขที่เอกสาร: RE-BRANCH-SEQ
    const receiptNumber = `RE-${branchCode}-${formattedSequence}`;

    console.log('✅ Receipt Number Generated:', {
      receiptNumber,
      branchCode,
      dateKey,
      sequenceNumber,
      formattedSequence,
      counterKey
    });

    return receiptNumber;

  } catch (error) {
    console.error('❌ Error generating receipt number:', error);
    // Fallback กรณีระบบ counter มีปัญหา
    const timestamp = Date.now().toString().slice(-3);
    const fallbackNumber = `RE-${branchCode}-${timestamp}`;
    console.warn('⚠️ Using fallback receipt number:', fallbackNumber);
    return fallbackNumber;
  }
}

/**
 * สร้างเลขที่ใบกำกับภาษี TX-YYMMDD-001
 * @param {string} branchCode - รหัสสาขา (เช่น '680731')
 * @returns {Promise<string>} เลขที่ใบกำกับภาษี เช่น TX-680731-001
 */
async function generateTaxInvoiceNumber(branchCode = '680731') {
  try {
    console.log('📄 Generating Tax Invoice Number (TX-)...');

    // สร้าง counter key แยกตามสาขาและวันที่
    const today = new Date();
    const year = (today.getFullYear() + 543).toString().slice(-2); // ปี พ.ศ. 2 หลัก
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateKey = `${year}${month}${day}`;

    // Counter key: taxinvoice_BRANCH_YYMMDD
    const counterKey = `taxinvoice_${branchCode}_${dateKey}`;

    // ดึงหมายเลขลำดับถัดไป (เริ่มจาก 001)
    const sequenceNumber = await getNextSequence(counterKey, branchCode);

    // Format เป็น 3 หลัก: 001, 002, 003...
    const formattedSequence = String(sequenceNumber).padStart(3, '0');

    // สร้างเลขที่เอกสาร: TX-BRANCH-SEQ
    const taxInvoiceNumber = `TX-${branchCode}-${formattedSequence}`;

    console.log('✅ Tax Invoice Number Generated:', {
      taxInvoiceNumber,
      branchCode,
      dateKey,
      sequenceNumber,
      formattedSequence,
      counterKey
    });

    return taxInvoiceNumber;

  } catch (error) {
    console.error('❌ Error generating tax invoice number:', error);
    // Fallback กรณีระบบ counter มีปัญหา
    const timestamp = Date.now().toString().slice(-3);
    const fallbackNumber = `TX-${branchCode}-${timestamp}`;
    console.warn('⚠️ Using fallback tax invoice number:', fallbackNumber);
    return fallbackNumber;
  }
}

/**
 * สร้างเลขที่เอกสารแบบอัตโนมัติตามประเภท VAT
 * @param {boolean} hasVatItems - มีสินค้าที่ต้องเสียภาษีหรือไม่
 * @param {string} branchCode - รหัสสาขา
 * @returns {Promise<string>} เลขที่เอกสาร
 */
async function generateDocumentNumber(hasVatItems, branchCode = '680731') {
  console.log('🔧 Auto-generating document number based on VAT status:', {
    hasVatItems,
    documentType: hasVatItems ? 'Tax Invoice (TX-)' : 'Receipt (RE-)',
    branchCode
  });

  if (hasVatItems) {
    return await generateTaxInvoiceNumber(branchCode);
  } else {
    return await generateReceiptNumber(branchCode);
  }
}

/**
 * ตรวจสอบเลขที่เอกสารที่มีอยู่แล้วในวันนี้
 * @param {string} prefix - คำนำหน้า (RE- หรือ TX-)
 * @param {string} branchCode - รหัสสาขา
 * @returns {Promise<number>} จำนวนเอกสารที่มีอยู่แล้ว
 */
async function getDocumentCountToday(prefix, branchCode = '680731') {
  try {
    const today = new Date();
    const year = (today.getFullYear() + 543).toString().slice(-2);
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateKey = `${year}${month}${day}`;

    // แปลง prefix เป็น counter key
    const prefixMap = {
      'RE-': 'receipt',
      'TX-': 'taxinvoice'
    };

    const counterType = prefixMap[prefix] || prefix.toLowerCase().replace('-', '');
    const counterKey = `${counterType}_${branchCode}_${dateKey}`;

    console.log('🔍 Getting document count:', {
      prefix,
      counterType,
      counterKey,
      branchCode,
      dateKey
    });

    const Counter = require('../models/POS/Counter');
    const counter = await Counter.findOne({
      key: counterKey,
      reference_value: branchCode
    });

    const count = counter ? counter.seq : 0;
    console.log('📊 Document count result:', count);

    return count;

  } catch (error) {
    console.error('❌ Error getting document count:', error);
    return 0;
  }
}

module.exports = {
  generateReceiptNumber,
  generateTaxInvoiceNumber,
  generateDocumentNumber,
  getDocumentCountToday
};
