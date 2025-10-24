const Commission = require('../../models/HR/commissionModel');
const CommissionSettings = require('../../models/HR/commissionSettingsModel');
const User = require('../../models/User/User');
const mongoose = require('mongoose');

// ดึงข้อมูลค่าคอมมิชชั่นทั้งหมด
exports.getAllCommissions = async (req, res) => {
  try {
    const { employeeId, month, year, status } = req.query;
    const filter = {};

    if (employeeId) filter.employeeId = employeeId;
    if (month) filter['period.month'] = parseInt(month);
    if (year) filter['period.year'] = parseInt(year);
    if (status) filter.status = status;

    const commissions = await Commission.find(filter)
      .populate('employeeId', 'name email position')
      .populate('approvedBy', 'name')
      .sort({ 'period.year': -1, 'period.month': -1 })
      .lean();

    res.json({ success: true, data: commissions });
  } catch (error) {
    console.error('Error fetching commissions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ดึงข้อมูลค่าคอมมิชชั่นตาม ID
exports.getCommissionById = async (req, res) => {
  try {
    const commission = await Commission.findById(req.params.id)
      .populate('employeeId', 'name email position')
      .populate('approvedBy', 'name')
      .populate('sales.approvedBy', 'name');

    if (!commission) {
      return res.status(404).json({ success: false, error: 'Commission not found' });
    }

    res.json({ success: true, data: commission });
  } catch (error) {
    console.error('Error fetching commission:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ดึงข้อมูลค่าคอมมิชชั่นของพนักงานคนเดียว
exports.getEmployeeCommissions = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { startDate, endDate } = req.query;

    const filter = { employeeId };

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      filter.createdAt = { $gte: start, $lte: end };
    }

    const commissions = await Commission.find(filter)
      .sort({ 'period.year': -1, 'period.month': -1 })
      .lean();

    // คำนวณสรุปข้อมูล
    const summary = {
      totalCommission: commissions.reduce((sum, c) => sum + c.totalCommission, 0),
      paidCommission: commissions.reduce((sum, c) => sum + c.paidCommission, 0),
      pendingCommission: commissions.reduce((sum, c) => sum + c.pendingCommission, 0),
      totalSales: commissions.reduce((sum, c) => sum + c.totalSales, 0)
    };

    res.json({
      success: true,
      data: commissions,
      summary
    });
  } catch (error) {
    console.error('Error fetching employee commissions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// สร้างหรืออัพเดทค่าคอมมิชชั่น
exports.upsertCommission = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { employeeId, period, sales } = req.body;

    // ตรวจสอบว่ามีข้อมูลค่าคอมมิชชั่นของเดือนนี้แล้วหรือไม่
    let commission = await Commission.findOne({
      employeeId,
      'period.month': period.month,
      'period.year': period.year
    }).session(session);

    if (commission) {
      // อัพเดทข้อมูลที่มีอยู่
      commission.sales = sales;
    } else {
      // สร้างข้อมูลใหม่
      const employee = await User.findById(employeeId);
      commission = new Commission({
        employeeId,
        employeeName: employee.name,
        period,
        sales,
        status: 'calculated',
        calculatedDate: new Date()
      });
    }

    // คำนวณยอดรวม
    commission.calculateTotals();
    await commission.save({ session });

    await session.commitTransaction();

    // ส่ง socket event สำหรับ real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('commissionUpdated', {
        employeeId,
        period,
        data: commission
      });
    }

    res.json({ success: true, data: commission });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error upserting commission:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    session.endSession();
  }
};

// เพิ่มรายการขายใหม่
exports.addSaleToCommission = async (req, res) => {
  try {
    const { employeeId, saleData } = req.body;
    const { month, year } = req.body.period || {
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear()
    };

    // หาการตั้งค่าค่าคอมมิชชั่นที่ใช้งานอยู่
    const settings = await CommissionSettings.findOne({
      isActive: true,
      $or: [
        { 'applicableEmployees.employeeId': employeeId },
        { applicableEmployees: { $size: 0 } } // ใช้กับทุกคน
      ]
    });

    if (!settings) {
      return res.status(400).json({
        success: false,
        error: 'No active commission settings found'
      });
    }

    // คำนวณค่าคอมมิชชั่น
    const commissionAmount = settings.calculateCommission(
      saleData.saleAmount,
      saleData.saleType,
      saleData.productCategory
    );

    // เพิ่มข้อมูลค่าคอมมิชชั่น
    saleData.commissionAmount = commissionAmount;
    saleData.commissionRate = (commissionAmount / saleData.saleAmount) * 100;

    // หาหรือสร้างเรคคอร์ดค่าคอมมิชชั่น
    let commission = await Commission.findOne({
      employeeId,
      'period.month': month,
      'period.year': year
    });

    if (!commission) {
      const employee = await User.findById(employeeId);
      commission = new Commission({
        employeeId,
        employeeName: employee.name,
        period: { month, year },
        sales: []
      });
    }

    commission.sales.push(saleData);
    commission.calculateTotals();
    await commission.save();

    // ส่ง socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('newSaleCommission', {
        employeeId,
        saleData,
        commission: commission.toObject()
      });
    }

    res.json({ success: true, data: commission });
  } catch (error) {
    console.error('Error adding sale to commission:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// อนุมัติค่าคอมมิชชั่น
exports.approveCommission = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedBy, notes } = req.body;

    const commission = await Commission.findById(id);
    if (!commission) {
      return res.status(404).json({ success: false, error: 'Commission not found' });
    }

    commission.status = 'approved';
    commission.approvedBy = approvedBy;
    commission.approvedDate = new Date();
    if (notes) commission.notes = notes;

    await commission.save();

    // ส่ง notification
    const io = req.app.get('io');
    if (io) {
      io.emit('commissionApproved', {
        commissionId: id,
        employeeId: commission.employeeId,
        approvedBy
      });
    }

    res.json({ success: true, data: commission });
  } catch (error) {
    console.error('Error approving commission:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// จ่ายค่าคอมมิชชั่น
exports.payCommission = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod, paymentReference, paidAmount } = req.body;

    const commission = await Commission.findById(id);
    if (!commission) {
      return res.status(404).json({ success: false, error: 'Commission not found' });
    }

    if (commission.status !== 'approved') {
      return res.status(400).json({
        success: false,
        error: 'Commission must be approved before payment'
      });
    }

    commission.status = 'paid';
    commission.paidDate = new Date();
    commission.paymentMethod = paymentMethod;
    commission.paymentReference = paymentReference;
    commission.paidCommission = paidAmount || commission.totalCommission;

    await commission.save();

    // ส่ง notification
    const io = req.app.get('io');
    if (io) {
      io.emit('commissionPaid', {
        commissionId: id,
        employeeId: commission.employeeId,
        amount: commission.paidCommission
      });
    }

    res.json({ success: true, data: commission });
  } catch (error) {
    console.error('Error paying commission:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ดึงข้อมูลค่าคอมมิชชั่นแบบ real-time
exports.getRealtimeCommissions = async (req, res) => {
  try {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const commissions = await Commission.find({
      'period.month': currentMonth,
      'period.year': currentYear
    })
    .populate('employeeId', 'name position')
    .sort({ totalCommission: -1 })
    .lean();

    // เพิ่มลำดับ
    const rankedCommissions = commissions.map((c, index) => ({
      ...c,
      rank: index + 1
    }));

    res.json({ success: true, data: rankedCommissions });
  } catch (error) {
    console.error('Error fetching realtime commissions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ดึงประวัติค่าคอมมิชชั่น
exports.getCommissionHistory = async (req, res) => {
  try {
    const { employeeId, startDate, endDate, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (employeeId) filter.employeeId = employeeId;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const [commissions, total] = await Promise.all([
      Commission.find(filter)
        .populate('employeeId', 'name')
        .sort({ 'period.year': -1, 'period.month': -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Commission.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: commissions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching commission history:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ดึงสรุปค่าคอมมิชชั่น
exports.getCommissionSummary = async (req, res) => {
  try {
    const { year } = req.query;
    const currentYear = year || new Date().getFullYear();

    const summary = await Commission.aggregate([
      {
        $match: {
          'period.year': parseInt(currentYear)
        }
      },
      {
        $group: {
          _id: '$period.month',
          totalSales: { $sum: '$totalSales' },
          totalCommission: { $sum: '$totalCommission' },
          paidCommission: { $sum: '$paidCommission' },
          pendingCommission: { $sum: '$pendingCommission' },
          employeeCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // เพิ่มชื่อเดือน
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
                   'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

    const formattedSummary = summary.map(s => ({
      month: s._id,
      monthName: months[s._id - 1],
      ...s
    }));

    res.json({
      success: true,
      data: formattedSummary,
      year: currentYear
    });
  } catch (error) {
    console.error('Error fetching commission summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};