// services/customerService.js

const Customer = require('../models/Customer/Customer');
const mongoose = require('mongoose');

class CustomerService {
  /**
   * ตรวจสอบสถานะลูกค้า (ใหม่/เก่า)
   * @param {string} identifier - taxId หรือ phone number
   * @returns {Object} Customer status information
   */
  static async checkCustomerStatus(identifier) {
    try {
      if (!identifier) {
        throw new Error('Identifier is required');
      }

      const cleanIdentifier = identifier.toString().replace(/-/g, '');

      const customer = await Customer.findOne({
        $or: [
          { 'individual.taxId': identifier },
          { 'corporate.companyTaxId': identifier },
          { 'individual.phone': new RegExp(cleanIdentifier) },
          { 'corporate.corporatePhone': new RegExp(cleanIdentifier) }
        ],
        deleted_at: null
      });

      if (!customer) {
        return {
          exists: false,
          isNewCustomer: true,
          message: 'ลูกค้าใหม่'
        };
      }

      return {
        exists: true,
        isNewCustomer: customer.statistics.isNewCustomer,
        customerId: customer._id,
        displayName: customer.displayName,
        totalPurchases: customer.statistics.totalPurchases || 0,
        totalAmount: customer.statistics.totalAmount || 0,
        lastPurchaseDate: customer.statistics.lastPurchaseDate,
        daysSinceLastPurchase: customer.statistics.lastPurchaseDate
          ? Math.floor((new Date() - new Date(customer.statistics.lastPurchaseDate)) / (1000 * 60 * 60 * 24))
          : null,
        message: customer.statistics.isNewCustomer
          ? 'ลูกค้าใหม่ (ยังไม่มีประวัติการซื้อ)'
          : `ลูกค้าเก่า (ซื้อไปแล้ว ${customer.statistics.totalPurchases} ครั้ง)`
      };
    } catch (error) {
      console.error('CustomerService.checkCustomerStatus error:', error);
      throw new Error(`Error checking customer status: ${error.message}`);
    }
  }

  /**
   * ดึงข้อมูลลูกค้าแบบละเอียด
   * @param {string} customerId - Customer ID
   * @returns {Object} Customer details
   */
  static async getCustomerDetails(customerId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(customerId)) {
        throw new Error('Invalid customer ID');
      }

      const customer = await Customer.findById(customerId)
        .populate('cashSales')
        .populate('installmentOrders');

      if (!customer) {
        return null;
      }

