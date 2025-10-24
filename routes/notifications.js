const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/notificationController');
const auth    = require('../middlewares/authJWT');

router.use(auth);

// นับแจ้งเตือนยังไม่อ่านของตัวเอง (ต้องมาไวกว่า /:id)
router.get('/unread-count', ctrl.getUnreadCount);

// ถ้าเป็น HR (req.user.role==='admin') จะเห็นทุกคน ถ้าไม่ใช่ จะเห็นเฉพาะของตัวเอง
router.get('/',              ctrl.getAll);

// สร้างแจ้งเตือนใหม่
router.post('/',             ctrl.create);

// ทำเครื่องหมายอ่านแล้ว (PATCH ให้แก้เฉพาะฟิลด์)
router.patch('/:id/read',    ctrl.markAsRead);

// อัปเดตเฉพาะฟิลด์ที่อนุญาต (message, isRead, meta)
router.patch('/:id',         ctrl.update);

// ลบแจ้งเตือน
router.delete('/:id',        ctrl.remove);

module.exports = router;
