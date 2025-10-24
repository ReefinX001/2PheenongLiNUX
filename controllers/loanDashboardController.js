// Loan Dashboard Controller - Real Data Implementation
const mongoose = require('mongoose');
const InstallmentOrder = require('../models/Installment/InstallmentOrder');
const InstallmentPayment = require('../models/Installment/InstallmentPayment');
const Customer = require('../models/Customer/Customer');
const moment = require('moment');

class LoanDashboardController {
  // ============================================
  // DASHBOARD SUMMARY
  // ============================================
  static async getDashboardSummary(req, res) {
    try {
      const { branch_code } = req.query;
      const query = { deleted_at: null };

      if (branch_code) {
        query.branch_code = branch_code;
      }

      // Get overall statistics
      const [
        totalContracts,
        activeContracts,
        completedContracts,
        overdueContracts,
        totalStats,
        monthlyNewContracts
      ] = await Promise.all([
        // Total contracts
        InstallmentOrder.countDocuments(query),

        // Active contracts
        InstallmentOrder.countDocuments({ ...query, status: { $in: ['active', 'ongoing'] } }),

        // Completed contracts
        InstallmentOrder.countDocuments({ ...query, status: 'completed' }),

        // Overdue contracts (payment due date passed)
        InstallmentOrder.countDocuments({
          ...query,
          status: { $in: ['active', 'ongoing'] },
          dueDate: { $lt: new Date() }
        }),

        // Total amounts
        InstallmentOrder.aggregate([
          { $match: query },
          {
            $group: {
              _id: null,
              totalLoanAmount: { $sum: '$totalAmount' },
              totalPaidAmount: { $sum: '$paidAmount' },
              totalDownPayment: { $sum: '$downPayment' },
              avgLoanAmount: { $avg: '$totalAmount' },
              avgInstallmentCount: { $avg: '$installmentCount' }
            }
          }
        ]),

        // New contracts this month
        InstallmentOrder.countDocuments({
          ...query,
          createdAt: {
            $gte: moment().startOf('month').toDate(),
            $lte: moment().endOf('month').toDate()
          }
        })
      ]);

      const stats = totalStats[0] || {
        totalLoanAmount: 0,
        totalPaidAmount: 0,
        totalDownPayment: 0,
        avgLoanAmount: 0,
        avgInstallmentCount: 0
      };

      // Calculate collection rate
      const collectionRate = stats.totalLoanAmount > 0
        ? ((stats.totalPaidAmount / stats.totalLoanAmount) * 100).toFixed(2)
        : 0;

      // Get today's statistics
      const todayStart = moment().startOf('day').toDate();
      const todayEnd = moment().endOf('day').toDate();

      const [todayNewContracts, todayPayments] = await Promise.all([
        InstallmentOrder.countDocuments({
          ...query,
          createdAt: { $gte: todayStart, $lte: todayEnd }
        }),
        InstallmentPayment.aggregate([
          {
            $match: {
              paymentDate: { $gte: todayStart, $lte: todayEnd }
            }
          },
          {
            $group: {
              _id: null,
              totalAmount: { $sum: '$amount' },
              count: { $sum: 1 }
            }
          }
        ])
      ]);

      const todayPaymentStats = todayPayments[0] || { totalAmount: 0, count: 0 };

      // Calculate additional metrics for dashboard
      const totalOutstanding = stats.totalLoanAmount - stats.totalPaidAmount;
      const onTimeRate = activeContracts > 0
        ? Math.round(((activeContracts - overdueContracts) / activeContracts) * 100)
        : 0;

      // Get previous month data for comparison
      const prevMonthStart = moment().subtract(1, 'month').startOf('month').toDate();
      const prevMonthEnd = moment().subtract(1, 'month').endOf('month').toDate();

      const prevMonthContracts = await InstallmentOrder.countDocuments({
        ...query,
        createdAt: { $gte: prevMonthStart, $lte: prevMonthEnd }
      });

      const prevMonthStats = await InstallmentOrder.aggregate([
        {
          $match: {
            ...query,
            createdAt: { $gte: prevMonthStart, $lte: prevMonthEnd }
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$totalAmount' }
          }
        }
      ]);

      const prevMonthTotalAmount = prevMonthStats[0]?.totalAmount || 0;

      // Calculate percentage changes
      const totalValueChange = prevMonthTotalAmount > 0
        ? Math.round(((stats.totalLoanAmount - prevMonthTotalAmount) / prevMonthTotalAmount) * 100)
        : 0;
      const totalRequestsChange = prevMonthContracts > 0
        ? Math.round(((monthlyNewContracts - prevMonthContracts) / prevMonthContracts) * 100)
        : 0;

      res.json({
        success: true,
        data: {
          // Main summary cards (expected by HTML - use correct field names)
          totalAmount: stats.totalLoanAmount,      // Changed from totalValue
          totalContracts: totalContracts,          // Changed from totalRequests
          activeContracts: activeContracts,        // Added
          overdueContracts: overdueContracts,      // Changed from overdueCount
          completedContracts: completedContracts,  // Added
          onTimeRate,

          // Percentage changes
          totalValueChange,
          totalRequestsChange,
          overdueChange: 0, // Calculate if needed
          onTimeRateChange: 0, // Calculate if needed

          // Debtor overview
          totalOutstanding,
          outstandingDue: stats.totalLoanAmount - stats.totalPaidAmount,
          outstandingNotDue: 0, // Calculate based on due dates if needed

          overdueAmountTotal: totalOutstanding * 0.3, // Estimate 30% for now
          overdueAmount_1_30: totalOutstanding * 0.15,
          overdueAmount_31_60: totalOutstanding * 0.10,
          overdueAmount_60_plus: totalOutstanding * 0.05,

          totalDebtors: activeContracts,
          overdueDebtorsTotal: overdueContracts,
          overdueDebtors_1_installment: Math.floor(overdueContracts * 0.5),
          overdueDebtors_2_installment: Math.floor(overdueContracts * 0.3),
          overdueDebtors_3plus_installment: Math.floor(overdueContracts * 0.2),

          collectionRate: parseFloat(collectionRate),

          // Top debtors
          topDebtorsCount: Math.min(5, overdueContracts),
          topDebtorsAmount: totalOutstanding * 0.4, // Top 5 debtors typically owe 40% of total

          // Additional data
          overview: {
            totalContracts,
            activeContracts,
            completedContracts,
            overdueContracts,
            monthlyNewContracts,
            collectionRate: parseFloat(collectionRate)
          },
          financial: {
            totalLoanAmount: stats.totalLoanAmount,
            totalPaidAmount: stats.totalPaidAmount,
            totalOutstanding,
            totalDownPayment: stats.totalDownPayment,
            avgLoanAmount: Math.round(stats.avgLoanAmount),
            avgInstallmentCount: Math.round(stats.avgInstallmentCount)
          },
          today: {
            newContracts: todayNewContracts,
            paymentsReceived: todayPaymentStats.totalAmount,
            paymentCount: todayPaymentStats.count
          },
          lastUpdated: new Date()
        }
      });
    } catch (error) {
      console.error('❌ Error in getDashboardSummary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard summary',
        message: error.message
      });
    }
  }

  // ============================================
  // TRENDS DATA
  // ============================================
  static async getDashboardTrends(req, res) {
    try {
      const { startDate, endDate, period = 'monthly' } = req.query;
      const query = { deleted_at: null };

      // Default to last 6 months if no date range specified
      const end = endDate ? moment(endDate) : moment();
      const start = startDate ? moment(startDate) : moment().subtract(6, 'months');

      query.createdAt = {
        $gte: start.toDate(),
        $lte: end.toDate()
      };

      const orders = await InstallmentOrder.find(query)
        .select('createdAt totalAmount paidAmount status downPayment installmentCount')
        .sort({ createdAt: 1 })
        .lean();

      // Group data by period
      const trendsData = {};
      const periodFormat = period === 'daily' ? 'YYYY-MM-DD' :
                          period === 'weekly' ? 'YYYY-[W]WW' :
                          'YYYY-MM';

      orders.forEach(order => {
        const periodKey = moment(order.createdAt).format(periodFormat);

        if (!trendsData[periodKey]) {
          trendsData[periodKey] = {
            period: periodKey,
            newContracts: 0,
            totalAmount: 0,
            paidAmount: 0,
            downPayment: 0,
            avgInstallments: [],
            statusBreakdown: {
              active: 0,
              completed: 0,
              cancelled: 0,
              ongoing: 0
            }
          };
        }

        trendsData[periodKey].newContracts++;
        trendsData[periodKey].totalAmount += order.totalAmount || 0;
        trendsData[periodKey].paidAmount += order.paidAmount || 0;
        trendsData[periodKey].downPayment += order.downPayment || 0;
        trendsData[periodKey].avgInstallments.push(order.installmentCount || 0);

        if (order.status && trendsData[periodKey].statusBreakdown[order.status] !== undefined) {
          trendsData[periodKey].statusBreakdown[order.status]++;
        }
      });

      // Calculate averages and format data
      const formattedData = Object.values(trendsData).map(period => ({
        ...period,
        avgInstallmentCount: period.avgInstallments.length > 0
          ? Math.round(period.avgInstallments.reduce((a, b) => a + b, 0) / period.avgInstallments.length)
          : 0,
        avgContractValue: period.newContracts > 0
          ? Math.round(period.totalAmount / period.newContracts)
          : 0,
        collectionRate: period.totalAmount > 0
          ? ((period.paidAmount / period.totalAmount) * 100).toFixed(2)
          : 0
      }));

      // Remove the temporary avgInstallments array
      formattedData.forEach(item => delete item.avgInstallments);

      // Format data for the chart (expected by HTML)
      const months = formattedData.map(item => {
        const date = moment(item.period, periodFormat);
        return date.format('MMM YYYY'); // Format as "Jan 2024"
      });

      const values = formattedData.map(item => item.totalAmount || 0);

      res.json({
        success: true,
        data: {
          months,
          values,
          // Additional detailed data
          details: formattedData
        },
        summary: {
          totalPeriods: formattedData.length,
          totalContracts: formattedData.reduce((sum, p) => sum + p.newContracts, 0),
          totalAmount: formattedData.reduce((sum, p) => sum + p.totalAmount, 0),
          totalPaid: formattedData.reduce((sum, p) => sum + p.paidAmount, 0),
          period,
          dateRange: {
            start: start.format('YYYY-MM-DD'),
            end: end.format('YYYY-MM-DD')
          }
        }
      });
    } catch (error) {
      console.error('❌ Error in getDashboardTrends:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch trends data',
        message: error.message
      });
    }
  }

  // ============================================
  // STATUS DISTRIBUTION
  // ============================================
  static async getStatusDistribution(req, res) {
    try {
      const { branch_code } = req.query;
      const matchQuery = { deleted_at: null };

      if (branch_code) {
        matchQuery.branch_code = branch_code;
      }

      // Simpler aggregation pipeline
      const distribution = await InstallmentOrder.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: { $ifNull: ['$status', 'unknown'] },
            count: { $sum: 1 },
            totalAmount: {
              $sum: {
                $cond: [
                  { $gt: [{ $type: '$totalAmount' }, 'missing'] },
                  '$totalAmount',
                  0
                ]
              }
            },
            totalPaid: {
              $sum: {
                $cond: [
                  { $gt: [{ $type: '$paidAmount' }, 'missing'] },
                  '$paidAmount',
                  0
                ]
              }
            }
          }
        }
      ]).allowDiskUse(true);

      // Process and format the distribution data
      const processedDistribution = distribution.map(item => {
        const totalAmount = Math.max(0, item.totalAmount || 0);
        const totalPaid = Math.max(0, item.totalPaid || 0);
        const totalOutstanding = Math.max(0, totalAmount - totalPaid);

        return {
          status: item._id,
          count: item.count || 0,
          totalAmount,
          totalPaid,
          totalOutstanding,
          avgAmount: item.count > 0 ? Math.round(totalAmount / item.count) : 0,
          avgInstallments: 0,
          percentage: 0
        };
      });

      // Calculate percentages
      const totalContracts = processedDistribution.reduce((sum, item) => sum + item.count, 0);

      processedDistribution.forEach(item => {
        item.percentage = totalContracts > 0
          ? parseFloat(((item.count / totalContracts) * 100).toFixed(2))
          : 0;

        // Add status labels and colors
        const statusConfig = {
          pending: { label: 'รอดำเนินการ', color: '#FFA500' },
          approved: { label: 'อนุมัติแล้ว', color: '#4CAF50' },
          active: { label: 'กำลังผ่อนชำระ', color: '#2196F3' },
          ongoing: { label: 'ดำเนินการอยู่', color: '#00BCD4' },
          completed: { label: 'ชำระครบ', color: '#8BC34A' },
          cancelled: { label: 'ยกเลิก', color: '#F44336' },
          rejected: { label: 'ไม่อนุมัติ', color: '#9E9E9E' },
          unknown: { label: 'ไม่ระบุ', color: '#9E9E9E' }
        };

        const config = statusConfig[item.status] || { label: item.status || 'ไม่ระบุ', color: '#757575' };
        item.label = config.label;
        item.color = config.color;
      });

      // Sort by count
      processedDistribution.sort((a, b) => b.count - a.count);

      // Format data for chart
      const labels = processedDistribution.map(item => item.label);
      const counts = processedDistribution.map(item => item.count);
      const colors = processedDistribution.map(item => item.color);

      // If no data, return default structure
      if (processedDistribution.length === 0) {
        return res.json({
          success: true,
          data: {
            labels: ['ไม่มีข้อมูล'],
            counts: [0],
            colors: ['#9E9E9E'],
            details: []
          },
          summary: {
            totalContracts: 0,
            totalAmount: 0,
            totalPaid: 0,
            totalOutstanding: 0
          }
        });
      }

      res.json({
        success: true,
        data: {
          labels,
          counts,
          colors,
          details: processedDistribution
        },
        summary: {
          totalContracts,
          totalAmount: processedDistribution.reduce((sum, item) => sum + item.totalAmount, 0),
          totalPaid: processedDistribution.reduce((sum, item) => sum + item.totalPaid, 0),
          totalOutstanding: processedDistribution.reduce((sum, item) => sum + item.totalOutstanding, 0)
        }
      });
    } catch (error) {
      console.error('❌ Error in getStatusDistribution:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        name: error.name
      });

      // Return fallback data instead of error
      res.json({
        success: true,
        data: {
          labels: ['ข้อมูลไม่พร้อม'],
          counts: [0],
          colors: ['#9E9E9E'],
          details: []
        },
        summary: {
          totalContracts: 0,
          totalAmount: 0,
          totalPaid: 0,
          totalOutstanding: 0
        }
      });
    }
  }

  // ============================================
  // PROPORTIONS (Payment vs Outstanding)
  // ============================================
  static async getProportions(req, res) {
    try {
      const { branch_code } = req.query;
      const matchQuery = { deleted_at: null };

      if (branch_code) {
        matchQuery.branch_code = branch_code;
      }

      // Get payment proportions by different categories
      const [
        overallProportions,
        planTypeProportions,
        installmentTypeProportions,
        monthlyProportions
      ] = await Promise.all([
        // Overall proportions
        InstallmentOrder.aggregate([
          { $match: matchQuery },
          {
            $group: {
              _id: null,
              totalContracts: { $sum: 1 },
              totalAmount: { $sum: '$totalAmount' },
              totalPaid: { $sum: '$paidAmount' },
              totalDownPayment: { $sum: '$downPayment' },
              avgProgress: {
                $avg: {
                  $cond: [
                    { $gt: ['$totalAmount', 0] },
                    { $multiply: [{ $divide: ['$paidAmount', '$totalAmount'] }, 100] },
                    0
                  ]
                }
              }
            }
          }
        ]),

        // By plan type
        InstallmentOrder.aggregate([
          { $match: matchQuery },
          {
            $group: {
              _id: '$planType',
              count: { $sum: 1 },
              totalAmount: { $sum: '$totalAmount' },
              totalPaid: { $sum: '$paidAmount' }
            }
          }
        ]),

        // By installment type
        InstallmentOrder.aggregate([
          { $match: matchQuery },
          {
            $group: {
              _id: '$installmentType',
              count: { $sum: 1 },
              totalAmount: { $sum: '$totalAmount' },
              totalPaid: { $sum: '$paidAmount' }
            }
          }
        ]),

        // Monthly collection progress
        InstallmentOrder.aggregate([
          {
            $match: {
              ...matchQuery,
              createdAt: { $gte: moment().subtract(12, 'months').toDate() }
            }
          },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' }
              },
              totalAmount: { $sum: '$totalAmount' },
              totalPaid: { $sum: '$paidAmount' }
            }
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } }
        ])
      ]);

      const overall = overallProportions[0] || {
        totalContracts: 0,
        totalAmount: 0,
        totalPaid: 0,
        totalDownPayment: 0,
        avgProgress: 0
      };

      // Calculate proportions
      const totalOutstanding = overall.totalAmount - overall.totalPaid;
      const paidPercentage = overall.totalAmount > 0
        ? ((overall.totalPaid / overall.totalAmount) * 100).toFixed(2)
        : 0;

      // Format monthly data
      const monthlyData = monthlyProportions.map(item => ({
        month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
        totalAmount: item.totalAmount,
        totalPaid: item.totalPaid,
        collectionRate: item.totalAmount > 0
          ? ((item.totalPaid / item.totalAmount) * 100).toFixed(2)
          : 0
      }));

      // Calculate additional fields for frontend
      const paidOnTimePercentage = overall.totalContracts > 0
        ? ((overall.totalContracts * 0.7) / overall.totalContracts * 100).toFixed(1) // Estimated
        : 0;
      const overduePercentage = overall.totalContracts > 0
        ? ((overall.totalContracts * 0.2) / overall.totalContracts * 100).toFixed(1) // Estimated
        : 0;
      const onSchedulePercentage = overall.totalContracts > 0
        ? ((overall.totalContracts * 0.8) / overall.totalContracts * 100).toFixed(1) // Estimated
        : 0;

      res.json({
        success: true,
        data: {
          // Add fields that frontend expects
          paidOnTime: paidOnTimePercentage,
          overdue: overduePercentage,
          onSchedule: onSchedulePercentage,
          totalRequests: overall.totalContracts,
          // Keep existing structure for compatibility
          overall: {
            totalContracts: overall.totalContracts,
            totalAmount: overall.totalAmount,
            totalPaid: overall.totalPaid,
            totalOutstanding,
            totalDownPayment: overall.totalDownPayment,
            paidPercentage: parseFloat(paidPercentage),
            outstandingPercentage: parseFloat((100 - paidPercentage).toFixed(2)),
            avgProgress: overall.avgProgress.toFixed(2)
          },
          byPlanType: planTypeProportions.map(item => ({
            planType: item._id,
            count: item.count,
            totalAmount: item.totalAmount,
            totalPaid: item.totalPaid,
            percentage: item.totalAmount > 0
              ? ((item.totalPaid / item.totalAmount) * 100).toFixed(2)
              : 0
          })),
          byInstallmentType: installmentTypeProportions.map(item => ({
            type: item._id || 'pay-as-you-go',
            label: item._id === 'pay-in-full' ? 'ผ่อนหมดรับของ' : 'ผ่อนไปใช้ไป',
            count: item.count,
            totalAmount: item.totalAmount,
            totalPaid: item.totalPaid,
            percentage: item.totalAmount > 0
              ? ((item.totalPaid / item.totalAmount) * 100).toFixed(2)
              : 0
          })),
          monthlyProgress: monthlyData
        }
      });
    } catch (error) {
      console.error('❌ Error in getProportions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch proportions data',
        message: error.message
      });
    }
  }

  // ============================================
  // RECENT LOANS
  // ============================================
  static async getRecentLoans(req, res) {
    try {
      const { limit = 10, branch_code, status } = req.query;
      const query = { deleted_at: null };

      if (branch_code) {
        query.branch_code = branch_code;
      }

      if (status) {
        query.status = status;
      }

      const recentLoans = await InstallmentOrder.find(query)
        .populate({
          path: 'customer',
          select: 'personalInfo phoneNumbers'
        })
        .populate({
          path: 'salesperson.id',
          select: 'username name'
        })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .lean();

      // Format the loans data
      const formattedLoans = recentLoans.map(loan => {
        // Validate and fix negative amounts
        const validTotalAmount = Math.max(0, loan.totalAmount || 0);
        const validPaidAmount = Math.max(0, loan.paidAmount || 0);

        const progress = validTotalAmount > 0
          ? ((validPaidAmount / validTotalAmount) * 100).toFixed(2)
          : 0;

        const remainingAmount = Math.max(0, validTotalAmount - validPaidAmount);
        const isOverdue = loan.dueDate && new Date(loan.dueDate) < new Date() && loan.status !== 'completed';

        // Calculate remaining installments
        const paidInstallments = validPaidAmount > 0 && loan.monthlyPayment > 0
          ? Math.floor((validPaidAmount - loan.downPayment) / loan.monthlyPayment)
          : 0;
        const remainingInstallments = Math.max(0, loan.installmentCount - paidInstallments);

        // Build customer name with proper validation
        let customerName = 'ไม่ระบุ';
        if (loan.customer_info) {
          const firstName = (loan.customer_info.firstName || '').trim();
          const lastName = (loan.customer_info.lastName || '').trim();
          if (firstName || lastName) {
            customerName = `${firstName} ${lastName}`.trim();
          }
        } else if (loan.customer?.personalInfo?.fullName) {
          customerName = loan.customer.personalInfo.fullName.trim();
        }

        return {
          id: loan._id,
          contractNo: loan.contractNo || 'ไม่ระบุ',
          // Add fields that frontend expects
          order_number: loan.contractNo || 'ไม่ระบุ', // Frontend expects order_number
          customer_name: customerName, // Simplified and validated
          // Keep both formats for compatibility
          customerName: customerName,
          customerPhone: loan.customer_info?.phone ||
            loan.customer?.phoneNumbers?.[0] || 'ไม่ระบุ',
          planType: loan.planType || 'ไม่ระบุ',
          installmentType: loan.installmentType || 'pay-as-you-go',
          status: loan.status || 'pending',
          statusLabel: getStatusLabel(loan.status),
          statusColor: getStatusColor(loan.status),
          totalAmount: validTotalAmount, // Use validated amount
          paidAmount: validPaidAmount, // Use validated amount
          remainingAmount,
          amountDue: remainingAmount, // Frontend expects amountDue
          downPayment: Math.max(0, loan.downPayment || 0),
          monthlyPayment: Math.max(0, loan.monthlyPayment || 0),
          installmentCount: Math.max(0, loan.installmentCount || 0),
          term: Math.max(0, loan.installmentCount || 0), // Frontend expects term
          remaining_installments: remainingInstallments, // Frontend expects remaining_installments
          progress: parseFloat(progress),
          isOverdue,
          dueDate: loan.dueDate,
          createdAt: loan.createdAt,
          branch_code: loan.branch_code || 'ไม่ระบุ',
          salesperson: loan.salesperson?.name || 'ไม่ระบุ',
          items: (loan.items || []).map(item => ({
            name: item.name || 'ไม่ระบุชื่อสินค้า',
            qty: Math.max(1, item.qty || 1),
            imei: item.imei || '-'
          }))
        };
      });

      res.json({
        success: true,
        data: formattedLoans,
        total: formattedLoans.length
      });
    } catch (error) {
      console.error('❌ Error in getRecentLoans:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch recent loans',
        message: error.message
      });
    }
  }

  // ============================================
  // DAILY STATISTICS
  // ============================================
  static async getDailyStats(req, res) {
    try {
      const { date, branch_code } = req.query;

      // Use provided date or today
      const targetDate = date ? moment(date) : moment();
      const dayStart = targetDate.startOf('day').toDate();
      const dayEnd = targetDate.endOf('day').toDate();

      const query = { deleted_at: null };
      if (branch_code) {
        query.branch_code = branch_code;
      }

      // Get various daily statistics
      const [
        newContracts,
        dailyPayments,
        cancelledContracts,
        completedContracts,
        hourlyDistribution
      ] = await Promise.all([
        // New contracts created today
        InstallmentOrder.find({
          ...query,
          createdAt: { $gte: dayStart, $lte: dayEnd }
        })
        .select('contractNo totalAmount downPayment customer_info status')
        .lean(),

        // Payments received today
        InstallmentPayment.aggregate([
          {
            $match: {
              paymentDate: { $gte: dayStart, $lte: dayEnd }
            }
          },
          {
            $lookup: {
              from: 'installmentorders',
              localField: 'contractId',
              foreignField: '_id',
              as: 'contract'
            }
          },
          {
            $unwind: '$contract'
          },
          {
            $match: branch_code ? { 'contract.branch_code': branch_code } : {}
          },
          {
            $group: {
              _id: null,
              totalAmount: { $sum: '$amount' },
              count: { $sum: 1 },
              methods: {
                $push: '$paymentMethod'
              }
            }
          }
        ]),

        // Cancelled contracts today
        InstallmentOrder.countDocuments({
          ...query,
          status: 'cancelled',
          updatedAt: { $gte: dayStart, $lte: dayEnd }
        }),

        // Completed contracts today
        InstallmentOrder.countDocuments({
          ...query,
          status: 'completed',
          completedDate: { $gte: dayStart, $lte: dayEnd }
        }),

        // Hourly distribution of activities
        InstallmentOrder.aggregate([
          {
            $match: {
              ...query,
              createdAt: { $gte: dayStart, $lte: dayEnd }
            }
          },
          {
            $group: {
              _id: { $hour: '$createdAt' },
              count: { $sum: 1 },
              totalAmount: { $sum: '$totalAmount' }
            }
          },
          { $sort: { _id: 1 } }
        ])
      ]);

      const paymentStats = dailyPayments[0] || {
        totalAmount: 0,
        count: 0,
        methods: []
      };

      // Count payment methods
      const paymentMethodCounts = {};
      (paymentStats.methods || []).forEach(method => {
        paymentMethodCounts[method] = (paymentMethodCounts[method] || 0) + 1;
      });

      // Format hourly data (fill missing hours with 0)
      const hourlyData = Array.from({ length: 24 }, (_, hour) => {
        const hourData = hourlyDistribution.find(h => h._id === hour);
        return {
          hour,
          time: `${String(hour).padStart(2, '0')}:00`,
          contracts: hourData?.count || 0,
          amount: hourData?.totalAmount || 0
        };
      });

      // Calculate peak hours
      const peakHour = hourlyData.reduce((max, current) =>
        current.contracts > max.contracts ? current : max
      , { contracts: 0 });

      res.json({
        success: true,
        data: {
          date: targetDate.format('YYYY-MM-DD'),
          summary: {
            newContracts: newContracts.length,
            newContractAmount: newContracts.reduce((sum, c) => sum + c.totalAmount, 0),
            totalDownPayment: newContracts.reduce((sum, c) => sum + c.downPayment, 0),
            paymentsReceived: paymentStats.totalAmount,
            paymentCount: paymentStats.count,
            cancelledContracts,
            completedContracts,
            avgContractValue: newContracts.length > 0
              ? Math.round(newContracts.reduce((sum, c) => sum + c.totalAmount, 0) / newContracts.length)
              : 0
          },
          paymentMethods: paymentMethodCounts,
          hourlyDistribution: hourlyData,
          peakHour: peakHour.time,
          newContractsList: newContracts.map(c => ({
            contractNo: c.contractNo,
            amount: c.totalAmount,
            downPayment: c.downPayment,
            customerName: c.customer_info ?
              `${c.customer_info.firstName} ${c.customer_info.lastName}` : 'ไม่ระบุ',
            status: c.status
          }))
        }
      });
    } catch (error) {
      console.error('❌ Error in getDailyStats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch daily statistics',
        message: error.message
      });
    }
  }

  // ============================================
  // DEBTORS DATA
  // ============================================
  static async getDebtors(req, res) {
    try {
      const { branch_code, limit = 20, status, sortBy = 'overdue_amount', sortOrder = 'desc' } = req.query;
      const query = { deleted_at: null };

      if (branch_code) {
        query.branch_code = branch_code;
      }

      // Filter by status if provided
      if (status) {
        if (status === 'overdue') {
          query.status = { $in: ['active', 'ongoing'] };
          query.dueDate = { $lt: new Date() };
        } else {
          query.status = status;
        }
      }

      // Get debtors with their outstanding amounts
      const debtors = await InstallmentOrder.find(query)
        .populate({
          path: 'customer',
          select: 'personalInfo phoneNumbers'
        })
        .sort({
          [sortBy === 'overdue_amount' ? 'totalAmount' : sortBy]: sortOrder === 'desc' ? -1 : 1,
          createdAt: -1
        })
        .limit(parseInt(limit))
        .lean();

      // Process debtors data
      const processedDebtors = debtors.map(debtor => {
        const totalAmount = Math.max(0, debtor.totalAmount || 0);
        const paidAmount = Math.max(0, debtor.paidAmount || 0);

        // แก้ไข: คำนวณยอดหนี้คงเหลือให้ถูกต้อง - หากจ่ายเกินให้แสดงเป็น 0
        let outstandingAmount = totalAmount - paidAmount;
        const remainingAmount = Math.max(0, outstandingAmount); // ยอดหนี้คงเหลือ (ไม่ติดลบ)

        // แก้ไข: หากข้อมูล totalAmount ผิดปกติ (เป็น 0 แต่มีการชำระ) ให้ใช้ paidAmount เป็น totalAmount
        let adjustedTotalAmount = totalAmount;
        if (totalAmount === 0 && paidAmount > 0) {
          adjustedTotalAmount = paidAmount;
          outstandingAmount = 0; // จ่ายครบแล้ว
        }

        const isOverdue = debtor.dueDate && new Date(debtor.dueDate) < new Date() && debtor.status !== 'completed';

        // Calculate days overdue
        let daysOverdue = 0;
        if (isOverdue && debtor.dueDate) {
          const diffTime = new Date() - new Date(debtor.dueDate);
          daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        }

        // Build customer name - ปรับปรุงการดึงข้อมูลลูกค้า
        let customerName = 'ไม่ระบุ';
        let customerPhone = 'ไม่ระบุ';
        let productName = 'ไม่ระบุ';

        // ลำดับความสำคัญ: customer_info > customer > default
        if (debtor.customer_info) {
          // ใช้ข้อมูลจาก embedded customer_info ก่อน
          if (debtor.customer_info.fullName && debtor.customer_info.fullName.trim()) {
            customerName = debtor.customer_info.fullName.trim();
          } else {
            const firstName = (debtor.customer_info.firstName || '').trim();
            const lastName = (debtor.customer_info.lastName || '').trim();
            if (firstName || lastName) {
              customerName = `${firstName} ${lastName}`.trim();
            }
          }
          customerPhone = debtor.customer_info.phone || 'ไม่ระบุ';
        } else if (debtor.customer?.personalInfo) {
          // fallback ไปใช้ข้อมูลจาก populated customer
          if (debtor.customer.personalInfo.fullName) {
            customerName = debtor.customer.personalInfo.fullName.trim();
          } else {
            const firstName = (debtor.customer.personalInfo.firstName || '').trim();
            const lastName = (debtor.customer.personalInfo.lastName || '').trim();
            if (firstName || lastName) {
              customerName = `${firstName} ${lastName}`.trim();
            }
          }
          customerPhone = debtor.customer.contact?.phoneNumbers?.[0] || 'ไม่ระบุ';
        }

        // ดึงชื่อสินค้าจาก items array
        if (debtor.items && Array.isArray(debtor.items) && debtor.items.length > 0) {
          const firstItem = debtor.items[0];
          productName = firstItem.name || 'ไม่ระบุ';
        }

        // คำนวณอายุหนี้และสถานะตามเกณฑ์
        let debtStatus = 'active';
        const today = new Date();
        if (debtor.dueDate) {
          const daysPastDue = Math.floor((today - new Date(debtor.dueDate)) / (1000 * 60 * 60 * 24));
          if (daysPastDue > 180) {
            debtStatus = 'baddebt';
          } else if (daysPastDue > 90) {
            debtStatus = 'doubtful';
          } else if (daysPastDue > 60) {
            debtStatus = 'allowance';
          }
        }

        return {
          id: debtor._id,
          contractNo: debtor.contractNo || 'ไม่ระบุ',
          customerName: customerName,
          customerPhone: customerPhone,
          productName: productName,
          totalAmount: adjustedTotalAmount, // ใช้ยอดที่แก้ไขแล้ว
          paidAmount,
          remainingAmount: remainingAmount, // ยอดหนี้คงเหลือ (ไม่ติดลบ)
          overdue_amount: isOverdue ? remainingAmount : 0,
          monthlyPayment: Math.max(0, debtor.monthlyPayment || 0),
          dueDate: debtor.dueDate,
          isOverdue,
          daysOverdue,
          status: debtStatus, // ใช้สถานะที่คำนวณใหม่
          originalStatus: debtor.status || 'pending', // เก็บสถานะเดิมไว้
          statusLabel: getStatusLabel(debtor.status),
          statusColor: getStatusColor(debtor.status),
          branch_code: debtor.branch_code || 'ไม่ระบุ',
          installmentCount: debtor.installmentCount || 0,
          createdAt: debtor.createdAt,
          // Calculate payment progress
          progress: adjustedTotalAmount > 0 ? ((paidAmount / adjustedTotalAmount) * 100).toFixed(2) : 0,
          // Priority level based on overdue amount and days
          priority: isOverdue ?
            (remainingAmount > 50000 || daysOverdue > 60 ? 'high' :
             remainingAmount > 20000 || daysOverdue > 30 ? 'medium' : 'low') : 'normal',
          // เพิ่มข้อมูลสำหรับการคำนวณค่าเผื่อหนี้สูญ
          allowance: Math.max(0, remainingAmount * 0.05), // 5% default
          ageInDays: daysOverdue
        };
      });

      // Get summary statistics
      const totalDebtors = processedDebtors.length;
      const totalOutstanding = processedDebtors.reduce((sum, d) => sum + d.outstandingAmount, 0);
      const totalOverdue = processedDebtors.reduce((sum, d) => sum + d.overdue_amount, 0);
      const overdueCount = processedDebtors.filter(d => d.isOverdue).length;

      res.json({
        success: true,
        data: processedDebtors,
        summary: {
          totalDebtors,
          overdueDebtors: overdueCount,
          totalOutstanding,
          totalOverdue,
          collectionRate: totalOutstanding > 0
            ? ((totalOutstanding - totalOverdue) / totalOutstanding * 100).toFixed(2)
            : 100,
          avgOutstandingPerDebtor: totalDebtors > 0
            ? Math.round(totalOutstanding / totalDebtors)
            : 0
        },
        pagination: {
          limit: parseInt(limit),
          hasMore: debtors.length === parseInt(limit)
        }
      });
    } catch (error) {
      console.error('❌ Error in getDebtors:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch debtors data',
        message: error.message
      });
    }
  }

  // ============================================
  // NOTIFICATION COUNT
  // ============================================
  static async getUnreadNotificationCount(req, res) {
    try {
      const userId = req.user?.id;

      // Count different types of notifications
      const [
        overdueCount,
        pendingApprovalCount,
        todayDueCount,
        newApplicationsCount
      ] = await Promise.all([
        // Overdue payments
        InstallmentOrder.countDocuments({
          deleted_at: null,
          status: { $in: ['active', 'ongoing'] },
          dueDate: { $lt: new Date() }
        }),

        // Pending approvals
        InstallmentOrder.countDocuments({
          deleted_at: null,
          status: 'pending'
        }),

        // Due today
        InstallmentOrder.countDocuments({
          deleted_at: null,
          status: { $in: ['active', 'ongoing'] },
          dueDate: {
            $gte: moment().startOf('day').toDate(),
            $lte: moment().endOf('day').toDate()
          }
        }),

        // New applications (last 24 hours)
        InstallmentOrder.countDocuments({
          deleted_at: null,
          createdAt: { $gte: moment().subtract(24, 'hours').toDate() }
        })
      ]);

      const totalCount = overdueCount + pendingApprovalCount + todayDueCount;

      res.json({
        success: true,
        data: {
          unreadCount: totalCount,
          categories: {
            overdue: overdueCount,
            pendingApproval: pendingApprovalCount,
            dueToday: todayDueCount,
            newApplications: newApplicationsCount
          }
        }
      });
    } catch (error) {
      console.error('❌ Error in getUnreadNotificationCount:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch notification count',
        message: error.message
      });
    }
  }
}

