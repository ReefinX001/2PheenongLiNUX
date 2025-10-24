// routes/MKT/promotionRoutes.js
const express = require('express');
const router = express.Router();
const promotionController = require('../../controllers/MKT/promotionController');
const authJWT = require('../../middlewares/authJWT');

// Apply authentication middleware to all routes
router.use(authJWT);

// Routes ที่เฉพาะเจาะจงต้องอยู่ก่อน dynamic routes

// คำนวณราคาหลังหักโปรโมชั่น (สำหรับ POS)
router.post('/calculate-price', promotionController.calculatePrice);

// ตรวจสอบโปรโมชั่นที่ใช้ได้กับสินค้า (สำหรับ POS)
router.post('/check-available', promotionController.checkAvailablePromotions);

// บันทึกการใช้โปรโมชั่น (เมื่อมีการขาย)
router.post('/use', promotionController.usePromotion);

// ดึงโปรโมชั่นที่กำลังใช้งาน
router.get('/active', async (req, res) => {
  try {
    req.query = { ...req.query, active: 'true' };
    return promotionController.getAllPromotions(req, res);
  } catch (err) {
    res.status(500).json({
      status: 'fail',
      message: err.message
    });
  }
});

// ดูสถิติโปรโมชั่น
router.get('/statistics', async (req, res) => {
  try {
    return promotionController.getPromotionStatistics(req, res);
  } catch (err) {
    res.status(500).json({
      status: 'fail',
      message: err.message
    });
  }
});

// เปิด/ปิดโปรโมชั่นหลายรายการพร้อมกัน
router.post('/bulk-toggle', async (req, res) => {
  try {
    return promotionController.bulkTogglePromotions(req, res);
  } catch (err) {
    res.status(500).json({
      status: 'fail',
      message: err.message
    });
  }
});

// ส่งออกข้อมูลโปรโมชั่น
router.get('/export', async (req, res) => {
  try {
    return promotionController.exportPromotions(req, res);
  } catch (err) {
    res.status(500).json({
      status: 'fail',
      message: err.message
    });
  }
});

// ตรวจสอบกฎของโปรโมชั่น
router.post('/validate', async (req, res) => {
  try {
    return promotionController.validatePromotionRules(req, res);
  } catch (err) {
    res.status(500).json({
      status: 'fail',
      message: err.message
    });
  }
});

// CRUD Operations
router.route('/')
  .get(promotionController.getAllPromotions)    // ดูโปรโมชั่นทั้งหมด
  .post(promotionController.createPromotion);    // สร้างโปรโมชั่นใหม่

router.route('/:id')
  .get(promotionController.getPromotionById)     // ดูโปรโมชั่นตาม ID
  .patch(promotionController.updatePromotion)    // อัพเดทโปรโมชั่น
  .put(promotionController.updatePromotion)      // อัพเดทโปรโมชั่น (full update)
  .delete(promotionController.deletePromotion);  // ลบโปรโมชั่น

// คัดลอกโปรโมชั่น
router.post('/:id/clone', async (req, res) => {
  try {
    return promotionController.clonePromotion(req, res);
  } catch (err) {
    res.status(500).json({
      status: 'fail',
      message: err.message
    });
  }
});

// ใช้โปรโมชั่นกับตะกร้าสินค้า
router.post('/:id/apply', async (req, res) => {
  try {
    return promotionController.applyPromotionToCart(req, res);
  } catch (err) {
    res.status(500).json({
      status: 'fail',
      message: err.message
    });
  }
});

// Debug routes
router.post('/debug/calculate-price', promotionController.debugCalculatePrice);
router.get('/:id/validate-setup', promotionController.validatePromotionSetup);

module.exports = router;
