// File: routes/installmentRoutes.js

const express = require('express');
const path    = require('path');
const multer  = require('multer');

const router                   = express.Router();
const authJWT                  = require('../../middlewares/authJWT');
const installmentController    = require('../../controllers/installmentController');
const dashboardController      = require('../../controllers/dashboardController');
const notificationController   = require('../../controllers/notificationController');
const customerController       = require('../../controllers/Customers/customerController');
const userController           = require('../../controllers/userController');
const authController           = require('../../controllers/authController');
const InstallmentPdfController = require('../../controllers/InstallmentPdfController');
const Order                    = require('../../models/POS/Order');

// ── Multer config for slip upload ─────────────────────
const slipStorage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/slips'));
  },
  filename(req, file, cb) {
    const ext  = path.extname(file.originalname);
    const name = `${req.params.paymentId}-${Date.now()}${ext}`;
    cb(null, name);
  }
});
const slipUpload = multer({
  storage: slipStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const allowed = /png|jpe?g|pdf/;
    if (!allowed.test(path.extname(file.originalname).toLowerCase())) {
      return cb(new Error('ไฟล์ต้องเป็น PNG, JPG หรือ PDF'));
    }
    cb(null, true);
  }
});

// —————————————— Installment APIs ——————————————
router.post(
  '/log-follow-up',
  authJWT,
  (req, res, next) => installmentController.logFollowUp(req, res, next)
);

router.get(
  '/level1',
  authJWT,
  (req, res, next) => installmentController.getLevel1(req, res, next)
);
router.get(
  '/level2',
  authJWT,
  (req, res, next) => installmentController.getLevel2(req, res, next)
);

router.post(
  '/',
  authJWT,
  (req, res, next) => installmentController.createInstallment(req, res, next)
);
router.post(
  '/createInstallment',
  authJWT,
  (req, res, next) => installmentController.createInstallment(req, res, next)
);

router.get(
  '/search-by-taxid',
  authJWT,
  (req, res, next) => installmentController.searchInstallmentByTaxId(req, res, next)
);
router.post(
  '/pay',
  authJWT,
  (req, res, next) => installmentController.payInstallment(req, res, next)
);
router.get(
  '/:id/receipt',
  authJWT,
  (req, res, next) => installmentController.getInstallmentReceiptById(req, res, next)
);
router.get(
  '/history',
  authJWT,
  (req, res, next) => installmentController.getInstallmentHistory(req, res, next)
);
router.get(
  '/history-receipt-image',
  authJWT,
  (req, res, next) => installmentController.getHistoryReceiptImage(req, res, next)
);

// —————————————— Dashboard APIs ——————————————
router.get(
  '/dashboard/summary',
  authJWT,
  (req, res, next) => dashboardController.getSummary(req, res, next)
);
router.get(
  '/dashboard/trends',
  authJWT,
  (req, res, next) => dashboardController.getTrends(req, res, next)
);
router.get(
  '/dashboard/status-distribution',
  authJWT,
  (req, res, next) => dashboardController.getStatusDistribution(req, res, next)
);
router.get(
  '/dashboard/proportions',
  authJWT,
  (req, res, next) => dashboardController.getProportions(req, res, next)
);
router.get(
  '/dashboard/recent-loans',
  authJWT,
  (req, res, next) => dashboardController.getRecentLoans(req, res, next)
);

// —————————————— Customer & Auth APIs ——————————————
// ❌ ลบ route นี้ออก เพราะไม่ต้องใช้แล้ว
// router.post(
//   '/customer',
//   authJWT,
//   (req, res, next) => installmentController.createInstallmentCustomer(req, res, next)
// );

// ✅ ใช้ customerController แทน
router.get(
  '/customers',
  authJWT,
  (req, res, next) => customerController.getAllCustomers(req, res, next)
);

router.get(
  '/user/profile',
  authJWT,
  (req, res, next) => userController.getProfile(req, res, next)
);
router.post(
  '/auth/logout',
  authJWT,
  (req, res, next) => authController.logout(req, res, next)
);

// —————————————— Notification APIs ——————————————
router.get(
  '/notifications/unread-count',
  authJWT,
  (req, res, next) => notificationController.getUnreadCount(req, res, next)
);

// —————————————— Slip Upload ——————————————
router.post(
  '/customers/:id/installments/:paymentId/slip',
  authJWT,
  slipUpload.single('fileSlip'),
  (req, res, next) => installmentController.uploadPaymentSlip(req, res, next)
);

// —————————————— Customer Detail ——————————————
router.get(
  '/customers/:id',
  authJWT,
  (req, res, next) => installmentController.getCustomerDetail(req, res, next)
);

// —————————————— Quotation PDF ——————————————
router.get(
  '/:id/pdf',
  authJWT,
  async (req, res, next) => {
    try {
      const order = await Order.findById(req.params.id).lean();
      const { buffer, fileName } = await InstallmentPdfController.createQuotationPdf(order);
      res
        .set('Content-Type', 'application/pdf')
        .set('Content-Disposition', `inline; filename="${fileName}"`)
        .send(buffer);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

module.exports = router;