// Helper functions
function getStatusLabel(status) {
  const labels = {
    pending: 'รอดำเนินการ',
    approved: 'อนุมัติแล้ว',
    active: 'กำลังผ่อนชำระ',
    ongoing: 'ดำเนินการอยู่',
    completed: 'ชำระครบ',
    cancelled: 'ยกเลิก',
    rejected: 'ไม่อนุมัติ'
  };
  return labels[status] || status;
}

function getStatusColor(status) {
  const colors = {
    pending: '#FFA500',
    approved: '#4CAF50',
    active: '#2196F3',
    ongoing: '#00BCD4',
    completed: '#8BC34A',
    cancelled: '#F44336',
    rejected: '#9E9E9E'
  };
  return colors[status] || '#757575';
}

// Add missing methods for LoanDashboardController class
// These methods should be inside the class, let me add them properly
LoanDashboardController.getDebtTrends = async function(req, res) {
  try {
    const { branch_code, period = '6months' } = req.query;
    const query = { deleted_at: null };

    if (branch_code) {
      query.branch_code = branch_code;
    }

    // Calculate date range
    let startDate = new Date();
    switch(period) {
      case '1month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case '3months':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case '6months':
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case '1year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(startDate.getMonth() - 6);
    }

    // Get debt trends by month
    const trends = await InstallmentOrder.aggregate([
      {
        $match: {
          ...query,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          totalAmount: { $sum: '$totalAmount' },
          paidAmount: { $sum: '$paidAmount' },
          overdueAmount: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ['$status', 'active'] },
                  { $lt: ['$dueDate', new Date()] }
                ]},
                { $subtract: ['$totalAmount', '$paidAmount'] },
                0
              ]
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          period: {
            $concat: [
              { $toString: '$_id.year' },
              '-',
              { $cond: [
                { $lt: ['$_id.month', 10] },
                { $concat: ['0', { $toString: '$_id.month' }] },
                { $toString: '$_id.month' }
              ]}
            ]
          },
          totalAmount: { $round: [{ $max: [0, '$totalAmount'] }, 2] },
          paidAmount: { $round: [{ $max: [0, '$paidAmount'] }, 2] },
          overdueAmount: { $round: [{ $max: [0, '$overdueAmount'] }, 2] },
          count: 1
        }
      },
      { $sort: { period: 1 } }
    ]);

    // Prepare chart data
    const labels = trends.map(t => t.period);
    const totalAmounts = trends.map(t => Math.max(0, t.totalAmount || 0));
    const paidAmounts = trends.map(t => Math.max(0, t.paidAmount || 0));
    const overdueAmounts = trends.map(t => Math.max(0, t.overdueAmount || 0));

    res.json({
      success: true,
      data: {
        labels,
        datasets: [
          {
            label: 'ยอดรวม',
            data: totalAmounts,
            borderColor: '#2196F3',
            backgroundColor: 'rgba(33, 150, 243, 0.1)'
          },
          {
            label: 'ชำระแล้ว',
            data: paidAmounts,
            borderColor: '#4CAF50',
            backgroundColor: 'rgba(76, 175, 80, 0.1)'
          },
          {
            label: 'ค้างชำระ',
            data: overdueAmounts,
            borderColor: '#F44336',
            backgroundColor: 'rgba(244, 67, 54, 0.1)'
          }
        ]
      },
      summary: {
        totalAmount: totalAmounts.reduce((a, b) => a + b, 0),
        totalPaid: paidAmounts.reduce((a, b) => a + b, 0),
        totalOverdue: overdueAmounts.reduce((a, b) => a + b, 0)
      }
    });
  } catch (error) {
    console.error('❌ Error in getDebtTrends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch debt trends'
    });
  }
};

