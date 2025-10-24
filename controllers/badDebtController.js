/**
 * Bad Debt Controller - Complete bad debt management system
 * @version 1.0.0
 */

const mongoose = require('mongoose');
const InstallmentOrder = require('../models/Installment/InstallmentOrder');
const InstallmentPayment = require('../models/Installment/InstallmentPayment');
const Customer = require('../models/Customer/Customer');
const BadDebtCriteria = require('../models/BadDebtCriteria');
const installmentController = require('./installmentController');
const moment = require('moment');

class BadDebtController {
  /**
   * 🔥 NEW: Get integrated bad debt list including installment contracts
   * This method combines traditional bad debts with installment-originated debts
   */
  static async getIntegratedList(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        branch_code,
        overdueDays = 30,
        sortBy = 'overdueAmount',
        sortOrder = 'desc',
        includeInstallments = true
      } = req.query;

      console.log('🔍 Fetching integrated bad debt list including installment contracts...');

      const skip = (parseInt(page) - 1) * parseInt(limit);
      let allBadDebts = [];
      let totalCount = 0;

      // 1. Get traditional bad debts (existing logic)
      const traditionalBadDebts = await this.getTraditionalBadDebts({
        branch_code,
        overdueDays,
        limit: includeInstallments ? Math.floor(parseInt(limit) / 2) : parseInt(limit),
        skip: includeInstallments ? Math.floor(skip / 2) : skip
      });

      // 2. Get installment-originated bad debts if requested
      let installmentBadDebts = [];
      if (includeInstallments === 'true' || includeInstallments === true) {
        installmentBadDebts = await this.getInstallmentBadDebts({
          branch_code,
          overdueDays,
          limit: Math.ceil(parseInt(limit) / 2),
          skip: Math.ceil(skip / 2)
        });
      }

      // 3. Combine and normalize data
      const combinedDebts = [
        ...traditionalBadDebts.data.map(debt => ({
          ...debt,
          sourceType: 'traditional',
          integratedId: `trad_${debt.id}`,
          originalId: debt.id
        })),
        ...installmentBadDebts.map(debt => ({
          ...debt,
          sourceType: 'installment',
          integratedId: `inst_${debt.id}`,
          originalId: debt.id
        }))
      ];

      // 4. Sort combined results
      combinedDebts.sort((a, b) => {
        const aValue = a[sortBy] || 0;
        const bValue = b[sortBy] || 0;
        return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
      });

      // 5. Apply pagination to combined results
      const paginatedDebts = combinedDebts.slice(skip, skip + parseInt(limit));
      totalCount = traditionalBadDebts.total + installmentBadDebts.length;

      // 6. Calculate summary statistics
      const summary = {
        totalContracts: totalCount,
        totalOverdueAmount: combinedDebts.reduce((sum, debt) => sum + (debt.overdueAmount || 0), 0),
        traditionalDebts: traditionalBadDebts.total,
        installmentDebts: installmentBadDebts.length,
        riskDistribution: this.calculateIntegratedRiskDistribution(combinedDebts)
      };

      console.log(`✅ Found ${totalCount} integrated bad debts (${traditionalBadDebts.total} traditional + ${installmentBadDebts.length} installment)`);

