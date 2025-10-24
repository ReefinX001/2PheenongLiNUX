// controllers/serviceController.js
const ServiceHistory = require('../../models/Service/ServiceHistory');
const Customer = require('../../models/Customer/Customer');
const CashSale = require('../../models/POS/CashSale');
const InstallmentOrder = require('../../models/Installment/InstallmentOrder');

class ServiceController {

  // ค้นหาสิทธิ์การใช้บริการด้วยข้อมูลลูกค้า
  static async checkServiceEligibility(req, res) {
    try {
      const { customerName, phone, idCard } = req.query;

      if (!customerName && !phone && !idCard) {
        return res.status(400).json({
          success: false,
          error: 'กรุณาระบุชื่อลูกค้า เบอร์โทร หรือเลขบัตรประชาชน'
        });
      }

      // ค้นหาลูกค้า
      let customerFilter = {};
      if (idCard) {
        customerFilter = {
          $or: [
            { 'individual.taxId': idCard },
            { 'corporate.companyTaxId': idCard }
          ]
        };
      } else if (phone) {
        customerFilter = {
          $or: [
            { 'individual.phone': phone },
            { 'corporate.corporatePhone': phone }
          ]
        };
      } else if (customerName) {
        customerFilter = {
          $or: [
            { 'individual.firstName': { $regex: customerName, $options: 'i' } },
            { 'individual.lastName': { $regex: customerName, $options: 'i' } },
            { 'corporate.companyName': { $regex: customerName, $options: 'i' } }
          ]
        };
      }

      const customers = await Customer.find(customerFilter).limit(100).lean();

      if (!customers.length) {
        return res.json({
          success: true,
          data: [],
          message: 'ไม่พบข้อมูลลูกค้า'
        });
      }

      // ค้นหาการซื้อของลูกค้าแต่ละคน
      const eligibilityData = [];

      for (const customer of customers) {
        // ค้นหาการซื้อสด
        const cashSales = await CashSale.find({
          customer: customer._id,
          hasWarranty: true,
          warrantyEndDate: { $gte: new Date() }
        }).sort({ createdAt: -1 });

        // ค้นหาการซื้อผ่อน
        const installmentOrders = await InstallmentOrder.find({
          customer: customer._id,
          hasWarranty: true,
          warrantyEndDate: { $gte: new Date() }
        }).sort({ createdAt: -1 });

        // ค้นหาประวัติการใช้บริการ
        const serviceHistory = await ServiceHistory.find({
          customer: customer._id
        }).sort({ serviceDate: -1 });

        // สร้างข้อมูลสิทธิ์
        const purchases = [
          ...cashSales.map(sale => ({
            purchaseId: sale._id,
            purchaseType: 'cash',
            purchaseDate: sale.soldAt || sale.createdAt,
            items: sale.items || sale.products || [],
            warrantyEndDate: sale.warrantyEndDate,
            eligibleServices: sale.eligibleServices || [],
            serviceUsageCount: sale.serviceUsageCount || {}
          })),
          ...installmentOrders.map(order => ({
            purchaseId: order._id,
            purchaseType: 'installment',
            purchaseDate: order.createdAt,
            items: order.items || [],
            warrantyEndDate: order.warrantyEndDate,
            eligibleServices: order.eligibleServices || [],
            serviceUsageCount: order.serviceUsageCount || {}
          }))
        ];

        eligibilityData.push({
          customer: {
            id: customer._id,
            name: customer.customerType === 'individual'
              ? `${customer.individual?.prefix || ''} ${customer.individual?.firstName || ''} ${customer.individual?.lastName || ''}`.trim()
              : customer.corporate?.companyName || 'Unknown Company',
            phone: customer.customerType === 'individual'
              ? customer.individual?.phone || ''
              : customer.corporate?.corporatePhone || '',
            taxId: customer.customerType === 'individual'
              ? customer.individual?.taxId || ''
              : customer.corporate?.companyTaxId || ''
          },
          purchases,
          serviceHistory: serviceHistory.map(service => ({
            serviceType: service.serviceType,
            serviceDate: service.serviceDate,
            usageCount: service.usageCount,
            remainingUsage: service.remainingUsage,
            deviceModel: service.device?.model || '',
            deviceImei: service.device?.imei || ''
          }))
        });
      }

      return res.json({
        success: true,
        data: eligibilityData
      });

    } catch (error) {
      console.error('checkServiceEligibility error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // บันทึกการใช้บริการ
  static async recordServiceUsage(req, res) {
    try {
      // console.log('🔧 recordServiceUsage received payload:', req.body);

      const {
        purchaseId,
        purchaseType, // 'cash' หรือ 'installment'
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

      // ตรวจสอบข้อมูลที่จำเป็น
      if (!purchaseId || !purchaseType || !customerId || !serviceType || !serviceReason || !staffName) {
        return res.status(400).json({
          success: false,
          error: 'ข้อมูลไม่ครบถ้วน: ต้องมี purchaseId, purchaseType, customerId, serviceType, serviceReason, และ staffName'
        });
      }

      // ตรวจสอบการซื้อ
      let purchase;
      let modelName = purchaseType === 'cash' ? 'CashSale' : 'InstallmentOrder';

      if (purchaseType === 'cash') {
        purchase = await CashSale.findById(purchaseId).lean();
      } else {
        purchase = await InstallmentOrder.findById(purchaseId).lean();
      }

      if (!purchase) {
        return res.status(404).json({
          success: false,
          error: 'ไม่พบข้อมูลการซื้อ'
        });
      }

      // ตรวจสอบสิทธิ์
      const now = new Date();
      if (purchase.warrantyEndDate < now) {
        return res.status(400).json({
          success: false,
          error: 'ประกันหมดอายุแล้ว'
        });
      }

      // ตรวจสอบจำนวนครั้งที่ใช้
      const serviceUsageCount = purchase.serviceUsageCount || {};
      const currentUsage = serviceUsageCount[serviceType] || 0;
      const maxUsage = getMaxUsageForService(serviceType);

      if (currentUsage >= maxUsage) {
        return res.status(400).json({
          success: false,
          error: `ใช้สิทธิ์ครบแล้ว (${currentUsage}/${maxUsage} ครั้ง)`
        });
      }

      // หาข้อมูลลูกค้า
      const customer = await Customer.findById(customerId).lean();
      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'ไม่พบข้อมูลลูกค้า'
        });
      }

      // บันทึกประวัติการใช้บริการ
      const serviceHistory = await ServiceHistory.create({
        purchaseReference: purchaseId,
        purchaseType: modelName,
        customer: customerId,
        customerInfo: {
          name: customer.customerType === 'individual'
            ? `${customer.individual.prefix || ''} ${customer.individual.firstName} ${customer.individual.lastName}`.trim()
            : customer.corporate.companyName,
          phone: customer.customerType === 'individual'
            ? customer.individual.phone
            : customer.corporate.corporatePhone,
          idCard: customer.customerType === 'individual'
            ? customer.individual.taxId
            : customer.corporate.companyTaxId
        },
        device: {
          type: deviceType,
          model: deviceModel,
          imei: deviceImei,
          purchaseDate: purchase.createdAt
        },
        serviceType,
        serviceReason,
        serviceDate: serviceDate ? new Date(serviceDate) : new Date(),
        branchCode,
        staffName,
        staffId: req.user?._id,
        usageCount: currentUsage + 1,
        maxUsage,
        remainingUsage: maxUsage - (currentUsage + 1),
        warrantyStartDate: purchase.warrantyStartDate,
        warrantyEndDate: purchase.warrantyEndDate,
        notes
      });

      // อัปเดตจำนวนการใช้ในการซื้อ
      serviceUsageCount[serviceType] = currentUsage + 1;
      purchase.serviceUsageCount = serviceUsageCount;
      await purchase.save();

      return res.json({
        success: true,
        data: serviceHistory,
        message: 'บันทึกการใช้บริการสำเร็จ'
      });

    } catch (error) {
      console.error('recordServiceUsage error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // ดูประวัติการใช้บริการ
  static async getServiceHistory(req, res) {
    try {
      const { customerId, deviceImei, serviceType, branchCode, startDate, endDate } = req.query;

      const filter = {};

      if (customerId) filter.customer = customerId;
      if (deviceImei) filter['device.imei'] = deviceImei;
      if (serviceType) filter.serviceType = serviceType;
      if (branchCode) filter.branchCode = branchCode;

      if (startDate || endDate) {
        filter.serviceDate = {};
        if (startDate) filter.serviceDate.$gte = new Date(startDate);
        if (endDate) filter.serviceDate.$lte = new Date(endDate);
      }

      const serviceHistory = await ServiceHistory.find(filter).limit(100).lean()
        .populate('customer', 'individual corporate customerType')
        .populate('purchaseReference')
        .sort({ serviceDate: -1 });

      return res.json({
        success: true,
        data: serviceHistory
      });

    } catch (error) {
      console.error('getServiceHistory error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

// Helper function
function getMaxUsageForService(serviceType) {
  const maxUsageMap = {
    'phone-film': 10,
    'ipad-film': 3,
    'phone-warranty': 1,
    'ipad-warranty': 1
  };
  return maxUsageMap[serviceType] || 1;
}

module.exports = ServiceController;
