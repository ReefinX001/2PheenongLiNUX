// routes/transfer.js

const express                 = require('express');
const router                  = express.Router();
const authJWT                 = require('../middlewares/authJWT');
const transferController      = require('../controllers/Transfer/transferController');
const stockTransferController = require('../controllers/stockTransferController');
const TransferSlipPdfController  = require('../controllers/TransferSlipPdfController');

// 1) สร้างรายการโอนใหม่ (POST /api/transfers)
router.post('/', authJWT, transferController.postTransfer);

// 2) ดึงประวัติการโอน (GET /api/transfers?page=&limit=&filter=&search=)
router.get('/', authJWT, transferController.getTransfers);

// 3) ดึงรายละเอียดการโอนตาม ID (GET /api/transfers/:id)
router.get('/:id', authJWT, transferController.getTransferById);

// 4) ฝ่ายสต๊อกอนุมัติ (POST /api/transfers/:id/approve-stock)
router.post('/:id/approve-stock', authJWT, transferController.approveStock);

// 5) ผู้จัดเตรียมเซ็น - เปลี่ยนสถานะเป็น in-transit (PUT /api/transfers/:id/prepare)
router.put('/:id/prepare', authJWT, transferController.prepareTransfer);

// 6) สาขาปลายทางรับสินค้า (PUT /api/transfers/:id/receive)
router.put('/:id/receive', authJWT, transferController.receiveTransfer);

// 7) ยกเลิกการโอน (PUT /api/transfers/:id/cancel)
router.put('/:id/cancel', authJWT, transferController.cancelTransfer);

// 8) ปฏิเสธการโอน (POST /api/transfers/:id/reject) - Legacy support
router.post('/:id/reject', authJWT, transferController.rejectTransfer);

// 7) ดาวน์โหลดหรือพิมพ์ใบโอน (GET /api/transfers/:id/pdf)
router.get('/:id/pdf', authJWT, TransferSlipPdfController.downloadTransferSlip);

// 7b) พิมพ์ใบโอน HTML (GET /api/transfers/:id/print)
router.get('/:id/print', authJWT, transferController.printTransfer);

// 8) บันทึกลายเซ็น (PUT /api/transfers/:id/signature)
router.put('/:id/signature', (req, res, next) => {
  console.log('🛣️ PUT /api/transfers/:id/signature route hit');
  console.log('🔍 Transfer ID:', req.params.id);
  console.log('📋 Body keys:', Object.keys(req.body));
  next();
}, authJWT, transferController.saveSignature);

// 8b) บันทึกลายเซ็น (POST /api/transfers/:id/signature) - Fallback
router.post('/:id/signature', (req, res, next) => {
  console.log('🛣️ POST /api/transfers/:id/signature route hit');
  console.log('🔍 Transfer ID:', req.params.id);
  console.log('📋 Body keys:', Object.keys(req.body));
  next();
}, authJWT, transferController.saveSignature);

module.exports = router;
