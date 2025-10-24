// File: routes/leaveRoutes.js
const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leaveController');

// Middlewares สำหรับตรวจสอบ JWT และสิทธิ์ (ถ้าต้องการ)
const authJWT = require('../middlewares/authJWT');
const hasPermission = require('../middlewares/permission');

// **New** อนุญาตคำขอเฉพาะของตัวเอง (ไม่ต้อง hasPermission)
router.get(
  '/me',
  authJWT,
  leaveController.getUserLeaves
);

// ดึงรายการคำขอลาทั้งหมด (ต้องมีสิทธิ์ view_leaves สมมติ)
router.get('/',
  authJWT,
  hasPermission('view_leaves'),
  leaveController.getAllLeaves
);

// บันทึกคำขอลาใหม่ (ต้องมีสิทธิ์ create_leaves สมมติ)
router.post('/',
  authJWT,
  hasPermission('create_leaves'),
  leaveController.createLeave
);

// **New** อนุมัติคำขอลา (ต้องมีสิทธิ์ update_leaves สมมติ)
router.put('/:id/approve',
  authJWT,
  hasPermission('update_leaves'),
  leaveController.approveLeave
);

// **New** ปฏิเสธคำขอลา (ต้องมีสิทธิ์ update_leaves สมมติ)
router.put('/:id/reject',
  authJWT,
  hasPermission('update_leaves'),
  leaveController.rejectLeave
);

// **New** ยกเลิกคำขอลา (เฉพาะเจ้าของเอง)
router.put('/:id/cancel',
  authJWT,
  leaveController.cancelLeave
);

// อัปเดตสถานะหรือข้อมูลอื่นๆของคำขอลา (แก้ไขด้วย PUT)
router.put('/:id',
  authJWT,
  hasPermission('update_leaves'),
  leaveController.updateLeaveStatus
);

// ลบคำขอลา (ต้องมีสิทธิ์ delete_leaves สมมติ)
router.delete('/:id',
  authJWT,
  hasPermission('delete_leaves'),
  leaveController.deleteLeave
);

module.exports = router;
