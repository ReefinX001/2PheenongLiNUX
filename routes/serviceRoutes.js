/**
 * routes/serviceRoutes.js - API Routes สำหรับระบบบริการหลังการขาย
 * ใช้ข้อมูลจริงจาก CashSale และ InstallmentOrder เท่านั้น
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Import models - ใช้เฉพาะ CashSale และ InstallmentOrder
const CashSale = require('../models/POS/CashSale');
const InstallmentOrder = require('../models/Installment/InstallmentOrder');

// Middleware สำหรับ error handling
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * GET /api/services/eligibility
 * ตรวจสอบสิทธิ์การใช้บริการของลูกค้า (ใช้ข้อมูลจริงจาก CashSale และ InstallmentOrder)
 */
router.get('/eligibility', asyncHandler(async (req, res) => {
  console.log('🔍 GET /api/services/eligibility');
  console.log('Query params:', req.query);

  try {
    const { customerName, phone, idCard } = req.query;

    if (!customerName && !phone && !idCard) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุชื่อลูกค้า เบอร์โทรศัพท์ หรือเลขบัตรประชาชน'
      });
    }

    const eligibleCustomers = [];

    // 1. ค้นหาจาก CashSale (การขายสด)
    const cashSaleQueries = [];

    if (phone) {
      cashSaleQueries.push(
        { 'individual.phone': { $regex: phone, $options: 'i' } },
        { 'corporate.corporatePhone': { $regex: phone, $options: 'i' } }
      );
    }

    if (idCard) {
      cashSaleQueries.push(
        { 'individual.taxId': { $regex: idCard, $options: 'i' } },
        { 'corporate.companyTaxId': { $regex: idCard, $options: 'i' } }
      );
    }

    if (customerName) {
      cashSaleQueries.push(
        { 'individual.firstName': { $regex: customerName, $options: 'i' } },
        { 'individual.lastName': { $regex: customerName, $options: 'i' } },
        { 'corporate.companyName': { $regex: customerName, $options: 'i' } }
      );
    }

    if (cashSaleQueries.length > 0) {
      console.log('💰 Searching CashSale with queries:', cashSaleQueries);

      const cashSales = await CashSale.find({ $or: cashSaleQueries })
        .populate('customer')
        .sort({ soldAt: -1 })
        .lean();

      console.log(`💰 Found ${cashSales.length} CashSale records`);

      // แปลงข้อมูล CashSale เป็นรูปแบบที่ระบบบริการใช้
      cashSales.forEach(sale => {
        const customerData = {
          id: sale.customer?._id || sale._id,
          name: sale.customerType === 'individual'
            ? `${sale.individual?.prefix || ''} ${sale.individual?.firstName || ''} ${sale.individual?.lastName || ''}`.trim()
            : sale.corporate?.companyName || '',
          phone: sale.customerType === 'individual'
            ? sale.individual?.phone
            : sale.corporate?.corporatePhone,
          taxId: sale.customerType === 'individual'
            ? sale.individual?.taxId
            : sale.corporate?.companyTaxId,
          email: sale.customerType === 'individual'
            ? sale.individual?.email
            : sale.corporate?.email
        };

        // คำนวณวันหมดประกัน
        const warrantyEndDate = sale.warrantyEndDate ||
          new Date(new Date(sale.soldAt || sale.createdAt).getTime() + 365 * 24 * 60 * 60 * 1000);

        const warrantyValid = new Date() <= warrantyEndDate;

        eligibleCustomers.push({
          customer: customerData,
          purchases: [{
            purchaseId: sale._id,
            purchaseType: 'cash',
            purchaseDate: sale.soldAt || sale.createdAt,
            invoiceNumber: sale.invoiceNo,
            items: (sale.items || []).map(item => ({
              name: item.name || 'ไม่ระบุ',
              price: item.price || 0,
              quantity: item.quantity || 1,
              deviceType: determineDeviceType(item.name || '')
            })),
            warrantyEndDate,
            warrantyValid,
            serviceUsageCount: sale.serviceUsageCount || {
              'phone-film': 0,
              'ipad-film': 0,
              'phone-warranty': 0,
              'ipad-warranty': 0
            }
          }]
        });
      });
    }

    // 2. ค้นหาจาก InstallmentOrder (การขายผ่อน)
    const installmentQueries = [];

    if (phone) {
      installmentQueries.push(
        { 'customer_info.phone': { $regex: phone, $options: 'i' } }
      );
    }

    if (idCard) {
      installmentQueries.push(
        { 'customer_info.taxId': { $regex: idCard, $options: 'i' } }
      );
    }

    if (customerName) {
      installmentQueries.push(
        { 'customer_info.firstName': { $regex: customerName, $options: 'i' } },
        { 'customer_info.lastName': { $regex: customerName, $options: 'i' } }
      );
    }

    if (installmentQueries.length > 0) {
      console.log('📱 Searching InstallmentOrder with queries:', installmentQueries);

      const installmentOrders = await InstallmentOrder.find({ $or: installmentQueries })
        .populate('customer')
        .sort({ createdAt: -1 })
        .lean();

      console.log(`📱 Found ${installmentOrders.length} InstallmentOrder records`);

      // แปลงข้อมูล InstallmentOrder เป็นรูปแบบที่ระบบบริการใช้
      installmentOrders.forEach(order => {
        const customerData = {
          id: order.customer?._id || order._id,
          name: `${order.customer_info?.prefix || ''} ${order.customer_info?.firstName || ''} ${order.customer_info?.lastName || ''}`.trim(),
          phone: order.customer_info?.phone,
          taxId: order.customer_info?.taxId,
          email: order.customer_info?.email
        };

        // คำนวณวันหมดประกัน
        const warrantyEndDate = order.warrantyEndDate ||
          new Date(new Date(order.createdAt).getTime() + 365 * 24 * 60 * 60 * 1000);

        const warrantyValid = new Date() <= warrantyEndDate;

        eligibleCustomers.push({
          customer: customerData,
          purchases: [{
            purchaseId: order._id,
            purchaseType: 'installment',
            purchaseDate: order.createdAt,
            contractNumber: order.contractNo,
            items: (order.items || []).map(item => ({
              name: item.name || 'ไม่ระบุ',
              qty: item.qty || 1,
              imei: item.imei || '',
              deviceType: determineDeviceType(item.name || '')
            })),
            warrantyEndDate,
            warrantyValid,
            serviceUsageCount: order.serviceUsageCount || {
              'phone-film': 0,
              'ipad-film': 0,
              'phone-warranty': 0,
              'ipad-warranty': 0
            }
          }]
        });
      });
    }

    // 3. รวมและจัดกลุ่มลูกค้าที่ซ้ำ
    const customerMap = new Map();

    eligibleCustomers.forEach(item => {
      const customerId = item.customer.id.toString();
      if (customerMap.has(customerId)) {
        customerMap.get(customerId).purchases.push(...item.purchases);
      } else {
        customerMap.set(customerId, item);
      }
    });

    const finalCustomers = Array.from(customerMap.values());

    console.log(`🎯 Final result: ${finalCustomers.length} eligible customers`);

    res.json({
      success: true,
      message: finalCustomers.length > 0
        ? `พบลูกค้าที่มีสิทธิ์ใช้บริการ ${finalCustomers.length} ราย`
        : 'ไม่พบข้อมูลลูกค้า',
      data: finalCustomers
    });

  } catch (error) {
    console.error('❌ Error checking service eligibility:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์',
      error: error.message
    });
  }
}));

