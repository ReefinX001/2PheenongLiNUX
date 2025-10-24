/**
 * routes/pointsRoutes.js - API Routes สำหรับระบบสะสมแต้ม
 */

const express = require('express');
const router = express.Router();
const PointsController = require('../controllers/Points/PointsController');

// Middleware สำหรับ authentication (ใช้ optionalAuth สำหรับการทดสอบ)
const { optionalAuth, authMiddleware } = require('../middleware/auth');

/**
 * สมาชิก (Members)
 */

// POST /api/points/members - สร้างสมาชิกใหม่
router.post('/members', optionalAuth, PointsController.createMember);

// GET /api/points/members/search - ค้นหาสมาชิก
router.get('/members/search', optionalAuth, PointsController.findMember);

// GET /api/points/members/:id - ดูข้อมูลสมาชิก
router.get('/members/:id', optionalAuth, PointsController.getMemberDetails);

/**
 * การทำรายการ (Transactions)
 */

// POST /api/points/purchase - บันทึกการซื้อและให้แต้ม
router.post('/purchase', optionalAuth, PointsController.recordPurchase);

// POST /api/points/redeem - ใช้แต้มแลกส่วนลด
router.post('/redeem', optionalAuth, PointsController.redeemPoints);

/**
 * การตั้งค่า (Settings)
 */

// GET /api/points/settings - ดึงการตั้งค่าระบบ
router.get('/settings', optionalAuth, PointsController.getSettings);

// PUT /api/points/settings - อัปเดตการตั้งค่าระบบ (ต้อง login)
router.put('/settings', authMiddleware, PointsController.updateSettings);

/**
 * รายงานและสถิติ (Reports & Statistics)
 */

// GET /api/points/statistics - สถิติระบบสะสมแต้ม
router.get('/statistics', optionalAuth, PointsController.getStatistics);

/**
 * API สำหรับ POS System Integration
 */

// POST /api/points/pos/scan - สแกนหาสมาชิกจากบาร์โค้ดหรือ QR Code
router.post('/pos/scan', optionalAuth, async (req, res) => {
  try {
    const { scanData } = req.body;

    if (!scanData) {
      return res.status(400).json({
        success: false,
        message: 'ไม่พบข้อมูลการสแกน'
      });
    }

    // ลองหาสมาชิกจากรหัสที่สแกน
    const Member = require('../models/Points/Member');

    let member = await Member.findByMemberCode(scanData);
    if (!member) {
      member = await Member.findByPhone(scanData);
    }

    if (!member) {
      return res.json({
        success: false,
        message: 'ไม่พบสมาชิกจากข้อมูลที่สแกน'
      });
    }

    res.json({
      success: true,
      data: {
        member: {
          id: member._id,
          memberCode: member.memberCode,
          name: member.fullName,
          phone: member.personalInfo.phone,
          points: member.points.current,
          memberLevel: member.memberLevel
        }
      }
    });

  } catch (error) {
    console.error('❌ POS scan error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสแกน',
      error: error.message
    });
  }
});

// GET /api/points/pos/calculate - คำนวณแต้มที่จะได้รับ
router.get('/pos/calculate', optionalAuth, async (req, res) => {
  try {
    const { purchaseType, amount, hasBoxSet } = req.query;

    if (!purchaseType || !amount) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุประเภทการซื้อและยอดเงิน'
      });
    }

    const PointsSettings = require('../models/Points/PointsSettings');
    const settings = await PointsSettings.getSettings();

    const earnedPoints = settings.calculateEarnedPoints(
      purchaseType,
      parseFloat(amount),
      hasBoxSet === 'true'
    );

    res.json({
      success: true,
      data: {
        earnedPoints,
        purchaseType,
        amount: parseFloat(amount),
        hasBoxSet: hasBoxSet === 'true'
      }
    });

  } catch (error) {
    console.error('❌ Calculate points error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการคำนวณแต้ม',
      error: error.message
    });
  }
});

// GET /api/points/pos/redeem-info - ข้อมูลการใช้แต้ม
router.get('/pos/redeem-info', optionalAuth, async (req, res) => {
  try {
    const { memberId, purchaseAmount } = req.query;

    if (!memberId || !purchaseAmount) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุรหัสสมาชิกและยอดซื้อ'
      });
    }

    const Member = require('../models/Points/Member');
    const PointsSettings = require('../models/Points/PointsSettings');

    const [member, settings] = await Promise.all([
      Member.findById(memberId),
      PointsSettings.getSettings()
    ]);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบสมาชิก'
      });
    }

    const amount = parseFloat(purchaseAmount);
    const maxRedeemablePoints = settings.getMaxRedeemablePoints(amount);
    const availablePoints = Math.min(member.points.current, maxRedeemablePoints);

    res.json({
      success: true,
      data: {
        memberPoints: member.points.current,
        maxRedeemablePoints,
        availablePoints,
        redemptionRate: settings.redemption.rate,
        minPurchaseAmount: settings.redemption.minPurchaseAmount,
        canRedeem: amount >= settings.redemption.minPurchaseAmount && availablePoints > 0
      }
    });

  } catch (error) {
    console.error('❌ Get redeem info error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการใช้แต้ม',
      error: error.message
    });
  }
});

/**
 * Health Check
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Points System API is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
