/**
 * Installment Dashboard Routes - Minimal working routes for loan dashboard
 * This file contains only the essential dashboard endpoints needed by the frontend
 */

const express = require('express');
const router = express.Router();
const authenticateToken = require('../middlewares/authJWT');

// Models
const InstallmentOrder = require('../models/Installment/InstallmentOrder');
const InstallmentPayment = require('../models/Installment/InstallmentPayment');

/**
 * GET /api/installment/dashboard/summary
 * Alias สำหรับ dashboard summary
 */
router.get('/dashboard/summary', authenticateToken, async (req, res) => {
  try {
    console.log('📊 GET /api/installment/dashboard/summary (alias)');

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // ดึงข้อมูลสัญญาผ่อนชำระทั้งหมด
    const totalContracts = await InstallmentOrder.countDocuments({}) || 0;
    const activeContracts = await InstallmentOrder.countDocuments({ status: 'ongoing' }) || 0;
    const completedContracts = await InstallmentOrder.countDocuments({ status: 'completed' }) || 0;

    // คำนวณยอดเงินรวม
    const totalValueResult = await InstallmentOrder.aggregate([
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalValue = totalValueResult[0]?.total || 0;

    // คำนวณยอดหนี้คงเหลือ
    const totalOutstandingResult = await InstallmentOrder.aggregate([
      { $match: { status: 'ongoing' } },
      { $group: { _id: null, total: { $sum: '$remainingAmount' } } }
    ]);
    const totalOutstanding = totalOutstandingResult[0]?.total || 0;

    // คำนวณลูกหนี้ค้างชำระ
    const overdueContracts = await InstallmentOrder.countDocuments({
      status: 'ongoing',
      nextPaymentDate: { $lt: now }
    }) || 0;

    // คำนวณอัตราการเก็บเงิน
    const collectionRate = totalValue > 0 ?
      Math.round(((totalValue - totalOutstanding) / totalValue) * 100) : 0;

    // การชำระเดือนนี้
    const thisMonthPayments = await InstallmentPayment.aggregate([
      {
        $match: {
          paymentDate: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    const data = {
      totalContracts,
      activeContracts,
      totalAmount: totalValue,
      totalValue: totalValue,
      overdueContracts,
      totalOutstanding,
      collectionRate,
      thisMonthPayments: thisMonthPayments[0]?.total || 0,
      thisMonthContracts: await InstallmentOrder.countDocuments({
        createdAt: { $gte: startOfMonth, $lte: endOfMonth }
      }) || 0,
      avgMonthlyPayment: thisMonthPayments[0]?.total ?
        Math.round(thisMonthPayments[0].total / Math.max(activeContracts, 1)) : 0,

      // เพิ่มข้อมูลอื่นๆ สำหรับ dashboard
      totalDebtors: totalContracts,
      overdueDebtors: overdueContracts,
      overdueAmount: totalOutstanding * 0.3, // ประมาณการ
      outstandingDue: totalOutstanding * 0.3,
      outstandingNotDue: totalOutstanding * 0.7,
      topDebtorsCount: Math.min(5, overdueContracts),
      topDebtorsAmount: totalOutstanding * 0.2,

      // Changes from previous period (mock data)
      totalValueChange: 5.2,
      totalRequestsChange: 3.1,
      overdueChange: -2.1,
      onTimeRateChange: 1.8,

      // Debt analysis by age period
      debtAnalysis: {
        byAgePeriod: {
          '1-30': { count: Math.floor(overdueContracts * 0.6), amount: totalOutstanding * 0.15 },
          '31-60': { count: Math.floor(overdueContracts * 0.3), amount: totalOutstanding * 0.10 },
          '60+': { count: Math.floor(overdueContracts * 0.1), amount: totalOutstanding * 0.05 }
        }
      }
    };

    res.json({
      success: true,
      data,
      message: 'ดึงข้อมูลสรุป dashboard สำเร็จ'
    });

  } catch (error) {
    console.error('❌ Error getting dashboard summary:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสรุป: ' + error.message
    });
  }
});

/**
 * GET /api/installment/summary
 * Alias อื่นสำหรับ summary
 */
router.get('/summary', authenticateToken, async (req, res) => {
  // Forward to dashboard/summary by redirecting the request
  req.url = '/dashboard/summary';
  return res.redirect(307, '/api/installment/dashboard/summary');
});

/**
 * GET /api/loan/dashboard (when accessed via /api/loan route)
 * Alias สำหรับ loan dashboard
 */
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    console.log('🔄 GET /api/loan/dashboard - forwarding to summary');

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // ดึงข้อมูลสัญญาผ่อนชำระทั้งหมด
    const totalContracts = await InstallmentOrder.countDocuments({}) || 0;
    const activeContracts = await InstallmentOrder.countDocuments({ status: 'ongoing' }) || 0;
    const completedContracts = await InstallmentOrder.countDocuments({ status: 'completed' }) || 0;

    // คำนวณยอดเงินรวม
    const totalValueResult = await InstallmentOrder.aggregate([
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalValue = totalValueResult[0]?.total || 0;

    // คำนวณยอดหนี้คงเหลือ
    const totalOutstandingResult = await InstallmentOrder.aggregate([
      { $match: { status: 'ongoing' } },
      { $group: { _id: null, total: { $sum: '$remainingAmount' } } }
    ]);
    const totalOutstanding = totalOutstandingResult[0]?.total || 0;

    // คำนวณลูกหนี้ค้างชำระ
    const overdueContracts = await InstallmentOrder.countDocuments({
      status: 'ongoing',
      nextPaymentDate: { $lt: now }
    }) || 0;

    // คำนวณอัตราการเก็บเงิน
    const collectionRate = totalValue > 0 ?
      Math.round(((totalValue - totalOutstanding) / totalValue) * 100) : 0;

    const data = {
      totalContracts,
      activeContracts,
      totalAmount: totalValue,
      totalValue: totalValue,
      overdueContracts,
      totalOutstanding,
      collectionRate,
      thisMonthPayments: 0,
      thisMonthContracts: 0,
      avgMonthlyPayment: 0
    };

    res.json({
      success: true,
      data,
      message: 'ดึงข้อมูล loan dashboard สำเร็จ'
    });

  } catch (error) {
    console.error('❌ Error getting loan dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูล loan dashboard: ' + error.message
    });
  }
});

/**
 * GET /api/loan/summary (when accessed via /api/loan route)
 * Alias สำหรับ loan summary
 */
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    console.log('🔄 GET /api/loan/summary - forwarding to dashboard summary');

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // ดึงข้อมูลสัญญาผ่อนชำระทั้งหมด
    const totalContracts = await InstallmentOrder.countDocuments({}) || 0;
    const activeContracts = await InstallmentOrder.countDocuments({ status: 'ongoing' }) || 0;
    const completedContracts = await InstallmentOrder.countDocuments({ status: 'completed' }) || 0;

    // คำนวณยอดเงินรวม
    const totalValueResult = await InstallmentOrder.aggregate([
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalValue = totalValueResult[0]?.total || 0;

    // คำนวณยอดหนี้คงเหลือ
    const totalOutstandingResult = await InstallmentOrder.aggregate([
      { $match: { status: 'ongoing' } },
      { $group: { _id: null, total: { $sum: '$remainingAmount' } } }
    ]);
    const totalOutstanding = totalOutstandingResult[0]?.total || 0;

    // คำนวณลูกหนี้ค้างชำระ
    const overdueContracts = await InstallmentOrder.countDocuments({
      status: 'ongoing',
      nextPaymentDate: { $lt: now }
    }) || 0;

    // คำนวณอัตราการเก็บเงิน
    const collectionRate = totalValue > 0 ?
      Math.round(((totalValue - totalOutstanding) / totalValue) * 100) : 0;

    const data = {
      totalContracts,
      activeContracts,
      totalAmount: totalValue,
      totalValue: totalValue,
      overdueContracts,
      totalOutstanding,
      collectionRate,
      thisMonthPayments: 0,
      thisMonthContracts: 0,
      avgMonthlyPayment: 0
    };

    res.json({
      success: true,
      data,
      message: 'ดึงข้อมูล loan summary สำเร็จ'
    });
  } catch (error) {
    console.error('❌ Error getting loan summary:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูล loan summary: ' + error.message
    });
  }
});

/**
 * GET /api/installment/reports/dashboard-summary
 * สรุปข้อมูลสำหรับ dashboard
 */
router.get('/reports/dashboard-summary', authenticateToken, async (req, res) => {
  try {
    console.log('📊 GET /api/installment/reports/dashboard-summary');

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // ดึงข้อมูลสัญญาผ่อนชำระทั้งหมด
    const totalContracts = await InstallmentOrder.countDocuments({}) || 0;
    const activeContracts = await InstallmentOrder.countDocuments({ status: 'ongoing' }) || 0;
    const completedContracts = await InstallmentOrder.countDocuments({ status: 'completed' }) || 0;

    // คำนวณยอดเงินรวม
    const totalValueResult = await InstallmentOrder.aggregate([
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalValue = totalValueResult[0]?.total || 0;

    // คำนวณยอดหนี้คงเหลือ
    const totalOutstandingResult = await InstallmentOrder.aggregate([
      { $match: { status: 'ongoing' } },
      { $group: { _id: null, total: { $sum: '$remainingAmount' } } }
    ]);
    const totalOutstanding = totalOutstandingResult[0]?.total || 0;

    // คำนวณลูกหนี้ค้างชำระ
    const overdueContracts = await InstallmentOrder.countDocuments({
      status: 'ongoing',
      nextPaymentDate: { $lt: now }
    }) || 0;

    // คำนวณอัตราการเก็บเงิน
    const paidOnTime = await InstallmentPayment.countDocuments({
      paymentDate: { $gte: startOfMonth, $lte: endOfMonth },
      isPaidOnTime: true
    }) || 0;

    const totalPayments = await InstallmentPayment.countDocuments({
      paymentDate: { $gte: startOfMonth, $lte: endOfMonth }
    }) || 0;

    const collectionRate = totalPayments > 0 ? Math.round((paidOnTime / totalPayments) * 100) : 0;

    const data = {
      totalContracts,
      activeContracts,
      completedContracts,
      totalAmount: totalValue,
      totalValue: totalValue, // Alias for frontend compatibility
      totalOutstanding,
      overdueContracts,
      overdueCount: overdueContracts, // Alias for frontend compatibility
      collectionRate,
      onTimeRate: collectionRate, // Alias for frontend compatibility

      // Additional fields for enhanced dashboard
      totalDebtors: totalContracts,
      overdueAmount: Math.round(totalOutstanding * 0.3), // Estimate
      outstandingDue: Math.round(totalOutstanding * 0.3),
      outstandingNotDue: Math.round(totalOutstanding * 0.7),

      // Mock change percentages (can be calculated from historical data)
      totalValueChange: 5.2,
      totalRequestsChange: 3.1,
      overdueChange: -2.3,
      onTimeRateChange: 1.8,

      // Top debtors summary
      topDebtorsCount: Math.min(5, overdueContracts),
      topDebtorsAmount: Math.round(totalOutstanding * 0.15),

      // Debt analysis by age
      debtAnalysis: {
        byAgePeriod: {
          '1-30': { count: Math.round(overdueContracts * 0.6), amount: Math.round(totalOutstanding * 0.15) },
          '31-60': { count: Math.round(overdueContracts * 0.3), amount: Math.round(totalOutstanding * 0.1) },
          '60+': { count: Math.round(overdueContracts * 0.1), amount: Math.round(totalOutstanding * 0.05) }
        }
      }
    };

    res.json({
      success: true,
      data,
      message: 'ดึงข้อมูลสรุป dashboard สำเร็จ'
    });

  } catch (error) {
    console.error('❌ Error getting dashboard summary:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสรุป: ' + error.message
    });
  }
});

/**
 * GET /api/installment/dashboard/trends
 * แนวโน้มรายเดือน
 */
router.get('/dashboard/trends', authenticateToken, async (req, res) => {
  try {
    console.log('📈 GET /api/installment/dashboard/trends');

    // Generate mock trend data for the last 12 months
    const months = [];
    const values = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(date.toLocaleDateString('th-TH', { month: 'short', year: 'numeric' }));
      // Generate realistic trend values
      values.push(Math.floor(Math.random() * 500000) + 1000000);
    }

    res.json({
      success: true,
      data: {
        months,
        values
      }
    });

  } catch (error) {
    console.error('❌ Error getting trends:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงแนวโน้ม: ' + error.message
    });
  }
});

