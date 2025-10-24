/**
 * routes/installmentPaymentRoutes.js - Routes สำหรับการชำระค่างวดผ่อน
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const InstallmentPaymentController = require('../controllers/Installment/InstallmentPaymentController');
const authMiddleware = require('../middlewares/authMiddleware');

// Multer configuration for slip uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images only
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น'));
    }
  }
});

// Routes

/**
 * GET /api/installment-orders
 * ดึงรายการสัญญาผ่อนทั้งหมด (สำหรับหน้า payment_installments_Pattani.html)
 */
router.get('/orders', authMiddleware, async (req, res) => {
  try {
    console.log('📥 GET /api/installment-payment/orders called');
    console.log('📋 Query params:', req.query);
    console.log('👤 User info:', req.user);

    const { page = 1, limit = 20, branchCode, status, search } = req.query;

    const InstallmentOrder = require('../models/Installment/InstallmentOrder');

    // สร้าง query
    let query = {};
    let andConditions = [];

    if (branchCode) {
      // ลองหาทั้ง branchCode และ branch_code
      andConditions.push({
        $or: [
          { branchCode: branchCode },
          { branch_code: branchCode }
        ]
      });
    }

    if (status) {
      andConditions.push({ status: status });
    }

    if (search) {
      andConditions.push({
        $or: [
          { customerName: { $regex: search, $options: 'i' } },
          { contractNumber: { $regex: search, $options: 'i' } },
          { customerPhone: { $regex: search, $options: 'i' } }
        ]
      });
    }

    // รวม conditions
    if (andConditions.length > 0) {
      query = { $and: andConditions };
    }

    console.log('🔍 Database query:', query);

    // ตรวจสอบว่ามีข้อมูลในฐานข้อมูลหรือไม่
    const totalRecords = await InstallmentOrder.countDocuments({});
    console.log(`📊 Total InstallmentOrder records in database: ${totalRecords}`);

    // ตรวจสอบโครงสร้างข้อมูลในฐานข้อมูล
    if (totalRecords > 0) {
      const sampleRecord = await InstallmentOrder.findOne({}).lean();
      console.log('📋 Sample InstallmentOrder structure:', {
        _id: sampleRecord._id,
        contractNumber: sampleRecord.contractNumber,
        branchCode: sampleRecord.branchCode,
        branch_code: sampleRecord.branch_code,
        customerName: sampleRecord.customerName,
        availableFields: Object.keys(sampleRecord)
      });
    }

    // Manual pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    const totalDocs = await InstallmentOrder.countDocuments(query);
    const totalPages = Math.ceil(totalDocs / limitNum);

    const contracts = await InstallmentOrder.find(query)
      .populate('customer', 'name phone email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    console.log(`📊 Found ${contracts.length} contracts from database`);
    console.log(`📋 Sample contract:`, contracts[0]);

    // ถ้าไม่มีข้อมูลเลย ให้ส่ง response ที่ชัดเจน
    if (contracts.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: totalRecords === 0 ?
          'ยังไม่มีสัญญาผ่อนในระบบ กรุณาสร้างสัญญาผ่อนก่อน' :
          `ไม่พบสัญญาที่ตรงกับเงื่อนไข (มีทั้งหมด ${totalRecords} สัญญา)`,
        pagination: {
          currentPage: parseInt(page),
          totalPages: 0,
          totalDocs: totalDocs,
          limit: limitNum,
          hasNextPage: false,
          hasPrevPage: false
        }
      });
    }

    // Transform data สำหรับ frontend (ใช้ข้อมูลจริงเท่านั้น)
    const transformedData = contracts.map(contract => {
      // ดึงข้อมูลลูกค้าจากหลายแหล่ง
      let customerName = 'ไม่ระบุ';
      let customerPhone = 'ไม่ระบุ';

      // ลองดึงจาก customer_info ก่อน
      if (contract.customer_info) {
        const { prefix = '', firstName = '', lastName = '', phone = '' } = contract.customer_info;
        customerName = `${prefix} ${firstName} ${lastName}`.trim() || 'ไม่ระบุ';
        customerPhone = phone || 'ไม่ระบุ';
      }
      // ถ้าไม่มี ลองดึงจากฟิลด์โดยตรง
      else {
        customerName = contract.customerName || contract.displayCustomerName || 'ไม่ระบุ';
        customerPhone = contract.customerPhone || contract.customer_phone || 'ไม่ระบุ';
      }

      // ถ้ายังได้ "ไม่ระบุ" ลองดึงจาก populated customer
      if (customerName === 'ไม่ระบุ' && contract.customer) {
        customerName = contract.customer.name || 'ไม่ระบุ';
        customerPhone = contract.customer.phone || customerPhone;
      }

      console.log(`👤 Customer data for contract ${contract._id}:`, {
        customerName,
        customerPhone,
        rawCustomerInfo: contract.customer_info,
        rawCustomer: contract.customer
      });

      return {
        _id: contract._id,
        contractNo: contract.contractNumber || contract.contractNo || contract._id,
        customerName,
        customerPhone,
        items: contract.items || [],
        type: contract.installmentType || contract.planType || 'INSTALLMENT',
        status: contract.status || 'ongoing',
        totalAmount: contract.totalAmount || contract.finalTotalAmount || 0,
        downPayment: contract.downPayment || 0,
        monthlyPayment: contract.monthlyPayment || contract.amountPerInstallment || 0,
        installmentCount: contract.installmentCount || contract.term || 0,
        paidAmount: contract.paidAmount || 0,
        remainingAmount: contract.remainingAmount || 0,
        createdAt: contract.createdAt,
        updatedAt: contract.updatedAt
      };
    });

    const responseData = {
      success: true,
      data: transformedData,
      pagination: {
        currentPage: parseInt(page),
        totalPages: totalPages,
        totalDocs: totalDocs,
        limit: limitNum,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    };

    console.log('📤 Sending response:', {
      success: responseData.success,
      dataLength: responseData.data.length,
      pagination: responseData.pagination
    });

    res.json(responseData);

  } catch (error) {
    console.error('Error getting installment orders:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสัญญา',
      error: error.message
    });
  }
});

