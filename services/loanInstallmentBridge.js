/**
 * Loan-Installment Data Bridge Service
 * Provides unified data integration between loan and installment systems
 * @version 1.0.0
 */

const mongoose = require('mongoose');

// Import Models
const InstallmentOrder = require('../models/Installment/InstallmentOrder');
const InstallmentPayment = require('../models/Installment/InstallmentPayment');
const Contract = require('../models/Load/Contract');
const ContractPaymentLog = require('../models/Load/ContractPaymentLog');
const Customer = require('../models/Customer/Customer');
const BranchStock = require('../models/POS/BranchStock');
const BranchStockHistory = require('../models/POS/BranchStockHistory');
const Branch = require('../models/Account/Branch');

class LoanInstallmentBridge {

  /**
   * Get unified customer data from both loan and installment systems
   * @param {string} customerId - Customer ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Unified customer data
   */
  static async getCustomerData(customerId, options = {}) {
    try {
      console.log(`🔍 Getting unified customer data for: ${customerId}`);

      const customer = await Customer.findById(customerId)
        .populate('contracts')
        .populate('installmentOrders')
        .lean();

      if (!customer) {
        return {
          success: false,
          error: 'Customer not found'
        };
      }

      // Get loan contracts
      const loanContracts = await Contract.find({
        customerId: customerId,
        deleted_at: null
      })
        .populate('paymentLogs')
        .sort({ createdAt: -1 })
        .lean();

      // Get installment orders
      const installmentOrders = await InstallmentOrder.find({
        customer: customerId,
        deleted_at: null
      })
        .populate('payments')
        .sort({ createdAt: -1 })
        .lean();

      // Calculate totals
      const loanTotals = this.calculateLoanTotals(loanContracts);
      const installmentTotals = this.calculateInstallmentTotals(installmentOrders);

      return {
        success: true,
        data: {
          customer: this.formatCustomerInfo(customer),
          loanContracts: loanContracts.map(contract => this.formatLoanContract(contract)),
          installmentOrders: installmentOrders.map(order => this.formatInstallmentOrder(order)),
          summary: {
            totalLoanAmount: loanTotals.totalAmount,
            totalLoanPaid: loanTotals.paidAmount,
            totalLoanRemaining: loanTotals.remainingAmount,
            totalInstallmentAmount: installmentTotals.totalAmount,
            totalInstallmentPaid: installmentTotals.paidAmount,
            totalInstallmentRemaining: installmentTotals.remainingAmount,
            overallTotalAmount: loanTotals.totalAmount + installmentTotals.totalAmount,
            overallPaidAmount: loanTotals.paidAmount + installmentTotals.paidAmount,
            overallRemainingAmount: loanTotals.remainingAmount + installmentTotals.remainingAmount,
            activeLoanContracts: loanContracts.filter(c => ['active', 'ongoing'].includes(c.status)).length,
            activeInstallmentOrders: installmentOrders.filter(o => ['active', 'ongoing'].includes(o.status)).length,
            overdueLoanContracts: loanContracts.filter(c => c.status === 'overdue').length,
            overdueInstallmentOrders: installmentOrders.filter(o => o.status === 'overdue').length
          }
        }
      };

    } catch (error) {
      console.error('❌ Error getting unified customer data:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Sync contract data between loan and installment systems
   * @param {string} contractId - Contract ID
   * @param {string} contractType - Type: 'loan' or 'installment'
   * @returns {Promise<Object>} Sync result
   */
  static async syncContractData(contractId, contractType) {
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        console.log(`🔄 Syncing ${contractType} contract: ${contractId}`);

        if (contractType === 'loan') {
          await this.syncLoanToInstallment(contractId, session);
        } else if (contractType === 'installment') {
          await this.syncInstallmentToLoan(contractId, session);
        }
      });

      return {
        success: true,
        message: `Contract ${contractId} synced successfully`
      };

    } catch (error) {
      console.error('❌ Error syncing contract data:', error);
      return {
        success: false,
        error: error.message
      };
    } finally {
      await session.endSession();
    }
  }