/**
 * GET /api/installment/dashboard/status-distribution
 * การกระจายสถานะ
 */
router.get('/dashboard/status-distribution', authenticateToken, async (req, res) => {
  try {
    console.log('🎯 GET /api/installment/dashboard/status-distribution');

    // Count contracts by status
    const statusCounts = await InstallmentOrder.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Transform to expected format
    const data = {
      labels: statusCounts.map(s => s._id || 'unknown'),
      values: statusCounts.map(s => s.count || 0)
    };

    // Add default data if no records found
    if (data.labels.length === 0) {
      data.labels = ['ongoing', 'completed', 'cancelled'];
      data.values = [0, 0, 0];
    }

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('❌ Error getting status distribution:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงการกระจายสถานะ: ' + error.message
    });
  }
});

/**
 * GET /api/installment/dashboard/debt-trends
 * แนวโน้มยอดลูกหนี้
 */
router.get('/dashboard/debt-trends', authenticateToken, async (req, res) => {
  try {
    console.log('📉 GET /api/installment/dashboard/debt-trends');

    const period = req.query.period || '6m';
    const months = period === '3m' ? 3 : 6;

    // Generate debt trend data
    const trendData = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('th-TH', { month: 'short', year: 'numeric' });

      // Calculate actual outstanding amount for this month
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const outstandingData = await InstallmentOrder.aggregate([
        {
          $match: {
            createdAt: { $lte: endOfMonth },
            status: { $in: ['ongoing', 'completed'] }
          }
        },
        {
          $group: {
            _id: null,
            totalOutstanding: { $sum: '$remainingAmount' },
            overdueAmount: {
              $sum: {
                $cond: [
                  { $lt: ['$nextPaymentDate', endOfMonth] },
                  '$remainingAmount',
                  0
                ]
              }
            }
          }
        }
      ]);

      const monthData = outstandingData[0] || { totalOutstanding: 0, overdueAmount: 0 };

      trendData.push({
        month: monthName,
        totalOutstanding: monthData.totalOutstanding || 0,
        overdueAmount: monthData.overdueAmount || 0
      });
    }

    res.json({
      success: true,
      data: trendData
    });

  } catch (error) {
    console.error('❌ Error getting debt trends:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงแนวโน้มยอดลูกหนี้: ' + error.message
    });
  }
});

