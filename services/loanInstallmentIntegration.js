/**
 * Loan-Installment Integration Service
 * Provides unified data access and synchronization between loan and installment systems
 * @version 1.0.0
 */

const mongoose = require('mongoose');
const InstallmentOrder = require('../models/Installment/InstallmentOrder');
const InstallmentPayment = require('../models/Installment/InstallmentPayment');
const Customer = require('../models/Customer/Customer');
const moment = require('moment');

class LoanInstallmentIntegration {
  /**
   * Synchronize customer data between systems
   */
  static async syncCustomerData(customerId) {
    try {
      console.log('🔄 Syncing customer data:', customerId);

      const customer = await Customer.findById(customerId).lean();
      if (!customer) {
        throw new Error('Customer not found');
      }

      // Find all installment orders for this customer
      const installmentOrders = await InstallmentOrderOrder.find({
        customer: customerId,
        deleted_at: null
      }).lean();

      // Find legacy installments
      const legacyInstallmentOrders = await InstallmentOrder.find({
        customerId: customerId,
        isDeleted: false
      }).lean();

      // Update customer info in all installment orders
      const updatePromises = installmentOrders.map(order => {
        const updatedCustomerInfo = {
          prefix: customer.personalInfo?.prefix || '',
          firstName: customer.personalInfo?.firstName || '',
          lastName: customer.personalInfo?.lastName || '',
          phone: customer.phoneNumbers?.[0] || '',
          email: customer.email || '',
          taxId: customer.taxId || '',
          address: {
            houseNo: customer.address?.houseNumber || '',
            moo: customer.address?.moo || '',
            subDistrict: customer.address?.subDistrict || '',
            district: customer.address?.district || '',
            province: customer.address?.province || '',
            zipcode: customer.address?.zipCode || ''
          }
        };

        return InstallmentOrderOrder.updateOne(
          { _id: order._id },
          { $set: { customer_info: updatedCustomerInfo } }
        );
      });

      await Promise.all(updatePromises);

      return {
        success: true,
        message: 'Customer data synchronized successfully',
        updatedOrders: installmentOrders.length,
        legacyInstallmentOrders: legacyInstallmentOrders.length
      };

    } catch (error) {
      console.error('❌ Error syncing customer data:', error);
      throw error;
    }
  }

  /**
   * Synchronize payment status between systems
   */
  static async syncPaymentStatus(contractId) {
    try {
      console.log('🔄 Syncing payment status for contract:', contractId);

      // Find installment order
      const order = await InstallmentOrderOrder.findById(contractId);
      if (!order) {
        throw new Error('Contract not found');
      }

      // Get all payments for this contract
      const payments = await InstallmentOrderPayment.find({
        contractId: contractId
      }).sort({ paymentDate: 1 }).lean();

      // Calculate totals
      const totalPaid = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
      const remainingAmount = Math.max(0, order.totalAmount - totalPaid);

      // Determine status based on payments
      let newStatus = order.status;
      if (remainingAmount <= 0 && order.status !== 'completed') {
        newStatus = 'completed';
        order.completedDate = new Date();
      } else if (totalPaid > 0 && order.status === 'pending') {
        newStatus = 'active';
      }

      // Update order with payment information
      order.paidAmount = totalPaid;
      order.payments = payments.map(payment => ({
        payDate: payment.paymentDate,
        amount: payment.amount,
        method: payment.paymentMethod || 'cash',
        note: payment.notes || ''
      }));
      order.status = newStatus;

      // Calculate next due date if still active
      if (newStatus === 'active' || newStatus === 'ongoing') {
        const lastPayment = payments[payments.length - 1];
        if (lastPayment) {
          const nextDue = moment(lastPayment.paymentDate)
            .add(1, 'month')
            .toDate();
          order.dueDate = nextDue;
        }
      }

      await order.save();

      // Sync with legacy installment system if exists
      const legacyInstallmentOrder = await InstallmentOrder.findOne({
        contractNumber: order.contractNo
      });

      if (legacyInstallmentOrder) {
        legacyInstallmentOrder.totalPaidAmount = totalPaid;
        legacyInstallmentOrder.remainingBalance = remainingAmount;
        legacyInstallmentOrder.status = newStatus;
        legacyInstallmentOrder.lastPaymentDate = payments.length > 0
          ? payments[payments.length - 1].paymentDate
          : null;

        // Update payment history
        legacyInstallmentOrder.paymentHistory = payments.map(payment => ({
          paymentDate: payment.paymentDate,
          paymentAmount: payment.amount,
          paymentMethod: payment.paymentMethod || 'cash',
          notes: payment.notes || ''
        }));

        await legacyInstallmentOrder.save();
      }

      return {
        success: true,
        message: 'Payment status synchronized successfully',
        contractId,
        totalPaid,
        remainingAmount,
        status: newStatus,
        paymentsCount: payments.length
      };

    } catch (error) {
      console.error('❌ Error syncing payment status:', error);
      throw error;
    }
  }

