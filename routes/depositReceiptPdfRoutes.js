/**
 * depositReceiptPdfRoutes.js - Routes สำหรับ PDF ใบรับเงินมัดจำ
 * จัดการการสร้าง PDF และเอกสารที่เกี่ยวข้อง
 */

const express = require('express');
const router = express.Router();
const DepositReceiptPDFController = require('../controllers/pdf/DepositReceiptPDFController');
const A4PDFController = require('../controllers/pdf/A4PDFController');

// Middleware สำหรับ error handling
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * POST /api/deposit-receipt-pdf/create
 * สร้าง PDF ใบรับเงินมัดจำจากข้อมูลที่ส่งมา
 */
router.post('/create', asyncHandler(async (req, res) => {
  console.log('📄 POST /api/deposit-receipt-pdf/create');

  try {
    const depositReceiptData = req.body;

    if (!depositReceiptData) {
      return res.status(400).json({
        success: false,
        message: 'Missing deposit receipt data'
      });
    }

    const result = await DepositReceiptPDFController.createDepositReceiptPdf(depositReceiptData);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.send(result.buffer);

  } catch (error) {
    console.error('❌ Error creating deposit receipt PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create deposit receipt PDF',
      error: error.message
    });
  }
}));

/**
 * GET /api/deposit-receipt-pdf/:id
 * สร้าง PDF ใบรับเงินมัดจำจาก ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
  console.log('📄 GET /api/deposit-receipt-pdf/:id');

  try {
    const { id } = req.params;

    const result = await DepositReceiptPDFController.createDepositReceiptPdfById(id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.send(result.buffer);

  } catch (error) {
    console.error('❌ Error creating deposit receipt PDF by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create deposit receipt PDF',
      error: error.message
    });
  }
}));

/**
 * POST /api/deposit-receipt-pdf/:id/email
 * สร้างและส่ง PDF ใบรับเงินมัดจำทาง Email
 */
router.post('/:id/email', asyncHandler(async (req, res) => {
  console.log('📧 POST /api/deposit-receipt-pdf/:id/email');

  try {
    const { id } = req.params;
    const emailData = req.body;

    if (!emailData.to) {
      return res.status(400).json({
        success: false,
        message: 'Email recipient is required'
      });
    }

    const result = await DepositReceiptPDFController.generateAndEmailDepositReceipt(id, emailData);

    res.json(result);

  } catch (error) {
    console.error('❌ Error emailing deposit receipt PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to email deposit receipt PDF',
      error: error.message
    });
  }
}));

/**
 * POST /api/deposit-receipt-pdf/:id/create-related
 * สร้างเอกสารที่เกี่ยวข้องทั้งหมด (ใบเสนอราคา, ใบเสร็จ/ใบกำกับภาษี)
 */
router.post('/:id/create-related', asyncHandler(async (req, res) => {
  console.log('📄 POST /api/deposit-receipt-pdf/:id/create-related');

  try {
    const { id } = req.params;
    const options = req.body || {};

    const result = await DepositReceiptPDFController.createRelatedDocuments(id, options);

    res.json(result);

  } catch (error) {
    console.error('❌ Error creating related documents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create related documents',
      error: error.message
    });
  }
}));

/**
 * GET /api/deposit-receipt-pdf/:id/navigation-data/:saleType
 * เตรียมข้อมูลสำหรับนำทางไปหน้าขายสด/ขายผ่อน
 */
router.get('/:id/navigation-data/:saleType', asyncHandler(async (req, res) => {
  console.log('🔄 GET /api/deposit-receipt-pdf/:id/navigation-data/:saleType');

  try {
    const { id, saleType } = req.params;

    if (!['cash', 'installment'].includes(saleType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid sale type. Must be "cash" or "installment"'
      });
    }

    const result = await DepositReceiptPDFController.prepareNavigationData(id, saleType);

    res.json(result);

  } catch (error) {
    console.error('❌ Error preparing navigation data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to prepare navigation data',
      error: error.message
    });
  }
}));

/**
 * POST /api/deposit-receipt-pdf/:id/create-quotation
 * สร้างใบเสนอราคาจากใบรับเงินมัดจำ (สำหรับขายผ่อน)
 */
