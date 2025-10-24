// File: routes/purchaseOrderRoutes.js
const express = require('express');
const router = express.Router();
const poController = require('../../controllers/procurement/purchaseOrderController');
const PDFoController = require('../../controllers/PDFPurchaseOrderController');
const auth = require('../../middlewares/authJWT');
const upload = require('../../middlewares/productImageUpload');

// Routes ที่ไม่ต้องการ authentication
router.get('/pdf/:id', PDFoController.generatePDF);

/**
 * GET /api/purchase_order/approval/:id
 * แสดงหน้าอนุมัติ PO
 */
router.get('/approval/:id', poController.showApprovalPage);

/**
 * POST /api/purchase_order
 * สร้างใบสั่งซื้อ (PO) ใหม่
 */
router.post('/', poController.createPO);

/**
 * GET /api/purchase_order
 * ดึง PO ทั้งหมด (หรือกรองตาม branch_id ผ่าน ?branch_id=xxx)
 */
router.get('/', poController.getAllPO);

/**
 * GET /api/purchase_order/history
 * ดึง PO เฉพาะที่มีสถานะ Approved หรือ Rejected
 * และถ้าใส่ query ?date=YYYY-MM-DD จะกรอง docDate เฉพาะวันนั้น
 */
router.get('/history', poController.getHistoryPO);

/**
 * GET /api/purchase_order/:id
 * ดึง PO ตาม _id
 */
router.get('/:id', poController.getPOById);

/**
 * PATCH /api/purchase_order/:id
 * แก้ไข PO ทั้งชุด (เช่น items ทั้งก้อน)
 */
router.patch('/:id', poController.updatePO);

/**
 * DELETE /api/purchase_order/:id
 * ลบ PO จริงออกจาก DB
 */
router.delete('/:id', poController.deletePO);

/**
 * PATCH /api/purchase_order/:poId/items/:itemIndex
 * แก้ไขข้อมูลของ item เดียวใน PO ตาม index
 * - รองรับการอัปโหลดรูป (ถ้ามี) ผ่าน field "image"
 */
router.patch(
  '/:poId/items/:itemIndex',
  (req, res, next) => {
    // เรียกใช้ multer.single('image') + handle error ขนาดไฟล์
    upload.single('image')(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: 'ไฟล์ใหญ่เกินกำหนด (50MB)'
          });
        }
        return res.status(400).json({ success: false, error: err.message });
      }
      // ถ้าไม่มี error -> ไปต่อ
      next();
    });
  },
  poController.updatePOItem
);

/**
 * PATCH /api/purchase_order/approve/:poId
 * อนุมัติ PO และสร้าง Document number อัตโนมัติ (ถ้ายังไม่มี)
 */
router.patch('/approve/:poId', poController.approvePO);

/**
 * PATCH /api/purchase_order/reject/:poId
 * ไม่อนุมัติ PO
 */
router.patch('/reject/:poId', poController.rejectPO);

// Routes ที่ต้องการ authentication
router.use(auth);

module.exports = router;
