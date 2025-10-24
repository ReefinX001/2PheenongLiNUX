const express = require('express');
const router = express.Router();
const payoffApprovalController = require('../controllers/payoffApprovalController');
const authJWT = require('../middlewares/authJWT');
const hasPermission = require('../middlewares/hasPermission');

// สร้างคำขออนุมัติ (พนักงานทุกคนสามารถส่งคำขอได้)
router.post('/request',
  authJWT,
  payoffApprovalController.createApprovalRequest
);

// อนุมัติคำขอ (เฉพาะ Manager/Admin)
router.put('/approve/:approvalId',
  authJWT,
  hasPermission(['manager', 'admin']),
  payoffApprovalController.approveRequest
);

// ปฏิเสธคำขอ (เฉพาะ Manager/Admin)
router.put('/reject/:approvalId',
  authJWT,
  hasPermission(['manager', 'admin']),
  payoffApprovalController.rejectRequest
);

// ดึงรายการคำขออนุมัติ (ทุกคนสามารถดูได้)
router.get('/list',
  authJWT,
  payoffApprovalController.getApprovalRequests
);

// ดึงข้อมูลคำขออนุมัติตาม ID
router.get('/:approvalId',
  authJWT,
  payoffApprovalController.getApprovalById
);

// ดึงข้อมูลคำขออนุมัติตามหมายเลขสัญญา
router.get('/contract/:contractNo',
  authJWT,
  payoffApprovalController.getApprovalByContractNo
);

module.exports = router;
