const ServiceHistory = require('../models/ServiceHistory');
const Sale = require('../models/POS/Sale');
const Installment = require('../models/Installment/InstallmentOrder');
const Customer = require('../models/Customer/Customer');

/**
 * ดึงประวัติการให้บริการตามสาขา
 */
exports.getServiceHistory = async (req, res) => {
  try {
    const { branchCode } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // สร้าง query filter
    const query = {};
    if (branchCode) {
      query.branchCode = branchCode;
    }

    // ดึงข้อมูลพร้อม pagination
    const [serviceHistory, totalCount] = await Promise.all([
      ServiceHistory.find(query)
        .sort({ serviceDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ServiceHistory.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: serviceHistory,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalRecords: totalCount,
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get service history error:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงประวัติการให้บริการ',
      details: error.message
    });
  }
};

/**
 * ตรวจสอบสิทธิ์การใช้บริการของลูกค้า
 */
exports.checkServiceEligibility = async (req, res) => {
  try {
    const { customerName, phone, idCard } = req.query;

    if (!customerName && !phone && !idCard) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุชื่อลูกค้า เบอร์โทรศัพท์ หรือเลขบัตรประชาชน'
      });
    }

    // ค้นหาลูกค้า
    const customerQuery = {};
    if (phone) {
      customerQuery.phone = { $regex: phone, $options: 'i' };
    }
    if (idCard) {
      customerQuery.taxId = idCard;
    }
    if (customerName) {
      customerQuery.name = { $regex: customerName, $options: 'i' };
    }

    const customers = await Customer.find(customerQuery).lean();

    if (!customers || customers.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: 'ไม่พบข้อมูลลูกค้า'
      });
    }

    // สำหรับลูกค้าแต่ละคน ค้นหาการซื้อที่มีประกัน
    const eligibilityData = [];

    for (const customer of customers) {
      // ค้นหาการซื้อสด
      const cashSales = await Sale.find({
        customerId: customer._id,
        warrantyStartDate: { $exists: true, $ne: null }
      }).lean();

      // ค้นหาการซื้อผ่อน
      const installmentSales = await Installment.find({
        customerId: customer._id,
        warrantyStartDate: { $exists: true, $ne: null }
      }).lean();

      // รวมการซื้อทั้งหมด
      const allPurchases = [
        ...cashSales.map(sale => ({ ...sale, purchaseType: 'cash' })),
        ...installmentSales.map(installment => ({ ...installment, purchaseType: 'installment' }))
      ];

      // สำหรับการซื้อแต่ละครั้ง ตรวจสอบสิทธิ์
      for (const purchase of allPurchases) {
        const warrantyEndDate = new Date(purchase.warrantyStartDate);
        warrantyEndDate.setFullYear(warrantyEndDate.getFullYear() + 1);

        // ตรวจสอบว่าประกันยังไม่หมดอายุ
        if (new Date() <= warrantyEndDate) {
          // นับการใช้บริการแต่ละประเภท
          const serviceUsageCount = {};

          const serviceTypes = ['phone-film', 'ipad-film', 'phone-warranty', 'ipad-warranty'];
          for (const serviceType of serviceTypes) {
            const count = await ServiceHistory.getUsageCount(purchase._id, serviceType);
            serviceUsageCount[serviceType] = count;
          }

          eligibilityData.push({
            customer: {
              id: customer._id,
              name: customer.name,
              phone: customer.phone,
              taxId: customer.taxId
            },
            purchase: {
              purchaseId: purchase._id,
              purchaseType: purchase.purchaseType,
              purchaseDate: purchase.warrantyStartDate,
              warrantyEndDate: warrantyEndDate,
              items: purchase.items || [],
              serviceUsageCount: serviceUsageCount
            }
          });
        }
      }
    }

    // Group by customer
    const customerGroups = {};
    eligibilityData.forEach(item => {
      const customerId = item.customer.id;
      if (!customerGroups[customerId]) {
        customerGroups[customerId] = {
          customer: item.customer,
          purchases: []
        };
      }
      customerGroups[customerId].purchases.push(item.purchase);
    });

    const result = Object.values(customerGroups);

    res.json({
      success: true,
      data: result,
      message: result.length > 0 ? `พบลูกค้า ${result.length} รายที่มีสิทธิ์ใช้บริการ` : 'ไม่พบลูกค้าที่มีสิทธิ์ใช้บริการ'
    });

  } catch (error) {
    console.error('Check service eligibility error:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์การใช้บริการ',
      details: error.message
    });
  }
};

/**
 * บันทึกการใช้บริการ
 */
