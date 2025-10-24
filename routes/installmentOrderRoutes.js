/**
 * routes/installmentOrderRoutes.js - Routes สำหรับจัดการข้อมูล InstallmentOrder
 * ใช้สำหรับระบบบริการหลังการขายในการค้นหาและตรวจสอบข้อมูลการซื้อผ่อน
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Import models
const InstallmentOrder = require('../models/Installment/InstallmentOrder');
const Customer = require('../models/Customer/Customer');
const BranchStock = require('../models/POS/BranchStock');
const BranchStockHistory = require('../models/POS/BranchStockHistory');

// Middleware สำหรับ error handling
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * GET /api/installment-orders
 * ดึงรายการการขายผ่อนทั้งหมด
 */
router.get('/', asyncHandler(async (req, res) => {
  console.log('📱 GET /api/installment-orders');

  try {
    const {
      page = 1,
      limit = 20,
      branchCode,
      customerPhone,
      customerName,
      contractNo,
      status,
      startDate,
      endDate
    } = req.query;

    // สร้าง query
    const query = {};

    if (branchCode) {
      query.branch_code = branchCode;
    }

    if (customerPhone) {
      query['customer_info.phone'] = { $regex: customerPhone, $options: 'i' };
    }

    if (customerName) {
      query.$or = [
        { 'customer_info.firstName': { $regex: customerName, $options: 'i' } },
        { 'customer_info.lastName': { $regex: customerName, $options: 'i' } }
      ];
    }

    if (contractNo) {
      query.contractNo = { $regex: contractNo, $options: 'i' };
    }

    if (status) {
      query.status = status;
    }

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;

    const [orders, totalCount] = await Promise.all([
      InstallmentOrder.find(query)
        .populate('customer')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      InstallmentOrder.countDocuments(query)
    ]);

    // Format response data
    const formattedOrders = orders.map(order => ({
      _id: order._id,
      contractNo: order.contractNo,
      planType: order.planType,
      installmentType: order.installmentType,
      createdAt: order.createdAt,
      customerName: `${order.customer_info?.prefix || ''} ${order.customer_info?.firstName || ''} ${order.customer_info?.lastName || ''}`.trim(),
      customerPhone: order.customer_info?.phone,
      customerTaxId: order.customer_info?.taxId,
      totalAmount: order.totalAmount,
      finalTotalAmount: order.finalTotalAmount,
      downPayment: order.downPayment,
      monthlyPayment: order.monthlyPayment,
      installmentCount: order.installmentCount,
      items: order.items,
      branch_code: order.branch_code,
      status: order.status,
      hasWarranty: order.hasWarranty,
      warrantyStartDate: order.warrantyStartDate,
      warrantyEndDate: order.warrantyEndDate
    }));

    res.json({
      success: true,
      data: formattedOrders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalDocs: totalCount,
        limit: parseInt(limit),
        hasNextPage: page * limit < totalCount,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('❌ Error getting installment orders:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการขายผ่อน',
      error: error.message
    });
  }
}));

/**
 * GET /api/installment-orders/:id
 * ดึงข้อมูลการขายผ่อนตาม ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
  console.log('📱 GET /api/installment-orders/:id');

  try {
    const { id } = req.params;

    const order = await InstallmentOrder.findById(id)
      .populate('customer')
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลการขายผ่อน'
      });
    }

    // Format response - ให้ส่งข้อมูลแบบเดิมเพื่อความเข้ากันได้
    const formattedOrder = {
      _id: order._id,
      contractNo: order.contractNo,
      planType: order.planType,
      installmentType: order.installmentType,
      createdAt: order.createdAt,

      // ส่งข้อมูลลูกค้าในรูปแบบเดิม (customer_info) ที่ frontend คาดหวัง
      customer_info: order.customer_info,

      // ส่งข้อมูลลูกค้าในรูปแบบใหม่ด้วย (เพื่อความเข้ากันได้)
      customer: {
        name: `${order.customer_info?.prefix || ''} ${order.customer_info?.firstName || ''} ${order.customer_info?.lastName || ''}`.trim(),
        phone: order.customer_info?.phone,
        taxId: order.customer_info?.taxId,
        email: order.customer_info?.email,
        age: order.customer_info?.age,
        address: order.customer_info?.address,
        contactAddress: order.customer_info?.contactAddress
      },

      items: order.items || [],
      amounts: {
        subTotal: order.subTotal || 0,
        totalAmount: order.totalAmount || 0,
        finalTotalAmount: order.finalTotalAmount || 0,
        promotionDiscount: order.promotionDiscount || 0,
        downPayment: order.downPayment || 0,
        monthlyPayment: order.monthlyPayment || 0,
        installmentCount: order.installmentCount || 0
      },

      // ส่งข้อมูลราคาในระดับ root เพื่อความเข้ากันได้
      subTotal: order.subTotal || 0,
      totalAmount: order.totalAmount || 0,
      finalTotalAmount: order.finalTotalAmount || 0,
      promotionDiscount: order.promotionDiscount || 0,
      downPayment: order.downPayment || 0,
      monthlyPayment: order.monthlyPayment || 0,
      installmentCount: order.installmentCount || 0,

      branch_code: order.branch_code,
      staffName: order.staffName,
      salesperson: order.salesperson,
      status: order.status,
      hasWarranty: order.hasWarranty,
      warrantyStartDate: order.warrantyStartDate,
      warrantyEndDate: order.warrantyEndDate,
      eligibleServices: order.eligibleServices,
      serviceUsageCount: order.serviceUsageCount,
      payments: order.payments,
      paidAmount: order.paidAmount,
      appliedPromotions: order.appliedPromotions
    };

    res.json({
      success: true,
      data: formattedOrder
    });

  } catch (error) {
    console.error('❌ Error getting installment order detail:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงรายละเอียดการขายผ่อน',
      error: error.message
    });
  }
}));

/**
 * GET /api/installment-orders/search
 * ค้นหาการขายผ่อนสำหรับระบบบริการ
 */
router.get('/search', asyncHandler(async (req, res) => {
  console.log('🔍 GET /api/installment-orders/search');

  try {
    const { q, phone, taxId, customerName, branchCode } = req.query;

    if (!q && !phone && !taxId && !customerName) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุเกณฑ์การค้นหา'
      });
    }

    // สร้าง query
    const searchQueries = [];

    // ถ้ามี q (general search)
    if (q) {
      if (/^\d+$/.test(q)) {
        // ถ้าเป็นตัวเลข ค้นหาเป็นเบอร์โทร
        searchQueries.push(
          { 'customer_info.phone': { $regex: q, $options: 'i' } }
        );
      } else {
        // ถ้าเป็นตัวอักษร ค้นหาเป็นชื่อ
        searchQueries.push(
          { 'customer_info.firstName': { $regex: q, $options: 'i' } },
          { 'customer_info.lastName': { $regex: q, $options: 'i' } }
        );
      }
    }

    // ค้นหาเฉพาะ
    if (phone) {
      searchQueries.push(
        { 'customer_info.phone': { $regex: phone, $options: 'i' } }
      );
    }

    if (taxId) {
      searchQueries.push(
        { 'customer_info.taxId': { $regex: taxId, $options: 'i' } }
      );
    }

    if (customerName) {
      searchQueries.push(
        { 'customer_info.firstName': { $regex: customerName, $options: 'i' } },
        { 'customer_info.lastName': { $regex: customerName, $options: 'i' } }
      );
    }

    const query = { $or: searchQueries };

    // เพิ่มเงื่อนไขสาขา
    if (branchCode) {
      query.branch_code = branchCode;
    }

    // ค้นหาข้อมูล
    const orders = await InstallmentOrder.find(query)
      .populate('customer')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Format ข้อมูลสำหรับระบบบริการ
    const serviceEligibleOrders = orders.map(order => ({
      purchaseId: order._id,
      purchaseType: 'installment',
      purchaseDate: order.createdAt,
      contractNumber: order.contractNo,
      customer: {
        id: order.customer?._id || order._id,
        name: `${order.customer_info?.prefix || ''} ${order.customer_info?.firstName || ''} ${order.customer_info?.lastName || ''}`.trim(),
        phone: order.customer_info?.phone,
        taxId: order.customer_info?.taxId,
        email: order.customer_info?.email,
        customerType: 'individual'
      },
      items: (order.items || []).map(item => ({
        name: item.name || 'ไม่ระบุ',
        qty: item.qty || 1,
        imei: item.imei || '',
        downAmount: item.downAmount || 0,
        payUseInstallment: item.payUseInstallment || 0,
        payUseInstallmentCount: item.payUseInstallmentCount || 0
      })),
      amounts: {
        subTotal: order.subTotal || 0,
        totalAmount: order.totalAmount || 0,
        finalTotalAmount: order.finalTotalAmount || 0,
        promotionDiscount: order.promotionDiscount || 0,
        downPayment: order.downPayment || 0,
        monthlyPayment: order.monthlyPayment || 0,
        installmentCount: order.installmentCount || 0
      },
      warranty: {
        hasWarranty: order.hasWarranty !== false, // default true
        startDate: order.warrantyStartDate || order.createdAt,
        endDate: order.warrantyEndDate || new Date(new Date(order.createdAt).getTime() + 365 * 24 * 60 * 60 * 1000)
      },
      serviceUsage: order.serviceUsageCount || {},
      branch_code: order.branch_code,
      staffName: order.staffName,
      status: order.status,
      planType: order.planType
    }));

    res.json({
      success: true,
      data: serviceEligibleOrders,
      count: serviceEligibleOrders.length,
      message: serviceEligibleOrders.length > 0
        ? `พบข้อมูลการขายผ่อน ${serviceEligibleOrders.length} รายการ`
        : 'ไม่พบข้อมูลการขายผ่อน'
    });

  } catch (error) {
    console.error('❌ Error searching installment orders:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการค้นหาข้อมูลการขายผ่อน',
      error: error.message
    });
  }
}));