router.post('/:id/create-quotation', asyncHandler(async (req, res) => {
  console.log('📋 POST /api/deposit-receipt-pdf/:id/create-quotation');

  try {
    const { id } = req.params;

    // ดึงข้อมูลใบรับเงินมัดจำ
    const DepositReceipt = require('../models/DepositReceipt');
    const depositReceipt = await DepositReceipt.findById(id)
      .populate('customer')
      .populate('product')
      .populate('branch')
      .populate('salesperson');

    if (!depositReceipt) {
      return res.status(404).json({
        success: false,
        message: 'Deposit receipt not found'
      });
    }

    // แปลงเป็นข้อมูลใบเสนอราคา
    const quotationData = {
      _id: depositReceipt._id,
      quotationNumber: `QT-${depositReceipt.receiptNumber}`,
      issueDate: depositReceipt.depositDate,
      customer: depositReceipt.customer,
      items: [{
        description: depositReceipt.product?.name || 'สินค้า',
        quantity: 1,
        unitPrice: depositReceipt.product?.price || 0,
        amount: depositReceipt.product?.price || 0,
        imei: depositReceipt.product?.imei
      }],
      subTotal: depositReceipt.product?.price || 0,
      docFee: 500,
      grandTotal: (depositReceipt.product?.price || 0) + 500,
      company: depositReceipt.company || { name: 'บริษัท 2 พี่น้อง โมบาย จำกัด' },
      branch: depositReceipt.branch,
      salesperson: depositReceipt.salesperson,
      documentType: 'QUOTATION'
    };

    // สร้าง PDF ใบเสนอราคา (ใช้ A4PDFController)
    const result = await A4PDFController.createReceiptPdf(quotationData);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.send(result.buffer);

  } catch (error) {
    console.error('❌ Error creating quotation from deposit receipt:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create quotation',
      error: error.message
    });
  }
}));

/**
 * POST /api/deposit-receipt-pdf/:id/create-receipt
 * สร้างใบเสร็จรับเงิน/ใบกำกับภาษีจากใบรับเงินมัดจำ
 */
router.post('/:id/create-receipt', asyncHandler(async (req, res) => {
  console.log('🧾 POST /api/deposit-receipt-pdf/:id/create-receipt');

  try {
    const { id } = req.params;
    const { documentType = 'RECEIPT' } = req.body; // RECEIPT หรือ TAX_INVOICE

    // ดึงข้อมูลใบรับเงินมัดจำ
    const DepositReceipt = require('../models/DepositReceipt');
    const depositReceipt = await DepositReceipt.findById(id)
      .populate('customer')
      .populate('product')
      .populate('branch')
      .populate('salesperson');

    if (!depositReceipt) {
      return res.status(404).json({
        success: false,
        message: 'Deposit receipt not found'
      });
    }

    // แปลงเป็นข้อมูลใบเสร็จ/ใบกำกับภาษี
    const receiptData = {
      _id: depositReceipt._id,
      order_number: `RE-${depositReceipt.receiptNumber}`,
      invoiceNo: `RE-${depositReceipt.receiptNumber}`,
      documentType: documentType,
      saleDate: depositReceipt.depositDate,
      customer: depositReceipt.customer,
      items: [{
        description: `ค่าดาวน์ - ${depositReceipt.product?.name || 'สินค้า'}`,
        quantity: 1,
        unitPrice: depositReceipt.amounts?.depositAmount || 0,
        amount: depositReceipt.amounts?.depositAmount || 0,
        imei: depositReceipt.product?.imei
      }],
      subTotal: depositReceipt.amounts?.depositAmount || 0,
      docFee: 0,
      vatTotal: documentType === 'TAX_INVOICE' ? (depositReceipt.amounts?.depositAmount || 0) * 0.07 : 0,
      grandTotal: documentType === 'TAX_INVOICE' ?
        (depositReceipt.amounts?.depositAmount || 0) * 1.07 :
        (depositReceipt.amounts?.depositAmount || 0),
      company: depositReceipt.company || { name: 'บริษัท 2 พี่น้อง โมบาย จำกัด' },
      branch: depositReceipt.branch,
      salesperson: depositReceipt.salesperson,
      taxType: documentType === 'TAX_INVOICE' ? 'inclusive' : 'no_vat'
    };

    // สร้าง PDF ใบเสร็จ/ใบกำกับภาษี
    const result = await A4PDFController.createReceiptPdf(receiptData);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.send(result.buffer);

  } catch (error) {
    console.error('❌ Error creating receipt from deposit receipt:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create receipt',
      error: error.message
    });
  }
}));

/**
 * Error handling middleware
 */
router.use((error, req, res, next) => {
  console.error('❌ Deposit Receipt PDF Routes Error:', error);

  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
});

module.exports = router;
