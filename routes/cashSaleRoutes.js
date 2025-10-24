/**
 * routes/cashSaleRoutes.js - Routes สำหรับจัดการข้อมูล CashSale
 * ใช้สำหรับระบบบริการหลังการขายในการค้นหาและตรวจสอบข้อมูลการซื้อ
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Import models
const CashSale = require('../models/POS/CashSale');
const Customer = require('../models/Customer/Customer');

// Middleware สำหรับ error handling
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * GET /api/cash-sales
 * ดึงรายการการขายสดทั้งหมด
 */
router.get('/', asyncHandler(async (req, res) => {
  console.log('💰 GET /api/cash-sales');

  try {
    const {
      page = 1,
      limit = 20,
      branchCode,
      customerPhone,
      customerName,
      invoiceNo,
      startDate,
      endDate
    } = req.query;

    // สร้าง query
    const query = {};

    if (branchCode) {
      query.branchCode = branchCode;
    }

    if (customerPhone) {
      query.$or = [
        { 'individual.phone': { $regex: customerPhone, $options: 'i' } },
        { 'corporate.corporatePhone': { $regex: customerPhone, $options: 'i' } }
      ];
    }

    if (customerName) {
      query.$or = [
        ...(query.$or || []),
        { 'individual.firstName': { $regex: customerName, $options: 'i' } },
        { 'individual.lastName': { $regex: customerName, $options: 'i' } },
        { 'corporate.companyName': { $regex: customerName, $options: 'i' } }
      ];
    }

    if (invoiceNo) {
      query.invoiceNo = { $regex: invoiceNo, $options: 'i' };
    }

    // Date range filter
    if (startDate || endDate) {
      query.soldAt = {};
      if (startDate) query.soldAt.$gte = new Date(startDate);
      if (endDate) query.soldAt.$lte = new Date(endDate);
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;

    const [cashSales, totalCount] = await Promise.all([
      CashSale.find(query)
        .populate('customer')
        .sort({ soldAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      CashSale.countDocuments(query)
    ]);

    // Format response data
    const formattedSales = cashSales.map(sale => ({
      _id: sale._id,
      invoiceNo: sale.invoiceNo,
      soldAt: sale.soldAt,
      customerType: sale.customerType,
      customerName: sale.customerType === 'individual'
        ? `${sale.individual?.prefix || ''} ${sale.individual?.firstName || ''} ${sale.individual?.lastName || ''}`.trim()
        : sale.corporate?.companyName || '',
      customerPhone: sale.customerType === 'individual'
        ? sale.individual?.phone
        : sale.corporate?.corporatePhone,
      customerTaxId: sale.customerType === 'individual'
        ? sale.individual?.taxId
        : sale.corporate?.companyTaxId,
      totalAmount: sale.totalAmount,
      items: sale.items,
      branchCode: sale.branchCode,
      hasWarranty: sale.hasWarranty,
      warrantyStartDate: sale.warrantyStartDate,
      warrantyEndDate: sale.warrantyEndDate
    }));

    res.json({
      success: true,
      data: formattedSales,
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
    console.error('❌ Error getting cash sales:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการขายสด',
      error: error.message
    });
  }
}));

/**
 * GET /api/cash-sales/:id
 * ดึงข้อมูลการขายสดตาม ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
  console.log('💰 GET /api/cash-sales/:id');

  try {
    const { id } = req.params;

    const cashSale = await CashSale.findById(id)
      .populate('customer')
      .lean();

    if (!cashSale) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลการขายสด'
      });
    }

    // Format response
    const formattedSale = {
      _id: cashSale._id,
      invoiceNo: cashSale.invoiceNo,
      soldAt: cashSale.soldAt,
      customerType: cashSale.customerType,
      customer: {
        name: cashSale.customerType === 'individual'
          ? `${cashSale.individual?.prefix || ''} ${cashSale.individual?.firstName || ''} ${cashSale.individual?.lastName || ''}`.trim()
          : cashSale.corporate?.companyName || '',
        phone: cashSale.customerType === 'individual'
          ? cashSale.individual?.phone
          : cashSale.corporate?.corporatePhone,
        taxId: cashSale.customerType === 'individual'
          ? cashSale.individual?.taxId
          : cashSale.corporate?.companyTaxId,
        email: cashSale.customerType === 'individual'
          ? cashSale.individual?.email
          : cashSale.corporate?.email,
        address: cashSale.customerType === 'individual'
          ? cashSale.individual?.address
          : cashSale.corporate?.companyAddress
      },
      items: cashSale.items || [],
      totalAmount: cashSale.totalAmount,
      subTotal: cashSale.subTotal,
      vatAmount: cashSale.vatAmount,
      discount: cashSale.discount,
      branchCode: cashSale.branchCode,
      staffName: cashSale.staffName,
      paymentMethod: cashSale.paymentMethod,
      status: cashSale.status,
      hasWarranty: cashSale.hasWarranty,
      warrantyStartDate: cashSale.warrantyStartDate,
      warrantyEndDate: cashSale.warrantyEndDate,
      eligibleServices: cashSale.eligibleServices,
      serviceUsageCount: cashSale.serviceUsageCount
    };

    res.json({
      success: true,
      data: formattedSale
    });

  } catch (error) {
    console.error('❌ Error getting cash sale detail:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงรายละเอียดการขายสด',
      error: error.message
    });
  }
}));

/**
 * GET /api/cash-sales/search
 * ค้นหาการขายสดสำหรับระบบบริการ
 */
router.get('/search', asyncHandler(async (req, res) => {
  console.log('🔍 GET /api/cash-sales/search');

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
          { 'individual.phone': { $regex: q, $options: 'i' } },
          { 'corporate.corporatePhone': { $regex: q, $options: 'i' } }
        );
      } else {
        // ถ้าเป็นตัวอักษร ค้นหาเป็นชื่อ
        searchQueries.push(
          { 'individual.firstName': { $regex: q, $options: 'i' } },
          { 'individual.lastName': { $regex: q, $options: 'i' } },
          { 'corporate.companyName': { $regex: q, $options: 'i' } }
        );
      }
    }

    // ค้นหาเฉพาะ
    if (phone) {
      searchQueries.push(
        { 'individual.phone': { $regex: phone, $options: 'i' } },
        { 'corporate.corporatePhone': { $regex: phone, $options: 'i' } }
      );
    }

    if (taxId) {
      searchQueries.push(
        { 'individual.taxId': { $regex: taxId, $options: 'i' } },
        { 'corporate.companyTaxId': { $regex: taxId, $options: 'i' } }
      );
    }

    if (customerName) {
      searchQueries.push(
        { 'individual.firstName': { $regex: customerName, $options: 'i' } },
        { 'individual.lastName': { $regex: customerName, $options: 'i' } },
        { 'corporate.companyName': { $regex: customerName, $options: 'i' } }
      );
    }

    const query = { $or: searchQueries };

    // เพิ่มเงื่อนไขสาขา
    if (branchCode) {
      query.branchCode = branchCode;
    }

    // ค้นหาข้อมูล
    const cashSales = await CashSale.find(query)
      .populate('customer')
      .sort({ soldAt: -1 })
      .limit(50)
      .lean();

    // Format ข้อมูลสำหรับระบบบริการ
    const serviceEligibleSales = cashSales.map(sale => ({
      purchaseId: sale._id,
      purchaseType: 'cash',
      purchaseDate: sale.soldAt || sale.createdAt,
      invoiceNumber: sale.invoiceNo,
      customer: {
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
          : sale.corporate?.email,
        customerType: sale.customerType
      },
      items: (sale.items || []).map(item => ({
        name: item.name || 'ไม่ระบุ',
        price: item.price || 0,
        quantity: item.quantity || 1,
        total: item.total || 0
      })),
      amounts: {
        subTotal: sale.subTotal || 0,
        vatAmount: sale.vatAmount || 0,
        discount: sale.discount || 0,
        totalAmount: sale.totalAmount || 0
      },
      warranty: {
        hasWarranty: sale.hasWarranty !== false, // default true
        startDate: sale.warrantyStartDate || sale.soldAt,
        endDate: sale.warrantyEndDate || new Date(new Date(sale.soldAt || sale.createdAt).getTime() + 365 * 24 * 60 * 60 * 1000)
      },
      serviceUsage: sale.serviceUsageCount || {},
      branchCode: sale.branchCode,
      staffName: sale.staffName
    }));

    res.json({
      success: true,
      data: serviceEligibleSales,
      count: serviceEligibleSales.length,
      message: serviceEligibleSales.length > 0
        ? `พบข้อมูลการขายสด ${serviceEligibleSales.length} รายการ`
        : 'ไม่พบข้อมูลการขายสด'
    });

  } catch (error) {
    console.error('❌ Error searching cash sales:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการค้นหาข้อมูลการขายสด',
      error: error.message
    });
  }
}));