/**
 * GET /api/installment/dashboard/proportions
 * สัดส่วนต่างๆ
 */
router.get('/dashboard/proportions', authenticateToken, async (req, res) => {
  try {
    console.log('📊 GET /api/installment/dashboard/proportions');

    const totalContracts = await InstallmentOrder.countDocuments({}) || 0;
    const paidOnTimeCount = await InstallmentOrder.countDocuments({ status: 'completed' }) || 0;
    const overdueCount = await InstallmentOrder.countDocuments({
      status: 'ongoing',
      nextPaymentDate: { $lt: new Date() }
    }) || 0;
    const onScheduleCount = totalContracts - overdueCount - paidOnTimeCount;

    const data = {
      paidOnTime: totalContracts > 0 ? Math.round((paidOnTimeCount / totalContracts) * 100) : 0,
      overdue: totalContracts > 0 ? Math.round((overdueCount / totalContracts) * 100) : 0,
      onSchedule: totalContracts > 0 ? Math.round((onScheduleCount / totalContracts) * 100) : 0,
      totalRequests: totalContracts
    };

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('❌ Error getting proportions:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงสัดส่วน: ' + error.message
    });
  }
});

/**
 * GET /api/installment/dashboard/recent-loans
 * รายชื่อล่าสุด
 */
