// routes/transfer.js

const express                 = require('express');
const router                  = express.Router();
const authJWT                 = require('../../middlewares/authJWT');
const transferController      = require('../../controllers/Transfer/transferController');
const stockTransferController = require('../../controllers/stockTransferController');

// 1) สร้างรายการโอนใหม่ (POST /api/transfers)
router.post('/', authJWT, transferController.postTransfer);

// 2) ดึงประวัติการโอน (GET /api/transfers?page=&limit=&filter=&search=)
router.get('/', authJWT, transferController.getTransfers);

// 3) ดึงรายละเอียดการโอนตาม ID (GET /api/transfers/:id)
router.get('/:id', authJWT, transferController.getTransferById);

// 4) ฝ่ายสต๊อกอนุมัติ (POST /api/transfers/:id/approve-stock)
router.post('/:id/approve-stock', authJWT, transferController.approveStock);

// 5) สาขาปลายทางรับสินค้า (PUT /api/transfers/:id/receive)
router.put('/:id/receive', authJWT, transferController.receiveTransfer);

// 6) ปฏิเสธการโอน (POST /api/transfers/:id/reject)
router.post('/:id/reject', authJWT, transferController.rejectTransfer);

// 7) ดาวน์โหลดใบโอน (PDF A4) (GET /api/transfers/:id/print)
router.get('/:id/print', authJWT, stockTransferController.printTransferSlip);

module.exports = router;