/**
 * GET /api/cash-sales/customer/:customerId
 * ดึงประวัติการซื้อของลูกค้าคนหนึ่ง
 */
router.get('/customer/:customerId', asyncHandler(async (req, res) => {
  console.log('👤 GET /api/cash-sales/customer/:customerId');

  try {
    const { customerId } = req.params;

    const cashSales = await CashSale.find({ customer: customerId })
      .populate('customer')
      .sort({ soldAt: -1 })
      .lean();

    res.json({
      success: true,
      data: cashSales,
      count: cashSales.length
    });

  } catch (error) {
    console.error('❌ Error getting customer cash sales:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงประวัติการซื้อ',
      error: error.message
    });
  }
}));

/**
 * GET /api/cash-sales/branch/:branchCode/recent
 * ดึงการขายสดล่าสุดของสาขา
 */
router.get('/branch/:branchCode/recent', asyncHandler(async (req, res) => {
  console.log('🏢 GET /api/cash-sales/branch/:branchCode/recent');

  try {
    const { branchCode } = req.params;
    const { limit = 10 } = req.query;

    const recentSales = await CashSale.find({ branchCode })
      .populate('customer')
      .sort({ soldAt: -1 })
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      data: recentSales,
      count: recentSales.length
    });

  } catch (error) {
    console.error('❌ Error getting recent cash sales:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการขายล่าสุด',
      error: error.message
    });
  }
}));