exports.recordServiceUsage = async (req, res) => {
  try {
    const {
      purchaseId,
      purchaseType,
      customerId,
      deviceType,
      deviceModel,
      deviceImei,
      serviceType,
      serviceReason,
      serviceDate,
      branchCode,
      staffName,
      notes
    } = req.body;

    // Validate required fields
    const requiredFields = [
      'purchaseId', 'purchaseType', 'customerId', 'deviceType',
      'deviceModel', 'serviceType', 'serviceReason', 'branchCode', 'staffName'
    ];

    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `ข้อมูลไม่ครบถ้วน: ${missingFields.join(', ')}`
      });
    }

    // ตรวจสอบว่าการซื้อมีอยู่จริง
    let purchase;
    if (purchaseType === 'cash') {
      purchase = await Sale.findById(purchaseId);
    } else if (purchaseType === 'installment') {
      purchase = await Installment.findById(purchaseId);
    }

    if (!purchase) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบข้อมูลการซื้อ'
      });
    }

    // ตรวจสอบลูกค้า
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบข้อมูลลูกค้า'
      });
    }

    // ตรวจสอบประกันยังไม่หมดอายุ
    if (!purchase.warrantyStartDate) {
      return res.status(400).json({
        success: false,
        error: 'การซื้อนี้ไม่มีประกัน'
      });
    }

    const warrantyEndDate = new Date(purchase.warrantyStartDate);
    warrantyEndDate.setFullYear(warrantyEndDate.getFullYear() + 1);

    if (new Date() > warrantyEndDate) {
      return res.status(400).json({
        success: false,
        error: 'ประกันหมดอายุแล้ว'
      });
    }

    // ตรวจสอบสิทธิ์การใช้บริการ
    const currentUsageCount = await ServiceHistory.getUsageCount(purchaseId, serviceType);
    const maxUsage = {
      'phone-film': 10,
      'ipad-film': 3,
      'phone-warranty': 1,
      'ipad-warranty': 1
    };

    if (currentUsageCount >= (maxUsage[serviceType] || 1)) {
      return res.status(400).json({
        success: false,
        error: `เกินสิทธิ์การใช้บริการ (ใช้ไปแล้ว ${currentUsageCount}/${maxUsage[serviceType]} ครั้ง)`
      });
    }

    // สร้างบันทึกการใช้บริการ
    const serviceHistory = new ServiceHistory({
      purchaseId,
      purchaseType,
      customerId,
      customerInfo: {
        name: customer.name,
        phone: customer.phone,
        idCard: customer.taxId
      },
      device: {
        type: deviceType,
        model: deviceModel,
        imei: deviceImei
      },
      serviceType,
      serviceReason,
      serviceDate: serviceDate ? new Date(serviceDate) : new Date(),
      warrantyStartDate: purchase.warrantyStartDate,
      warrantyEndDate,
      branchCode,
      staffName,
      usageCount: currentUsageCount + 1,
      notes,
      createdBy: req.user?.name || staffName,
      updatedBy: req.user?.name || staffName
    });

    await serviceHistory.save();

    res.status(201).json({
      success: true,
      data: serviceHistory,
      message: 'บันทึกการใช้บริการเรียบร้อยแล้ว'
    });

  } catch (error) {
    console.error('Record service usage error:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการบันทึกการใช้บริการ',
      details: error.message
    });
  }
};

/**
 * ดึงประวัติการใช้บริการของลูกค้า
 */
exports.getCustomerServiceHistory = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { branchCode } = req.query;

    const serviceHistory = await ServiceHistory.getCustomerServiceHistory(customerId, branchCode);

    res.json({
      success: true,
      data: serviceHistory
    });

  } catch (error) {
    console.error('Get customer service history error:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงประวัติการใช้บริการ',
      details: error.message
    });
  }
};

/**
 * อัปเดตสถานะการใช้บริการ
 */
exports.updateServiceStatus = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { status, notes } = req.body;

    const serviceHistory = await ServiceHistory.findById(serviceId);
    if (!serviceHistory) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบข้อมูลการใช้บริการ'
      });
    }

    serviceHistory.status = status;
    if (notes) {
      serviceHistory.notes = notes;
    }
    serviceHistory.updatedBy = req.user?.name || 'System';

    await serviceHistory.save();

    res.json({
      success: true,
      data: serviceHistory,
      message: 'อัปเดตสถานะเรียบร้อยแล้ว'
    });

  } catch (error) {
    console.error('Update service status error:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการอัปเดตสถานะ',
      details: error.message
    });
  }
};

/**
 * ลบการใช้บริการ (Soft delete)
 */
exports.deleteServiceRecord = async (req, res) => {
  try {
    const { serviceId } = req.params;

    const serviceHistory = await ServiceHistory.findById(serviceId);
    if (!serviceHistory) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบข้อมูลการใช้บริการ'
      });
    }

    serviceHistory.status = 'cancelled';
    serviceHistory.updatedBy = req.user?.name || 'System';
    await serviceHistory.save();

    res.json({
      success: true,
      message: 'ยกเลิกการใช้บริการเรียบร้อยแล้ว'
    });

  } catch (error) {
    console.error('Delete service record error:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการยกเลิกการใช้บริการ',
      details: error.message
    });
  }
};

/**
 * สถิติการใช้บริการ
 */
exports.getServiceStatistics = async (req, res) => {
  try {
    const { branchCode, startDate, endDate } = req.query;

    const matchQuery = {};
    if (branchCode) {
      matchQuery.branchCode = branchCode;
    }
    if (startDate && endDate) {
      matchQuery.serviceDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const statistics = await ServiceHistory.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$serviceType',
          count: { $sum: 1 },
          totalUsage: { $sum: '$usageCount' }
        }
      },
      {
        $project: {
          serviceType: '$_id',
          count: 1,
          totalUsage: 1,
          _id: 0
        }
      }
    ]);

    const totalServices = await ServiceHistory.countDocuments(matchQuery);

    res.json({
      success: true,
      data: {
        totalServices,
        byServiceType: statistics
      }
    });

  } catch (error) {
    console.error('Get service statistics error:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงสถิติ',
      details: error.message
    });
  }
};