// middleware/installmentMiddleware.js
// Middleware สำหรับป้องกัน Double Submission และ Rate Limiting
// Created: 2025-07-08 เพื่อแก้ไขปัญหาจาก log

const rateLimit = require('express-rate-limit');

// เก็บ request fingerprint ชั่วคราว
const recentRequests = new Map();
const CONTRACT_CACHE = new Map();

// Request deduplication middleware
const preventDuplicateSubmission = (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const clientIP = req.ip || req.connection.remoteAddress;

    // สร้าง fingerprint จากข้อมูลสำคัญ
    const requestData = {
      userId,
      clientIP,
      customerPhone: req.body.customer?.phone_number,
      customerName: `${req.body.customer?.first_name} ${req.body.customer?.last_name}`.trim(),
      totalAmount: req.body.total_amount,
      items: req.body.items?.map(item => ({
        name: item.name,
        imei: item.imei,
        price: item.price
      }))
    };

    const fingerprint = JSON.stringify(requestData);
    const requestKey = `${userId}-${Date.now()}`;

    console.log('🔍 Checking duplicate submission:', {
      userId,
      clientIP,
      fingerprint: fingerprint.substring(0, 100) + '...',
      recentRequestsCount: recentRequests.size
    });

    // ตรวจสอบ request ซ้ำใน 30 วินาทีที่ผ่านมา
    const now = Date.now();
    const DUPLICATE_WINDOW = 30 * 1000; // 30 seconds

    // ลบ request เก่าที่หมดอายุ
    for (const [key, data] of recentRequests.entries()) {
      if (now - data.timestamp > DUPLICATE_WINDOW) {
        recentRequests.delete(key);
      }
    }

    // ตรวจสอบ fingerprint ซ้ำ
    for (const [key, data] of recentRequests.entries()) {
      if (data.fingerprint === fingerprint) {
        const timeDiff = now - data.timestamp;
        if (timeDiff < DUPLICATE_WINDOW) {
          console.warn('⚠️ Duplicate submission detected:', {
            timeDiff: `${timeDiff}ms ago`,
            originalRequest: key,
            newRequest: requestKey
          });

          return res.status(429).json({
            success: false,
            error: 'การส่งข้อมูลซ้ำ กรุณารอสักครู่แล้วลองใหม่',
            code: 'DUPLICATE_SUBMISSION',
            retryAfter: Math.ceil((DUPLICATE_WINDOW - timeDiff) / 1000)
          });
        }
      }
    }

    // เก็บ request ปัจจุบัน
    recentRequests.set(requestKey, {
      fingerprint,
      timestamp: now,
      userId,
      clientIP
    });

    // Cleanup หลังจาที่ request จบ
    res.on('finish', () => {
      setTimeout(() => {
        recentRequests.delete(requestKey);
      }, DUPLICATE_WINDOW);
    });

    console.log('✅ Request approved:', requestKey);
    next();

  } catch (error) {
    console.error('❌ Error in duplicate prevention:', error);
    next(); // อย่าให้ middleware นี้ block request ถ้ามี error
  }
};

// Contract number validation middleware
const validateContractNumber = async (req, res, next) => {
  try {
    const { items = [] } = req.body;

    // ตรวจสอบ IMEI ซ้ำในคำขอเดียวกัน
    const imeis = items.filter(item => item.imei).map(item => item.imei);
    const duplicateImeis = imeis.filter((imei, index) => imeis.indexOf(imei) !== index);

    if (duplicateImeis.length > 0) {
      return res.status(400).json({
        success: false,
        error: `พบ IMEI ซ้ำในคำขอ: ${duplicateImeis.join(', ')}`,
        code: 'DUPLICATE_IMEI_IN_REQUEST'
      });
    }

    // ตรวจสอบ IMEI ในฐานข้อมูล (ต้อง import model)
    const mongoose = require('mongoose');
    const InstallmentOrder = mongoose.model('InstallmentOrder');

    for (const item of items) {
      if (item.imei) {
        // ตรวจสอบว่า IMEI นี้ถูกใช้ในสัญญาที่ active อยู่หรือไม่
        const existingContract = await InstallmentOrder.findOne({
          'items.imei': item.imei,
          status: { $in: ['ongoing', 'active'] }
        }).lean();

        if (existingContract) {
          return res.status(400).json({
            success: false,
            error: `IMEI ${item.imei} ถูกใช้ในสัญญา ${existingContract.contractNo} แล้ว`,
            code: 'IMEI_ALREADY_IN_USE',
            conflictContract: existingContract.contractNo
          });
        }
      }
    }

    next();

  } catch (error) {
    console.error('❌ Error in contract validation:', error);
    next(); // อย่าให้ error นี้ block request
  }
};