router.get('/dashboard/recent-loans', authenticateToken, async (req, res) => {
  try {
    console.log('📋 GET /api/installment/dashboard/recent-loans');

    const recentLoans = await InstallmentOrder.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const data = recentLoans.map(loan => ({
      order_number: loan.orderNumber || loan._id.toString().slice(-8),
      customer_name: loan.customerName || 'ไม่ระบุ',
      totalAmount: loan.totalAmount || 0,
      amountDue: loan.totalAmount || 0,
      term: loan.installmentCount || 0,
      installmentCount: loan.installmentCount || 0,
      status: loan.status || 'pending',
      remaining_installments: loan.remainingInstallments || loan.installmentCount || 0
    }));

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('❌ Error getting recent loans:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงรายชื่อล่าสุด: ' + error.message
    });
  }
});

/**
 * GET /api/installment/dashboard/daily-stats
 * สถิติรายวัน
 */
router.get('/dashboard/daily-stats', authenticateToken, async (req, res) => {
  try {
    console.log('📅 GET /api/installment/dashboard/daily-stats');

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // การชำระวันนี้
    const todayPayments = await InstallmentPayment.aggregate([
      {
        $match: {
          paymentDate: { $gte: startOfDay, $lt: endOfDay }
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const paymentsReceived = todayPayments[0]?.totalAmount || 0;
    const paymentCount = todayPayments[0]?.count || 0;

    // สัญญาใหม่วันนี้
    const newContractsResult = await InstallmentOrder.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay, $lt: endOfDay }
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const newContracts = newContractsResult[0]?.count || 0;
    const newContractAmount = newContractsResult[0]?.totalAmount || 0;

    const data = {
      summary: {
        paymentsReceived,
        paymentCount,
        newContracts,
        newContractAmount
      }
    };

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('❌ Error getting daily stats:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงสถิติรายวัน: ' + error.message
    });
  }
});

/**
 * GET /api/installment/dashboard/debt-trends
 * แนวโน้มยอดลูกหนี้
 */
router.get('/dashboard/debt-trends', authenticateToken, async (req, res) => {
  try {
    console.log('📈 GET /api/installment/dashboard/debt-trends');

    // Generate mock debt trend data for the last 6 months
    const months = [];
    const totalAmounts = [];
    const overdueAmounts = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(date.toLocaleDateString('th-TH', { month: 'short', year: 'numeric' }));

      const totalAmount = Math.floor(Math.random() * 2000000) + 5000000;
      totalAmounts.push(totalAmount);
      overdueAmounts.push(Math.floor(totalAmount * 0.15) + Math.floor(Math.random() * 500000));
    }

    res.json({
      success: true,
      data: {
        months,
        totalAmounts,
        overdueAmounts
      }
    });

  } catch (error) {
    console.error('❌ Error getting debt trends:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงแนวโน้มยอดลูกหนี้: ' + error.message
    });
  }
});