  /**
   * Transform data between camelCase and snake_case formats
   */
  static unifyDataStructure(data, targetFormat = 'camelCase') {
    if (!data) return data;

    if (Array.isArray(data)) {
      return data.map(item => this.unifyDataStructure(item, targetFormat));
    }

    if (typeof data === 'object' && data !== null) {
      const transformed = {};

      for (const [key, value] of Object.entries(data)) {
        let newKey = key;

        if (targetFormat === 'snake_case') {
          // Convert camelCase to snake_case
          newKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        } else if (targetFormat === 'camelCase') {
          // Convert snake_case to camelCase
          newKey = key.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
        }

        // Recursively transform nested objects
        transformed[newKey] = this.unifyDataStructure(value, targetFormat);
      }

      return transformed;
    }

    return data;
  }

  /**
   * Get unified customer loans and installments data
   */
  static async getCustomerLoans(customerId, options = {}) {
    try {
      const {
        includePayments = false,
        includeHistory = false,
        status = null,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      // Get installment orders
      const orderQuery = {
        customer: customerId,
        deleted_at: null
      };

      if (status) {
        orderQuery.status = status;
      }

      let ordersPromise = InstallmentOrderOrder.find(orderQuery)
        .populate({
          path: 'customer',
          select: 'personalInfo phoneNumbers email address'
        });

      if (includePayments) {
        ordersPromise = ordersPromise.populate({
          path: 'installmentPayments',
          model: 'InstallmentOrderPayment',
          match: { contractId: { $exists: true } }
        });
      }

      const sortObj = {};
      sortObj[sortBy] = sortOrder === 'desc' ? -1 : 1;
      ordersPromise = ordersPromise.sort(sortObj);

      // Get legacy installments
      const legacyQuery = {
        customerId: customerId,
        isDeleted: false
      };

      if (status) {
        legacyQuery.status = status;
      }

      const [orders, legacyInstallmentOrders] = await Promise.all([
        ordersPromise.lean(),
        InstallmentOrder.find(legacyQuery).sort(sortObj).lean()
      ]);

      // Transform orders to unified format
      const unifiedOrders = await Promise.all(orders.map(async order => {
        const unified = {
          id: order._id,
          contractNumber: order.contractNo,
          type: 'installment_order',
          customerInfo: order.customer_info || {},
          totalAmount: Math.max(0, order.totalAmount || 0),
          paidAmount: Math.max(0, order.paidAmount || 0),
          remainingAmount: Math.max(0, (order.totalAmount || 0) - (order.paidAmount || 0)),
          downPayment: Math.max(0, order.downPayment || 0),
          monthlyPayment: Math.max(0, order.monthlyPayment || 0),
          installmentCount: order.installmentCount || 0,
          status: order.status || 'pending',
          planType: order.planType,
          installmentType: order.installmentType,
          branchCode: order.branch_code,
          dueDate: order.dueDate,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          items: order.items || [],
          // Calculate additional fields
          progressPercentage: order.totalAmount > 0
            ? Math.round(((order.paidAmount || 0) / order.totalAmount) * 100)
            : 0,
          isOverdue: order.dueDate && new Date(order.dueDate) < new Date(),
          daysPastDue: order.dueDate
            ? Math.max(0, Math.floor((new Date() - new Date(order.dueDate)) / (1000 * 60 * 60 * 24)))
            : 0
        };

        // Add payment details if requested
        if (includePayments) {
          const payments = await InstallmentOrderPayment.find({
            contractId: order._id
          }).sort({ paymentDate: 1 }).lean();

          unified.payments = payments.map(payment => ({
            id: payment._id,
            date: payment.paymentDate,
            amount: Math.max(0, payment.amount || 0),
            method: payment.paymentMethod || 'cash',
            notes: payment.notes || '',
            receiptNumber: payment.receiptNumber || ''
          }));

          unified.lastPaymentDate = payments.length > 0
            ? payments[payments.length - 1].paymentDate
            : null;
          unified.paymentCount = payments.length;
        }

        return unified;
      }));

      // Transform legacy installments to unified format
      const unifiedLegacy = legacyInstallmentOrders.map(installment => ({
        id: installment._id,
        contractNumber: installment.contractNumber,
        type: 'legacy_installment',
        customerInfo: {
          firstName: installment.customerName?.split(' ')[0] || '',
          lastName: installment.customerName?.split(' ').slice(1).join(' ') || '',
          phone: installment.customerPhone || '',
          address: installment.customerAddress || ''
        },
        totalAmount: Math.max(0, installment.totalAmount || 0),
        paidAmount: Math.max(0, installment.totalPaidAmount || 0),
        remainingAmount: Math.max(0, installment.remainingBalance || 0),
        downPayment: Math.max(0, installment.downPayment || 0),
        monthlyPayment: Math.max(0, installment.monthlyPayment || 0),
        installmentCount: installment.installmentMonths || 0,
        status: installment.status || 'pending',
        branchCode: installment.branchCode,
        dueDate: installment.nextPaymentDate,
        createdAt: installment.createdAt,
        updatedAt: installment.updatedAt,
        items: [{
          name: installment.productName || 'ไม่ระบุ',
          qty: 1
        }],
        progressPercentage: installment.totalAmount > 0
          ? Math.round(((installment.totalPaidAmount || 0) / installment.totalAmount) * 100)
          : 0,
        isOverdue: installment.nextPaymentDate && new Date(installment.nextPaymentDate) < new Date(),
        daysPastDue: installment.nextPaymentDate
          ? Math.max(0, Math.floor((new Date() - new Date(installment.nextPaymentDate)) / (1000 * 60 * 60 * 24)))
          : 0,
        payments: includePayments ? (installment.paymentHistory || []) : [],
        lastPaymentDate: installment.lastPaymentDate,
        paymentCount: installment.paymentHistory?.length || 0
      }));

      // Combine and sort all data
      const allLoans = [...unifiedOrders, ...unifiedLegacy];

      // Sort combined data
      allLoans.sort((a, b) => {
        const aValue = a[sortBy];
        const bValue = b[sortBy];

        if (sortOrder === 'desc') {
          return bValue > aValue ? 1 : -1;
        } else {
          return aValue > bValue ? 1 : -1;
        }
      });

      // Calculate summary statistics
      const summary = {
        totalLoans: allLoans.length,
        totalAmount: allLoans.reduce((sum, loan) => sum + loan.totalAmount, 0),
        totalPaid: allLoans.reduce((sum, loan) => sum + loan.paidAmount, 0),
        totalRemaining: allLoans.reduce((sum, loan) => sum + loan.remainingAmount, 0),
        activeLoans: allLoans.filter(loan => ['active', 'ongoing'].includes(loan.status)).length,
        completedLoans: allLoans.filter(loan => loan.status === 'completed').length,
        overdueLoans: allLoans.filter(loan => loan.isOverdue).length,
        averageLoanAmount: allLoans.length > 0
          ? Math.round(allLoans.reduce((sum, loan) => sum + loan.totalAmount, 0) / allLoans.length)
          : 0
      };

      return {
        success: true,
        data: {
          loans: allLoans,
          summary,
          counts: {
            installmentOrders: unifiedOrders.length,
            legacyInstallmentOrders: unifiedLegacy.length
          }
        }
      };

    } catch (error) {
      console.error('❌ Error getting unified customer loans:', error);
      throw error;
    }
  }

  /**
   * Consolidate reports from both systems
   */
  static async consolidateReports(reportType, options = {}) {
    try {
      const {
        startDate,
        endDate,
        branchCode,
        status,
        groupBy = 'month'
      } = options;

      const dateQuery = {};
      if (startDate) dateQuery.$gte = new Date(startDate);
      if (endDate) dateQuery.$lte = new Date(endDate);

      let reportData = {};

      switch (reportType) {
        case 'payment_summary':
          reportData = await this._generatePaymentSummaryReport(dateQuery, options);
          break;

        case 'overdue_analysis':
          reportData = await this._generateOverdueAnalysisReport(dateQuery, options);
          break;

        case 'collection_performance':
          reportData = await this._generateCollectionPerformanceReport(dateQuery, options);
          break;

        case 'customer_portfolio':
          reportData = await this._generateCustomerPortfolioReport(dateQuery, options);
          break;

        default:
          throw new Error(`Unsupported report type: ${reportType}`);
      }

      return {
        success: true,
        reportType,
        generatedAt: new Date(),
        dateRange: { startDate, endDate },
        filters: { branchCode, status, groupBy },
        data: reportData
      };

    } catch (error) {
      console.error('❌ Error consolidating reports:', error);
      throw error;
    }
  }

  /**
   * Generate payment summary report
   */
  static async _generatePaymentSummaryReport(dateQuery, options) {
    const { branchCode, groupBy } = options;

    // Build aggregation pipeline
    const matchStage = { deleted_at: null };
    if (branchCode) matchStage.branch_code = branchCode;
    if (Object.keys(dateQuery).length > 0) matchStage.createdAt = dateQuery;

    const groupStage = {
      _id: null,
      totalContracts: { $sum: 1 },
      totalAmount: { $sum: '$totalAmount' },
      totalPaid: { $sum: '$paidAmount' },
      totalDownPayment: { $sum: '$downPayment' },
      averageContract: { $avg: '$totalAmount' }
    };

    // Adjust grouping based on groupBy parameter
    if (groupBy === 'month') {
      groupStage._id = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' }
      };
    } else if (groupBy === 'branch') {
      groupStage._id = '$branch_code';
    } else if (groupBy === 'status') {
      groupStage._id = '$status';
    }

    const [installmentData, legacyData] = await Promise.all([
      InstallmentOrderOrder.aggregate([
        { $match: matchStage },
        { $group: groupStage },
        { $sort: { _id: 1 } }
      ]),

      InstallmentOrder.aggregate([
        {
          $match: {
            isDeleted: false,
            ...(branchCode && { branchCode }),
            ...(Object.keys(dateQuery).length > 0 && { createdAt: dateQuery })
          }
        },
        {
          $group: {
            ...groupStage,
            totalAmount: { $sum: '$totalAmount' },
            totalPaid: { $sum: '$totalPaidAmount' },
            totalDownPayment: { $sum: '$downPayment' }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    return {
      installmentOrders: installmentData,
      legacyInstallmentOrders: legacyData,
      combined: this._combineReportData(installmentData, legacyData)
    };
  }

  /**
   * Generate overdue analysis report
   */
  static async _generateOverdueAnalysisReport(dateQuery, options) {
    const currentDate = new Date();
    const { branchCode } = options;

    const baseMatch = {
      deleted_at: null,
      status: { $in: ['active', 'ongoing'] },
      ...(branchCode && { branch_code: branchCode })
    };

    const overdueAnalysis = await InstallmentOrderOrder.aggregate([
      { $match: baseMatch },
      {
        $addFields: {
          overdueAmount: {
            $max: [0, { $subtract: ['$totalAmount', '$paidAmount'] }]
          },
          daysPastDue: {
            $cond: [
              { $lt: ['$dueDate', currentDate] },
              { $divide: [{ $subtract: [currentDate, '$dueDate'] }, 86400000] },
              0
            ]
          }
        }
      },
      {
        $match: { daysPastDue: { $gt: 0 } }
      },
      {
        $bucket: {
          groupBy: '$daysPastDue',
          boundaries: [1, 30, 60, 90, 180, 365, Infinity],
          default: 'other',
          output: {
            count: { $sum: 1 },
            totalAmount: { $sum: '$overdueAmount' },
            averageAmount: { $avg: '$overdueAmount' },
            contracts: {
              $push: {
                contractNo: '$contractNo',
                overdueAmount: '$overdueAmount',
                daysPastDue: '$daysPastDue'
              }
            }
          }
        }
      }
    ]);

    return {
      overdueAnalysis,
      summary: {
        totalOverdueContracts: overdueAnalysis.reduce((sum, bucket) => sum + bucket.count, 0),
        totalOverdueAmount: overdueAnalysis.reduce((sum, bucket) => sum + bucket.totalAmount, 0)
      }
    };
  }

  /**
   * Generate collection performance report
   */
  static async _generateCollectionPerformanceReport(dateQuery, options) {
    const { branchCode, groupBy } = options;

    const matchStage = {
      deleted_at: null,
      ...(branchCode && { branch_code: branchCode }),
      ...(Object.keys(dateQuery).length > 0 && { createdAt: dateQuery })
    };

    const performanceData = await InstallmentOrderOrder.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: groupBy === 'branch' ? '$branch_code' : {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          totalContracts: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          totalCollected: { $sum: '$paidAmount' },
          completedContracts: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          activeContracts: {
            $sum: { $cond: [{ $in: ['$status', ['active', 'ongoing']] }, 1, 0] }
          }
        }
      },
      {
        $addFields: {
          collectionRate: {
            $multiply: [
              { $divide: ['$totalCollected', '$totalAmount'] },
              100
            ]
          },
          completionRate: {
            $multiply: [
              { $divide: ['$completedContracts', '$totalContracts'] },
              100
            ]
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return {
      performanceData,
      summary: {
        totalContracts: performanceData.reduce((sum, item) => sum + item.totalContracts, 0),
        averageCollectionRate: performanceData.length > 0
          ? performanceData.reduce((sum, item) => sum + item.collectionRate, 0) / performanceData.length
          : 0,
        averageCompletionRate: performanceData.length > 0
          ? performanceData.reduce((sum, item) => sum + item.completionRate, 0) / performanceData.length
          : 0
      }
    };
  }

  /**
   * Generate customer portfolio report
   */
  static async _generateCustomerPortfolioReport(dateQuery, options) {
    const { branchCode } = options;

    const matchStage = {
      deleted_at: null,
      ...(branchCode && { branch_code: branchCode })
    };

    const portfolioData = await InstallmentOrderOrder.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$customer',
          contractCount: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          totalPaid: { $sum: '$paidAmount' },
          activeContracts: {
            $sum: { $cond: [{ $in: ['$status', ['active', 'ongoing']] }, 1, 0] }
          },
          completedContracts: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          customerInfo: { $first: '$customer_info' }
        }
      },
      {
        $addFields: {
          remainingAmount: { $subtract: ['$totalAmount', '$totalPaid'] },
          customerRisk: {
            $switch: {
              branches: [
                { case: { $gt: ['$activeContracts', 3] }, then: 'สูง' },
                { case: { $gt: ['$activeContracts', 1] }, then: 'ปานกลาง' },
                { case: { $eq: ['$activeContracts', 1] }, then: 'ต่ำ' }
              ],
              default: 'ไม่มีความเสี่ยง'
            }
          }
        }
      },
      { $sort: { totalAmount: -1 } },
      { $limit: 100 } // Top 100 customers
    ]);

    return {
      portfolioData,
      summary: {
        totalCustomers: portfolioData.length,
        averageContractsPerCustomer: portfolioData.length > 0
          ? portfolioData.reduce((sum, customer) => sum + customer.contractCount, 0) / portfolioData.length
          : 0,
        totalPortfolioValue: portfolioData.reduce((sum, customer) => sum + customer.totalAmount, 0),
        totalOutstanding: portfolioData.reduce((sum, customer) => sum + customer.remainingAmount, 0)
      }
    };
  }

  /**
   * Combine report data from different sources
   */
  static _combineReportData(data1, data2) {
    const combined = new Map();

    // Add data from first source
    data1.forEach(item => {
      const key = JSON.stringify(item._id);
      combined.set(key, { ...item, source: 'installment_orders' });
    });

    // Add or merge data from second source
    data2.forEach(item => {
      const key = JSON.stringify(item._id);
      if (combined.has(key)) {
        const existing = combined.get(key);
        combined.set(key, {
          _id: item._id,
          totalContracts: (existing.totalContracts || 0) + (item.totalContracts || 0),
          totalAmount: (existing.totalAmount || 0) + (item.totalAmount || 0),
          totalPaid: (existing.totalPaid || 0) + (item.totalPaid || 0),
          totalDownPayment: (existing.totalDownPayment || 0) + (item.totalDownPayment || 0),
          source: 'combined'
        });
      } else {
        combined.set(key, { ...item, source: 'legacy_installments' });
      }
    });

    return Array.from(combined.values());
  }

  /**
   * Get system health and sync status
   */
  static async getSystemHealth() {
    try {
      const [
        installmentOrdersCount,
        legacyInstallmentOrdersCount,
        paymentsCount,
        customersCount
      ] = await Promise.all([
        InstallmentOrderOrder.countDocuments({ deleted_at: null }),
        InstallmentOrder.countDocuments({ isDeleted: false }),
        InstallmentOrderPayment.countDocuments({}),
        Customer.countDocuments({ deleted_at: null })
      ]);

      // Check for data inconsistencies
      const inconsistencies = await this._checkDataInconsistencies();

      return {
        success: true,
        data: {
          recordCounts: {
            installmentOrders: installmentOrdersCount,
            legacyInstallmentOrders: legacyInstallmentOrdersCount,
            payments: paymentsCount,
            customers: customersCount
          },
          inconsistencies,
          lastSyncCheck: new Date(),
          systemStatus: inconsistencies.length === 0 ? 'healthy' : 'needs_attention'
        }
      };

    } catch (error) {
      console.error('❌ Error checking system health:', error);
      throw error;
    }
  }

  /**
   * Check for data inconsistencies between systems
   */
  static async _checkDataInconsistencies() {
    const inconsistencies = [];

    try {
      // Check for installment orders without customer references
      const ordersWithoutCustomers = await InstallmentOrderOrder.countDocuments({
        deleted_at: null,
        customer: null
      });

      if (ordersWithoutCustomers > 0) {
        inconsistencies.push({
          type: 'missing_customer_reference',
          count: ordersWithoutCustomers,
          severity: 'high',
          description: 'InstallmentOrder orders without customer references'
        });
      }

      // Check for payments without contracts
      const paymentsWithoutContracts = await InstallmentOrderPayment.countDocuments({
        contractId: null
      });

      if (paymentsWithoutContracts > 0) {
        inconsistencies.push({
          type: 'orphaned_payments',
          count: paymentsWithoutContracts,
          severity: 'medium',
          description: 'Payments without contract references'
        });
      }

      // Check for amount mismatches
      const amountMismatches = await InstallmentOrderOrder.aggregate([
        { $match: { deleted_at: null } },
        {
          $addFields: {
            calculatedTotal: { $add: ['$paidAmount', { $subtract: ['$totalAmount', '$paidAmount'] }] },
            mismatch: { $ne: ['$totalAmount', { $add: ['$paidAmount', { $subtract: ['$totalAmount', '$paidAmount'] }] }] }
          }
        },
        { $match: { mismatch: true } },
        { $count: 'count' }
      ]);

      const mismatchCount = amountMismatches[0]?.count || 0;
      if (mismatchCount > 0) {
        inconsistencies.push({
          type: 'amount_calculation_mismatch',
          count: mismatchCount,
          severity: 'low',
          description: 'Contracts with amount calculation inconsistencies'
        });
      }

    } catch (error) {
      console.error('❌ Error checking data inconsistencies:', error);
      inconsistencies.push({
        type: 'system_error',
        count: 1,
        severity: 'critical',
        description: 'Error occurred while checking data consistency'
      });
    }

    return inconsistencies;
  }
}

module.exports = LoanInstallmentIntegration;