/**
 * GET /api/services/history
 * ดึงประวัติการให้บริการ (ใช้ข้อมูลจาก CashSale และ InstallmentOrder)
 */
router.get('/history', asyncHandler(async (req, res) => {
  console.log('📋 GET /api/services/history');

  try {
    const { branchCode } = req.query;

    // ดึงข้อมูลการขายที่มีการใช้บริการ
    const query = {};
    if (branchCode && branchCode !== '00000') {
      query.$or = [
        { branchCode: branchCode },
        { branch_code: branchCode }
      ];
    }

    const [cashSalesWithService, ordersWithService] = await Promise.all([
      CashSale.find({
        ...query,
        serviceUsageCount: { $exists: true, $ne: {} }
      }).lean(),
      InstallmentOrder.find({
        ...query,
        serviceUsageCount: { $exists: true, $ne: {} }
      }).lean()
    ]);

    // รวมข้อมูลประวัติการให้บริการ
    const serviceHistory = [];

    // จาก CashSale
    cashSalesWithService.forEach(sale => {
      if (sale.serviceUsageCount && Object.keys(sale.serviceUsageCount).length > 0) {
        Object.entries(sale.serviceUsageCount).forEach(([serviceType, count]) => {
          serviceHistory.push({
            id: `${sale._id}_${serviceType}`,
            purchaseId: sale._id,
            purchaseType: 'cash',
            invoiceNumber: sale.invoiceNo,
            customerName: sale.customerType === 'individual'
              ? `${sale.individual?.firstName || ''} ${sale.individual?.lastName || ''}`.trim()
              : sale.corporate?.companyName || '',
            customerPhone: sale.customerType === 'individual'
              ? sale.individual?.phone
              : sale.corporate?.corporatePhone,
            serviceType: serviceType,
            serviceCount: count,
            purchaseDate: sale.soldAt,
            warrantyDate: sale.warrantyStartDate || sale.soldAt,
            branchCode: sale.branchCode,
            staff: sale.staffName || 'ไม่ระบุ'
          });
        });
      }
    });

    // จาก InstallmentOrder
    ordersWithService.forEach(order => {
      if (order.serviceUsageCount && Object.keys(order.serviceUsageCount).length > 0) {
        Object.entries(order.serviceUsageCount).forEach(([serviceType, count]) => {
          serviceHistory.push({
            id: `${order._id}_${serviceType}`,
            purchaseId: order._id,
            purchaseType: 'installment',
            contractNumber: order.contractNo,
            customerName: `${order.customer_info?.firstName || ''} ${order.customer_info?.lastName || ''}`.trim(),
            customerPhone: order.customer_info?.phone,
            serviceType: serviceType,
            serviceCount: count,
            purchaseDate: order.createdAt,
            warrantyDate: order.warrantyStartDate || order.createdAt,
            branchCode: order.branch_code,
            staff: order.staffName || 'ไม่ระบุ'
          });
        });
      }
    });

    // เรียงลำดับตามวันที่ล่าสุด
    serviceHistory.sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate));

    res.json({
      success: true,
      data: serviceHistory,
      count: serviceHistory.length
    });

  } catch (error) {
    console.error('❌ Error getting service history:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงประวัติการให้บริการ',
      error: error.message
    });
  }
}));

