const express = require('express');
const router = express.Router();
const posController = require('../../controllers/POS/posController');
const authJWT = require('../../middlewares/authJWT');

console.log('🔍 posController:', posController);

// Protected routes
router.get('/level1', authJWT, posController.getLevel1);
router.get('/level2', authJWT, posController.getLevel2);
router.get('/level3', authJWT, posController.getLevel3);
router.post('/checkout', authJWT, posController.checkout);
router.get('/history-receipt-image', authJWT, posController.getHistoryReceiptImage);

// New endpoint for generating POS images from Receipt/TaxInvoice data
// 🆕 New endpoint for generating dual receipts (RE + TX with same number)
router.post('/generate-dual-receipts', authJWT, async (req, res) => {
  try {
    console.log('🔄 Generate dual receipts (RE + TX with same base number)');

    const { originalData } = req.body;

    if (!originalData) {
      return res.status(400).json({
        success: false,
        error: 'Missing required order data'
      });
    }

    // Import CashSalesPDFController for dual receipt generation
    const CashSalesPDFController = require('../../controllers/pdf/CashSalesPDFController');

    // Generate both receipts with same base number
    const result = await CashSalesPDFController.printDualReceipts(originalData);

    return res.json({
      success: true,
      receipt: {
        base64Data: result.receipt.base64,
        fileName: result.receipt.fileName,
        documentNumber: result.receiptNumber
      },
      taxInvoice: {
        base64Data: result.taxInvoice.base64,
        fileName: result.taxInvoice.fileName,
        documentNumber: result.taxInvoiceNumber
      },
      baseNumber: result.baseNumber,
      message: `สร้างใบเสร็จคู่สำเร็จ: ${result.receiptNumber} และ ${result.taxInvoiceNumber}`
    });

  } catch (error) {
    console.error('❌ Error generating dual receipts:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate dual receipts'
    });
  }
});

router.post('/generate-receipt-image', authJWT, async (req, res) => {
  try {
    console.log('📄 Generate POS receipt image from Receipt/TaxInvoice data');

    const {
      documentType = 'RECEIPT', // 'RECEIPT' | 'TAX_INVOICE'
      documentId,
      documentNumber,
      originalData
    } = req.body || {};

    const CashSalesPDFController = require('../../controllers/pdf/CashSalesPDFController');

    let result;   // { base64, fileName }

    if (documentId) {
      // 1) มี _id -> ไปดึงจาก DB ตามชนิดเอกสาร
      result = await CashSalesPDFController.printFromDbById(documentId, documentType);
    } else if (documentNumber) {
      // 2) มีเลขเอกสาร -> ให้ controller หา/พิมพ์เอง
      result = await CashSalesPDFController.printFromDbByNumber(documentNumber);
    } else {
      // 3) ใช้ payload เดิม (รองรับทั้ง object และ JSON string)
      let payload = originalData;
      if (typeof payload === 'string') {
        try { payload = JSON.parse(payload); } catch { /* ปล่อยเป็น string ไม่ได้ -> invalid */ }
      }
      if (!payload || typeof payload !== 'object') {
        return res.status(400).json({ success:false, error:'Invalid payload' });
      }

      // แปลงเป็น order format ที่ renderer เข้าใจ
      let order = CashSalesPDFController.normalizeFromDbDoc(payload, documentType);
      if (!order || Object.keys(order).length === 0) order = payload;

      result = await CashSalesPDFController.printCashSalesReceipt(order, documentType);
    }

    // ส่งกลับเป็น JSON ปรกติ
    return res.json({
      success: true,
      base64Data: result.base64,   // string (ไม่มี data:prefix)
      fileName: result.fileName,
      documentType,
      documentNumber,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error generating POS receipt image:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate POS receipt image'
    });
  }
});

// Receipt Voucher related endpoints
router.get('/receipts/pending-vouchers', authJWT, posController.getPendingReceiptsForVouchers);

// Promotion routes - แก้ไขให้ตรงกับ frontend
router.post('/promotion/check-available', authJWT, async (req, res) => {
  try {
    // Forward request ไปยัง promotion controller
    const promotionController = require('../../controllers/MKT/promotionController');
    return await promotionController.checkAvailablePromotions(req, res);
  } catch (err) {
    console.error('Error in promotion check (forwarded from posRoutes):', err);
    res.status(500).json({ status: 'fail', message: err.message });
  }
});

router.post('/promotion/use', authJWT, async (req, res) => {
  try {
    const promotionController = require('../../controllers/MKT/promotionController');
    return await promotionController.usePromotion(req, res);
  } catch (err) {
    console.error('Error in promotion use (forwarded from posRoutes):', err);
    res.status(500).json({ status: 'fail', message: err.message });
  }
});

module.exports = router;