/**
 * GET /api/installment-orders/customer/:customerId
 * ดึงประวัติการซื้อผ่อนของลูกค้าคนหนึ่ง
 */
router.get('/customer/:customerId', asyncHandler(async (req, res) => {
  console.log('👤 GET /api/installment-orders/customer/:customerId');

  try {
    const { customerId } = req.params;

    const orders = await InstallmentOrder.find({ customer: customerId })
      .populate('customer')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: orders,
      count: orders.length
    });

  } catch (error) {
    console.error('❌ Error getting customer installment orders:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงประวัติการซื้อผ่อน',
      error: error.message
    });
  }
}));

/**
 * GET /api/installment-orders/branch/:branchCode/recent
 * ดึงการขายผ่อนล่าสุดของสาขา
 */
router.get('/branch/:branchCode/recent', asyncHandler(async (req, res) => {
  console.log('🏢 GET /api/installment-orders/branch/:branchCode/recent');

  try {
    const { branchCode } = req.params;
    const { limit = 10 } = req.query;

    const recentOrders = await InstallmentOrder.find({ branch_code: branchCode })
      .populate('customer')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      data: recentOrders,
      count: recentOrders.length
    });

  } catch (error) {
    console.error('❌ Error getting recent installment orders:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการขายผ่อนล่าสุด',
      error: error.message
    });
  }
}));