/**
 * POST /api/services/usage
 * บันทึกการใช้บริการ (อัปเดตข้อมูลใน CashSale หรือ InstallmentOrder)
 */
router.post('/usage', asyncHandler(async (req, res) => {
  console.log('📝 POST /api/services/usage');
  console.log('Request body:', req.body);

  try {
    const {
      purchaseId,
      purchaseType,
      serviceType,
      deviceModel,
      serviceReason,
      branchCode,
      staffName,
      notes
    } = req.body;

    // Validate required fields
    if (!purchaseId || !purchaseType || !serviceType) {
      return res.status(400).json({
        success: false,
        message: 'ข้อมูลไม่ครบถ้วน: purchaseId, purchaseType, serviceType จำเป็น'
      });
    }

    let purchaseRecord = null;
    let customerData = null;

    // ดึงข้อมูลการซื้อตามประเภท
    if (purchaseType === 'cash') {
      purchaseRecord = await CashSale.findById(purchaseId);

      if (purchaseRecord) {
        customerData = {
          name: purchaseRecord.customerType === 'individual'
            ? `${purchaseRecord.individual?.prefix || ''} ${purchaseRecord.individual?.firstName || ''} ${purchaseRecord.individual?.lastName || ''}`.trim()
            : purchaseRecord.corporate?.companyName || '',
          phone: purchaseRecord.customerType === 'individual'
            ? purchaseRecord.individual?.phone
            : purchaseRecord.corporate?.corporatePhone
        };
      }
    } else if (purchaseType === 'installment') {
      purchaseRecord = await InstallmentOrder.findById(purchaseId);

      if (purchaseRecord) {
        customerData = {
          name: `${purchaseRecord.customer_info?.prefix || ''} ${purchaseRecord.customer_info?.firstName || ''} ${purchaseRecord.customer_info?.lastName || ''}`.trim(),
          phone: purchaseRecord.customer_info?.phone
        };
      }
    }

    if (!purchaseRecord) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลการซื้อ'
      });
    }

    // ตรวจสอบประกัน (1 ปี)
    const purchaseDate = purchaseType === 'cash'
      ? purchaseRecord.soldAt || purchaseRecord.createdAt
      : purchaseRecord.createdAt;

    const warrantyEndDate = new Date(purchaseDate.getTime() + 365 * 24 * 60 * 60 * 1000);
    const warrantyValid = new Date() <= warrantyEndDate;

    if (!warrantyValid) {
      return res.status(400).json({
        success: false,
        message: 'ประกันหมดอายุแล้ว',
        warrantyEndDate: warrantyEndDate
      });
    }

    // ตรวจสอบการใช้บริการก่อนหน้า
    const serviceUsageCount = purchaseRecord.serviceUsageCount || new Map();
    const currentUsage = serviceUsageCount.get ? serviceUsageCount.get(serviceType) || 0 : serviceUsageCount[serviceType] || 0;

    // กำหนดจำนวนครั้งสูงสุด
    const maxUsage = {
      'phone-film': 10,
      'ipad-film': 3,
      'phone-warranty': 1,
      'ipad-warranty': 1
    }[serviceType] || 1;

    if (currentUsage >= maxUsage) {
      return res.status(400).json({
        success: false,
        message: `ใช้บริการครบจำนวนแล้ว (${currentUsage}/${maxUsage})`,
        currentUsage,
        maxUsage
      });
    }

    // อัปเดตการใช้บริการ
    if (!purchaseRecord.serviceUsageCount) {
      purchaseRecord.serviceUsageCount = new Map();
    }

    if (purchaseRecord.serviceUsageCount.set) {
      purchaseRecord.serviceUsageCount.set(serviceType, currentUsage + 1);
    } else {
      purchaseRecord.serviceUsageCount[serviceType] = currentUsage + 1;
    }

    await purchaseRecord.save();

    // บันทึกประวัติการให้บริการ (ถ้ามี ServiceHistory model)
    try {
      const ServiceHistory = require('../models/Service/ServiceHistory');

      const serviceHistory = new ServiceHistory({
        purchaseReference: {
          purchaseId: purchaseId,
          purchaseType: purchaseType === 'cash' ? 'CashSale' : 'InstallmentOrder',
          purchaseDate: purchaseDate,
          invoiceNumber: purchaseType === 'cash' ? purchaseRecord.invoiceNo : null,
          contractNumber: purchaseType === 'installment' ? purchaseRecord.contractNo : null
        },
        customer: {
          _id: purchaseRecord.customer || purchaseId,
          name: customerData.name,
          phone: customerData.phone
        },
        device: {
          name: deviceModel || 'ไม่ระบุ',
          type: determineDeviceType(deviceModel || ''),
          warrantyStartDate: purchaseDate,
          warrantyEndDate: warrantyEndDate
        },
        service: {
          serviceType: serviceType,
          serviceDate: new Date(),
          serviceReason: serviceReason || 'ไม่ระบุ',
          usageCount: currentUsage + 1,
          maxUsageAllowed: maxUsage
        },
        branch: {
          code: branchCode || 'PATTANI',
          name: branchCode || 'PATTANI'
        },
        staff: {
          name: staffName || 'ไม่ระบุ'
        },
        notes: notes || '',
        status: 'completed'
      });

      await serviceHistory.save();
      console.log('✅ Service history saved');

    } catch (serviceHistoryError) {
      console.warn('⚠️ Could not save to ServiceHistory:', serviceHistoryError.message);
    }

    res.json({
      success: true,
      message: 'บันทึกการใช้บริการเรียบร้อยแล้ว',
      data: {
        purchaseId,
        purchaseType,
        serviceType,
        previousUsage: currentUsage,
        newUsage: currentUsage + 1,
        maxUsage,
        remainingUsage: maxUsage - (currentUsage + 1),
        customerName: customerData.name,
        customerPhone: customerData.phone
      }
    });

  } catch (error) {
    console.error('❌ Error recording service usage:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการบันทึกการใช้บริการ',
      error: error.message
    });
  }
}));

