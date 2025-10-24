/**
 * Document Generation Routes
 * Unified routes for generating PDF documents for installment system
 */

const express = require('express');
const router = express.Router();
const documentGenerationController = require('../controllers/documentGenerationController');

// Optional: Add authentication middleware if needed
// const authJWT = require('../middlewares/authJWT');

/**
 * POST /api/document/generate/:type
 * Generate PDF document based on type
 *
 * Supported types:
 * - quotation: ใบเสนอราคา
 * - invoice: ใบแจ้งหนี้ (เฉพาะเงินดาวน์)
 * - receipt: ใบเสร็จรับเงิน & ใบกำกับภาษี (เฉพาะเงินดาวน์)
 * - contract: สัญญาผ่อนชำระ
 * - payment_schedule: ตารางการชำระเงิน
 */
router.post('/generate/:type', documentGenerationController.generateDocument);

/**
 * POST /api/document/generate/quotation
 * Specific route for quotation generation (for step4-integration.js compatibility)
 */
router.post('/generate/quotation', async (req, res) => {
  req.params = { type: 'quotation' };
  return documentGenerationController.generateDocument(req, res);
});

/**
 * POST /api/document/generate/invoice
 * Specific route for invoice generation (for step4-integration.js compatibility)
 */
router.post('/generate/invoice', async (req, res) => {
  req.params = { type: 'invoice' };
  return documentGenerationController.generateDocument(req, res);
});

/**
 * POST /api/document/generate/receipt
 * Specific route for receipt generation (for step4-integration.js compatibility)
 */
router.post('/generate/receipt', async (req, res) => {
  req.params = { type: 'receipt' };
  return documentGenerationController.generateDocument(req, res);
});

/**
 * POST /api/document/generate/out-receipt
 * Generate 80mm receipt using PDFoooRasterController (Returns JSON with base64)
 */
router.post('/generate/out-receipt', async (req, res) => {
  try {
    console.log('🖨️ Generating 80mm receipt...');

    const PDFoooRasterController = require('../controllers/pdf/PDFoooRasterController');
    const receiptData = req.body;

    // Validate required data
    if (!receiptData) {
      return res.status(400).json({
        success: false,
        error: 'ไม่พบข้อมูลใบเสร็จ'
      });
    }

    // Generate receipt using PDFoooRasterController
    const result = await PDFoooRasterController.printReceipt(receiptData);

    if (!result || !result.base64) {
      return res.status(500).json({
        success: false,
        error: 'ไม่สามารถสร้างใบเสร็จได้'
      });
    }

    // Return JSON response with base64 image
    res.json({
      success: true,
      data: {
        base64: result.base64,
        fileName: result.fileName || 'receipt-80mm.png',
        format: 'image/png'
      },
      message: 'สร้างใบเสร็จสำเร็จ'
    });

  } catch (error) {
    console.error('❌ Error generating 80mm receipt:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'เกิดข้อผิดพลาดในการสร้างใบเสร็จ'
    });
  }
});

/**
 * GET /api/document/types
 * Get supported document types
 */
router.get('/types', (req, res) => {
  res.json({
    success: true,
    data: {
      types: [
        {
          type: 'quotation',
          name: 'ใบเสนอราคา',
          description: 'เอกสารแสดงรายละเอียดสินค้าและแผนการผ่อนชำระ',
          showFullAmount: true,
          showInstallmentPlan: true
        },
        {
          type: 'invoice',
          name: 'ใบแจ้งหนี้ (เงินดาวน์)',
          description: 'เอกสารแจ้งยอดเงินดาวน์ที่ต้องชำระ',
          showDownPaymentOnly: true
        },
        {
          type: 'receipt',
          name: 'ใบเสร็จรับเงิน & ใบกำกับภาษี (เงินดาวน์)',
          description: 'เอกสารยืนยันการชำระเงินดาวน์และใบกำกับภาษี',
          showDownPaymentOnly: true,
          paymentStatus: 'paid'
        },
        {
          type: 'contract',
          name: 'สัญญาผ่อนชำระ',
          description: 'สัญญาและเงื่อนไขการผ่อนชำระ',
          showInstallmentTerms: true
        },
        {
          type: 'payment_schedule',
          name: 'ตารางการชำระเงิน',
          description: 'ตารางการชำระเงินรายเดือน',
          showScheduleTable: true
        }
      ]
    }
  });
});

/**
 * GET /api/document/status
 * Get document generation service status
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'Document Generation Service',
      status: 'running',
      version: '1.0.0',
      supportedTypes: ['quotation', 'invoice', 'receipt', 'contract', 'payment_schedule'],
      endpoints: {
        generate: 'POST /api/document/generate/:type',
        types: 'GET /api/document/types',
        status: 'GET /api/document/status'
      }
    }
  });
});

module.exports = router;