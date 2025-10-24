const express = require('express');
const router = express.Router();
const boxsetController = require('../../controllers/POS/boxsetController');

// ==================== BOXSET ROUTES ====================

/**
 * สร้าง Boxset ใหม่
 * POST /api/boxset
 */
router.post('/', boxsetController.createBoxset);

/**
 * ดึงข้อมูล Boxset ทั้งหมดของสาขา
 * GET /api/boxset?branchCode=xxx&status=active
 */
router.get('/', boxsetController.getBoxsets);

/**
 * ดึงข้อมูล Boxset ในรูปแบบที่ใช้กับ POS
 * GET /api/boxset/stock-format?branchCode=xxx&purchaseType=cash,installment
 */
router.get('/stock-format', boxsetController.getBoxsetsForPOS);

/**
 * ค้นหา Boxset
 * GET /api/boxset/search?branchCode=xxx&q=yyy&purchaseType=cash
 */
router.get('/search', boxsetController.searchBoxsets);

/**
 * ตรวจสอบความพร้อมของสินค้าใน Boxset
 * POST /api/boxset/check-availability
 */
router.post('/check-availability', boxsetController.checkBoxsetAvailability);

/**
 * ดึงข้อมูล Boxset ตาม ID
 * GET /api/boxset/:id
 */
router.get('/:id', boxsetController.getBoxsetById);

/**
 * อัพเดต Boxset
 * PUT /api/boxset/:id
 */
router.put('/:id', boxsetController.updateBoxset);

/**
 * ลบ Boxset (Soft Delete)
 * DELETE /api/boxset/:id
 */
router.delete('/:id', boxsetController.deleteBoxset);

/**
 * อัพเดตสต็อก Boxset
 * PATCH /api/boxset/:id/stock
 */
router.patch('/:id/stock', boxsetController.updateBoxsetStock);

module.exports = router;