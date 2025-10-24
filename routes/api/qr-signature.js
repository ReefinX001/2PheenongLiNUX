/**
 * QR Code Signature API Routes
 * สำหรับการเซ็นชื่อผ่าน QR Code บน iPad/Mobile Device
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const authJWT = require('../../middlewares/authJWT');
const { asyncHandler } = require('../../utils/error-handler');

// In-memory storage สำหรับ signature sessions (TTL: 5 นาที)
const signatureSessions = new Map();

// Auto-cleanup sessions ทุก 1 นาที
setInterval(() => {
  const now = Date.now();
  const expireTime = 5 * 60 * 1000; // 5 minutes

  for (const [sessionId, data] of signatureSessions.entries()) {
    if (now - data.createdAt > expireTime) {
      signatureSessions.delete(sessionId);
      console.log(`🧹 Cleaned up expired signature session: ${sessionId}`);
    }
  }
}, 60000);

/**
 * POST /api/qr-signature/create-session
 * สร้าง session สำหรับเซ็นชื่อผ่าน QR Code
 */
router.post('/create-session',
  authJWT,
  asyncHandler(async (req, res) => {
    const { receiptId, signatureType } = req.body;

    if (!receiptId || !signatureType) {
      return res.status(400).json({
        success: false,
        message: 'receiptId and signatureType are required'
      });
    }

    // สร้าง session ID ที่ไม่ซ้ำ
    const sessionId = crypto.randomBytes(16).toString('hex');

    // เก็บข้อมูล session
    signatureSessions.set(sessionId, {
      sessionId,
      receiptId,
      signatureType,
      userId: req.user._id,
      username: req.user.username,
      status: 'pending', // pending, signed, expired
      signatureData: null,
      createdAt: Date.now(),
      expiresAt: Date.now() + (5 * 60 * 1000) // 5 minutes
    });

    console.log(`✅ Created signature session: ${sessionId} for ${receiptId} (${signatureType})`);

    // สร้าง URL สำหรับ QR Code
    // ใช้ BASE_URL จาก env หรือ detect จาก request header
    let baseUrl = process.env.BASE_URL;

    if (!baseUrl) {
      // Try to get from request
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const host = req.headers['x-forwarded-host'] || req.headers.host || 'www.2pheenong.com';
      baseUrl = `${protocol}://${host}`;
    }

    const signatureUrl = `${baseUrl}/mobile-signature/${sessionId}`;

    console.log(`🔗 Generated signature URL: ${signatureUrl}`);

    res.status(200).json({
      success: true,
      message: 'Signature session created successfully',
      data: {
        sessionId,
        signatureUrl,
        receiptId,
        signatureType,
        expiresIn: 300 // seconds
      }
    });
  })
);

/**
 * GET /api/qr-signature/session/:sessionId
 * ดึงข้อมูล session
 */
router.get('/session/:sessionId',
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const session = signatureSessions.get(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found or expired'
      });
    }

    // ตรวจสอบว่า session หมดอายุหรือไม่
    if (Date.now() > session.expiresAt) {
      signatureSessions.delete(sessionId);
      return res.status(410).json({
        success: false,
        message: 'Session expired'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        sessionId: session.sessionId,
        receiptId: session.receiptId,
        signatureType: session.signatureType,
        status: session.status,
        expiresAt: session.expiresAt
      }
    });
  })
);

/**
 * POST /api/qr-signature/save/:sessionId
 * บันทึกลายเซ็นจาก mobile device
 */
router.post('/save/:sessionId',
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { signatureData } = req.body;

    if (!signatureData) {
      return res.status(400).json({
        success: false,
        message: 'signatureData is required'
      });
    }

    const session = signatureSessions.get(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found or expired'
      });
    }

    // ตรวจสอบว่า session หมดอายุหรือไม่
    if (Date.now() > session.expiresAt) {
      signatureSessions.delete(sessionId);
      return res.status(410).json({
        success: false,
        message: 'Session expired'
      });
    }

    // บันทึกลายเซ็น
    session.signatureData = signatureData;
    session.status = 'signed';
    session.signedAt = Date.now();

    console.log(`✅ Signature saved for session: ${sessionId}`);

    // แจ้งเตือนผ่าน Socket.IO (ถ้ามี)
    if (req.app.get('io')) {
      req.app.get('io').emit('signature-saved', {
        sessionId,
        receiptId: session.receiptId,
        signatureType: session.signatureType,
        signatureData: session.signatureData
      });
    }

    res.status(200).json({
      success: true,
      message: 'Signature saved successfully',
      data: {
        sessionId,
        status: 'signed'
      }
    });
  })
);

/**
 * GET /api/qr-signature/poll/:sessionId
 * Polling เพื่อตรวจสอบว่ามีลายเซ็นแล้วหรือไม่ (สำหรับคอมพิวเตอร์)
 */
router.get('/poll/:sessionId',
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const session = signatureSessions.get(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found or expired'
      });
    }

    // ตรวจสอบว่า session หมดอายุหรือไม่
    if (Date.now() > session.expiresAt) {
      signatureSessions.delete(sessionId);
      return res.status(410).json({
        success: false,
        message: 'Session expired'
      });
    }

    if (session.status === 'signed' && session.signatureData) {
      // ส่งลายเซ็นกลับ และลบ session
      const signatureData = session.signatureData;
      signatureSessions.delete(sessionId);

      return res.status(200).json({
        success: true,
        status: 'signed',
        data: {
          signatureData,
          receiptId: session.receiptId,
          signatureType: session.signatureType
        }
      });
    }

    res.status(200).json({
      success: true,
      status: session.status,
      data: {
        status: session.status,
        expiresAt: session.expiresAt
      }
    });
  })
);

/**
 * DELETE /api/qr-signature/cancel/:sessionId
 * ยกเลิก session
 */
router.delete('/cancel/:sessionId',
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const session = signatureSessions.get(sessionId);

    if (session) {
      signatureSessions.delete(sessionId);
      console.log(`❌ Cancelled signature session: ${sessionId}`);
    }

    res.status(200).json({
      success: true,
      message: 'Session cancelled'
    });
  })
);

module.exports = router;