  /**
   * Get unified payment history for customer
   * @param {string} customerId - Customer ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Unified payment history
   */
  static async getUnifiedPaymentHistory(customerId, options = {}) {
    try {
      const { startDate, endDate, limit = 50, page = 1 } = options;

      const query = {
        deleted_at: null,
        customerId: customerId
      };

      if (startDate && endDate) {
        query.paymentDate = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      // Get loan payments
      const loanPayments = await ContractPaymentLog.find(query)
        .populate('contractId', 'contractNumber')
        .sort({ paymentDate: -1 })
        .limit(limit)
        .lean();

      // Get installment payments
      const installmentPayments = await InstallmentPayment.find(query)
        .populate('contractId', 'contractNo')
        .sort({ paymentDate: -1 })
        .limit(limit)
        .lean();

      // Merge and sort all payments
      const allPayments = [
        ...loanPayments.map(p => ({ ...p, type: 'loan' })),
        ...installmentPayments.map(p => ({ ...p, type: 'installment' }))
      ].sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));

      const skip = (page - 1) * limit;
      const paginatedPayments = allPayments.slice(skip, skip + limit);

      return {
        success: true,
        data: {
          payments: paginatedPayments.map(payment => this.formatUnifiedPayment(payment)),
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: allPayments.length,
            pages: Math.ceil(allPayments.length / limit)
          }
        }
      };

    } catch (error) {
      console.error('❌ Error getting unified payment history:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check stock availability for contract fulfillment
   * @param {string} contractId - Contract ID
   * @param {string} contractType - Type: 'loan' or 'installment'
   * @returns {Promise<Object>} Stock availability result
   */
  static async checkStockAvailability(contractId, contractType) {
    try {
      let contract;

      if (contractType === 'loan') {
        contract = await Contract.findById(contractId)
          .populate('items.productId')
          .populate('branchId')
          .lean();
      } else {
        contract = await InstallmentOrder.findById(contractId)
          .populate('items.productId')
          .populate('branchId')
          .lean();
      }

      if (!contract) {
        return {
          success: false,
          error: 'Contract not found'
        };
      }

      const stockChecks = [];

      for (const item of contract.items || []) {
        const stock = await BranchStock.findOne({
          productId: item.productId._id,
          branch_code: contract.branchId?.branch_code || contract.branch_code
        }).lean();

        const available = stock ? stock.quantity : 0;
        const required = item.quantity || 1;

        stockChecks.push({
          productId: item.productId._id,
          productName: item.productId.name || item.name,
          required: required,
          available: available,
          sufficient: available >= required,
          shortage: Math.max(0, required - available)
        });
      }

      const allSufficient = stockChecks.every(check => check.sufficient);

      return {
        success: true,
        data: {
          contractId,
          contractType,
          branchCode: contract.branchId?.branch_code || contract.branch_code,
          stockChecks,
          allSufficient,
          totalShortage: stockChecks.reduce((sum, check) => sum + check.shortage, 0)
        }
      };

    } catch (error) {
      console.error('❌ Error checking stock availability:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Reserve stock for contract
   * @param {string} contractId - Contract ID
   * @param {string} contractType - Type: 'loan' or 'installment'
   * @param {string} userId - User performing the reservation
   * @returns {Promise<Object>} Stock reservation result
   */
  static async reserveStock(contractId, contractType, userId) {
    const session = await mongoose.startSession();

    try {
      return await session.withTransaction(async () => {
        console.log(`🔒 Reserving stock for ${contractType} contract: ${contractId}`);

        // Check stock availability first
        const stockCheck = await this.checkStockAvailability(contractId, contractType);

        if (!stockCheck.success || !stockCheck.data.allSufficient) {
          throw new Error('Insufficient stock for reservation');
        }

        let contract;
        if (contractType === 'loan') {
          contract = await Contract.findById(contractId).populate('items.productId').session(session);
        } else {
          contract = await InstallmentOrder.findById(contractId).populate('items.productId').session(session);
        }

        const reservations = [];

        for (const item of contract.items || []) {
          // Deduct from branch stock
          const stockUpdate = await BranchStock.findOneAndUpdate(
            {
              productId: item.productId._id,
              branch_code: contract.branchId?.branch_code || contract.branch_code
            },
            {
              $inc: {
                quantity: -(item.quantity || 1),
                reserved: (item.quantity || 1)
              }
            },
            { session, new: true }
          );

          if (!stockUpdate) {
            throw new Error(`Stock not found for product ${item.productId.name}`);
          }

          // Record stock history
          const stockHistory = await BranchStockHistory.create([{
            productId: item.productId._id,
            branch_code: contract.branchId?.branch_code || contract.branch_code,
            type: 'reservation',
            quantity: item.quantity || 1,
            reason: `${contractType}_reservation`,
            referenceId: contractId,
            referenceType: `${contractType}_contract`,
            performedBy: userId,
            notes: `Stock reserved for ${contractType} contract ${contract.contractNumber || contract.contractNo}`
          }], { session });

          reservations.push({
            productId: item.productId._id,
            productName: item.productId.name,
            quantity: item.quantity || 1,
            stockHistoryId: stockHistory[0]._id
          });
        }

        // Update contract status
        const updateData = {
          stockStatus: 'reserved',
          stockReservedAt: new Date(),
          stockReservedBy: userId
        };

        if (contractType === 'loan') {
          await Contract.findByIdAndUpdate(contractId, updateData, { session });
        } else {
          await InstallmentOrder.findByIdAndUpdate(contractId, updateData, { session });
        }

        return {
          success: true,
          data: {
            contractId,
            contractType,
            reservations,
            message: `Stock reserved successfully for ${reservations.length} items`
          }
        };
      });

    } catch (error) {
      console.error('❌ Error reserving stock:', error);
      return {
        success: false,
        error: error.message
      };
    } finally {
      await session.endSession();
    }
  }

  /**
   * Get consolidated financial reports
   * @param {Object} options - Report options
   * @returns {Promise<Object>} Consolidated report
   */
  static async getConsolidatedFinancialReport(options = {}) {
    try {
      const { startDate, endDate, branchCode, groupBy = 'month' } = options;

      const dateFilter = {};
      if (startDate && endDate) {
        dateFilter.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      const branchFilter = branchCode ? { branch_code: branchCode } : {};

      // Get loan contract data
      const loanData = await Contract.aggregate([
        { $match: { ...dateFilter, ...branchFilter, deleted_at: null } },
        {
          $group: {
            _id: groupBy === 'month' ? {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            } : {
              year: { $year: '$createdAt' }
            },
            totalAmount: { $sum: '$totalAmount' },
            paidAmount: { $sum: '$paidAmount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]);

      // Get installment order data
      const installmentData = await InstallmentOrder.aggregate([
        { $match: { ...dateFilter, ...branchFilter, deleted_at: null } },
        {
          $group: {
            _id: groupBy === 'month' ? {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            } : {
              year: { $year: '$createdAt' }
            },
            totalAmount: { $sum: '$totalAmount' },
            paidAmount: { $sum: '$paidAmount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]);

      // Merge data by period
      const mergedData = this.mergeFinancialData(loanData, installmentData, groupBy);

      // Calculate summary
      const summary = mergedData.reduce((acc, period) => {
        acc.totalAmount += period.totalAmount;
        acc.totalPaid += period.totalPaid;
        acc.totalContracts += period.totalContracts;
        return acc;
      }, {
        totalAmount: 0,
        totalPaid: 0,
        totalRemaining: 0,
        totalContracts: 0
      });

      summary.totalRemaining = summary.totalAmount - summary.totalPaid;
      summary.paymentRate = summary.totalAmount > 0 ?
        (summary.totalPaid / summary.totalAmount * 100).toFixed(2) : 0;

      return {
        success: true,
        data: {
          summary,
          periods: mergedData,
          options
        }
      };

    } catch (error) {
      console.error('❌ Error generating consolidated report:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Helper Methods

  static formatCustomerInfo(customer) {
    return {
      id: customer._id,
      customerType: customer.customerType,
      name: customer.customerType === 'individual'
        ? `${customer.individual?.firstName || ''} ${customer.individual?.lastName || ''}`.trim()
        : customer.corporate?.companyName || 'Unknown',
      phone: customer.individual?.phone || customer.corporate?.phone || '',
      email: customer.individual?.email || customer.corporate?.email || '',
      address: customer.individual?.address || customer.corporate?.address || '',
      idCard: customer.individual?.idCard || '',
      taxId: customer.corporate?.taxId || '',
      registrationDate: customer.createdAt
    };
  }

  static formatLoanContract(contract) {
    return {
      id: contract._id,
      type: 'loan',
      contractNumber: contract.contractNumber,
      totalAmount: contract.totalAmount || 0,
      paidAmount: contract.paidAmount || 0,
      remainingAmount: (contract.totalAmount || 0) - (contract.paidAmount || 0),
      monthlyPayment: contract.monthlyPayment || 0,
      interestRate: contract.interestRate || 0,
      installmentMonths: contract.installmentMonths || 0,
      status: contract.status,
      startDate: contract.startDate,
      endDate: contract.endDate,
      nextPaymentDate: contract.nextPaymentDate,
      createdAt: contract.createdAt
    };
  }

  static formatInstallmentOrder(order) {
    return {
      id: order._id,
      type: 'installment',
      contractNumber: order.contractNo,
      totalAmount: order.totalAmount || 0,
      paidAmount: order.paidAmount || 0,
      remainingAmount: (order.totalAmount || 0) - (order.paidAmount || 0),
      monthlyPayment: order.monthlyPayment || 0,
      installmentMonths: order.installmentMonths || 0,
      status: order.status,
      items: order.items || [],
      createdAt: order.createdAt
    };
  }

  static formatUnifiedPayment(payment) {
    return {
      id: payment._id,
      type: payment.type,
      contractNumber: payment.contractId?.contractNumber || payment.contractId?.contractNo,
      amount: payment.amount,
      paymentDate: payment.paymentDate,
      paymentMethod: payment.paymentMethod,
      notes: payment.notes,
      status: payment.status,
      createdAt: payment.createdAt
    };
  }

  static calculateLoanTotals(contracts) {
    return contracts.reduce((totals, contract) => {
      totals.totalAmount += contract.totalAmount || 0;
      totals.paidAmount += contract.paidAmount || 0;
      totals.remainingAmount += (contract.totalAmount || 0) - (contract.paidAmount || 0);
      return totals;
    }, { totalAmount: 0, paidAmount: 0, remainingAmount: 0 });
  }

  static calculateInstallmentTotals(orders) {
    return orders.reduce((totals, order) => {
      totals.totalAmount += order.totalAmount || 0;
      totals.paidAmount += order.paidAmount || 0;
      totals.remainingAmount += (order.totalAmount || 0) - (order.paidAmount || 0);
      return totals;
    }, { totalAmount: 0, paidAmount: 0, remainingAmount: 0 });
  }

  static mergeFinancialData(loanData, installmentData, groupBy) {
    const dataMap = new Map();

    // Add loan data
    loanData.forEach(item => {
      const key = groupBy === 'month'
        ? `${item._id.year}-${String(item._id.month).padStart(2, '0')}`
        : `${item._id.year}`;

      dataMap.set(key, {
        period: key,
        loanAmount: item.totalAmount,
        loanPaid: item.paidAmount,
        loanCount: item.count,
        installmentAmount: 0,
        installmentPaid: 0,
        installmentCount: 0
      });
    });

    // Add installment data
    installmentData.forEach(item => {
      const key = groupBy === 'month'
        ? `${item._id.year}-${String(item._id.month).padStart(2, '0')}`
        : `${item._id.year}`;

      const existing = dataMap.get(key) || {
        period: key,
        loanAmount: 0,
        loanPaid: 0,
        loanCount: 0,
        installmentAmount: 0,
        installmentPaid: 0,
        installmentCount: 0
      };

      existing.installmentAmount = item.totalAmount;
      existing.installmentPaid = item.paidAmount;
      existing.installmentCount = item.count;

      dataMap.set(key, existing);
    });

    // Convert to array and add totals
    return Array.from(dataMap.values()).map(item => ({
      ...item,
      totalAmount: item.loanAmount + item.installmentAmount,
      totalPaid: item.loanPaid + item.installmentPaid,
      totalContracts: item.loanCount + item.installmentCount
    })).sort((a, b) => a.period.localeCompare(b.period));
  }

  static async syncLoanToInstallment(contractId, session) {
    // Implementation for syncing loan contract to installment system
    console.log(`🔄 Syncing loan contract ${contractId} to installment system`);
    // Add specific sync logic here
  }

  static async syncInstallmentToLoan(contractId, session) {
    // Implementation for syncing installment order to loan system
    console.log(`🔄 Syncing installment order ${contractId} to loan system`);
    // Add specific sync logic here
  }
}

module.exports = LoanInstallmentBridge;