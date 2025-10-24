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

// เพิ่ม alias สำหรับ stats
router.get('/stats', async (req, res) => {
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

// ===== NEW ADVANCED ROUTES =====

// Analytics & Reports
router.get('/analytics', async (req, res) => {
  try {
    return promotionController.getPromotionAnalytics(req, res);
  } catch (err) {
    res.status(500).json({
      status: 'fail',
      message: err.message
    });
  }
});

// ROI Calculator
router.get('/:id/roi', async (req, res) => {
  try {
    return promotionController.calculateROI(req, res);
  } catch (err) {
    res.status(500).json({
      status: 'fail',
      message: err.message
    });
  }
});

// Schedule Management
router.post('/:id/schedule', async (req, res) => {
  try {
    req.body.promotionId = req.params.id;
    return promotionController.schedulePromotion(req, res);
  } catch (err) {
    res.status(500).json({
      status: 'fail',
      message: err.message
    });
  }
});

// Templates
router.get('/templates', async (req, res) => {
  try {
    return promotionController.getPromotionTemplates(req, res);
  } catch (err) {
    res.status(500).json({
      status: 'fail',
      message: err.message
    });
  }
});

// A/B Testing
router.post('/ab-test', async (req, res) => {
  try {
    return promotionController.createABTest(req, res);
  } catch (err) {
    res.status(500).json({
      status: 'fail',
      message: err.message
    });
  }
});

// Notifications
router.get('/notifications', async (req, res) => {
  try {
    // Call controller with proper error handling
    await promotionController.getNotifications(req, res);
  } catch (err) {
    console.error('Notifications route error:', err);
    // Return empty state on any error to prevent frontend crashes
    res.json({
      status: 'success',
      data: {
        notifications: [],
        summary: {
          expiringSoon: 0,
          highUsage: 0,
          lowPerformance: 0,
          total: 0
        },
        error: `เกิดข้อผิดพลาด: ${err.message}`
      }
    });
  }
});

// Bulk Operations (Enhanced)
router.post('/bulk-operations', async (req, res) => {
  try {
    const { action, promotionIds, data } = req.body;

    switch (action) {
      case 'activate':
        const activateResult = await Promotion.updateMany(
          { _id: { $in: promotionIds } },
          { isActive: true, updatedAt: new Date() }
        );
        res.json({
          status: 'success',
          message: `เปิดใช้งานโปรโมชั่น ${activateResult.modifiedCount} รายการ`,
          modifiedCount: activateResult.modifiedCount
        });
        break;

      case 'deactivate':
        const deactivateResult = await Promotion.updateMany(
          { _id: { $in: promotionIds } },
          { isActive: false, updatedAt: new Date() }
        );
        res.json({
          status: 'success',
          message: `ปิดใช้งานโปรโมชั่น ${deactivateResult.modifiedCount} รายการ`,
          modifiedCount: deactivateResult.modifiedCount
        });
        break;

      case 'delete':
        const deleteResult = await Promotion.deleteMany(
          { _id: { $in: promotionIds } }
        );
        res.json({
          status: 'success',
          message: `ลบโปรโมชั่น ${deleteResult.deletedCount} รายการ`,
          deletedCount: deleteResult.deletedCount
        });
        break;

      case 'extend':
        if (!data.extendDays) {
          return res.status(400).json({
            status: 'fail',
            message: 'กรุณาระบุจำนวนวันที่ต้องการขยาย'
          });
        }

        const extendResult = await Promotion.updateMany(
          { _id: { $in: promotionIds } },
          {
            $inc: {
              endDate: data.extendDays * 24 * 60 * 60 * 1000
            },
            updatedAt: new Date()
          }
        );
        res.json({
          status: 'success',
          message: `ขยายระยะเวลาโปรโมชั่น ${extendResult.modifiedCount} รายการ`,
          modifiedCount: extendResult.modifiedCount
        });
        break;

      default:
        res.status(400).json({
          status: 'fail',
          message: 'รูปแบบการดำเนินการไม่ถูกต้อง'
        });
    }

  } catch (err) {
    res.status(500).json({
      status: 'fail',
      message: err.message
    });
  }
});

module.exports = router;
