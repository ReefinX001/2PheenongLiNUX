const express = require('express');
const router = express.Router();
const posControllerNew = require('../controllers/POS/posController');
const generateReceiptImage = require('../controllers/generateReceiptImage');
const authJWT = require('../middlewares/authJWT');

console.log('🔍 Using POS Controller New');

// Protected routes
router.get('/level1', authJWT, posControllerNew.getLevel1);
router.get('/level2', authJWT, posControllerNew.getLevel2);
router.get('/level3', authJWT, posControllerNew.getLevel3);
router.post('/checkout', authJWT, posControllerNew.checkout);
router.get('/history-receipt-image', authJWT, posControllerNew.getHistoryReceiptImage);

// ✅ เพิ่ม route สำหรับ generate-receipt-image ที่หายไป
router.post('/generate-receipt-image', authJWT, generateReceiptImage);

// Receipt Voucher related endpoints - ใช้ controller ใหม่
router.get('/receipts/pending-vouchers', authJWT, posControllerNew.getPendingReceiptsForVouchers);

// Promotion routes - แก้ไขให้ตรงกับ frontend
router.post('/promotion/check-available', authJWT, async (req, res) => {
  try {
    // Forward request ไปยัง promotion controller
    const promotionController = require('../controllers/MKT/promotionController');
    return await promotionController.checkAvailablePromotions(req, res);
  } catch (err) {
    console.error('Error in promotion check (forwarded from posRoutes):', err);
    res.status(500).json({ status: 'fail', message: err.message });
  }
});

router.post('/promotion/use', authJWT, async (req, res) => {
  try {
    const promotionController = require('../controllers/MKT/promotionController');
    return await promotionController.usePromotion(req, res);
  } catch (err) {
    console.error('Error in promotion use (forwarded from posRoutes):', err);
    res.status(500).json({ status: 'fail', message: err.message });
  }
});

module.exports = router;