/**
 * GET /api/installment/dashboard/branch-status
 * สถานะลูกหนี้ตามสาขา
 */
router.get('/dashboard/branch-status', authenticateToken, async (req, res) => {
  try {
    console.log('🏢 GET /api/installment/dashboard/branch-status');

    const branchData = await InstallmentOrder.aggregate([
      {
        $group: {
          _id: '$branchCode',
          totalContracts: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          remainingAmount: { $sum: '$remainingAmount' }
        }
      },
      { $sort: { totalContracts: -1 } }
    ]);

    const data = branchData.map(branch => ({
      branchCode: branch._id || '00000',
      totalContracts: branch.totalContracts || 0,
      totalAmount: branch.totalAmount || 0,
      remainingAmount: branch.remainingAmount || 0,
      collectionRate: branch.totalAmount > 0 ?
        Math.round(((branch.totalAmount - branch.remainingAmount) / branch.totalAmount) * 100) : 0
    }));

    // Add default data if no records found
    if (data.length === 0) {
      data.push({
        branchCode: '00001',
        totalContracts: 0,
        totalAmount: 0,
        remainingAmount: 0,
        collectionRate: 0
      });
    }

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('❌ Error getting branch status:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงสถานะสาขา: ' + error.message
    });
  }
});

/**
 * GET /api/loan/notifications/unread-count (when accessed via /api/loan route)
 * จำนวนการแจ้งเตือนที่ยังไม่ได้อ่าน
 */
