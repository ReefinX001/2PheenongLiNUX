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

// controllers/dashboardController.js

exports.getRecentLoans = async (req, res) => {
  const io = req.app.get('io');
  try {
    const orders = await InstallmentOrder.find().lean()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('customer_id', 'first_name last_name')
      .lean();

    const data = await Promise.all(orders.map(async o => {
      // นับงวดที่จ่ายจริง
      const paidInstallments = await InstallmentPayment.countDocuments({
        installmentOrder: o._id,
        paymentDate: { $ne: null }
      });

      // หา next installment (ยังไม่จ่าย) เพื่ออาจใช้ amountDue จาก payment record
      const nextPayment = await InstallmentPayment.findOne({
        installmentOrder: o._id,
        paymentDate: null
      })
      .sort({ installmentNumber: 1 })
      .lean();

      return {
        order_number: o.contractNo,
        customer_name: o.customer_id
          ? `${o.customer_id.first_name} ${o.customer_id.last_name}`.trim()
          : '-',
        // ใช้ amountDue จาก nextPayment ถ้ามีและ >0 มิฉะนั้น fallback ไปใช้ monthlyPayment
        amountDue: (nextPayment && nextPayment.amountDue > 0)
                   ? nextPayment.amountDue
                   : o.monthlyPayment,
        term: o.installmentCount,
        status: o.paidAmount >= o.totalAmount ? 'paid' : 'overdue',
        remaining_installments: Math.max(0, o.installmentCount - paidInstallments)
      };
    }));

    return res.json({ success: true, data });
  } catch (err) {
    console.error('dashboardController.getRecentLoans:', err);
    return res.status(500).json({ success: false, error: err.message });
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
