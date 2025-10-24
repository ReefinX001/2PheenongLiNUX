// middlewares/autoApproval.js
// ระบบอนุมัติอัตโนมัติสำหรับการจัดการพนักงาน

/**
 * Middleware สำหรับการอนุมัติอัตโนมัติ (เวอร์ชันเรียบง่าย)
 * ใช้ virtual admin โดยไม่ต้อง authenticate
 */
const autoApproval = (req, res, next) => {
  console.log('🤖 Auto-approval system activated');

  // สร้าง virtual admin user สำหรับการอนุมัติอัตโนมัติ
  req.user = {
    _id: 'auto-approval-system',
    username: 'system-auto-approval',
    email: 'system@auto-approval.local',
    role: {
      name: 'admin',
      permissions: ['*'] // มีสิทธิ์ทุกอย่าง
    },
    isVirtual: true
  };
  req.userId = 'auto-approval-system';

  // เพิ่ม flag ให้รู้ว่าเป็นการอนุมัติอัตโนมัติ
  req.isAutoApproved = true;
  req.approvalReason = 'Auto-approved by system for employee management';

  console.log('✅ Auto-approval granted - no authentication required');
  next();
};

/**
 * Middleware สำหรับ logging การทำงานของระบบอนุมัติอัตโนมัติ
 */
const logAutoApproval = (req, res, next) => {
  if (req.isAutoApproved) {
    const originalSend = res.send;
    res.send = function(data) {
      console.log(`📝 Auto-approval log:`, {
        method: req.method,
        url: req.originalUrl,
        user: req.user.username,
        timestamp: new Date().toISOString(),
        success: res.statusCode < 400,
        reason: req.approvalReason
      });

      originalSend.call(this, data);
    };
  }
  next();
};

/**
 * ตรวจสอบว่าการทำงานนี้ได้รับการอนุมัติหรือไม่
 */
const verifyApproval = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'ไม่มีการอนุมัติการทำงาน กรุณาตรวจสอบระบบ',
      error: 'NO_APPROVAL'
    });
  }

  if (req.isAutoApproved) {
    console.log(`✅ Operation approved automatically for: ${req.user.username}`);
  } else {
    console.log(`✅ Operation approved manually for: ${req.user.username}`);
  }

  next();
};

module.exports = {
  autoApproval,
  logAutoApproval,
  verifyApproval
};