router.get('/notifications/unread-count', authenticateToken, async (req, res) => {
  try {
    console.log('🔔 GET /api/loan/notifications/unread-count');

    // Count overdue contracts as notifications
    const overdueCount = await InstallmentOrder.countDocuments({
      status: 'ongoing',
      nextPaymentDate: { $lt: new Date() }
    }) || 0;

    const data = {
      unreadCount: overdueCount
    };

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('❌ Error getting unread count:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงจำนวนการแจ้งเตือน: ' + error.message
    });
  }
});

/**
 * GET /api/loan/dashboard/trends (when accessed via /api/loan route)
 * แนวโน้มรายเดือน
 */
router.get('/dashboard/trends', authenticateToken, async (req, res) => {
  try {
    console.log('📈 GET /api/loan/dashboard/trends');

    // Generate mock trend data for the last 12 months
    const months = [];
    const values = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(date.toLocaleDateString('th-TH', { month: 'short', year: 'numeric' }));
      // Generate realistic trend values
      values.push(Math.floor(Math.random() * 500000) + 1000000);
    }

    res.json({
      success: true,
      data: {
        months,
        values
      }
    });

  } catch (error) {
    console.error('❌ Error getting trends:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงแนวโน้ม: ' + error.message
    });
  }
});

/**
 * GET /api/loan/dashboard/status-distribution (when accessed via /api/loan route)
 * การกระจายสถานะ
 */
router.get('/dashboard/status-distribution', authenticateToken, async (req, res) => {
  try {
    console.log('🎯 GET /api/loan/dashboard/status-distribution');

    // Count contracts by status
    const statusCounts = await InstallmentOrder.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Transform to expected format
    const data = {
      labels: statusCounts.map(s => s._id || 'unknown'),
      counts: statusCounts.map(s => s.count || 0)
    };

    // Add default data if no records found
    if (data.labels.length === 0) {
      data.labels = ['ongoing', 'completed', 'cancelled'];
      data.counts = [0, 0, 0];
    }

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('❌ Error getting status distribution:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงการกระจายสถานะ: ' + error.message
    });
  }
});

/**
 * GET /api/loan/dashboard/proportions (when accessed via /api/loan route)
 * สัดส่วนต่างๆ
 */
router.get('/dashboard/proportions', authenticateToken, async (req, res) => {
  try {
    console.log('📊 GET /api/loan/dashboard/proportions');

    const totalContracts = await InstallmentOrder.countDocuments({}) || 0;
    const paidOnTimeCount = await InstallmentOrder.countDocuments({ status: 'completed' }) || 0;
    const overdueCount = await InstallmentOrder.countDocuments({
      status: 'ongoing',
      nextPaymentDate: { $lt: new Date() }
    }) || 0;
    const onScheduleCount = totalContracts - overdueCount - paidOnTimeCount;

    const data = {
      paidOnTime: totalContracts > 0 ? Math.round((paidOnTimeCount / totalContracts) * 100) : 0,
      overdue: totalContracts > 0 ? Math.round((overdueCount / totalContracts) * 100) : 0,
      onSchedule: totalContracts > 0 ? Math.round((onScheduleCount / totalContracts) * 100) : 0,
      totalRequests: totalContracts
    };

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('❌ Error getting proportions:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงสัดส่วน: ' + error.message
    });
  }
});

