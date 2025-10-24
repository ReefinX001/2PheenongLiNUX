// routes/POS/paymentVoucherRoutes.js
const express = require('express');
const router = express.Router();
const paymentVoucherController = require('../../controllers/POS/paymentVoucherController');
const authenticateToken = require('../../middlewares/authJWT');
const hasPermission = require('../../middlewares/permission');

// Apply authentication to all routes
router.use(authenticateToken);

// GET /api/pos/payment-vouchers - Get all payment vouchers
router.get('/',
  hasPermission('pos:read'),
  paymentVoucherController.getAllVouchers
);

// GET /api/pos/payment-vouchers/products - Get products for voucher
router.get('/products',
  hasPermission('pos:read'),
  paymentVoucherController.getProducts
);

// GET /api/pos/payment-vouchers/:id - Get voucher by ID
router.get('/:id',
  hasPermission('pos:read'),
  paymentVoucherController.getVoucherById
);

// POST /api/pos/payment-vouchers - Create new voucher
router.post('/',
  hasPermission('pos:create'),
  paymentVoucherController.createVoucher
);

// PUT /api/pos/payment-vouchers/:id - Update voucher
router.put('/:id',
  hasPermission('pos:update'),
  paymentVoucherController.updateVoucher
);

// PATCH /api/pos/payment-vouchers/:id/approve - Approve voucher
router.patch('/:id/approve',
  hasPermission('pos:approve'),
  paymentVoucherController.approveVoucher
);

// PATCH /api/pos/payment-vouchers/:id/pay - Mark as paid
router.patch('/:id/pay',
  hasPermission('pos:pay'),
  paymentVoucherController.markAsPaid
);

// PATCH /api/pos/payment-vouchers/:id/cancel - Cancel voucher
router.patch('/:id/cancel',
  hasPermission('pos:update'),
  paymentVoucherController.cancelVoucher
);

// DELETE /api/pos/payment-vouchers/:id - Delete voucher
router.delete('/:id',
  hasPermission('pos:delete'),
  paymentVoucherController.deleteVoucher
);

module.exports = router;
