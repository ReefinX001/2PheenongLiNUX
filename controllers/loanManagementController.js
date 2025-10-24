// Comprehensive Loan Management Controller
// Handles all loan-related operations for the loan dashboard pages

const mongoose = require('mongoose');
const moment = require('moment');
const InstallmentOrder = require('../models/Installment/InstallmentOrder');
const InstallmentPayment = require('../models/Installment/InstallmentPayment');
const Customer = require('../models/Customer/Customer');
const BadDebtCriteria = require('../models/BadDebtCriteria');
const User = require('../models/User/User');

class LoanManagementController {

  // ============================================
  // DEBTORS MANAGEMENT
  // ============================================

  /**
   * Get list of debtors with overdue payments
   */
  static async getDebtors(req, res) {
    try {
      const {
        status = 'overdue',
        branch_code,
        page = 1,
        limit = 20,
        sortBy = 'daysOverdue',
        sortOrder = 'desc'
      } = req.query;

      const query = {
        deleted_at: null,
        status: { $in: ['active', 'ongoing'] }
      };

      if (branch_code) {
        query.branch_code = branch_code;
      }

      // Add overdue filter
      if (status === 'overdue') {
        query.dueDate = { $lt: new Date() };
      }

      const skip = (page - 1) * limit;

      // Get debtors with payment details
      const debtors = await InstallmentOrder.aggregate([
        { $match: query },
        {
          $lookup: {
            from: 'customers',
            localField: 'customer',
            foreignField: '_id',
            as: 'customerData'
          }
        },
        { $unwind: { path: '$customerData', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'installmentpayments',
            localField: '_id',
            foreignField: 'contractId',
            as: 'payments'
          }
        },
        {
          $addFields: {
            daysOverdue: {
              $dateDiff: {
                startDate: '$dueDate',
                endDate: new Date(),
                unit: 'day'
              }
            },
            outstandingAmount: { $subtract: ['$totalAmount', '$paidAmount'] },
            lastPaymentDate: { $max: '$payments.paymentDate' },
            paymentCount: { $size: '$payments' }
          }
        },
        {
          $project: {
            contractNo: 1,
            customerName: {
              $ifNull: [
                { $concat: ['$customerData.personalInfo.firstName', ' ', '$customerData.personalInfo.lastName'] },
                { $concat: ['$customer_info.firstName', ' ', '$customer_info.lastName'] }
              ]
            },
            customerPhone: {
              $ifNull: ['$customerData.phoneNumbers', '$customer_info.phone']
            },
            totalAmount: 1,
            paidAmount: 1,
            outstandingAmount: 1,
            monthlyPayment: 1,
            dueDate: 1,
            daysOverdue: 1,
            lastPaymentDate: 1,
            paymentCount: 1,
            status: 1,
            branch_code: 1,
            createdAt: 1
          }
        },
        { $sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 } },
        { $skip: skip },
        { $limit: parseInt(limit) }
      ]);

      // Get total count
      const totalCount = await InstallmentOrder.countDocuments(query);

      // Calculate summary statistics
      const summaryStats = await InstallmentOrder.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalDebtors: { $sum: 1 },
            totalOutstanding: {
              $sum: { $subtract: ['$totalAmount', '$paidAmount'] }
            },
            avgDaysOverdue: {
              $avg: {
                $dateDiff: {
                  startDate: '$dueDate',
                  endDate: new Date(),
                  unit: 'day'
                }
              }
            }
          }
        }
      ]);

      const stats = summaryStats[0] || {
        totalDebtors: 0,
        totalOutstanding: 0,
        avgDaysOverdue: 0
      };

      res.json({
        success: true,
        data: {
          debtors,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            pages: Math.ceil(totalCount / limit)
          },
          summary: {
            ...stats,
            avgDaysOverdue: Math.round(stats.avgDaysOverdue)
          }
        }
      });
    } catch (error) {
      console.error('❌ Error in getDebtors:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch debtors',
        message: error.message
      });
    }
  }

  /**
   * Get debtor details
   */
  static async getDebtorDetails(req, res) {
    try {
      const { id } = req.params;

      const debtor = await InstallmentOrder.findById(id)
        .populate('customer')
        .populate('salesperson.id', 'username name')
        .lean();

      if (!debtor) {
        return res.status(404).json({
          success: false,
          error: 'Debtor not found'
        });
      }

      // Get payment history
      const payments = await InstallmentPayment.find({ contractId: id })
        .sort({ paymentDate: -1 })
        .lean();

      // Calculate overdue details
      const now = new Date();
      const daysOverdue = debtor.dueDate < now
        ? Math.floor((now - debtor.dueDate) / (1000 * 60 * 60 * 24))
        : 0;

      res.json({
        success: true,
        data: {
          ...debtor,
          daysOverdue,
          paymentHistory: payments,
          outstandingAmount: debtor.totalAmount - debtor.paidAmount
        }
      });
    } catch (error) {
      console.error('❌ Error in getDebtorDetails:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch debtor details',
        message: error.message
      });
    }
  }

  // ============================================
  // BAD DEBT MANAGEMENT
  // ============================================

  /**
   * Get bad debt statistics
   */
  static async getBadDebtStats(req, res) {
    try {
      const { branch_code, startDate, endDate } = req.query;

      const query = {
        deleted_at: null,
        status: { $in: ['active', 'ongoing'] }
      };

      if (branch_code) {
        query.branch_code = branch_code;
      }

      // Define bad debt criteria (e.g., overdue > 90 days)
      const badDebtThreshold = 90; // days

      const badDebtStats = await InstallmentOrder.aggregate([
        { $match: query },
        {
          $addFields: {
            daysOverdue: {
              $cond: {
                if: { $lt: ['$dueDate', new Date()] },
                then: {
                  $dateDiff: {
                    startDate: '$dueDate',
                    endDate: new Date(),
                    unit: 'day'
                  }
                },
                else: 0
              }
            },
            outstandingAmount: { $subtract: ['$totalAmount', '$paidAmount'] }
          }
        },
        {
          $facet: {
            overview: [
              {
                $group: {
                  _id: null,
                  totalContracts: { $sum: 1 },
                  totalOutstanding: { $sum: '$outstandingAmount' },
                  overdueContracts: {
                    $sum: { $cond: [{ $gt: ['$daysOverdue', 0] }, 1, 0] }
                  },
                  overdueAmount: {
                    $sum: {
                      $cond: [
                        { $gt: ['$daysOverdue', 0] },
                        '$outstandingAmount',
                        0
                      ]
                    }
                  },
                  badDebtContracts: {
                    $sum: { $cond: [{ $gte: ['$daysOverdue', badDebtThreshold] }, 1, 0] }
                  },
                  badDebtAmount: {
                    $sum: {
                      $cond: [
                        { $gte: ['$daysOverdue', badDebtThreshold] },
                        '$outstandingAmount',
                        0
                      ]
                    }
                  }
                }
              }
            ],
            agingBuckets: [
              {
                $bucket: {
                  groupBy: '$daysOverdue',
                  boundaries: [0, 30, 60, 90, 120, 180, 365, Infinity],
                  default: 'current',
                  output: {
                    count: { $sum: 1 },
                    amount: { $sum: '$outstandingAmount' }
                  }
                }
              }
            ],
            topBadDebts: [
              { $match: { daysOverdue: { $gte: badDebtThreshold } } },
              { $sort: { outstandingAmount: -1 } },
              { $limit: 10 },
              {
                $project: {
                  contractNo: 1,
                  customerName: {
                    $concat: ['$customer_info.firstName', ' ', '$customer_info.lastName']
                  },
                  outstandingAmount: 1,
                  daysOverdue: 1,
                  lastPaymentDate: 1
                }
              }
            ]
          }
        }
      ]);

      const result = badDebtStats[0];
      const overview = result.overview[0] || {
        totalContracts: 0,
        totalOutstanding: 0,
        overdueContracts: 0,
        overdueAmount: 0,
        badDebtContracts: 0,
        badDebtAmount: 0
      };

      res.json({
        success: true,
        data: {
          overview,
          agingBuckets: result.agingBuckets,
          topBadDebts: result.topBadDebts,
          badDebtPercentage: overview.totalOutstanding > 0
            ? ((overview.badDebtAmount / overview.totalOutstanding) * 100).toFixed(2)
            : 0
        }
      });
    } catch (error) {
      console.error('❌ Error in getBadDebtStats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch bad debt statistics',
        message: error.message
      });
    }
  }

  /**
   * Mark contract as bad debt
   */
  static async markAsBadDebt(req, res) {
    try {
      const { contractId } = req.params;
      const { reason, notes } = req.body;

      const contract = await InstallmentOrder.findById(contractId);

      if (!contract) {
        return res.status(404).json({
          success: false,
          error: 'Contract not found'
        });
      }

      // Update contract status
      contract.status = 'bad_debt';
      contract.badDebtDate = new Date();
      contract.badDebtReason = reason;
      contract.badDebtNotes = notes;
      contract.updatedBy = req.user?.id;

      await contract.save();

      // Log the action
      console.log(`Contract ${contract.contractNo} marked as bad debt by ${req.user?.username}`);

      res.json({
        success: true,
        message: 'Contract marked as bad debt',
        data: contract
      });
    } catch (error) {
      console.error('❌ Error in markAsBadDebt:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mark as bad debt',
        message: error.message
      });
    }
  }

  // ============================================
  // CUSTOMER MANAGEMENT
  // ============================================

  /**
   * Get customer list with loan history
   */
  static async getCustomersWithLoans(req, res) {
    try {
      const {
        search,
        status,
        hasOverdue,
        page = 1,
        limit = 20
      } = req.query;

      const skip = (page - 1) * limit;

      // Build customer query
      const customerQuery = {};
      if (search) {
        customerQuery.$or = [
          { 'personalInfo.firstName': new RegExp(search, 'i') },
          { 'personalInfo.lastName': new RegExp(search, 'i') },
          { 'individual.firstName': new RegExp(search, 'i') },
          { 'individual.lastName': new RegExp(search, 'i') },
          { 'individual.taxId': search },
          { 'phoneNumbers': search }
        ];
      }

      // Get customers with their loan statistics
      const customers = await Customer.aggregate([
        { $match: customerQuery },
        {
          $lookup: {
            from: 'installmentorders',
            localField: '_id',
            foreignField: 'customer',
            as: 'loans'
          }
        },
        {
          $addFields: {
            totalLoans: { $size: '$loans' },
            activeLoans: {
              $size: {
                $filter: {
                  input: '$loans',
                  cond: { $in: ['$$this.status', ['active', 'ongoing']] }
                }
              }
            },
            totalBorrowed: { $sum: '$loans.totalAmount' },
            totalPaid: { $sum: '$loans.paidAmount' },
            hasOverdue: {
              $gt: [
                {
                  $size: {
                    $filter: {
                      input: '$loans',
                      cond: {
                        $and: [
                          { $in: ['$$this.status', ['active', 'ongoing']] },
                          { $lt: ['$$this.dueDate', new Date()] }
                        ]
                      }
                    }
                  }
                },
                0
              ]
            }
          }
        },
        {
          $project: {
            loans: 0 // Remove the full loans array to reduce data size
          }
        },
        { $sort: { totalLoans: -1 } },
        { $skip: skip },
        { $limit: parseInt(limit) }
      ]);

      // Get total count
      const totalCount = await Customer.countDocuments(customerQuery);

      res.json({
        success: true,
        data: {
          customers,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            pages: Math.ceil(totalCount / limit)
          }
        }
      });
    } catch (error) {
      console.error('❌ Error in getCustomersWithLoans:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch customers',
        message: error.message
      });
    }
  }

  /**
   * Get customer loan details
   */
  static async getCustomerLoanDetails(req, res) {
    try {
      const { customerId } = req.params;

      const customer = await Customer.findById(customerId).lean();

      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found'
        });
      }

      // Get all loans for this customer
      const loans = await InstallmentOrder.find({ customer: customerId })
        .sort({ createdAt: -1 })
        .lean();

      // Get payment history
      const loanIds = loans.map(loan => loan._id);
      const payments = await InstallmentPayment.find({
        contractId: { $in: loanIds }
      })
        .sort({ paymentDate: -1 })
        .lean();

      // Calculate statistics
      const stats = {
        totalLoans: loans.length,
        activeLoans: loans.filter(l => ['active', 'ongoing'].includes(l.status)).length,
        completedLoans: loans.filter(l => l.status === 'completed').length,
        totalBorrowed: loans.reduce((sum, l) => sum + l.totalAmount, 0),
        totalPaid: loans.reduce((sum, l) => sum + l.paidAmount, 0),
        totalPayments: payments.length,
        lastPaymentDate: payments[0]?.paymentDate,
        creditScore: customer.creditInfo?.creditScore || 0
      };

      res.json({
        success: true,
        data: {
          customer,
          loans,
          payments,
          statistics: stats
        }
      });
    } catch (error) {
      console.error('❌ Error in getCustomerLoanDetails:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch customer details',
        message: error.message
      });
    }
  }

  // ============================================
  // INSTALLMENT HISTORY
  // ============================================

  /**
   * Get installment payment history
   */
  static async getInstallmentHistory(req, res) {
    try {
      const {
        contractNo,
        customerId,
        startDate,
        endDate,
        status,
        branch_code,
        page = 1,
        limit = 20
      } = req.query;

      const query = {};

      if (contractNo) {
        query.contractNumber = contractNo;
      }

      if (customerId) {
        query.customerId = customerId;
      }

      if (status) {
        query.status = status;
      }

      if (branch_code) {
        query.branchCode = branch_code;
      }

      if (startDate && endDate) {
        query.paymentDate = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      const skip = (page - 1) * limit;

      const payments = await InstallmentPayment.find(query)
        .populate('contractId', 'contractNo customer_info')
        .populate('recordedBy', 'username name')
        .sort({ paymentDate: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      const totalCount = await InstallmentPayment.countDocuments(query);

      // Calculate summary
      const summary = await InstallmentPayment.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            totalPayments: { $sum: 1 },
            avgAmount: { $avg: '$amount' }
          }
        }
      ]);

      res.json({
        success: true,
        data: {
          payments,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            pages: Math.ceil(totalCount / limit)
          },
          summary: summary[0] || {
            totalAmount: 0,
            totalPayments: 0,
            avgAmount: 0
          }
        }
      });
    } catch (error) {
      console.error('❌ Error in getInstallmentHistory:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch installment history',
        message: error.message
      });
    }
  }

  // ============================================
  // REPAYMENT MANAGEMENT
  // ============================================

  /**
   * Get repayment schedule
   */
  static async getRepaymentSchedule(req, res) {
    try {
      const { contractId } = req.params;

      const contract = await InstallmentOrder.findById(contractId).lean();

      if (!contract) {
        return res.status(404).json({
          success: false,
          error: 'Contract not found'
        });
      }

      // Get existing payments
      const payments = await InstallmentPayment.find({ contractId })
        .sort({ installmentNumber: 1 })
        .lean();

      // Generate payment schedule
      const schedule = [];
      const startDate = moment(contract.createdAt);

      for (let i = 1; i <= contract.installmentCount; i++) {
        const dueDate = startDate.clone().add(i, 'months');
        const payment = payments.find(p => p.installmentNumber === i);

        schedule.push({
          installmentNumber: i,
          dueDate: dueDate.toDate(),
          amount: contract.monthlyPayment,
          status: payment ? payment.status : 'pending',
          paymentDate: payment?.paymentDate,
          paidAmount: payment?.amount || 0,
          receiptNumber: payment?.receiptNumber,
          isOverdue: !payment && dueDate.isBefore(moment())
        });
      }

      res.json({
        success: true,
        data: {
          contract,
          schedule,
          summary: {
            totalInstallments: contract.installmentCount,
            paidInstallments: payments.length,
            remainingInstallments: contract.installmentCount - payments.length,
            totalAmount: contract.totalAmount,
            paidAmount: contract.paidAmount,
            remainingAmount: contract.totalAmount - contract.paidAmount
          }
        }
      });
    } catch (error) {
      console.error('❌ Error in getRepaymentSchedule:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch repayment schedule',
        message: error.message
      });
    }
  }

  /**
   * Record a repayment
   */
  static async recordRepayment(req, res) {
    try {
      const {
        contractId,
        installmentNumber,
        amount,
        paymentMethod,
        paymentDate,
        notes
      } = req.body;

      // Validate contract
      const contract = await InstallmentOrder.findById(contractId);

      if (!contract) {
        return res.status(404).json({
          success: false,
          error: 'Contract not found'
        });
      }

      // Check if payment already exists
      const existingPayment = await InstallmentPayment.findOne({
        contractId,
        installmentNumber
      });

      if (existingPayment && existingPayment.status === 'confirmed') {
        return res.status(400).json({
          success: false,
          error: 'Payment already recorded for this installment'
        });
      }

      // Create payment record
      const payment = new InstallmentPayment({
        paymentId: `PAY${Date.now()}`,
        contractId,
        contractNumber: contract.contractNo,
        customerId: contract.customer,
        customerName: `${contract.customer_info.firstName} ${contract.customer_info.lastName}`,
        customerPhone: contract.customer_info.phone,
        installmentNumber,
        dueDate: moment(contract.createdAt).add(installmentNumber, 'months').toDate(),
        paymentDate: paymentDate || new Date(),
        amount,
        paymentMethod,
        status: 'confirmed',
        receiptNumber: `RCP${Date.now()}`,
        notes,
        branchCode: contract.branch_code,
        recordedBy: req.user?.id,
        recordedByName: req.user?.username
      });

      await payment.save();

      // Update contract paid amount
      contract.paidAmount += amount;

      // Check if fully paid
      if (contract.paidAmount >= contract.totalAmount) {
        contract.status = 'completed';
        contract.completedDate = new Date();
      }

      await contract.save();

      res.json({
        success: true,
        message: 'Payment recorded successfully',
        data: {
          payment,
          contract: {
            contractNo: contract.contractNo,
            totalAmount: contract.totalAmount,
            paidAmount: contract.paidAmount,
            remainingAmount: contract.totalAmount - contract.paidAmount,
            status: contract.status
          }
        }
      });
    } catch (error) {
      console.error('❌ Error in recordRepayment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to record repayment',
        message: error.message
      });
    }
  }

  // ============================================
  // TAX & DEPOSITS
  // ============================================

  /**
   * Get tax summary for loans
   */
  static async getTaxSummary(req, res) {
    try {
      const { year = new Date().getFullYear(), branch_code } = req.query;

      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59);

      const query = {
        createdAt: { $gte: startDate, $lte: endDate },
        deleted_at: null
      };

      if (branch_code) {
        query.branch_code = branch_code;
      }

      const taxSummary = await InstallmentOrder.aggregate([
        { $match: query },
        {
          $group: {
            _id: { $month: '$createdAt' },
            totalSales: { $sum: '$totalAmount' },
            totalVat: { $sum: { $multiply: ['$totalAmount', 0.07] } }, // 7% VAT
            contractCount: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      // Format monthly data
      const monthlyData = Array.from({ length: 12 }, (_, i) => {
        const monthData = taxSummary.find(t => t._id === i + 1);
        return {
          month: i + 1,
          monthName: moment().month(i).format('MMMM'),
          totalSales: monthData?.totalSales || 0,
          totalVat: monthData?.totalVat || 0,
          contractCount: monthData?.contractCount || 0
        };
      });

      // Calculate yearly totals
      const yearlyTotal = monthlyData.reduce((acc, month) => ({
        totalSales: acc.totalSales + month.totalSales,
        totalVat: acc.totalVat + month.totalVat,
        contractCount: acc.contractCount + month.contractCount
      }), { totalSales: 0, totalVat: 0, contractCount: 0 });

      res.json({
        success: true,
        data: {
          year,
          monthly: monthlyData,
          yearly: yearlyTotal
        }
      });
    } catch (error) {
      console.error('❌ Error in getTaxSummary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch tax summary',
        message: error.message
      });
    }
  }

  /**
   * Get deposit receipts
   */
  static async getDepositReceipts(req, res) {
    try {
      const {
        startDate,
        endDate,
        branch_code,
        status = 'active',
        page = 1,
        limit = 20
      } = req.query;

      const query = { purchaseType: 'installment' };

      if (branch_code) {
        query.branch_code = branch_code;
      }

      if (status) {
        query.status = status;
      }

      if (startDate && endDate) {
        query.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      const skip = (page - 1) * limit;

      // Get deposits from installment orders
      const deposits = await InstallmentOrder.find(query)
        .select('contractNo customer_info downPayment createdAt status branch_code')
        .populate('customer', 'personalInfo phoneNumbers')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      const totalCount = await InstallmentOrder.countDocuments(query);

      // Calculate summary
      const summary = await InstallmentOrder.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalDeposits: { $sum: '$downPayment' },
            count: { $sum: 1 },
            avgDeposit: { $avg: '$downPayment' }
          }
        }
      ]);

      res.json({
        success: true,
        data: {
          deposits: deposits.map(d => ({
            id: d._id,
            receiptNo: `DEP-${d.contractNo}`,
            contractNo: d.contractNo,
            customerName: `${d.customer_info.firstName} ${d.customer_info.lastName}`,
            customerPhone: d.customer_info.phone,
            amount: d.downPayment,
            date: d.createdAt,
            status: d.status,
            branch_code: d.branch_code
          })),
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            pages: Math.ceil(totalCount / limit)
          },
          summary: summary[0] || {
            totalDeposits: 0,
            count: 0,
            avgDeposit: 0
          }
        }
      });
    } catch (error) {
      console.error('❌ Error in getDepositReceipts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch deposit receipts',
        message: error.message
      });
    }
  }

  // ============================================
  // CREDIT APPROVAL
  // ============================================

  /**
   * Get pending credit approvals
   */
  static async getPendingApprovals(req, res) {
    try {
      const { branch_code } = req.query;

      const query = {
        status: 'pending',
        deleted_at: null
      };

      if (branch_code) {
        query.branch_code = branch_code;
      }

      const pendingApprovals = await InstallmentOrder.find(query)
        .populate('customer', 'personalInfo creditInfo phoneNumbers')
        .populate('salesperson.id', 'username name')
        .sort({ createdAt: -1 })
        .lean();

      // Add credit score and risk assessment
      const approvalsWithRisk = pendingApprovals.map(approval => {
        const creditScore = approval.customer?.creditInfo?.creditScore || 0;
        let riskLevel = 'high';
        let recommendation = 'reject';

        if (creditScore >= 700) {
          riskLevel = 'low';
          recommendation = 'approve';
        } else if (creditScore >= 500) {
          riskLevel = 'medium';
          recommendation = 'review';
        }

        return {
          ...approval,
          riskAssessment: {
            creditScore,
            riskLevel,
            recommendation,
            loanToIncomeRatio: approval.customer?.workInfo?.monthlyIncome
              ? (approval.monthlyPayment / approval.customer.workInfo.monthlyIncome * 100).toFixed(2)
              : null
          }
        };
      });

      res.json({
        success: true,
        data: approvalsWithRisk,
        summary: {
          total: approvalsWithRisk.length,
          lowRisk: approvalsWithRisk.filter(a => a.riskAssessment.riskLevel === 'low').length,
          mediumRisk: approvalsWithRisk.filter(a => a.riskAssessment.riskLevel === 'medium').length,
          highRisk: approvalsWithRisk.filter(a => a.riskAssessment.riskLevel === 'high').length
        }
      });
    } catch (error) {
      console.error('❌ Error in getPendingApprovals:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch pending approvals',
        message: error.message
      });
    }
  }

  /**
   * Approve or reject credit application
   */
  static async processCreditApproval(req, res) {
    try {
      const { contractId } = req.params;
      const { action, notes, conditions } = req.body;

      if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid action. Must be approve or reject'
        });
      }

      const contract = await InstallmentOrder.findById(contractId);

      if (!contract) {
        return res.status(404).json({
          success: false,
          error: 'Contract not found'
        });
      }

      if (contract.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: 'Contract is not pending approval'
        });
      }

      // Update contract status
      contract.status = action === 'approve' ? 'approved' : 'rejected';
      contract.approvalDate = new Date();
      contract.approvedBy = req.user?.id;
      contract.approvalNotes = notes;

      if (conditions) {
        contract.approvalConditions = conditions;
      }

      await contract.save();

      // Log the action
      console.log(`Contract ${contract.contractNo} ${action}ed by ${req.user?.username}`);

      res.json({
        success: true,
        message: `Contract ${action}ed successfully`,
        data: contract
      });
    } catch (error) {
      console.error('❌ Error in processCreditApproval:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process approval',
        message: error.message
      });
    }
  }

  // ============================================
  // ADDITIONAL METHODS FOR MISSING ENDPOINTS
  // ============================================

  /**
   * Get repayment statistics
   */
  static async getRepaymentStats(req, res) {
    try {
      const { branch, startDate, endDate } = req.query;

      // Build query
      const query = {};
      if (branch) query.branch_code = branch;

      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      // Get repayment statistics
      const [totalStats, monthlyStats, statusBreakdown] = await Promise.all([
        // Total statistics
        InstallmentOrder.aggregate([
          { $match: query },
          {
            $group: {
              _id: null,
              totalContracts: { $sum: 1 },
              totalAmount: { $sum: '$totalAmount' },
              totalPaid: { $sum: '$paidAmount' },
              avgPaymentRate: { $avg: { $divide: ['$paidAmount', '$totalAmount'] } }
            }
          }
        ]),

        // Monthly repayment trend
        InstallmentPayment.aggregate([
          {
            $match: {
              status: 'confirmed',
              ...(query.createdAt && { paymentDate: query.createdAt })
            }
          },
          {
            $group: {
              _id: {
                year: { $year: '$paymentDate' },
                month: { $month: '$paymentDate' }
              },
              totalPayments: { $sum: '$amount' },
              paymentCount: { $sum: 1 }
            }
          },
          { $sort: { '_id.year': -1, '_id.month': -1 } },
          { $limit: 12 }
        ]),

        // Status breakdown
        InstallmentOrder.aggregate([
          { $match: query },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
              totalAmount: { $sum: '$totalAmount' }
            }
          }
        ])
      ]);

      res.json({
        success: true,
        data: {
          summary: totalStats[0] || {
            totalContracts: 0,
            totalAmount: 0,
            totalPaid: 0,
            avgPaymentRate: 0
          },
          monthlyTrend: monthlyStats.map(stat => ({
            month: `${stat._id.year}-${String(stat._id.month).padStart(2, '0')}`,
            payments: stat.totalPayments,
            count: stat.paymentCount
          })),
          statusBreakdown: statusBreakdown.reduce((acc, curr) => {
            acc[curr._id] = {
              count: curr.count,
              amount: curr.totalAmount
            };
            return acc;
          }, {})
        }
      });
    } catch (error) {
      console.error('❌ Error getting repayment stats:', error);
      res.status(500).json({
        success: false,
        error: 'ไม่สามารถดึงข้อมูลสถิติการชำระได้'
      });
    }
  }

  /**
   * Get specific contract details
   */
  static async getContractDetail(req, res) {
    try {
      const { contractId } = req.params;

      const contract = await InstallmentOrder.findById(contractId)
        .populate('customer', 'customerType individual personalInfo contactInfo creditInfo')
        .populate('payments')
        .lean();

      if (!contract) {
        return res.status(404).json({
          success: false,
          error: 'ไม่พบข้อมูลสัญญา'
        });
      }

      // Calculate payment progress
      const paymentProgress = {
        totalInstallments: contract.installmentCount,
        paidInstallments: await InstallmentPayment.countDocuments({
          contractId: contract._id,
          status: 'confirmed'
        }),
        nextDueDate: contract.dueDate,
        remainingAmount: contract.totalAmount - contract.paidAmount,
        overdueAmount: 0
      };

      // Check for overdue
      if (new Date(contract.dueDate) < new Date() && contract.status !== 'completed') {
        const overduePayments = await InstallmentPayment.find({
          contractId: contract._id,
          dueDate: { $lt: new Date() },
          status: { $ne: 'confirmed' }
        });

        paymentProgress.overdueAmount = overduePayments.reduce((sum, p) => sum + p.amount, 0);
      }

      res.json({
        success: true,
        data: {
          contract,
          paymentProgress,
          paymentHistory: contract.payments || []
        }
      });
    } catch (error) {
      console.error('❌ Error getting contract detail:', error);
      res.status(500).json({
        success: false,
        error: 'ไม่สามารถดึงข้อมูลสัญญาได้'
      });
    }
  }

  /**
   * Reject payoff approval
   */
  static async rejectPayoffApproval(req, res) {
    try {
      const { approvalId } = req.params;
      const { reason } = req.body;

      const order = await InstallmentOrder.findById(approvalId);

      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'ไม่พบคำขออนุมัติ'
        });
      }

      // Update status
      order.approvalStatus = 'rejected';
      order.approvalReason = reason;
      order.approvedBy = req.user?._id;
      order.approvedAt = new Date();

      await order.save();

      // TODO: Send notification to customer

      res.json({
        success: true,
        message: 'ปฏิเสธคำขออนุมัติเรียบร้อย',
        data: order
      });
    } catch (error) {
      console.error('❌ Error rejecting payoff approval:', error);
      res.status(500).json({
        success: false,
        error: 'ไม่สามารถปฏิเสธคำขออนุมัติได้'
      });
    }
  }
}

module.exports = LoanManagementController;