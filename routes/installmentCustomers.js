// File: routes/installmentCustomers.js

const express       = require('express');
const router        = express.Router();
const multer        = require('multer');

const authJWT               = require('../middlewares/authJWT');
const installmentController = require('../controllers/installmentController');
const InstallmentCustomer   = require('../models/Installment/InstallmentCustomer');
const paymentCtrl = require('../controllers/installmentPaymentController');
const UnifiedCustomerController = require('../controllers/unifiedCustomerController');

// ตั้งค่า Multer สำหรับอัปโหลดสลิปการชำระเงิน
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/slips'),
  filename:    (req, file, cb) => {
    const ext = file.originalname.split('.').pop();
    cb(null, `slip_${req.params.id}_${Date.now()}.${ext}`);
  }
});
const upload = multer({
  storage,
  limits:     { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/png','image/jpeg','application/pdf'];
    cb(null, allowed.includes(file.mimetype));
  }
});

/**
 * แปลงชื่อไฟล์ใน DB ให้เป็น URL เต็ม
 */
function withImageUrls(req, customer) {
  const base = `${req.protocol}://${req.get('host')}`;
  const imgs = [
    'idCardImage',
    'incomeSlip',
    'selfieImage',
    'customerSignature',
    'employeeSignature',
    'authorizedSignature'
  ];

  imgs.forEach(key => {
    const val = customer[key];
    if (!val) return;
    if (val.startsWith('http://') || val.startsWith('https://')) {
      customer[key] = val;
    } else {
      const parts = val.split('/uploads/');
      const rel   = parts[parts.length - 1].replace(/^\/+/, '');
      customer[key] = `${base}/uploads/${rel}`;
    }
  });

  return customer;
}

/**
 * GET /api/installment/customers
 * ดึงรายชื่อลูกค้า (รองรับค้นหา) พร้อม URL รูปภาพ
 */
router.get('/', authJWT, async (req, res) => {
  try {
    const { search } = req.query;
    const query = {};
    if (search) {
      const re = new RegExp(search.trim(), 'i');
      query.$or = [
        { first_name: re },
        { last_name:  re },
        { phone_number: re },
        { tax_id: re }
      ];
    }

    let data = await InstallmentCustomer
      .find(query)
      .select('-__v')
      .sort({ createdAt: -1 })
      .lean();

    data = data.map(c => withImageUrls(req, c));
    res.json({ success: true, data });
  } catch (err) {
    console.error('List customers error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/installment/customers/:id
 * ดูรายละเอียดลูกค้า พร้อม populate และเปลี่ยน installmentOrder ให้เป็น array
 */
router.get('/:id', authJWT, async (req, res) => {
  try {
    let cust = await InstallmentCustomer
      .findById(req.params.id)
      .select('-__v')
      .populate('salesperson', 'name imageUrl')
      .populate('installmentOrder')
      .lean();

    if (!cust) return res.status(404).json({ success: false, message: 'Customer not found' });

    cust = withImageUrls(req, cust);
    cust.installmentOrders = cust.installmentOrder
      ? (Array.isArray(cust.installmentOrder)
         ? cust.installmentOrder
         : [cust.installmentOrder])
      : [];

    res.json({ success: true, data: cust });
  } catch (err) {
    console.error('Get customer error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});



/**
 * DELETE /api/installment/customers/:id
 * ลบลูกค้าตาม ID
 */
router.delete('/:id', authJWT, async (req, res) => {
  try {
    const result = await InstallmentCustomer.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    console.error('Delete customer error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});



/**
 * POST /api/installment/customers/:id/installments/pay
 * บันทึกการชำระงวดใหม่
 */
router.post(
  '/:id/installments/pay',
  authJWT,
  installmentController.recordPayment    // ← ใช้เมธอด recordPayment ที่มีอยู่จริง
);

/**
 * POST /api/installment/customers/:id/installments/:paymentId/slip
 * อัปโหลดสลิปการชำระงวด
 */
router.post(
  '/:id/installments/:paymentId/slip',
  authJWT,
  upload.single('fileSlip'),
  installmentController.uploadPaymentSlip  // ← ตรวจสอบว่ามีเมธอดนี้ใน controller
);

router.get(
  '/:id/installments/history',
  authJWT,                         // ถ้ามี JWT middleware
  paymentCtrl.getInstallmentHistory
);

/**
 * GET /api/installment/customers/:id/complete-profile
 * รับข้อมูลลูกค้าแบบครบถ้วนรวมทุกระบบ
 */
router.get(
  '/:id/complete-profile',
  authJWT,
  UnifiedCustomerController.getCustomerCompleteProfile
);

/**
 * GET /api/installment/customers/:id/bad-debt-analysis
 * วิเคราะห์หนี้สงสัยของลูกค้า
 */
router.get(
  '/:id/bad-debt-analysis',
  authJWT,
  UnifiedCustomerController.getCustomerBadDebtAnalysis
);

/**
 * GET /api/installment/customers/:id/cost-analysis
 * วิเคราะห์ต้นทุนที่เกี่ยวข้องกับลูกค้า
 */
router.get(
  '/:id/cost-analysis',
  authJWT,
  UnifiedCustomerController.getCustomerCostAnalysis
);

module.exports = router;