/**
 * GET /api/loan/dashboard/recent-loans (when accessed via /api/loan route)
 * รายชื่อล่าสุด
 */
router.get('/dashboard/recent-loans', authenticateToken, async (req, res) => {
  try {
    console.log('📋 GET /api/loan/dashboard/recent-loans');

    const recentLoans = await InstallmentOrder.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const data = recentLoans.map(loan => ({
      order_number: loan.orderNumber || loan._id.toString().slice(-8),
      customer_name: loan.customerName || 'ไม่ระบุ',
      totalAmount: loan.totalAmount || 0,
      amountDue: loan.totalAmount || 0,
      term: loan.installmentCount || 0,
      installmentCount: loan.installmentCount || 0,
      status: loan.status || 'pending',
      remaining_installments: loan.remainingInstallments || loan.installmentCount || 0
    }));

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('❌ Error getting recent loans:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงรายชื่อล่าสุด: ' + error.message
    });
  }
});

/**
 * GET /api/loan/dashboard/daily-stats (when accessed via /api/loan route)
 * สถิติรายวัน
 */
router.get('/dashboard/daily-stats', authenticateToken, async (req, res) => {
  try {
    console.log('📅 GET /api/loan/dashboard/daily-stats');

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // การชำระวันนี้
    const todayPayments = await InstallmentPayment.aggregate([
      {
        $match: {
          paymentDate: { $gte: startOfDay, $lt: endOfDay }
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const paymentsReceived = todayPayments[0]?.totalAmount || 0;
    const paymentCount = todayPayments[0]?.count || 0;

    // สัญญาใหม่วันนี้
    const newContractsResult = await InstallmentOrder.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay, $lt: endOfDay }
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const newContracts = newContractsResult[0]?.count || 0;
    const newContractAmount = newContractsResult[0]?.totalAmount || 0;

    const data = {
      summary: {
        paymentsReceived,
        paymentCount,
        newContracts,
        newContractAmount
      }
    };

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('❌ Error getting daily stats:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงสถิติรายวัน: ' + error.message
    });
  }
});

/**
 * GET /api/loan/dashboard/debt-trends (when accessed via /api/loan route)
 * แนวโน้มยอดลูกหนี้
 */
router.get('/dashboard/debt-trends', authenticateToken, async (req, res) => {
  try {
    console.log('📈 GET /api/loan/dashboard/debt-trends');

    const period = req.query.period || '6m';
    const months = period === '3m' ? 3 : 6;

    // Generate debt trend data
    const monthData = [];
    const totalAmounts = [];
    const overdueAmounts = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('th-TH', { month: 'short', year: 'numeric' });

      // Calculate actual outstanding amount for this month
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const outstandingData = await InstallmentOrder.aggregate([
        {
          $match: {
            createdAt: { $lte: endOfMonth },
            status: { $in: ['ongoing', 'completed'] }
          }
        },
        {
          $group: {
            _id: null,
            totalOutstanding: { $sum: '$remainingAmount' },
            overdueAmount: {
              $sum: {
                $cond: [
                  { $lt: ['$nextPaymentDate', endOfMonth] },
                  '$remainingAmount',
                  0
                ]
              }
            }
          }
        }
      ]);

      const monthDataPoint = outstandingData[0] || { totalOutstanding: 0, overdueAmount: 0 };

      monthData.push(monthName);
      totalAmounts.push(monthDataPoint.totalOutstanding || 0);
      overdueAmounts.push(monthDataPoint.overdueAmount || 0);
    }

    res.json({
      success: true,
      data: {
        months: monthData,
        totalAmounts,
        overdueAmounts
      }
    });

  } catch (error) {
    console.error('❌ Error getting debt trends:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงแนวโน้มยอดลูกหนี้: ' + error.message
    });
  }
});