/**
 * POST /api/installment-payment/record
 * บันทึกการชำระค่างวด
 */
router.post('/record', authMiddleware, InstallmentPaymentController.recordPayment);

/**
 * POST /api/installment-payment/:paymentId/upload-slip
 * อัปโหลดสลิปโอนเงิน
 */
router.post('/:paymentId/upload-slip',
  authMiddleware,
  upload.single('slip'),
  InstallmentPaymentController.uploadTransferSlip
);

/**
 * GET /api/installment-payment/history/:contractId
 * ดึงประวัติการชำระของสัญญา
 */
router.get('/history/:contractId', authMiddleware, InstallmentPaymentController.getPaymentHistory);

/**
 * GET /api/installment-payment/contract/:contractId
 * ดึงรายละเอียดสัญญาพร้อมตารางการชำระ
 */
router.get('/contract/:contractId', authMiddleware, InstallmentPaymentController.getContractWithPaymentSchedule);

/**
 * GET /api/installment-payment/:paymentId
 * ดึงข้อมูลการชำระตาม ID
 */
router.get('/:paymentId', authMiddleware, InstallmentPaymentController.getPaymentById);

/**
 * PUT /api/installment-payment/:paymentId/cancel
 * ยกเลิกการชำระ
 */
router.put('/:paymentId/cancel', authMiddleware, InstallmentPaymentController.cancelPayment);

/**
 * GET /api/installment-payment/report
 * ดึงรายงานการชำระตามช่วงวันที่
 */
router.get('/report', authMiddleware, InstallmentPaymentController.getPaymentReport);

/**
 * GET /api/installment-payment/debug
 * Debug endpoint เพื่อตรวจสอบข้อมูลในฐานข้อมูล
 */
router.get('/debug', authMiddleware, async (req, res) => {
  try {
    const InstallmentOrder = require('../models/Installment/InstallmentOrder');
    const InstallmentPayment = require('../models/Installment/InstallmentPayment');

    const totalOrders = await InstallmentOrder.countDocuments({});
    const totalPayments = await InstallmentPayment.countDocuments({});

    let sampleOrder = null;
    let samplePayment = null;

    if (totalOrders > 0) {
      sampleOrder = await InstallmentOrder.findOne({}).lean();
    }

    if (totalPayments > 0) {
      samplePayment = await InstallmentPayment.findOne({}).lean();
    }

    // ตรวจสอบ branch codes ที่มีอยู่
    const branchCodes = await InstallmentOrder.distinct('branchCode');
    const branch_codes = await InstallmentOrder.distinct('branch_code');

    res.json({
      success: true,
      debug: {
        database: {
          totalOrders,
          totalPayments,
          availableBranchCodes: branchCodes,
          availableBranch_codes: branch_codes
        },
        sampleOrder: sampleOrder ? {
          _id: sampleOrder._id,
          contractNumber: sampleOrder.contractNumber,
          branchCode: sampleOrder.branchCode,
          branch_code: sampleOrder.branch_code,
          customerName: sampleOrder.customerName,
          customer_info: sampleOrder.customer_info,
          customer: sampleOrder.customer,
          status: sampleOrder.status,
          installmentType: sampleOrder.installmentType,
          planType: sampleOrder.planType,
          availableFields: Object.keys(sampleOrder)
        } : null,
        samplePayment: samplePayment ? {
          _id: samplePayment._id,
          paymentId: samplePayment.paymentId,
          contractId: samplePayment.contractId,
          installmentNumber: samplePayment.installmentNumber,
          amount: samplePayment.amount,
          paymentMethod: samplePayment.paymentMethod,
          availableFields: Object.keys(samplePayment)
        } : null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการ debug',
      error: error.message
    });
  }
});

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Installment Payment API is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