// Rate limiting สำหรับ installment creation
const rateLimitInstallment = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // ไม่เกิน 5 requests ต่อนาที
  message: {
    success: false,
    error: 'สร้างสัญญาผ่อนชำระเร็วเกินไป กรุณารอสักครู่',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // ใช้ user ID เป็นหลัก
    return req.user?.id || req.user?._id || req.ip;
  },
  skip: (req) => {
    // ข้าม rate limit สำหรับ admin
    return req.user?.role === 'admin';
  }
});

// Request validation middleware
const validateInstallmentData = (req, res, next) => {
  try {
    const {
      items = [],
      customer = {},
      plan_type,
      total_amount,
      down_payment
    } = req.body;

    console.log('🔍 Validating installment data:', {
      itemsCount: items.length,
      planType: plan_type,
      totalAmount: total_amount,
      downPayment: down_payment,
      customerName: `${customer.first_name} ${customer.last_name}`.trim()
    });

    // ตรวจสอบข้อมูลพื้นฐาน
    const validationErrors = [];

    if (!Array.isArray(items) || items.length === 0) {
      validationErrors.push('ไม่มีสินค้าในตะกร้า');
    }

    if (!['plan1', 'plan2', 'plan3'].includes(plan_type)) {
      validationErrors.push('แผนการผ่อนชำระไม่ถูกต้อง');
    }

    if (!total_amount || total_amount <= 0) {
      validationErrors.push('ยอดรวมต้องมากกว่า 0');
    }

    if (!customer.first_name && !customer.companyName) {
      validationErrors.push('กรุณากรอกชื่อลูกค้าหรือชื่อบริษัท');
    }

    if (!customer.phone_number) {
      validationErrors.push('กรุณากรอกเบอร์โทรศัพท์');
    }

    // ตรวจสอบความสมเหตุสมผลของตัวเลข
    if (down_payment && down_payment > total_amount) {
      validationErrors.push('เงินดาวน์ไม่สามารถมากกว่ายอดรวมได้');
    }

    // ตรวจสอบ items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.name) {
        validationErrors.push(`สินค้าลำดับที่ ${i + 1}: ไม่มีชื่อสินค้า`);
      }
      if (!item.price || item.price <= 0) {
        validationErrors.push(`สินค้าลำดับที่ ${i + 1}: ราคาไม่ถูกต้อง`);
      }
      if (!item.qty || item.qty <= 0) {
        validationErrors.push(`สินค้าลำดับที่ ${i + 1}: จำนวนไม่ถูกต้อง`);
      }
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'ข้อมูลไม่ถูกต้อง',
        details: validationErrors,
        code: 'VALIDATION_ERROR'
      });
    }

    console.log('✅ Installment data validation passed');
    next();

  } catch (error) {
    console.error('❌ Error in data validation:', error);
    return res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูล',
      code: 'VALIDATION_ERROR'
    });
  }
};

// Monitoring middleware
const logInstallmentRequest = (req, res, next) => {
  const startTime = Date.now();
  const userId = req.user?.id || req.user?._id;
  const userName = req.user?.name || 'Unknown';
  const clientIP = req.ip;

  console.log('📋 Installment Request Start:', {
    userId,
    userName,
    clientIP,
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString(),
    userAgent: req.get('User-Agent')
  });

  // Track response
  res.on('finish', () => {
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('📊 Installment Request Complete:', {
      userId,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      success: res.statusCode < 400,
      timestamp: new Date().toISOString()
    });
  });

  next();
};

module.exports = {
  preventDuplicateSubmission,
  validateContractNumber,
  rateLimitInstallment,
  validateInstallmentData,
  logInstallmentRequest
};