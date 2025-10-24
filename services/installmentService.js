/**
 * Installment Service
 * Modular service for installment business logic
 * @version 1.0.0
 */

const mongoose = require('mongoose');
const InstallmentOrder = require('../models/Installment/InstallmentOrder');
const InstallmentPayment = require('../models/Installment/InstallmentPayment');
const InstallmentCounter = require('../models/Installment/InstallmentCounter');
const Customer = require('../models/Customer/Customer');
const BranchStock = require('../models/POS/BranchStock');
const BranchStockHistory = require('../models/POS/BranchStockHistory');

class InstallmentService {

  /**
   * Generate next contract number
   * @returns {Promise<string>} Contract number
   */
  static async generateContractNumber() {
    const now = new Date();
    const yearCE = now.getFullYear();
    const month = now.getMonth() + 1;
    const yearBE = yearCE + 543;

    const counter = await InstallmentCounter.findOneAndUpdate(
      { name: 'installment', year: yearBE, month },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const seqStr = String(counter.seq).padStart(4, '0');
    return `INST${yearBE}${String(month).padStart(2, '0')}${seqStr}`;
  }

  /**
   * Validate installment order data
   * @param {Object} orderData - Order data to validate
   * @returns {Object} Validation result
   */
  static validateOrderData(orderData) {
    const errors = [];

    if (!orderData.customer && !orderData.customerId) {
      errors.push('Customer information is required');
    }

    if (!orderData.totalAmount || orderData.totalAmount <= 0) {
      errors.push('Total amount must be greater than 0');
    }

    if (!orderData.monthlyPayment || orderData.monthlyPayment <= 0) {
      errors.push('Monthly payment must be greater than 0');
    }

    if (!orderData.installmentMonths || orderData.installmentMonths <= 0) {
      errors.push('Installment months must be greater than 0');
    }

    if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
      errors.push('At least one item is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Create installment order
   * @param {Object} orderData - Order data
   * @param {Object} user - Current user
   * @returns {Promise<Object>} Created order result
   */
  static async createOrder(orderData, user) {
    const session = await mongoose.startSession();

    try {
      return await session.withTransaction(async () => {
        console.log('📝 Creating installment order...');

        // Validate input data
        const validation = this.validateOrderData(orderData);
        if (!validation.isValid) {
          throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }

        // Generate contract number
        const contractNo = await this.generateContractNumber();

        // Process customer
        let customer;
        if (orderData.customerId) {
          customer = await Customer.findById(orderData.customerId).session(session);
          if (!customer) {
            throw new Error('Customer not found');
          }
        } else {
          // Create new customer if not exists
          customer = await this.createOrUpdateCustomer(orderData.customer, session);
        }

        // Calculate financial details
        const financialDetails = this.calculateFinancialDetails(orderData);

        // Create installment order
        const orderDoc = {
          contractNo,
          customer: customer._id,
          customerName: this.getCustomerName(customer),
          customerPhone: this.getCustomerPhone(customer),
          customerAddress: this.getCustomerAddress(customer),
          branchId: orderData.branchId,
          branch_code: orderData.branch_code || 'default',
          ...financialDetails,
          items: orderData.items,
          status: 'pending',
          approvalStatus: 'pending',
          createdBy: user.id,
          notes: orderData.notes || ''
        };

        const order = await InstallmentOrder.create([orderDoc], { session });

        // Generate payment schedule
        await this.generatePaymentSchedule(order[0]._id, financialDetails, session);

        // Reserve stock if required
        if (orderData.reserveStock) {
          await this.reserveStock(order[0]._id, orderData.items, orderData.branch_code, user.id, session);
        }

        console.log('✅ Installment order created:', contractNo);

        return {
          success: true,
          data: {
            id: order[0]._id,
            contractNo: order[0].contractNo,
            customer: {
              id: customer._id,
              name: orderDoc.customerName,
              phone: orderDoc.customerPhone
            },
            totalAmount: orderDoc.totalAmount,
            monthlyPayment: orderDoc.monthlyPayment,
            installmentMonths: orderDoc.installmentMonths,
            status: orderDoc.status,
            createdAt: order[0].createdAt
          }
        };
      });

    } catch (error) {
      console.error('❌ Error creating installment order:', error);
      return {
        success: false,
        error: error.message
      };
    } finally {
      await session.endSession();
    }
  }

  /**
   * Update installment order
   * @param {string} orderId - Order ID
   * @param {Object} updateData - Update data
   * @param {Object} user - Current user
   * @returns {Promise<Object>} Update result
   */
  static async updateOrder(orderId, updateData, user) {
    try {
      console.log(`📝 Updating installment order: ${orderId}`);

      const order = await InstallmentOrder.findById(orderId);
      if (!order) {
        return {
          success: false,
          error: 'Installment order not found',
          statusCode: 404
        };
      }

      // Check if order can be updated
      if (order.status === 'completed' || order.status === 'cancelled') {
        return {
          success: false,
          error: 'Cannot update completed or cancelled order',
          statusCode: 400
        };
      }

      // Update fields
      const allowedFields = [
        'customerName', 'customerPhone', 'customerAddress',
        'totalAmount', 'monthlyPayment', 'installmentMonths',
        'interestRate', 'notes', 'items'
      ];

      allowedFields.forEach(field => {
        if (updateData.hasOwnProperty(field)) {
          order[field] = updateData[field];
        }
      });

      // Recalculate financial details if amounts changed
      if (updateData.totalAmount || updateData.monthlyPayment || updateData.installmentMonths) {
        const financialDetails = this.calculateFinancialDetails(updateData);
        Object.assign(order, financialDetails);
      }

      order.updatedBy = user.id;
      await order.save();

      console.log('✅ Installment order updated successfully');

      return {
        success: true,
        data: {
          id: order._id,
          contractNo: order.contractNo,
          totalAmount: order.totalAmount,
          monthlyPayment: order.monthlyPayment,
          status: order.status,
          updatedAt: order.updatedAt
        }
      };

    } catch (error) {
      console.error('❌ Error updating installment order:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Record payment
   * @param {Object} paymentData - Payment data
   * @param {Object} user - Current user
   * @returns {Promise<Object>} Payment result
   */
  static async recordPayment(paymentData, user) {
    const session = await mongoose.startSession();

    try {
      return await session.withTransaction(async () => {
        console.log('💰 Recording payment...');

        const { contractId, amount, paymentMethod, paymentDate, notes } = paymentData;

        if (!contractId || !amount || amount <= 0) {
          throw new Error('Contract ID and valid payment amount are required');
        }

        // Get installment order
        const order = await InstallmentOrder.findById(contractId).session(session);
        if (!order) {
          throw new Error('Installment order not found');
        }

        if (order.status === 'completed' || order.status === 'cancelled') {
          throw new Error('Cannot record payment for completed or cancelled order');
        }

        // Validate payment amount
        const remainingBalance = order.totalAmount - (order.paidAmount || 0);
        if (amount > remainingBalance) {
          throw new Error(`Payment amount (${amount}) exceeds remaining balance (${remainingBalance})`);
        }

        // Create payment record
        const payment = await InstallmentPayment.create([{
          contractId: order._id,
          customerId: order.customer,
          amount: amount,
          paymentMethod: paymentMethod || 'cash',
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          periodNumber: (order.paidPeriods || 0) + 1,
          status: 'paid',
          notes: notes || '',
          recordedBy: user.id
        }], { session });

        // Update order
        order.paidAmount = (order.paidAmount || 0) + amount;
        order.paidPeriods = (order.paidPeriods || 0) + 1;
        order.remainingBalance = order.totalAmount - order.paidAmount;
        order.lastPaymentDate = payment[0].paymentDate;
        order.updatedBy = user.id;

        // Update status
        if (order.remainingBalance <= 0) {
          order.status = 'completed';
        } else if (order.paidAmount > 0 && order.status === 'pending') {
          order.status = 'ongoing';
        }

        // Update next payment date
        if (order.remainingBalance > 0) {
          const nextDate = new Date(payment[0].paymentDate);
          nextDate.setMonth(nextDate.getMonth() + 1);
          order.nextPaymentDate = nextDate;
        }

        await order.save({ session });

        console.log('✅ Payment recorded successfully');

        return {
          success: true,
          data: {
            paymentId: payment[0]._id,
            contractNo: order.contractNo,
            amount: payment[0].amount,
            paymentDate: payment[0].paymentDate,
            newBalance: order.remainingBalance,
            status: order.status
          }
        };
      });

    } catch (error) {
      console.error('❌ Error recording payment:', error);
      return {
        success: false,
        error: error.message
      };
    } finally {
      await session.endSession();
    }
  }

  /**
   * Get payment schedule
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Payment schedule
   */
  static async getPaymentSchedule(orderId) {
    try {
      const order = await InstallmentOrder.findById(orderId);
      if (!order) {
        return {
          success: false,
          error: 'Installment order not found'
        };
      }

      const schedule = [];
      const startDate = new Date(order.startDate || order.createdAt);

      for (let i = 1; i <= order.installmentMonths; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + i);

        // Check if this period is paid
        const payment = await InstallmentPayment.findOne({
          contractId: orderId,
          periodNumber: i
        });

        schedule.push({
          periodNumber: i,
          dueDate: dueDate,
          amount: order.monthlyPayment,
          status: payment ? 'paid' : (dueDate < new Date() ? 'overdue' : 'pending'),
          paidDate: payment?.paymentDate,
          paidAmount: payment?.amount,
          paymentMethod: payment?.paymentMethod
        });
      }

      return {
        success: true,
        data: {
          contractNo: order.contractNo,
          totalPeriods: order.installmentMonths,
          paidPeriods: order.paidPeriods || 0,
          schedule
        }
      };

    } catch (error) {
      console.error('❌ Error getting payment schedule:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Helper Methods

  /**
   * Calculate financial details
   * @param {Object} orderData - Order data
   * @returns {Object} Financial calculations
   */
  static calculateFinancialDetails(orderData) {
    const totalAmount = parseFloat(orderData.totalAmount) || 0;
    const downPayment = parseFloat(orderData.downPayment) || 0;
    const financeAmount = totalAmount - downPayment;
    const interestRate = parseFloat(orderData.interestRate) || 0;
    const installmentMonths = parseInt(orderData.installmentMonths) || 0;

    // Calculate interest
    const interestAmount = (financeAmount * interestRate * installmentMonths) / 100;
    const totalPayable = financeAmount + interestAmount;
    const monthlyPayment = installmentMonths > 0 ? totalPayable / installmentMonths : 0;

    return {
      totalAmount,
      downPayment,
      financeAmount,
      interestRate,
      interestAmount,
      totalPayable,
      monthlyPayment: Math.round(monthlyPayment * 100) / 100,
      installmentMonths,
      remainingBalance: totalPayable,
      startDate: orderData.startDate ? new Date(orderData.startDate) : new Date(),
      endDate: this.calculateEndDate(orderData.startDate, installmentMonths)
    };
  }

  /**
   * Calculate end date
   * @param {string|Date} startDate - Start date
   * @param {number} months - Number of months
   * @returns {Date} End date
   */
  static calculateEndDate(startDate, months) {
    const date = startDate ? new Date(startDate) : new Date();
    date.setMonth(date.getMonth() + months);
    return date;
  }

  /**
   * Create or update customer
   * @param {Object} customerData - Customer data
   * @param {Object} session - Database session
   * @returns {Promise<Object>} Customer document
   */
  static async createOrUpdateCustomer(customerData, session) {
    // Check if customer exists by phone or ID card
    let customer = null;

    if (customerData.phone) {
      customer = await Customer.findOne({
        $or: [
          { 'individual.phone': customerData.phone },
          { 'corporate.phone': customerData.phone }
        ]
      }).session(session);
    }

    if (!customer && customerData.idCard) {
      customer = await Customer.findOne({
        'individual.idCard': customerData.idCard
      }).session(session);
    }

    if (customer) {
      // Update existing customer
      if (customerData.firstName) customer.individual.firstName = customerData.firstName;
      if (customerData.lastName) customer.individual.lastName = customerData.lastName;
      if (customerData.phone) customer.individual.phone = customerData.phone;
      if (customerData.address) customer.individual.address = customerData.address;

      await customer.save({ session });
      return customer;
    } else {
      // Create new customer
      const newCustomer = await Customer.create([{
        customerType: 'individual',
        individual: {
          firstName: customerData.firstName || '',
          lastName: customerData.lastName || '',
          phone: customerData.phone || '',
          idCard: customerData.idCard || '',
          address: customerData.address || ''
        }
      }], { session });

      return newCustomer[0];
    }
  }

  /**
   * Get customer name
   * @param {Object} customer - Customer document
   * @returns {string} Customer name
   */
  static getCustomerName(customer) {
    if (customer.customerType === 'individual') {
      return `${customer.individual?.firstName || ''} ${customer.individual?.lastName || ''}`.trim();
    } else {
      return customer.corporate?.companyName || 'Unknown';
    }
  }

  /**
   * Get customer phone
   * @param {Object} customer - Customer document
   * @returns {string} Customer phone
   */
  static getCustomerPhone(customer) {
    return customer.individual?.phone || customer.corporate?.phone || '';
  }

  /**
   * Get customer address
   * @param {Object} customer - Customer document
   * @returns {string} Customer address
   */
  static getCustomerAddress(customer) {
    if (customer.customerType === 'individual') {
      return customer.individual?.address?.fullAddress || customer.individual?.address || '';
    } else {
      return customer.corporate?.address?.fullAddress || customer.corporate?.address || '';
    }
  }

  /**
   * Generate payment schedule
   * @param {string} orderId - Order ID
   * @param {Object} financialDetails - Financial details
   * @param {Object} session - Database session
   */
  static async generatePaymentSchedule(orderId, financialDetails, session) {
    const schedule = [];
    const startDate = new Date(financialDetails.startDate);

    for (let i = 1; i <= financialDetails.installmentMonths; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      schedule.push({
        periodNumber: i,
        dueDate: dueDate,
        principalAmount: financialDetails.financeAmount / financialDetails.installmentMonths,
        interestAmount: financialDetails.interestAmount / financialDetails.installmentMonths,
        totalAmount: financialDetails.monthlyPayment,
        status: 'pending'
      });
    }

    // Update order with payment schedule
    await InstallmentOrder.findByIdAndUpdate(
      orderId,
      {
        paymentSchedule: schedule,
        nextPaymentDate: schedule[0]?.dueDate
      },
      { session }
    );
  }

  /**
   * Reserve stock for order items
   * @param {string} orderId - Order ID
   * @param {Array} items - Order items
   * @param {string} branchCode - Branch code
   * @param {string} userId - User ID
   * @param {Object} session - Database session
   */
  static async reserveStock(orderId, items, branchCode, userId, session) {
    for (const item of items) {
      if (!item.productId) continue;

      const stock = await BranchStock.findOne({
        productId: item.productId,
        branch_code: branchCode
      }).session(session);

      if (!stock || stock.quantity < (item.quantity || 1)) {
        throw new Error(`Insufficient stock for product: ${item.name}`);
      }

      // Update stock
      await BranchStock.findByIdAndUpdate(
        stock._id,
        {
          $inc: {
            quantity: -(item.quantity || 1),
            reserved: (item.quantity || 1)
          }
        },
        { session }
      );

      // Record stock history
      await BranchStockHistory.create([{
        productId: item.productId,
        branch_code: branchCode,
        type: 'reservation',
        quantity: item.quantity || 1,
        reason: 'installment_reservation',
        referenceId: orderId,
        referenceType: 'installment_order',
        performedBy: userId,
        notes: `Stock reserved for installment order`
      }], { session });
    }
  }
}

module.exports = InstallmentService;