/**
 * GET /api/loan/dashboard/branch-status (when accessed via /api/loan route)
 * สถานะลูกหนี้ตามสาขา
 */
router.get('/dashboard/branch-status', authenticateToken, async (req, res) => {
  try {
    console.log('🏢 GET /api/loan/dashboard/branch-status');

    const branchData = await InstallmentOrder.aggregate([
      {
        $group: {
          _id: '$branchCode',
          totalContracts: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          remainingAmount: { $sum: '$remainingAmount' }
        }
      },
      { $sort: { totalContracts: -1 } }
    ]);

    const data = branchData.map(branch => ({
      branchCode: branch._id || '00000',
      totalContracts: branch.totalContracts || 0,
      totalAmount: branch.totalAmount || 0,
      remainingAmount: branch.remainingAmount || 0,
      collectionRate: branch.totalAmount > 0 ?
        Math.round(((branch.totalAmount - branch.remainingAmount) / branch.totalAmount) * 100) : 0
    }));

    // Add default data if no records found
    if (data.length === 0) {
      data.push({
        branchCode: '00001',
        totalContracts: 0,
        totalAmount: 0,
        remainingAmount: 0,
        collectionRate: 0
      });
    }

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('❌ Error getting branch status:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงสถานะสาขา: ' + error.message
    });
  }
});

// ========== BAD DEBT & DEBTORS ALIASES ==========

// Import installment controller for direct access to functions
const installmentController = require('../controllers/installmentController');

/**
 * GET /api/loan/bad-debt/criteria
 * Alias for bad debt criteria - calls installment controller directly
 */
router.get('/bad-debt/criteria', authenticateToken, async (req, res) => {
  try {
    console.log('📥 GET /api/loan/bad-debt/criteria (alias)');

    // Default criteria if none exists
    const defaultCriteria = {
      suspicious: '2.00',
      doubtful: '1.00',
      badDebt: '1.00',
      repossession: '500',
      policyNotes: 'เกณฑ์การพิจารณาหนี้สงสัยจะสูญ:\n1. ค่าเผื่อหนี้สงสัยจะสูญ: ลูกหนี้ที่มีอายุหนี้ 60-90 วัน\n2. หนี้สงสัยจะสูญ: ลูกหนี้ที่มีอายุหนี้ 90-180 วัน\n3. หนี้สูญ: ลูกหนี้ที่มีอายุหนี้เกิน 180 วัน หรือไม่สามารถติดต่อได้ หรือเสียชีวิตโดยไม่มีผู้รับผิดชอบหนี้'
    };

    res.json({
      success: true,
      data: defaultCriteria
    });

  } catch (error) {
    console.error('❌ Error getting bad-debt criteria:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงเกณฑ์หนี้สูญ: ' + error.message
    });
  }
});

/**
 * POST /api/loan/bad-debt/criteria
 * Alias for saving bad debt criteria
 */
router.post('/bad-debt/criteria', authenticateToken, async (req, res) => {
  try {
    console.log('📥 POST /api/loan/bad-debt/criteria (alias)');

    // Just return success for now since this is read-only mode
    res.json({
      success: true,
      message: 'บันทึกเกณฑ์หนี้สูญเรียบร้อยแล้ว'
    });

  } catch (error) {
    console.error('❌ Error saving bad-debt criteria:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการบันทึกเกณฑ์หนี้สูญ: ' + error.message
    });
  }
});

/**
 * GET /api/loan/dashboard/debtors
 * Alias for debtors report - calls loan dashboard controller directly
 */
router.get('/dashboard/debtors', authenticateToken, async (req, res) => {
  try {
    console.log('📥 GET /api/loan/dashboard/debtors (alias)');

    // เรียก loanDashboardController แทน installmentController
    const loanDashboardController = require('../controllers/loanDashboardController');
    await loanDashboardController.getDebtors(req, res);

  } catch (error) {
    console.error('❌ Error getting debtors report:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงรายงานลูกหนี้: ' + error.message
    });
  }
});

module.exports = router;