      return {
        basicInfo: {
          _id: customer._id,
          customerType: customer.customerType,
          displayName: customer.displayName,
          contactPhone: customer.contactPhone,
          contactEmail: customer.contactEmail,
          status: customer.status
        },
        statistics: customer.statistics,
        creditInfo: {
          creditLimit: customer.installmentInfo.creditLimit,
          availableCredit: customer.calculateAvailableCredit(),
          activeContracts: customer.installmentInfo.currentActiveContracts
        },
        purchaseHistory: customer.purchaseHistory,
        loyaltyPoints: customer.loyaltyPoints
      };
    } catch (error) {
      console.error('CustomerService.getCustomerDetails error:', error);
      throw new Error(`Error getting customer details: ${error.message}`);
    }
  }

  /**
   * สร้างหรืออัพเดทลูกค้าจากข้อมูลการขาย
   * @param {Object} customerData - ข้อมูลลูกค้า
   * @param {Object} saleData - ข้อมูลการขาย
   * @returns {Object} Customer document
   */
  static async createOrUpdateFromSale(customerData, saleData) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Validate input
      if (!customerData || !saleData) {
        throw new Error('Customer data and sale data are required');
      }

      if (!saleData.type || !['cash_sale', 'installment_new', 'installment_pickup', 'installment_ongoing'].includes(saleData.type)) {
        throw new Error('Invalid sale type');
      }

      // ค้นหาลูกค้าที่มีอยู่
      let customer;
      const searchCriteria = [];

      if (customerData.taxId) {
        searchCriteria.push(
          { 'individual.taxId': customerData.taxId },
          { 'corporate.companyTaxId': customerData.taxId }
        );
      }

      if (customerData.phone) {
        const cleanPhone = customerData.phone.replace(/-/g, '');
        searchCriteria.push(
          { 'individual.phone': new RegExp(cleanPhone) },
          { 'corporate.corporatePhone': new RegExp(cleanPhone) }
        );
      }

      if (searchCriteria.length > 0) {
        customer = await Customer.findOne({
          $or: searchCriteria,
          deleted_at: null
        }).session(session);
      }

      if (!customer) {
        // สร้างลูกค้าใหม่
        const newCustomerData = {
          customerType: customerData.customerType || 'individual',
          createdBy: saleData.userId || null
        };

        if (newCustomerData.customerType === 'individual') {
          newCustomerData.individual = {
            prefix: customerData.prefix || 'นาย',
            firstName: customerData.firstName,
            lastName: customerData.lastName,
            phone: customerData.phone,
            email: customerData.email,
            address: customerData.address || {},
            taxId: customerData.taxId
          };
        } else {
          newCustomerData.corporate = {
            companyName: customerData.companyName,
            companyTaxId: customerData.taxId,
            contactPerson: customerData.contactPerson,
            corporatePhone: customerData.phone,
            corporateEmail: customerData.email,
            companyAddress: customerData.companyAddress
          };
        }

        customer = new Customer(newCustomerData);
        await customer.save({ session });
      } else {
        // อัพเดทข้อมูลที่จำเป็น (optional)
        if (customerData.email && !customer.contactEmail) {
          if (customer.customerType === 'individual') {
            customer.individual.email = customerData.email;
          } else {
            customer.corporate.corporateEmail = customerData.email;
          }
        }

        customer.updatedBy = saleData.userId || null;
      }

      // เพิ่มประวัติการซื้อ
      const purchaseData = {
        type: saleData.type,
        orderId: saleData.orderId,
        orderModel: saleData.orderModel || (saleData.type === 'cash_sale' ? 'CashSale' : 'InstallmentOrder'),
        purchaseDate: saleData.purchaseDate || new Date(),
        amount: saleData.amount || 0,
        branchCode: saleData.branchCode,
        items: saleData.items || []
      };

      // เพิ่มข้อมูลเฉพาะสำหรับการผ่อน
      if (saleData.type === 'installment') {
        purchaseData.contractNo = saleData.contractNo;
        purchaseData.planType = saleData.planType;
      }

      customer.purchaseHistory.push(purchaseData);

      // อัพเดทสถิติ
      if (customer.statistics.isNewCustomer && customer.purchaseHistory.length > 0) {
        customer.statistics.isNewCustomer = false;
        customer.statistics.firstPurchaseDate = purchaseData.purchaseDate;
      }

      customer.statistics.lastPurchaseDate = purchaseData.purchaseDate;
      customer.statistics.totalPurchases = customer.purchaseHistory.length;
      customer.statistics.totalAmount = customer.purchaseHistory.reduce((sum, p) => sum + p.amount, 0);

      // คำนวณแยกตามประเภท
      const cashPurchases = customer.purchaseHistory.filter(p => p.type === 'cash_sale');
              const installmentPurchases = customer.purchaseHistory.filter(p => p.type.startsWith('installment_'));

      customer.statistics.cashPurchases = cashPurchases.length;
      customer.statistics.cashAmount = cashPurchases.reduce((sum, p) => sum + p.amount, 0);
      customer.statistics.installmentPurchases = installmentPurchases.length;
      customer.statistics.installmentAmount = installmentPurchases.reduce((sum, p) => sum + p.amount, 0);

      // คำนวณค่าเฉลี่ย
      if (customer.statistics.totalPurchases > 0) {
        customer.statistics.averageOrderValue = customer.statistics.totalAmount / customer.statistics.totalPurchases;
      }

      // อัพเดทข้อมูลการผ่อน
      if (saleData.type === 'installment') {
        customer.installmentInfo.currentActiveContracts += 1;
        customer.installmentInfo.totalCreditAmount += saleData.amount;

        // เพิ่ม payment plan ถ้ายังไม่มี (แปลง 'custom' เป็น 'manual')
        if (saleData.planType) {
          const normalizedPlanType = saleData.planType === 'custom' ? 'manual' : saleData.planType;
          if (!customer.installmentInfo.paymentPlans.includes(normalizedPlanType)) {
            customer.installmentInfo.paymentPlans.push(normalizedPlanType);
          }
        }
      }

      await customer.save({ session });
      await session.commitTransaction();

      return customer;
    } catch (error) {
      await session.abortTransaction();
      console.error('CustomerService.createOrUpdateFromSale error:', error);
      throw new Error(`Error creating/updating customer from sale: ${error.message}`);
    } finally {
      session.endSession();
    }
  }

  /**
   * อัพเดทวงเงินผ่อน
   * @param {string} customerId - Customer ID
   * @param {number} newLimit - วงเงินใหม่
   * @returns {Object} Updated customer
   */
  static async updateCreditLimit(customerId, newLimit) {
    try {
      const customer = await Customer.findById(customerId);
      if (!customer) {
        throw new Error('Customer not found');
      }

      customer.installmentInfo.creditLimit = newLimit;
      customer.calculateAvailableCredit();
      await customer.save();

      return customer;
    } catch (error) {
      console.error('CustomerService.updateCreditLimit error:', error);
      throw new Error(`Error updating credit limit: ${error.message}`);
    }
  }

  /**
   * ค้นหาลูกค้าที่มีการซื้อซ้ำ
   * @param {Object} criteria - Search criteria
   * @returns {Array} List of duplicate customers
   */
  static async findDuplicateCustomers(criteria = {}) {
    try {
      const pipeline = [
        {
          $match: {
            deleted_at: null,
            ...criteria
          }
        },
        {
          $group: {
            _id: {
              $cond: [
                { $eq: ['$customerType', 'individual'] },
                '$individual.taxId',
                '$corporate.companyTaxId'
              ]
            },
            count: { $sum: 1 },
            customers: { $push: '$$ROOT' }
          }
        },
        {
          $match: { count: { $gt: 1 } }
        },
        {
          $sort: { count: -1 }
        }
      ];

      const duplicates = await Customer.aggregate(pipeline);
      return duplicates;
    } catch (error) {
      console.error('CustomerService.findDuplicateCustomers error:', error);
      throw new Error(`Error finding duplicate customers: ${error.message}`);
    }
  }
}

module.exports = CustomerService;