/**
 * GET /api/installment-orders/warranty-eligible
 * ดึงการขายผ่อนที่มีสิทธิ์ใช้บริการประกัน
 */
router.get('/warranty-eligible', asyncHandler(async (req, res) => {
  console.log('🛡️ GET /api/installment-orders/warranty-eligible');

  try {
    const { branchCode, customerPhone } = req.query;

    // หาการขายที่อยู่ในประกัน (ภายใน 1 ปี)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const query = {
      createdAt: { $gte: oneYearAgo },
      hasWarranty: { $ne: false } // ไม่ใช่ false (รวม true และ undefined)
    };

    if (branchCode) {
      query.branch_code = branchCode;
    }

    if (customerPhone) {
      query['customer_info.phone'] = { $regex: customerPhone, $options: 'i' };
    }

    const eligibleOrders = await InstallmentOrder.find(query)
      .populate('customer')
      .sort({ createdAt: -1 })
      .lean();

    // คำนวณวันหมดประกัน
    const ordersWithWarranty = eligibleOrders.map(order => {
      const warrantyEndDate = order.warrantyEndDate ||
        new Date(new Date(order.createdAt).getTime() + 365 * 24 * 60 * 60 * 1000);

      return {
        ...order,
        warrantyEndDate,
        warrantyValid: new Date() <= warrantyEndDate,
        warrantyDaysRemaining: Math.max(0, Math.ceil((warrantyEndDate - new Date()) / (1000 * 60 * 60 * 24)))
      };
    });

    res.json({
      success: true,
      data: ordersWithWarranty,
      count: ordersWithWarranty.length
    });

  } catch (error) {
    console.error('❌ Error getting warranty eligible orders:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการขายผ่อนที่มีประกัน',
      error: error.message
    });
  }
}));

/**
 * PUT /api/installment-orders/:id/service-usage
 * อัปเดตการใช้บริการของการขายผ่อน
 */