/**
 * GET /api/cash-sales/warranty-eligible
 * ดึงการขายสดที่มีสิทธิ์ใช้บริการประกัน
 */
router.get('/warranty-eligible', asyncHandler(async (req, res) => {
  console.log('🛡️ GET /api/cash-sales/warranty-eligible');

  try {
    const { branchCode, customerPhone } = req.query;

    // หาการขายที่อยู่ในประกัน (ภายใน 1 ปี)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const query = {
      soldAt: { $gte: oneYearAgo },
      hasWarranty: { $ne: false } // ไม่ใช่ false (รวม true และ undefined)
    };

    if (branchCode) {
      query.branchCode = branchCode;
    }

    if (customerPhone) {
      query.$or = [
        { 'individual.phone': { $regex: customerPhone, $options: 'i' } },
        { 'corporate.corporatePhone': { $regex: customerPhone, $options: 'i' } }
      ];
    }

    const eligibleSales = await CashSale.find(query)
      .populate('customer')
      .sort({ soldAt: -1 })
      .lean();

    // คำนวณวันหมดประกัน
    const salesWithWarranty = eligibleSales.map(sale => {
      const warrantyEndDate = sale.warrantyEndDate ||
        new Date(new Date(sale.soldAt).getTime() + 365 * 24 * 60 * 60 * 1000);

      return {
        ...sale,
        warrantyEndDate,
        warrantyValid: new Date() <= warrantyEndDate,
        warrantyDaysRemaining: Math.max(0, Math.ceil((warrantyEndDate - new Date()) / (1000 * 60 * 60 * 24)))
      };
    });

    res.json({
      success: true,
      data: salesWithWarranty,
      count: salesWithWarranty.length
    });

  } catch (error) {
    console.error('❌ Error getting warranty eligible sales:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการขายที่มีประกัน',
      error: error.message
    });
  }
}));

/**
 * PUT /api/cash-sales/:id/service-usage
 * อัปเดตการใช้บริการของการขายสด
 */
router.put('/:id/service-usage', asyncHandler(async (req, res) => {
  console.log('📝 PUT /api/cash-sales/:id/service-usage');

  try {
    const { id } = req.params;
    const { serviceType, increment = 1 } = req.body;

    if (!serviceType) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุประเภทบริการ'
      });
    }

    const cashSale = await CashSale.findById(id);

    if (!cashSale) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลการขายสด'
      });
    }

    // อัปเดตการใช้บริการ
    if (!cashSale.serviceUsageCount) {
      cashSale.serviceUsageCount = new Map();
    }

    const currentUsage = cashSale.serviceUsageCount.get(serviceType) || 0;
    cashSale.serviceUsageCount.set(serviceType, currentUsage + increment);

    await cashSale.save();

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
 * GET /api/cash-sales/statistics
 * สถิติการขายสด
 */
router.get('/statistics', asyncHandler(async (req, res) => {
  console.log('📊 GET /api/cash-sales/statistics');

  try {
    const { branchCode, startDate, endDate } = req.query;

    const matchQuery = {};

    if (branchCode) {
      matchQuery.branchCode = branchCode;
    }

    if (startDate || endDate) {
      matchQuery.soldAt = {};
      if (startDate) matchQuery.soldAt.$gte = new Date(startDate);
      if (endDate) matchQuery.soldAt.$lte = new Date(endDate);
    }

    const stats = await CashSale.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$branchCode',
          totalSales: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          avgAmount: { $avg: '$totalAmount' },
          uniqueCustomers: { $addToSet: '$customer' }
        }
      },
      {
        $project: {
          branchCode: '$_id',
          totalSales: 1,
          totalAmount: 1,
          avgAmount: { $round: ['$avgAmount', 2] },
          uniqueCustomerCount: { $size: '$uniqueCustomers' }
        }
      }
    ]);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Error getting cash sale statistics:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงสถิติการขายสด',
      error: error.message
    });
  }
}));

module.exports = router;
