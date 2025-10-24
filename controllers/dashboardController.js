// controllers/dashboardController.js
const InstallmentOrder   = require('../models/Installment/InstallmentOrder');
const InstallmentPayment = require('../models/Installment/InstallmentPayment');
const News         = require('../models/HR/News');
const User         = require('../models/User/User');
const Comment      = require('../models/HR/Comment');
const Notification = require('../models/HR/Notification');

// 1) สรุปภาพรวม (cards)
exports.getSummary = async (req, res) => {
  const io = req.app.get('io');
  try {
    const now       = new Date();
    const startThis = new Date(now.getFullYear(), now.getMonth(), 1);
    const startPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endPrev   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // — มูลค่าเดือนนี้ / เดือนก่อน
    const [{ sum: totalValue = 0 } = {}] = await InstallmentOrder.aggregate([
      { $match: { createdAt: { $gte: startThis } } },
      { $group: { _id: null, sum: { $sum: '$totalAmount' } } }
    ]);
    const [{ sum: prevValue = 0 } = {}] = await InstallmentOrder.aggregate([
      { $match: { createdAt: { $gte: startPrev, $lte: endPrev } } },
      { $group: { _id: null, sum: { $sum: '$totalAmount' } } }
    ]);
    const totalValueChange = prevValue
      ? Math.round((totalValue - prevValue) * 100 / prevValue)
      : 0;

    // — คำขอทั้งหมดเดือนนี้ / เดือนก่อน
    const totalRequests       = await InstallmentOrder.countDocuments({ createdAt: { $gte: startThis } });
    const prevRequests        = await InstallmentOrder.countDocuments({ createdAt: { $gte: startPrev, $lte: endPrev } });
    const totalRequestsChange = prevRequests
      ? Math.round((totalRequests - prevRequests) * 100 / prevRequests)
      : 0;

    // — ลูกค้าที่ยังผ่อนไม่ครบ (pending) เดือนนี้ / เดือนก่อน
    const ordersThis = await InstallmentOrder.find(
      { createdAt: { $gte: startThis } },
      'paidAmount totalAmount'
    ).lean();
    const overdueCount     = ordersThis.filter(o => o.paidAmount < o.totalAmount).length;
    const ordersPrev = await InstallmentOrder.find(
      { createdAt: { $gte: startPrev, $lte: endPrev } },
      'paidAmount totalAmount'
    ).lean();
    const prevOverdueCount = ordersPrev.filter(o => o.paidAmount < o.totalAmount).length;
    const overdueChange    = prevOverdueCount
      ? Math.round((overdueCount - prevOverdueCount) * 100 / prevOverdueCount)
      : 0;

    // — อัตราชำระตรงเวลา (% สัญญาผ่อนครบ) เดือนนี้ / เดือนก่อน
    const paidThis       = ordersThis.filter(o => o.paidAmount >= o.totalAmount).length;
    const onTimeRate     = totalRequests ? Math.round(paidThis * 100 / totalRequests) : 0;
    const paidPrev       = ordersPrev.filter(o => o.paidAmount >= o.totalAmount).length;
    const prevRate       = prevRequests ? Math.round(paidPrev * 100 / prevRequests) : 0;
    const onTimeRateChange = onTimeRate - prevRate;

    return res.json({
      success: true,
      data: {
        totalValue,
        totalValueChange,
        totalRequests,
        totalRequestsChange,
        overdueCount,
        overdueChange,
        onTimeRate,
        onTimeRateChange
      }
    });
  } catch (err) {
    console.error('dashboardController.getSummary:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// 2) กราฟแนวโน้มรายเดือน (ย้อนหลัง 12 เดือน)
exports.getTrends = async (req, res) => {
  const io = req.app.get('io');
  try {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const trends = await InstallmentOrder.aggregate([
      { $match: { createdAt: { $gte: oneYearAgo } } },
      { $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 }
      }},
      { $project: {
          _id: 0,
          period: { $concat: [ { $toString: '$_id.year' }, '-', { $toString: '$_id.month' } ] },
          count: 1
      }},
      { $sort: { period: 1 } }
    ]);

    const months = trends.map(t => t.period);
    const values = trends.map(t => t.count);
    return res.json({ success: true, data: { months, values } });
  } catch (err) {
    console.error('dashboardController.getTrends:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// 3) สัดส่วนสถานะสัญญา (ongoing/completed)
exports.getStatusDistribution = async (req, res) => {
  const io = req.app.get('io');
  try {
    const distribution = await InstallmentOrder.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $project: { _id: 0, status: '$_id', count: 1 } }
    ]);

    const labels = distribution.map(d => d.status);
    const counts = distribution.map(d => d.count);
    return res.json({ success: true, data: { labels, counts } });
  } catch (err) {
    console.error('dashboardController.getStatusDistribution:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// 4) สัดส่วนภาพรวม (จำนวนสัญญา, จ่ายครบ, ค้างจ่าย)
exports.getProportions = async (req, res) => {
  const io = req.app.get('io');
  try {
    const totalRequests = await InstallmentOrder.countDocuments();

    // ใช้ aggregation กับ $expr เพื่อเปรียบเทียบ 2 ฟิลด์
    const [{ paidCount = 0 } = {}] = await InstallmentOrder.aggregate([
      { $match: { $expr: { $gte: ['$paidAmount', '$totalAmount'] } } },
      { $count: 'paidCount' }
    ]);
    const [{ overdueCount = 0 } = {}] = await InstallmentOrder.aggregate([
      { $match: { $expr: { $lt: ['$paidAmount', '$totalAmount'] } } },
      { $count: 'overdueCount' }
    ]);

    const paidOnTime  = totalRequests ? Math.round(paidCount  * 100 / totalRequests) : 0;
    const overdue     = totalRequests ? Math.round(overdueCount * 100 / totalRequests) : 0;
    const onSchedule  = 100 - (paidOnTime + overdue);

    return res.json({
      success: true,
      data: { totalRequests, paidOnTime, overdue, onSchedule }
    });
  } catch (err) {
    console.error('dashboardController.getProportions:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// 5) สถิติรายวัน (วันนี้)
exports.getDailyStats = async (req, res) => {
  const io = req.app.get('io');
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    // การผ่อนชำระวันนี้
    const todayPaymentsAgg = await InstallmentPayment.aggregate([
      {
        $match: {
          paymentDate: { $gte: startOfDay, $lt: endOfDay, $ne: null }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amountPaid' },
          count: { $sum: 1 }
        }
      }
    ]);
    const todayRepayments = todayPaymentsAgg[0]?.total || 0;
    const todayRepaymentsCount = todayPaymentsAgg[0]?.count || 0;

    // สร้างสินเชื่อใหม่วันนี้
    const todayNewLoansAgg = await InstallmentOrder.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay, $lt: endOfDay }
        }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          total: { $sum: '$totalAmount' }
        }
      }
    ]);
    const todayNewLoans = todayNewLoansAgg[0]?.count || 0;
    const todayNewLoansValue = todayNewLoansAgg[0]?.total || 0;

    // ค้างชำระวันนี้ (payment ที่มี dueDate <= วันนี้ แต่ยังไม่จ่าย)
    const todayOverdueAgg = await InstallmentPayment.aggregate([
      {
        $match: {
          dueDate: { $lte: now },
          paymentDate: null
        }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          total: { $sum: '$amountDue' }
        }
      }
    ]);
    const todayOverdue = todayOverdueAgg[0]?.count || 0;
    const todayOverdueValue = todayOverdueAgg[0]?.total || 0;

    // ล็อคอุปกรณ์วันนี้ (สัญญาที่ถูกยกเลิกวันนี้ - ใช้เป็นตัวแทน)
    const todayLockedAgg = await InstallmentOrder.aggregate([
      {
        $match: {
          status: 'cancelled',
          updatedAt: { $gte: startOfDay, $lt: endOfDay }
        }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 }
        }
      }
    ]);
    const todayLocked = todayLockedAgg[0]?.count || 0;

    // จำนวนวันค้างชำระเฉลี่ย (คำนวณจากสัญญาที่ค้างชำระ)
    const overdueOrdersAgg = await InstallmentOrder.aggregate([
      {
        $match: {
          status: { $in: ['ongoing', 'active'] },
          dueDate: { $lt: now }
        }
      },
      {
        $addFields: {
          daysPastDue: {
            $divide: [
              { $subtract: [now, '$dueDate'] },
              1000 * 60 * 60 * 24  // แปลงจาก milliseconds เป็นวัน
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgDaysPastDue: { $avg: '$daysPastDue' }
        }
      }
    ]);
    const todayLockedFromOverdue = Math.round(overdueOrdersAgg[0]?.avgDaysPastDue || 0);

    return res.json({
      success: true,
      data: {
        todayRepayments,
        todayRepaymentsCount,
        todayNewLoans,
        todayNewLoansValue,
        todayOverdue,
        todayOverdueValue,
        todayLocked,
        todayLockedFromOverdue
      }
    });
  } catch (err) {
    console.error('dashboardController.getDailyStats:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// controllers/dashboardController.js

exports.getRecentLoans = async (req, res) => {
  const io = req.app.get('io');
  try {
    // เพิ่ม error handling และ validation
    const orders = await InstallmentOrder.find(
      { deleted_at: null }, // เฉพาะที่ไม่ถูกลบ
      {
        _id: 1,
        contractNo: 1,
        customer: 1,  // ใช้ customer แทน customer_id
        monthlyPayment: 1,
        installmentCount: 1,
        paidAmount: 1,
        totalAmount: 1,
        finalTotalAmount: 1, // เพิ่ม finalTotalAmount
        createdAt: 1
      }
    )
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('customer', 'individual.firstName individual.lastName corporate.companyName') // แก้ตาม Customer schema
      .lean();

    if (!orders || orders.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const data = await Promise.all(orders.map(async o => {
      try {
        // ป้องกัน null reference
        if (!o._id) {
          console.warn('Order without _id found:', o);
          return null;
        }

        // นับงวดที่จ่ายจริง
        const paidInstallments = await InstallmentPayment.countDocuments({
          installmentOrder: o._id,
          paymentDate: { $ne: null }
        });

        // หา next installment (ยังไม่จ่าย)
        const nextPayment = await InstallmentPayment.findOne({
          installmentOrder: o._id,
          paymentDate: null
        })
        .sort({ installmentNumber: 1 })
        .select('amountDue')
        .lean();

        // Safe data handling สำหรับ Customer schema ใหม่
        let customerName = 'ไม่ระบุลูกค้า';
        if (o.customer) {
          if (o.customer.individual) {
            // ลูกค้าบุคคลธรรมดา
            customerName = `${o.customer.individual.firstName || ''} ${o.customer.individual.lastName || ''}`.trim();
          } else if (o.customer.corporate) {
            // ลูกค้าบริษัท
            customerName = o.customer.corporate.companyName || 'บริษัท';
          }
        }

        // ใช้ finalTotalAmount หากมี มิฉะนั้นใช้ totalAmount
        const totalAmountToCheck = o.finalTotalAmount || o.totalAmount || 0;

        return {
          order_number: o.contractNo || 'N/A',
          customer_name: customerName,
          amountDue: (nextPayment && nextPayment.amountDue > 0)
                     ? nextPayment.amountDue
                     : (o.monthlyPayment || 0),
          term: o.installmentCount || 0,
          status: (o.paidAmount >= totalAmountToCheck) ? 'paid' : 'active',
          remaining_installments: Math.max(0, (o.installmentCount || 0) - paidInstallments)
        };
      } catch (itemErr) {
        console.error(`Error processing order ${o._id}:`, itemErr);
        return {
          order_number: o.contractNo || 'ERROR',
          customer_name: 'ข้อมูลไม่ถูกต้อง',
          amountDue: 0,
          term: 0,
          status: 'error',
          remaining_installments: 0
        };
      }
    }));

    // กรองข้อมูลที่เป็น null ออก
    const validData = data.filter(item => item !== null);

    return res.json({ success: true, data: validData });
  } catch (err) {
    console.error('dashboardController.getRecentLoans:', err);
    return res.status(500).json({
      success: false,
      error: err.message,
      details: 'Error fetching recent loans data'
    });
  }
};

exports.getStats = async (req, res) => {
  const io = req.app.get('io');
  try {
    const totalNews        = await News.countDocuments();
    const featuredNews     = await News.countDocuments({ important: true });
    const totalViewsAgg    = await News.aggregate([
      { $group: { _id: null, sum: { $sum: '$views' } } }
    ]);
    const totalViews       = totalViewsAgg[0]?.sum || 0;
    const totalMembers     = await User.countDocuments();
    const activeMembers    = await User.countDocuments({ isActive: true });
    const pendingComments  = await Comment.countDocuments({ approved: false });
    const unreadNotifs     = await Notification.countDocuments({ read: false });

    res.json({
      success: true,
      data: {
        totalNews,
        featuredNews,
        totalViews,
        totalMembers,
        activeMembers,
        pendingComments,
        unreadNotifications: unreadNotifs
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error fetching stats' });
  }
};