/**
 * GET /api/services/customer-lookup
 * ค้นหาลูกค้าจาก CashSale และ InstallmentOrder (สำหรับ autocomplete)
 */
router.get('/customer-lookup', asyncHandler(async (req, res) => {
  console.log('🔍 GET /api/services/customer-lookup');

  try {
    const { q, type = 'all' } = req.query;

    if (!q || q.length < 2) {
      return res.json({
        success: true,
        data: [],
        message: 'กรุณาพิมพ์อย่างน้อย 2 ตัวอักษร'
      });
    }

    const customers = [];

    // ค้นหาจาก CashSale
    if (type === 'all' || type === 'cash') {
      const cashSales = await CashSale.find({
        $or: [
          { 'individual.firstName': { $regex: q, $options: 'i' } },
          { 'individual.lastName': { $regex: q, $options: 'i' } },
          { 'individual.phone': { $regex: q, $options: 'i' } },
          { 'corporate.companyName': { $regex: q, $options: 'i' } },
          { 'corporate.corporatePhone': { $regex: q, $options: 'i' } }
        ]
      })
      .limit(10)
      .lean();

      customers.push(...cashSales.map(sale => ({
        customerId: sale.customer || sale._id,
        customerName: sale.customerType === 'individual'
          ? `${sale.individual?.firstName || ''} ${sale.individual?.lastName || ''}`.trim()
          : sale.corporate?.companyName || '',
        customerPhone: sale.customerType === 'individual'
          ? sale.individual?.phone
          : sale.corporate?.corporatePhone,
        purchaseType: 'cash',
        purchaseId: sale._id,
        purchaseDate: sale.soldAt || sale.createdAt,
        invoiceNumber: sale.invoiceNo
      })));
    }

    // ค้นหาจาก InstallmentOrder
    if (type === 'all' || type === 'installment') {
      const orders = await InstallmentOrder.find({
        $or: [
          { 'customer_info.firstName': { $regex: q, $options: 'i' } },
          { 'customer_info.lastName': { $regex: q, $options: 'i' } },
          { 'customer_info.phone': { $regex: q, $options: 'i' } }
        ]
      })
      .limit(10)
      .lean();

      customers.push(...orders.map(order => ({
        customerId: order.customer || order._id,
        customerName: `${order.customer_info?.firstName || ''} ${order.customer_info?.lastName || ''}`.trim(),
        customerPhone: order.customer_info?.phone,
        purchaseType: 'installment',
        purchaseId: order._id,
        purchaseDate: order.createdAt,
        contractNumber: order.contractNo
      })));
    }

    res.json({
      success: true,
      data: customers.slice(0, 10), // จำกัด 10 รายการ
      count: customers.length
    });

  } catch (error) {
    console.error('❌ Error customer lookup:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการค้นหาลูกค้า',
      error: error.message
    });
  }
}));

// Helper function: กำหนดประเภทอุปกรณ์จากชื่อสินค้า
function determineDeviceType(productName) {
  if (!productName) return 'phone';

  const name = productName.toLowerCase();

  if (name.includes('ipad') || name.includes('tablet')) {
    return 'ipad';
  }

  return 'phone'; // default
}

module.exports = router;