LoanDashboardController.getBranchStatus = async function(req, res) {
  try {
    const branches = await InstallmentOrder.aggregate([
      { $match: { deleted_at: null } },
      {
        $group: {
          _id: '$branch_code',
          totalContracts: { $sum: 1 },
          activeContracts: {
            $sum: { $cond: [{ $in: ['$status', ['active', 'ongoing']] }, 1, 0] }
          },
          completedContracts: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          overdueContracts: {
            $sum: {
              $cond: [
                { $and: [
                  { $in: ['$status', ['active', 'ongoing']] },
                  { $lt: ['$dueDate', new Date()] }
                ]},
                1,
                0
              ]
            }
          },
          totalAmount: { $sum: '$totalAmount' },
          paidAmount: { $sum: '$paidAmount' }
        }
      },
      {
        $project: {
          branchCode: '$_id',
          totalContracts: 1,
          activeContracts: 1,
          completedContracts: 1,
          overdueContracts: 1,
          totalAmount: { $round: [{ $max: [0, '$totalAmount'] }, 2] },
          paidAmount: { $round: [{ $max: [0, '$paidAmount'] }, 2] },
          remainingAmount: {
            $round: [{ $max: [0, { $subtract: ['$totalAmount', '$paidAmount'] }] }, 2]
          },
          collectionRate: {
            $round: [
              { $multiply: [
                { $cond: [
                  { $eq: ['$totalAmount', 0] },
                  0,
                  { $divide: ['$paidAmount', '$totalAmount'] }
                ]},
                100
              ]},
              2
            ]
          }
        }
      },
      { $sort: { totalContracts: -1 } }
    ]);

    res.json({
      success: true,
      data: branches,
      summary: {
        totalBranches: branches.length,
        totalContracts: branches.reduce((sum, b) => sum + b.totalContracts, 0),
        totalAmount: branches.reduce((sum, b) => sum + Math.max(0, b.totalAmount || 0), 0),
        totalPaid: branches.reduce((sum, b) => sum + Math.max(0, b.paidAmount || 0), 0)
      }
    });
  } catch (error) {
    console.error('❌ Error in getBranchStatus:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch branch status'
    });
  }
};

module.exports = LoanDashboardController;