router.put('/:id/service-usage', asyncHandler(async (req, res) => {
  console.log('📝 PUT /api/installment-orders/:id/service-usage');

  try {
    const { id } = req.params;
    const { serviceType, increment = 1 } = req.body;

    if (!serviceType) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุประเภทบริการ'
      });
    }

    const order = await InstallmentOrder.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลการขายผ่อน'
      });
    }

    // อัปเดตการใช้บริการ
    if (!order.serviceUsageCount) {
      order.serviceUsageCount = new Map();
    }

    const currentUsage = order.serviceUsageCount.get(serviceType) || 0;
    order.serviceUsageCount.set(serviceType, currentUsage + increment);

    await order.save();

    res.json({
      success: true,
      message: 'อัปเดตการใช้บริการเรียบร้อยแล้ว',
      data: {
        serviceType,
        previousUsage: currentUsage,
        newUsage: currentUsage + increment
      }
    });

  } catch (error) {
    console.error('❌ Error updating service usage:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัปเดตการใช้บริการ',
      error: error.message
    });
  }
}));

/**
 * GET /api/installment-orders/statistics
 * สถิติการขายผ่อน
 */
router.get('/statistics', asyncHandler(async (req, res) => {
  console.log('📊 GET /api/installment-orders/statistics');

  try {
    const { branchCode, startDate, endDate } = req.query;

    const matchQuery = {};

    if (branchCode) {
      matchQuery.branch_code = branchCode;
    }

    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
    }

    const stats = await InstallmentOrder.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$branch_code',
          totalOrders: { $sum: 1 },
          totalAmount: { $sum: '$finalTotalAmount' },
          avgAmount: { $avg: '$finalTotalAmount' },
          totalDownPayment: { $sum: '$downPayment' },
          avgMonthlyPayment: { $avg: '$monthlyPayment' },
          uniqueCustomers: { $addToSet: '$customer' }
        }
      },
      {
        $project: {
          branchCode: '$_id',
          totalOrders: 1,
          totalAmount: 1,
          avgAmount: { $round: ['$avgAmount', 2] },
          totalDownPayment: 1,
          avgMonthlyPayment: { $round: ['$avgMonthlyPayment', 2] },
          uniqueCustomerCount: { $size: '$uniqueCustomers' }
        }
      }
    ]);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Error getting installment order statistics:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงสถิติการขายผ่อน',
      error: error.message
    });
  }
}));

/**
 * GET /api/installment-orders/payment-status/:id
 * ตรวจสอบสถานะการชำระเงินของสัญญาผ่อน
 */
router.get('/payment-status/:id', asyncHandler(async (req, res) => {
  console.log('💳 GET /api/installment-orders/payment-status/:id');

  try {
    const { id } = req.params;

    const order = await InstallmentOrder.findById(id)
      .populate('installmentPayments')
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลการขายผ่อน'
      });
    }

    // คำนวณสถานะการชำระเงิน
    const totalPayments = order.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
    const remainingAmount = (order.finalTotalAmount || order.totalAmount) - totalPayments;
    const paymentProgress = totalPayments / (order.finalTotalAmount || order.totalAmount) * 100;

    res.json({
      success: true,
      data: {
        contractNo: order.contractNo,
        totalAmount: order.finalTotalAmount || order.totalAmount,
        paidAmount: totalPayments,
        remainingAmount: Math.max(0, remainingAmount),
        paymentProgress: Math.min(100, paymentProgress),
        payments: order.payments || [],
        status: order.status,
        monthlyPayment: order.monthlyPayment,
        installmentCount: order.installmentCount,
        completedPayments: order.payments?.length || 0
      }
    });

  } catch (error) {
    console.error('❌ Error getting payment status:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบสถานะการชำระเงิน',
      error: error.message
    });
  }
}));

/**
 * PATCH /api/installment-orders/:id
 * อัปเดตข้อมูลการขายผ่อน - สำหรับแก้ไขข้อมูลที่ขาดหาย
 */
