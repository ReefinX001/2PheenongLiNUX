/**
 * documentFlowRoutes.js - Routes สำหรับจัดการ flow เอกสาร
 * จัดการการสร้างเอกสารตาม flow และการส่งทาง email
 */

const express = require('express');
const router = express.Router();
const DocumentFlowController = require('../controllers/DocumentFlowController');

// Middleware สำหรับ error handling
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * POST /api/document-flow/:id/installment
 * สร้างเอกสารทั้งหมดตาม flow สำหรับขายผ่อน
 */
router.post('/:id/installment', asyncHandler(async (req, res) => {
  console.log('📄 POST /api/document-flow/:id/installment');

  try {
    const { id } = req.params;
    const options = req.body || {};

    const result = await DocumentFlowController.createInstallmentDocumentFlow(id, options);

    if (result.success) {
      res.json({
        success: true,
        message: 'Installment document flow created successfully',
        data: result
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'Failed to create installment document flow',
        data: result
      });
    }

  } catch (error) {
    console.error('❌ Error creating installment document flow:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create installment document flow',
      error: error.message
    });
  }
}));

/**
 * POST /api/document-flow/:id/cash-sale
 * สร้างเอกสารสำหรับขายสด
 */
router.post('/:id/cash-sale', asyncHandler(async (req, res) => {
  console.log('💰 POST /api/document-flow/:id/cash-sale');

  try {
    const { id } = req.params;

    const result = await DocumentFlowController.createCashSaleDocuments(id);

    if (result.success) {
      res.json({
        success: true,
        message: 'Cash sale documents created successfully',
        data: result
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'Failed to create cash sale documents',
        data: result
      });
    }

  } catch (error) {
    console.error('❌ Error creating cash sale documents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create cash sale documents',
      error: error.message
    });
  }
}));

/**
 * POST /api/document-flow/:id/email
 * ส่งเอกสารทั้งหมดทาง Email
 */
router.post('/:id/email', asyncHandler(async (req, res) => {
  console.log('📧 POST /api/document-flow/:id/email');

  try {
    const { id } = req.params;
    const emailData = req.body;

    if (!emailData.to) {
      return res.status(400).json({
        success: false,
        message: 'Email recipient is required'
      });
    }

    const result = await DocumentFlowController.emailDocuments(id, emailData);

    res.json(result);

  } catch (error) {
    console.error('❌ Error emailing documents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to email documents',
      error: error.message
    });
  }
}));

/**
 * POST /api/document-flow/:id/auto-flow
 * สร้างเอกสารอัตโนมัติตาม saleType
 */
router.post('/:id/auto-flow', asyncHandler(async (req, res) => {
  console.log('🔄 POST /api/document-flow/:id/auto-flow');

  try {
    const { id } = req.params;
    const options = req.body || {};

    // ดึงข้อมูล deposit receipt เพื่อตรวจสอบ saleType
    const DepositReceipt = require('../models/DepositReceipt');
    const depositReceipt = await DepositReceipt.findById(id);

    if (!depositReceipt) {
      return res.status(404).json({
        success: false,
        message: 'Deposit receipt not found'
      });
    }

    let result;
    if (depositReceipt.saleType === 'installment') {
      result = await DocumentFlowController.createInstallmentDocumentFlow(id, options);
    } else {
      result = await DocumentFlowController.createCashSaleDocuments(id);
    }

    if (result.success) {
      res.json({
        success: true,
        message: `${depositReceipt.saleType === 'installment' ? 'Installment' : 'Cash sale'} document flow created successfully`,
        data: result
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'Failed to create document flow',
        data: result
      });
    }

  } catch (error) {
    console.error('❌ Error creating auto document flow:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create document flow',
      error: error.message
    });
  }
}));

/**
 * GET /api/document-flow/:id/status
 * ตรวจสอบสถานะเอกสารที่เกี่ยวข้อง
 */
router.get('/:id/status', asyncHandler(async (req, res) => {
  console.log('📊 GET /api/document-flow/:id/status');

  try {
    const { id } = req.params;

    // ดึงข้อมูล deposit receipt พร้อมเอกสารที่เกี่ยวข้อง
    const DepositReceipt = require('../models/DepositReceipt');
    const depositReceipt = await DepositReceipt.findById(id)
      .populate('relatedDocuments.quotationId')
      .populate('relatedDocuments.receiptId')
      .populate('relatedDocuments.taxInvoiceId')
      .populate('relatedDocuments.invoiceId')
      .populate('relatedDocuments.creditNoteId');

    if (!depositReceipt) {
      return res.status(404).json({
        success: false,
        message: 'Deposit receipt not found'
      });
    }

    const documentStatus = {
      depositReceipt: {
        number: depositReceipt.receiptNumber,
        status: depositReceipt.status,
        created: true
      },
      quotation: {
        number: depositReceipt.relatedDocuments.quotationNumber,
        created: !!depositReceipt.relatedDocuments.quotationId
      },
      receipt: {
        number: depositReceipt.relatedDocuments.receiptNumber,
        created: !!depositReceipt.relatedDocuments.receiptId
      },
      taxInvoice: {
        number: depositReceipt.relatedDocuments.taxInvoiceNumber,
        created: !!depositReceipt.relatedDocuments.taxInvoiceId
      },
      invoice: {
        number: depositReceipt.relatedDocuments.invoiceNumber,
        created: !!depositReceipt.relatedDocuments.invoiceId
      },
      creditNote: {
        number: depositReceipt.relatedDocuments.creditNoteNumber,
        created: !!depositReceipt.relatedDocuments.creditNoteId
      }
    };

    res.json({
      success: true,
      data: {
        saleType: depositReceipt.saleType,
        status: depositReceipt.status,
        documents: documentStatus,
        printing: depositReceipt.printing,
        conversion: depositReceipt.conversion,
        cancellation: depositReceipt.cancellation
      }
    });

  } catch (error) {
    console.error('❌ Error getting document flow status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get document flow status',
      error: error.message
    });
  }
}));

/**
 * Error handling middleware
 */
router.use((error, req, res, next) => {
  console.error('❌ Document Flow Routes Error:', error);

  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
});

module.exports = router;