      res.json({
        success: true,
        data: paginatedDebts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / parseInt(limit))
        },
        summary,
        integration: {
          includesInstallments: includeInstallments,
          dataTypes: ['traditional', 'installment'],
          lastUpdated: new Date()
        }
      });

    } catch (error) {
      console.error('❌ Error in BadDebt getIntegratedList:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch integrated bad debt list',
        message: error.message
      });
    }
  }

  /**
   * Helper method to get traditional bad debts
   */
  static async getTraditionalBadDebts(options) {
    const { branch_code, overdueDays, limit, skip } = options;

    const query = {
      deleted_at: null,
      status: { $in: ['active', 'ongoing'] }
    };

    if (branch_code) {
      query.branch_code = branch_code;
    }

    const overdueDate = moment().subtract(parseInt(overdueDays), 'days').toDate();
    query.dueDate = { $lt: overdueDate };

    const [debts, totalCount] = await Promise.all([
      InstallmentOrder.aggregate([
        { $match: query },
        {
          $addFields: {
            overdueAmount: { $max: [0, { $subtract: ['$totalAmount', '$paidAmount'] }] },
            overdueDays: { $divide: [{ $subtract: [new Date(), '$dueDate'] }, 86400000] }
          }
        },
        { $match: { overdueAmount: { $gt: 0 }, overdueDays: { $gte: parseInt(overdueDays) } } },
        { $skip: skip },
        { $limit: limit }
      ]),
      InstallmentOrder.aggregate([
        { $match: query },
        {
          $addFields: {
            overdueAmount: { $max: [0, { $subtract: ['$totalAmount', '$paidAmount'] }] },
            overdueDays: { $divide: [{ $subtract: [new Date(), '$dueDate'] }, 86400000] }
          }
        },
        { $match: { overdueAmount: { $gt: 0 }, overdueDays: { $gte: parseInt(overdueDays) } } },
        { $count: 'total' }
      ])
    ]);

    return {
      data: debts,
      total: totalCount[0]?.total || 0
    };
  }

  /**
   * Helper method to get installment-originated bad debts
   */
  static async getInstallmentBadDebts(options) {
    const { branch_code, overdueDays, limit, skip } = options;

    try {
      // Use the installment controller's method to get contracts for bad debt display
      const mockReq = {
        query: {
          overdueDays,
          branchCode: branch_code,
          page: Math.floor(skip / limit) + 1,
          limit,
          sortBy: 'daysPastDue',
          sortOrder: 'desc'
        }
      };

      const mockRes = {
        json: (data) => data,
        status: (code) => ({ json: (data) => ({ ...data, statusCode: code }) })
      };

      // Get installment contracts formatted for bad debt display
      await installmentController.getContractsForBadDebtDisplay(mockReq, mockRes);

      // Since we can't directly get the response, we'll make a direct call
      const currentDate = new Date();
      const overdueDate = moment().subtract(parseInt(overdueDays), 'days').toDate();

      const matchQuery = {
        deleted_at: null,
        status: { $in: ['active', 'ongoing', 'approved'] },
        dueDate: { $lt: overdueDate }
      };

      if (branch_code) {
        matchQuery.branch_code = branch_code;
      }

      const installmentContracts = await InstallmentOrder.aggregate([
        { $match: matchQuery },
        {
          $addFields: {
            daysPastDue: { $divide: [{ $subtract: [currentDate, '$dueDate'] }, 86400000] },
            remainingAmount: { $max: [0, { $subtract: ['$totalAmount', '$paidAmount'] }] }
          }
        },
        {
          $match: {
            remainingAmount: { $gt: 0 },
            daysPastDue: { $gte: parseInt(overdueDays) }
          }
        },
        { $skip: skip },
        { $limit: limit }
      ]);

      // Convert each contract to debt format
      const badDebts = await Promise.all(
        installmentContracts.map(async (contract) => {
          const debtRecord = await installmentController.convertInstallmentToDebtRecord(contract);
          return {
            id: contract._id,
            contractNumber: contract.contractNo,
            customerName: debtRecord.customerName,
            customerPhone: debtRecord.customerPhone,
            customerAddress: debtRecord.customerAddress,
            totalAmount: debtRecord.originalAmount,
            paidAmount: debtRecord.paidAmount,
            overdueAmount: debtRecord.currentBalance,
            overdueDays: Math.round(contract.daysPastDue || 0),
            dueDate: contract.dueDate,
            monthlyPayment: debtRecord.monthlyPayment,
            branchCode: contract.branch_code,
            riskLevel: debtRecord.agingAnalysis.riskLevel,
            debtStatus: debtRecord.debtStatus,
            badDebtCategory: debtRecord.badDebtClassification.category,
            recommendations: debtRecord.badDebtClassification.recommendations,
            productName: contract.items?.[0]?.name || 'ไม่ระบุ',
            salesPerson: contract.staffName,
            lastPaymentDate: debtRecord.agingAnalysis.lastPaymentDate,
            nextDueDate: debtRecord.agingAnalysis.nextDueDate,
            sourceType: 'installment_contract',
            originalContract: contract
          };
        })
      );

      return badDebts;

    } catch (error) {
      console.error('❌ Error getting installment bad debts:', error);
      return [];
    }
  }

  /**
   * Calculate risk distribution for integrated bad debts
   */
  static calculateIntegratedRiskDistribution(combinedDebts) {
    const distribution = {
      'ต่ำ': 0,
      'ปานกลาง': 0,
      'สูง': 0,
      'สูงมาก': 0
    };

    combinedDebts.forEach(debt => {
      const riskLevel = debt.riskLevel;
      if (distribution.hasOwnProperty(riskLevel)) {
        distribution[riskLevel]++;
      }
    });

    return distribution;
  }

  /**
   * Get list of bad debts based on criteria (original method)
   */
  static async getList(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        branch_code,
        overdueDays = 30,
        sortBy = 'overdueAmount',
        sortOrder = 'desc',
        status = 'active'
      } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const query = {
        deleted_at: null,
        status: { $in: ['active', 'ongoing'] }
      };

      if (branch_code) {
        query.branch_code = branch_code;
      }

      // Calculate overdue date threshold
      const overdueDate = moment().subtract(parseInt(overdueDays), 'days').toDate();
      query.dueDate = { $lt: overdueDate };

      // Aggregation pipeline for bad debt analysis
      const pipeline = [
        { $match: query },
        {
          $lookup: {
            from: 'customers',
            localField: 'customer',
            foreignField: '_id',
            as: 'customerDetails'
          }
        },
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
            overdueAmount: {
              $max: [0, { $subtract: ['$totalAmount', '$paidAmount'] }]
            },
            overdueDays: {
              $divide: [
                { $subtract: [new Date(), '$dueDate'] },
                86400000 // milliseconds in a day
              ]
            },
            lastPaymentDate: {
              $max: '$payments.paymentDate'
            },
            paymentCount: { $size: '$payments' },
            customerInfo: { $arrayElemAt: ['$customerDetails', 0] }
          }
        },
        {
          $match: {
            overdueAmount: { $gt: 0 },
            overdueDays: { $gte: parseInt(overdueDays) }
          }
        },
        {
          $project: {
            contractNo: 1,
            customerName: {
              $concat: [
                { $ifNull: ['$customer_info.firstName', ''] },
                ' ',
                { $ifNull: ['$customer_info.lastName', ''] }
              ]
            },
            customerPhone: '$customer_info.phone',
            customerAddress: {
              $concat: [
                { $ifNull: ['$customer_info.address.houseNo', ''] },
                ' ',
                { $ifNull: ['$customer_info.address.subDistrict', ''] },
                ' ',
                { $ifNull: ['$customer_info.address.district', ''] },
                ' ',
                { $ifNull: ['$customer_info.address.province', ''] }
              ]
            },
            totalAmount: 1,
            paidAmount: 1,
            overdueAmount: 1,
            overdueDays: { $round: ['$overdueDays', 0] },
            dueDate: 1,
            lastPaymentDate: 1,
            paymentCount: 1,
            monthlyPayment: 1,
            installmentCount: 1,
            branch_code: 1,
            status: 1,
            createdAt: 1,
            items: 1,
            riskLevel: {
              $switch: {
                branches: [
                  {
                    case: { $gte: ['$overdueDays', 180] },
                    then: 'ความเสี่ยงสูงมาก'
                  },
                  {
                    case: { $gte: ['$overdueDays', 90] },
                    then: 'ความเสี่ยงสูง'
                  },
                  {
                    case: { $gte: ['$overdueDays', 60] },
                    then: 'ความเสี่ยงปานกลาง'
                  },
                  {
                    case: { $gte: ['$overdueDays', 30] },
                    then: 'ความเสี่ยงต่ำ'
                  }
                ],
                default: 'ปกติ'
              }
            },
            riskScore: {
              $multiply: [
                { $divide: ['$overdueAmount', 100000] }, // Amount factor
                { $divide: ['$overdueDays', 30] } // Time factor
              ]
            }
          }
        }
      ];

      // Add sorting
      const sortField = {};
      sortField[sortBy] = sortOrder === 'desc' ? -1 : 1;
      pipeline.push({ $sort: sortField });

      // Execute aggregation with pagination
      const [badDebts, totalCount] = await Promise.all([
        InstallmentOrder.aggregate([
          ...pipeline,
          { $skip: skip },
          { $limit: parseInt(limit) }
        ]),
        InstallmentOrder.aggregate([
          ...pipeline,
          { $count: 'total' }
        ])
      ]);

      const total = totalCount[0]?.total || 0;

      // Format the results
      const formattedDebts = badDebts.map(debt => ({
        id: debt._id,
        contractNo: debt.contractNo,
        customerName: debt.customerName.trim() || 'ไม่ระบุ',
        customerPhone: debt.customerPhone || 'ไม่ระบุ',
        customerAddress: debt.customerAddress.trim() || 'ไม่ระบุ',
        totalAmount: Math.max(0, debt.totalAmount || 0),
        paidAmount: Math.max(0, debt.paidAmount || 0),
        overdueAmount: Math.max(0, debt.overdueAmount || 0),
        overdueDays: Math.max(0, debt.overdueDays || 0),
        dueDate: debt.dueDate,
        lastPaymentDate: debt.lastPaymentDate,
        paymentCount: debt.paymentCount || 0,
        monthlyPayment: Math.max(0, debt.monthlyPayment || 0),
        installmentCount: debt.installmentCount || 0,
        branchCode: debt.branch_code,
        status: debt.status,
        riskLevel: debt.riskLevel,
        riskScore: Math.round((debt.riskScore || 0) * 100) / 100,
        productName: debt.items?.[0]?.name || 'ไม่ระบุ',
        createdAt: debt.createdAt,
        // Additional fields for frontend
        remainingInstallments: Math.max(0, (debt.installmentCount || 0) - (debt.paymentCount || 0)),
        progressPercentage: debt.totalAmount > 0
          ? Math.round(((debt.paidAmount || 0) / debt.totalAmount) * 100)
          : 0
      }));

      res.json({
        success: true,
        data: formattedDebts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        filters: {
          overdueDays: parseInt(overdueDays),
          branch_code,
          status,
          sortBy,
          sortOrder
        }
      });

    } catch (error) {
      console.error('❌ Error in BadDebt getList:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch bad debt list',
        message: error.message
      });
    }
  }

  /**
   * Get bad debt statistics and summary
   */
  static async getStatistics(req, res) {
    try {
      const { branch_code, period = '30' } = req.query;
      const query = {
        deleted_at: null,
        status: { $in: ['active', 'ongoing'] }
      };

      if (branch_code) {
        query.branch_code = branch_code;
      }

      // Calculate different overdue periods
      const overduePeriods = [30, 60, 90, 180, 365];
      const currentDate = new Date();

      const [overallStats, riskDistribution, monthlyTrends] = await Promise.all([
        // Overall bad debt statistics
        InstallmentOrder.aggregate([
          { $match: query },
          {
            $addFields: {
              overdueAmount: {
                $max: [0, { $subtract: ['$totalAmount', '$paidAmount'] }]
              },
              overdueDays: {
                $divide: [
                  { $subtract: [currentDate, '$dueDate'] },
                  86400000
                ]
              }
            }
          },
          {
            $group: {
              _id: null,
              totalContracts: { $sum: 1 },
              totalAmount: { $sum: '$totalAmount' },
              totalPaid: { $sum: '$paidAmount' },
              totalOverdue: { $sum: '$overdueAmount' },
              overdue_30_days: {
                $sum: {
                  $cond: [{ $gte: ['$overdueDays', 30] }, '$overdueAmount', 0]
                }
              },
              overdue_60_days: {
                $sum: {
                  $cond: [{ $gte: ['$overdueDays', 60] }, '$overdueAmount', 0]
                }
              },
              overdue_90_days: {
                $sum: {
                  $cond: [{ $gte: ['$overdueDays', 90] }, '$overdueAmount', 0]
                }
              },
              overdue_180_days: {
                $sum: {
                  $cond: [{ $gte: ['$overdueDays', 180] }, '$overdueAmount', 0]
                }
              },
              overdue_365_days: {
                $sum: {
                  $cond: [{ $gte: ['$overdueDays', 365] }, '$overdueAmount', 0]
                }
              },
              count_30_days: {
                $sum: {
                  $cond: [{ $gte: ['$overdueDays', 30] }, 1, 0]
                }
              },
              count_60_days: {
                $sum: {
                  $cond: [{ $gte: ['$overdueDays', 60] }, 1, 0]
                }
              },
              count_90_days: {
                $sum: {
                  $cond: [{ $gte: ['$overdueDays', 90] }, 1, 0]
                }
              },
              count_180_days: {
                $sum: {
                  $cond: [{ $gte: ['$overdueDays', 180] }, 1, 0]
                }
              },
              count_365_days: {
                $sum: {
                  $cond: [{ $gte: ['$overdueDays', 365] }, 1, 0]
                }
              }
            }
          }
        ]),

        // Risk level distribution
        InstallmentOrder.aggregate([
          { $match: query },
          {
            $addFields: {
              overdueAmount: {
                $max: [0, { $subtract: ['$totalAmount', '$paidAmount'] }]
              },
              overdueDays: {
                $divide: [
                  { $subtract: [currentDate, '$dueDate'] },
                  86400000
                ]
              }
            }
          },
          {
            $match: { overdueDays: { $gte: 30 } }
          },
          {
            $group: {
              _id: {
                $switch: {
                  branches: [
                    { case: { $gte: ['$overdueDays', 180] }, then: 'สูงมาก' },
                    { case: { $gte: ['$overdueDays', 90] }, then: 'สูง' },
                    { case: { $gte: ['$overdueDays', 60] }, then: 'ปานกลาง' },
                    { case: { $gte: ['$overdueDays', 30] }, then: 'ต่ำ' }
                  ],
                  default: 'ปกติ'
                }
              },
              count: { $sum: 1 },
              amount: { $sum: '$overdueAmount' }
            }
          }
        ]),

        // Monthly bad debt trends (last 12 months)
        InstallmentOrder.aggregate([
          {
            $match: {
              ...query,
              createdAt: { $gte: moment().subtract(12, 'months').toDate() }
            }
          },
          {
            $addFields: {
              overdueAmount: {
                $max: [0, { $subtract: ['$totalAmount', '$paidAmount'] }]
              },
              overdueDays: {
                $divide: [
                  { $subtract: [currentDate, '$dueDate'] },
                  86400000
                ]
              }
            }
          },
          {
            $match: { overdueDays: { $gte: 30 } }
          },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' }
              },
              amount: { $sum: '$overdueAmount' },
              count: { $sum: 1 }
            }
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } }
        ])
      ]);

      const stats = overallStats[0] || {};

      // Calculate bad debt ratios
      const badDebtRatio = stats.totalAmount > 0
        ? ((stats.totalOverdue / stats.totalAmount) * 100).toFixed(2)
        : 0;

      const collectionRate = stats.totalAmount > 0
        ? ((stats.totalPaid / stats.totalAmount) * 100).toFixed(2)
        : 0;

      // Format aged analysis
      const agedAnalysis = [
        {
          period: '30-59 วัน',
          amount: Math.max(0, (stats.overdue_30_days || 0) - (stats.overdue_60_days || 0)),
          count: Math.max(0, (stats.count_30_days || 0) - (stats.count_60_days || 0)),
          percentage: stats.totalOverdue > 0
            ? (((stats.overdue_30_days || 0) - (stats.overdue_60_days || 0)) / stats.totalOverdue * 100).toFixed(2)
            : 0
        },
        {
          period: '60-89 วัน',
          amount: Math.max(0, (stats.overdue_60_days || 0) - (stats.overdue_90_days || 0)),
          count: Math.max(0, (stats.count_60_days || 0) - (stats.count_90_days || 0)),
          percentage: stats.totalOverdue > 0
            ? (((stats.overdue_60_days || 0) - (stats.overdue_90_days || 0)) / stats.totalOverdue * 100).toFixed(2)
            : 0
        },
        {
          period: '90-179 วัน',
          amount: Math.max(0, (stats.overdue_90_days || 0) - (stats.overdue_180_days || 0)),
          count: Math.max(0, (stats.count_90_days || 0) - (stats.count_180_days || 0)),
          percentage: stats.totalOverdue > 0
            ? (((stats.overdue_90_days || 0) - (stats.overdue_180_days || 0)) / stats.totalOverdue * 100).toFixed(2)
            : 0
        },
        {
          period: '180+ วัน',
          amount: Math.max(0, stats.overdue_180_days || 0),
          count: Math.max(0, stats.count_180_days || 0),
          percentage: stats.totalOverdue > 0
            ? ((stats.overdue_180_days || 0) / stats.totalOverdue * 100).toFixed(2)
            : 0
        }
      ];

      // Format monthly trends
      const formattedTrends = monthlyTrends.map(trend => ({
        period: `${trend._id.year}-${String(trend._id.month).padStart(2, '0')}`,
        amount: Math.max(0, trend.amount || 0),
        count: trend.count || 0
      }));

      res.json({
        success: true,
        data: {
          summary: {
            totalContracts: stats.totalContracts || 0,
            totalAmount: Math.max(0, stats.totalAmount || 0),
            totalPaid: Math.max(0, stats.totalPaid || 0),
            totalOverdue: Math.max(0, stats.totalOverdue || 0),
            badDebtRatio: parseFloat(badDebtRatio),
            collectionRate: parseFloat(collectionRate),
            averageBadDebt: stats.count_30_days > 0
              ? Math.round((stats.overdue_30_days || 0) / stats.count_30_days)
              : 0
          },
          agedAnalysis,
          riskDistribution: riskDistribution.map(risk => ({
            level: risk._id,
            count: risk.count,
            amount: Math.max(0, risk.amount || 0),
            percentage: stats.totalOverdue > 0
              ? ((risk.amount || 0) / stats.totalOverdue * 100).toFixed(2)
              : 0
          })),
          monthlyTrends: formattedTrends
        }
      });

    } catch (error) {
      console.error('❌ Error in BadDebt getStatistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch bad debt statistics',
        message: error.message
      });
    }
  }

  /**
   * Get aged receivables analysis
   */
  static async getAgedAnalysis(req, res) {
    try {
      const { branch_code, asOfDate } = req.query;
      const analysisDate = asOfDate ? new Date(asOfDate) : new Date();

      const query = {
        deleted_at: null,
        status: { $in: ['active', 'ongoing'] },
        createdAt: { $lte: analysisDate }
      };

      if (branch_code) {
        query.branch_code = branch_code;
      }

      const agedAnalysis = await InstallmentOrder.aggregate([
        { $match: query },
        {
          $addFields: {
            overdueAmount: {
              $max: [0, { $subtract: ['$totalAmount', '$paidAmount'] }]
            },
            daysPastDue: {
              $cond: [
                { $lt: ['$dueDate', analysisDate] },
                { $divide: [{ $subtract: [analysisDate, '$dueDate'] }, 86400000] },
                0
              ]
            }
          }
        },
        {
          $match: { overdueAmount: { $gt: 0 } }
        },
        {
          $bucket: {
            groupBy: '$daysPastDue',
            boundaries: [0, 30, 60, 90, 180, 365, Infinity],
            default: 'Unknown',
            output: {
              totalAmount: { $sum: '$overdueAmount' },
              count: { $sum: 1 },
              contracts: {
                $push: {
                  contractNo: '$contractNo',
                  customerName: {
                    $concat: [
                      { $ifNull: ['$customer_info.firstName', ''] },
                      ' ',
                      { $ifNull: ['$customer_info.lastName', ''] }
                    ]
                  },
                  overdueAmount: '$overdueAmount',
                  daysPastDue: { $round: ['$daysPastDue', 0] },
                  dueDate: '$dueDate'
                }
              }
            }
          }
        }
      ]);

      // Format the buckets with proper labels
      const bucketLabels = {
        0: 'ปัจจุบัน (0 วัน)',
        30: '30 วัน',
        60: '31-60 วัน',
        90: '61-90 วัน',
        180: '91-180 วัน',
        365: '181-365 วัน',
        'Infinity': 'มากกว่า 365 วัน'
      };

      const formattedAnalysis = agedAnalysis.map(bucket => ({
        period: bucketLabels[bucket._id] || `${bucket._id} วัน`,
        periodDays: bucket._id,
        totalAmount: Math.max(0, bucket.totalAmount || 0),
        count: bucket.count || 0,
        averageAmount: bucket.count > 0
          ? Math.round((bucket.totalAmount || 0) / bucket.count)
          : 0,
        contracts: bucket.contracts || []
      }));

      // Calculate totals
      const totals = formattedAnalysis.reduce((acc, period) => ({
        totalAmount: acc.totalAmount + period.totalAmount,
        totalCount: acc.totalCount + period.count
      }), { totalAmount: 0, totalCount: 0 });

      // Add percentages
      formattedAnalysis.forEach(period => {
        period.percentageOfAmount = totals.totalAmount > 0
          ? ((period.totalAmount / totals.totalAmount) * 100).toFixed(2)
          : 0;
        period.percentageOfCount = totals.totalCount > 0
          ? ((period.count / totals.totalCount) * 100).toFixed(2)
          : 0;
      });

      res.json({
        success: true,
        data: {
          asOfDate: analysisDate,
          periods: formattedAnalysis,
          summary: {
            totalOverdueAmount: totals.totalAmount,
            totalOverdueCount: totals.totalCount,
            averageOverdueAmount: totals.totalCount > 0
              ? Math.round(totals.totalAmount / totals.totalCount)
              : 0
          }
        }
      });

    } catch (error) {
      console.error('❌ Error in BadDebt getAgedAnalysis:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch aged analysis',
        message: error.message
      });
    }
  }

  /**
   * Get bad debt criteria
   */
  static async getCriteria(req, res) {
    try {
      const criteria = await BadDebtCriteria.findOne().sort({ createdAt: -1 });

      // Default criteria if none found
      const defaultCriteria = {
        overdueDaysThreshold: 90,
        minimumAmount: 1000,
        riskFactors: {
          noPaymentDays: 60,
          partialPaymentThreshold: 0.3,
          contactFailureCount: 3
        },
        automaticClassification: true,
        notificationSettings: {
          emailAlerts: true,
          smsAlerts: false,
          frequency: 'daily'
        },
        provisionRates: {
          '30-59': 5,
          '60-89': 15,
          '90-179': 50,
          '180+': 100
        }
      };

      res.json({
        success: true,
        data: criteria || defaultCriteria
      });

    } catch (error) {
      console.error('❌ Error in BadDebt getCriteria:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch bad debt criteria',
        message: error.message
      });
    }
  }

  /**
   * Update bad debt criteria
   */
  static async updateCriteria(req, res) {
    try {
      const {
        overdueDaysThreshold,
        minimumAmount,
        riskFactors,
        automaticClassification,
        notificationSettings,
        provisionRates
      } = req.body;

      const criteria = await BadDebtCriteria.findOneAndUpdate(
        {},
        {
          overdueDaysThreshold,
          minimumAmount,
          riskFactors,
          automaticClassification,
          notificationSettings,
          provisionRates,
          updatedBy: req.user?.id,
          lastModified: new Date()
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true
        }
      );

      res.json({
        success: true,
        message: 'อัปเดตเกณฑ์หนี้สูญเสียเรียบร้อยแล้ว',
        data: criteria
      });

    } catch (error) {
      console.error('❌ Error in BadDebt updateCriteria:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update bad debt criteria',
        message: error.message
      });
    }
  }

  /**
   * Export bad debt report
   */
  static async exportReport(req, res) {
    try {
      const {
        format = 'json',
        branch_code,
        overdueDays = 30,
        includeDetails = true
      } = req.query;

      const query = {
        deleted_at: null,
        status: { $in: ['active', 'ongoing'] }
      };

      if (branch_code) {
        query.branch_code = branch_code;
      }

      // Calculate overdue date
      const overdueDate = moment().subtract(parseInt(overdueDays), 'days').toDate();
      query.dueDate = { $lt: overdueDate };

      const badDebts = await InstallmentOrder.aggregate([
        { $match: query },
        {
          $lookup: {
            from: 'customers',
            localField: 'customer',
            foreignField: '_id',
            as: 'customerDetails'
          }
        },
        {
          $addFields: {
            overdueAmount: {
              $max: [0, { $subtract: ['$totalAmount', '$paidAmount'] }]
            },
            overdueDays: {
              $divide: [
                { $subtract: [new Date(), '$dueDate'] },
                86400000
              ]
            }
          }
        },
        {
          $match: {
            overdueAmount: { $gt: 0 },
            overdueDays: { $gte: parseInt(overdueDays) }
          }
        },
        {
          $project: {
            contractNo: 1,
            customerName: {
              $concat: [
                { $ifNull: ['$customer_info.firstName', ''] },
                ' ',
                { $ifNull: ['$customer_info.lastName', ''] }
              ]
            },
            customerPhone: '$customer_info.phone',
            totalAmount: 1,
            paidAmount: 1,
            overdueAmount: 1,
            overdueDays: { $round: ['$overdueDays', 0] },
            dueDate: 1,
            branch_code: 1,
            status: 1,
            createdAt: 1,
            items: includeDetails === 'true' ? 1 : 0
          }
        },
        { $sort: { overdueAmount: -1 } }
      ]);

      const reportData = {
        generatedAt: new Date(),
        criteria: {
          overdueDays: parseInt(overdueDays),
          branch_code: branch_code || 'ทุกสาขา'
        },
        summary: {
          totalContracts: badDebts.length,
          totalOverdueAmount: badDebts.reduce((sum, debt) => sum + debt.overdueAmount, 0),
          averageOverdueAmount: badDebts.length > 0
            ? Math.round(badDebts.reduce((sum, debt) => sum + debt.overdueAmount, 0) / badDebts.length)
            : 0
        },
        data: badDebts
      };

      if (format === 'csv') {
        // Convert to CSV format
        const csv = convertToCSV(badDebts);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="bad-debt-report-${moment().format('YYYY-MM-DD')}.csv"`);
        res.send(csv);
      } else {
        res.json({
          success: true,
          data: reportData
        });
      }

    } catch (error) {
      console.error('❌ Error in BadDebt exportReport:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export bad debt report',
        message: error.message
      });
    }
  }
}

/**
 * Helper function to convert data to CSV format
 */
function convertToCSV(data) {
  if (!data || data.length === 0) return '';

  const headers = [
    'เลขที่สัญญา',
    'ชื่อลูกค้า',
    'เบอร์โทร',
    'ยอดรวม',
    'ยอดชำระแล้ว',
    'ยอดค้างชำระ',
    'วันที่ค้าง',
    'วันครบกำหนด',
    'สาขา',
    'สถานะ'
  ];

  const csvRows = [headers.join(',')];

  data.forEach(debt => {
    const row = [
      debt.contractNo || '',
      (debt.customerName || '').replace(/,/g, ';'),
      debt.customerPhone || '',
      debt.totalAmount || 0,
      debt.paidAmount || 0,
      debt.overdueAmount || 0,
      debt.overdueDays || 0,
      debt.dueDate ? moment(debt.dueDate).format('YYYY-MM-DD') : '',
      debt.branch_code || '',
      debt.status || ''
    ];
    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
}

module.exports = BadDebtController;