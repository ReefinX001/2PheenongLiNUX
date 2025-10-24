const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');

// Middleware สำหรับ authentication (ปรับตามระบบของคุณ)
const authenticateToken = (req, res, next) => {
  // Skip authentication for development - remove this in production
  if (process.env.NODE_ENV === 'development') {
    req.user = {
      id: 'demo-user',
      name: 'พนักงานทดสอบ',
      branch: 'PATTANI',
      role: 'staff'
    }; // Mock user for development
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'ไม่พบ token การยืนยันตัวตน'
    });
  }

  // TODO: Verify JWT token here
  // สำหรับตอนนี้ให้ผ่านไปก่อน
  req.user = { id: 'demo-user' }; // Mock user
  next();
};

// Middleware สำหรับ rate limiting (ป้องกันการส่งอีเมลเกินขีดจำกัด)
const rateLimitEmail = (req, res, next) => {
  // TODO: Implement rate limiting logic
  // สำหรับตอนนี้ให้ผ่านไปก่อน
  next();
};

// ===================== EMAIL API ROUTES =====================

/**
 * POST /api/email/send-installment-documents
 * ส่งอีเมลเอกสารผ่อนชำระ
 */
router.post('/send-installment-documents',
  authenticateToken,
  rateLimitEmail,
  emailController.sendInstallmentDocuments
);

/**
 * POST /api/email/send-installment
 * ส่งอีเมลผ่อนชำระ (alias สำหรับ frontend ใหม่)
 */
router.post('/send-installment',
  authenticateToken,
  rateLimitEmail,
  emailController.sendInstallmentDocuments
);

/**
 * POST /api/email/send-receipt
 * ส่งอีเมลใบเสร็จจากระบบ POS
 */
router.post('/send-receipt',
  authenticateToken,
  rateLimitEmail,
  emailController.sendReceiptEmail
);

/**
 * POST /api/email/test-connection
 * ทดสอบการเชื่อมต่ออีเมล (สำหรับ frontend ใหม่)
 */
router.post('/test-connection',
  authenticateToken,
  rateLimitEmail,
  emailController.testConnection
);

/**
 * POST /api/email/send-document
 * ส่งเอกสารผ่าน Gmail (สำหรับ frontend ใหม่)
 */
router.post('/send-document',
  authenticateToken,
  rateLimitEmail,
  emailController.sendDocument
);

/**
 * POST /api/email/test-send
 * ทดสอบส่งอีเมล
 */
router.post('/test-send',
  authenticateToken,
  rateLimitEmail,
  emailController.sendTestEmail
);

/**
 * GET /api/email/status
 * ตรวจสอบสถานะการเชื่อมต่ออีเมล
 */
router.get('/status',
  authenticateToken,
  emailController.checkEmailStatus
);

/**
 * POST /api/email/preview
 * ดูตัวอย่างอีเมลก่อนส่ง
 */
router.post('/preview',
  authenticateToken,
  emailController.previewEmail
);

/**
 * GET /api/email/stats
 * ดูสถิติการส่งอีเมล
 */
router.get('/stats',
  authenticateToken,
  emailController.getEmailStats
);

/**
 * PUT /api/email/settings
 * อัพเดทการตั้งค่าอีเมล
 */
router.put('/settings',
  authenticateToken,
  emailController.updateEmailSettings
);

// ===================== HELPER ROUTES =====================

/**
 * GET /api/email/health
 * ตรวจสอบสุขภาพของ Email Service (ไม่ต้อง auth)
 */
router.get('/health', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Email service is running',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Email service health check failed',
      error: error.message
    });
  }
});

/**
 * GET /api/email/config
 * ดูการกำหนดค่าอีเมลพื้นฐาน (ไม่แสดงข้อมูลลับ)
 */
router.get('/config', authenticateToken, (req, res) => {
  try {
    const config = {
      serviceEnabled: !!process.env.GMAIL_USER,
      smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
      smtpPort: process.env.SMTP_PORT || 587,
      fromEmail: process.env.GMAIL_USER || 'not-configured',
      companyName: process.env.COMPANY_NAME || 'ระบบผ่อนชำระ',
      companyPhone: process.env.COMPANY_PHONE || 'ไม่ระบุ',
      features: {
        gmailApi: !!process.env.GMAIL_CLIENT_ID,
        smtpFallback: !!process.env.SMTP_USER,
        attachments: true,
        preview: true,
        testEmail: true
      }
    };

    res.json({
      success: true,
      message: 'ดึงการกำหนดค่าสำเร็จ',
      data: config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'ดึงการกำหนดค่าไม่สำเร็จ',
      error: error.message
    });
  }
});

// ===================== ERROR HANDLING =====================

// Handle 404 for email routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'ไม่พบ API endpoint ที่ต้องการ',
    path: req.originalUrl,
    method: req.method
  });
});

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Email Routes Error:', error);

  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'เกิดข้อผิดพลาดในระบบอีเมล',
    error: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
});

module.exports = router;