router.patch('/:id', asyncHandler(async (req, res) => {
  console.log('🔧 PATCH /api/installment-orders/:id - Updating missing contract data');

  try {
    const { id } = req.params;
    const updateData = req.body;

    console.log('🔍 Update data received:', {
      contractId: id,
      updateFields: Object.keys(updateData),
      totalAmount: updateData.totalAmount,
      remainingAmount: updateData.remainingAmount,
      nextPaymentDate: updateData.nextPaymentDate,
      dueDate: updateData.dueDate
    });

    // ตรวจสอบว่า ID ถูกต้อง
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'รูปแบบ ID ไม่ถูกต้อง'
      });
    }

    // ดึงข้อมูล order เดิมก่อน update
    const existingOrder = await InstallmentOrder.findById(id);
    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลการขายผ่อนที่ต้องการอัปเดต'
      });
    }

    // 🚨🚨🚨 ตรวจสอบว่าต้องตัดสต๊อกหรือไม่
    const needsStockDeduction = !existingOrder.isStockCommitted && existingOrder.items && existingOrder.items.length > 0;

    if (needsStockDeduction) {
      console.log('🚨🚨🚨 STOCK DEDUCTION NEEDED - Contract has items but stock not committed yet');
      console.log('🚨🚨🚨 Processing stock deduction for contract:', existingOrder.contractNo);

      try {
        // ตัดสต๊อกสำหรับแต่ละสินค้า
        for (const item of existingOrder.items) {
          // ใช้ qty แทน quantity และตรวจสอบทั้ง productId และ IMEI
          const quantity = item.qty || item.quantity || 1;
          const productIdentifier = item.productId || item.imei;

          if (productIdentifier && quantity > 0) {
            console.log(`🚨🚨🚨 Deducting stock for product: ${item.name || productIdentifier}, IMEI: ${item.imei || 'N/A'}, quantity: ${quantity}`);

            // ค้นหา BranchStock ตาม IMEI หรือ barcode (สำหรับสินค้าที่มี IMEI)
            let branchStock = null;

            if (item.imei) {
              // ค้นหาด้วย IMEI หรือ barcode
              branchStock = await BranchStock.findOne({
                $or: [
                  { imei: item.imei, branch_code: existingOrder.branch_code },
                  { barcode: item.imei, branch_code: existingOrder.branch_code }
                ]
              });
            }

            if (branchStock) {
              const oldStock = branchStock.stock_value;
              const newStock = Math.max(0, oldStock - quantity);

              // อัปเดตสต๊อก
              branchStock.stock_value = newStock;
              branchStock.lastUpdated = new Date();
              await branchStock.save();

              console.log(`✅ Stock deducted: ${item.name || item.productName || item.productId}`);
              console.log(`   Old stock: ${oldStock}, Deducted: ${quantity}, New stock: ${newStock}`);

              // บันทึกประวัติการตัดสต๊อก
              if (BranchStockHistory) {
                await BranchStockHistory.create({
                  branchStockId: branchStock._id,
                  branchId: existingOrder.branch_code,
                  changeType: 'sale',
                  changeAmount: -quantity,
                  previousValue: oldStock,
                  newValue: newStock,
                  reference: `INSTALLMENT-${existingOrder.contractNo}`,
                  performedBy: 'SYSTEM',
                  notes: `ตัดสต๊อกจากการขายผ่อน ${existingOrder.contractNo}`
                });
              }
            } else {
              console.warn(`⚠️ BranchStock not found for product: ${item.name || productIdentifier}`);
            }
          }
        }

        // ทำเครื่องหมายว่าตัดสต๊อกแล้ว
        updateData.isStockCommitted = true;
        console.log('🚨🚨🚨 Stock deduction completed, marking isStockCommitted = true');

      } catch (stockError) {
        console.error('❌ Error during stock deduction:', stockError);
        // ไม่ให้ error หยุดการ update แต่แจ้งเตือน
        console.warn('⚠️ Stock deduction failed but continuing with order update');
      }
    } else {
      if (existingOrder.isStockCommitted) {
        console.log('ℹ️ Stock already committed for this order');
      } else {
        console.log('ℹ️ No items to deduct stock for');
      }
    }

    // อัปเดตข้อมูล
    const updatedOrder = await InstallmentOrder.findByIdAndUpdate(
      id,
      {
        $set: updateData,
        updatedAt: new Date()
      },
      {
        new: true, // คืนค่าข้อมูลที่อัปเดตแล้ว
        runValidators: true // ตรวจสอบ validation
      }
    );

    console.log('✅ InstallmentOrder updated successfully:', {
      contractId: id,
      totalAmount: updatedOrder.totalAmount,
      remainingAmount: updatedOrder.remainingAmount,
      nextPaymentDate: updatedOrder.nextPaymentDate,
      dueDate: updatedOrder.dueDate,
      isStockCommitted: updatedOrder.isStockCommitted
    });

    res.json({
      success: true,
      message: 'อัปเดตข้อมูลการขายผ่อนเรียบร้อยแล้ว',
      data: updatedOrder,
      stockDeducted: needsStockDeduction
    });

  } catch (error) {
    console.error('❌ Error updating installment order:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูลการขายผ่อน',
      error: error.message
    });
  }
}));

module.exports = router;
