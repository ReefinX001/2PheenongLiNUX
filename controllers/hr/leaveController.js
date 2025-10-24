// File: controllers/leaveController.js

const Leave = require('../../models/HR/Leave');
const LeavePolicy = require('../../models/HR/LeavePolicy');

// helper object เดียวกันสำหรับ populate
const employeePopulate = {
  path: 'user',
  select: 'employee',
  populate: {
    path: 'employee',
    select: 'name department photoUrl'
  }
};

/**
 * GET /api/leaves
 */
exports.getAllLeaves = async (req, res) => {
  const io = req.app.get('io');
  try {
    const leaves = await Leave.find().limit(100).lean().populate(employeePopulate);
    return res.json({ success: true, data: leaves });
  } catch (error) {
    console.error('getAllLeaves error:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

/**
 * POST /api/leaves
 */
exports.createLeave = async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;
    const { leaveType = 'annual', startDate, endDate, reason = '' } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'startDate, endDate are required' });
    }

    const newLeave = new Leave({
      user:      userId,
      leaveType,
      startDate,
      endDate,
      reason,
      status:    'pending',
    });

    const saved = await newLeave.save();
    const populated = await Leave.findById(saved._id).lean().populate(employeePopulate);

    // Real-time emit
    const io = req.app.get('io');
    if (io) {
      io.emit('leave_created', populated);
    }

    return res.status(201).json({ success: true, data: populated });
  } catch (error) {
    console.error('createLeave error:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

/**
 * PATCH /api/leaves/:id (general status update)
 */
exports.updateLeaveStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectReason = '' } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required' });
    }

    const update = { status };
    if (status === 'approved') {
      update.approvedBy = req.user.employee?.name || req.user.username;
      update.approvedAt = new Date();
    }
    if (status === 'rejected') {
      update.rejectedBy   = req.user.employee?.name || req.user.username;
      update.rejectedAt   = new Date();
      update.rejectReason = rejectReason;
    }

    const leave = await Leave.findByIdAndUpdate(id, update, { new: true })
      .populate(employeePopulate);

    if (!leave) {
      return res.status(404).json({ success: false, error: 'Leave not found' });
    }

    // Real-time emit
    const io = req.app.get('io');
    if (io) {
      io.emit('leave_updated', leave);
    }

    return res.json({ success: true, data: leave });
  } catch (error) {
    console.error('updateLeaveStatus error:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

/**
 * DELETE /api/leaves/:id
 */
exports.deleteLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const leave = await Leave.findByIdAndDelete(id);

    if (!leave) {
      return res.status(404).json({ success: false, error: 'Leave not found' });
    }

    // Real-time emit
    const io = req.app.get('io');
    if (io) {
      io.emit('leave_deleted', { id, data: leave });
    }

    return res.json({ success: true, message: 'Leave deleted successfully' });
  } catch (err) {
    console.error('deleteLeave error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

// **New** อนุมัติคำขอลา
exports.approveLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const leave = await Leave.findByIdAndUpdate(
      id,
      {
        status:     'approved',
        approvedBy: req.user.employee?.name || req.user.username,
        approvedAt: new Date()
      },
      { new: true }
    ).populate(employeePopulate);

    if (!leave) {
      return res.status(404).json({ success: false, error: 'Leave not found' });
    }

    // Real-time emit
    const io = req.app.get('io');
    if (io) {
      io.emit('leave_updated', leave);
    }

    return res.json({ success: true, data: leave });
  } catch (error) {
    console.error('approveLeave error:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

// **New** ปฏิเสธคำขอลา
exports.rejectLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectReason = '' } = req.body;
    const leave = await Leave.findByIdAndUpdate(
      id,
      {
        status:       'rejected',
        rejectedBy:   req.user.employee?.name || req.user.username,
        rejectedAt:   new Date(),
        rejectReason
      },
      { new: true }
    ).populate(employeePopulate);

    if (!leave) {
      return res.status(404).json({ success: false, error: 'Leave not found' });
    }

    // Real-time emit
    const io = req.app.get('io');
    if (io) {
      io.emit('leave_updated', leave);
    }

    return res.json({ success: true, data: leave });
  } catch (error) {
    console.error('rejectLeave error:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

/**
 * GET /api/leaves/me
 */
exports.getUserLeaves = async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;
    const leaves = await Leave.find({ user: userId }).limit(100).lean().populate(employeePopulate);
    return res.json({ success: true, data: leaves });
  } catch (error) {
    console.error('getUserLeaves error:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

// ยกเลิกคำขอ (alias to deleteLeave)
exports.cancelLeave = exports.deleteLeave;

/**
 * GET /api/hr/leaves/balance - ดึงข้อมูลวันลาคงเหลือของผู้ใช้
 */
exports.getUserLeaveBalance = async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;
    const currentYear = new Date().getFullYear();

    // ดึงนโยบายการลาปัจจุบัน
    const currentPolicy = await LeavePolicy.getCurrentPolicy(currentYear);

    if (!currentPolicy) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบนโยบายการลาสำหรับปีปัจจุบัน'
      });
    }

    // ใช้ข้อมูลจากนโยบายการลา
    const annualLeaveAllowance = {
      annual: currentPolicy.policy.annual.days,
      sick: currentPolicy.policy.sick.days,
      personal: currentPolicy.policy.personal.days,
      special: currentPolicy.policy.special.days,
      maternity: currentPolicy.policy.maternity.days,
      paternity: currentPolicy.policy.paternity.days
    };

    // คำนวณช่วงเวลาปีปัจจุบัน (1 มกราคม - 31 ธันวาคม)
    const yearStart = new Date(currentYear, 0, 1); // 1 มกราคม
    const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59); // 31 ธันวาคม

    // ดึงข้อมูลการลาที่อนุมัติแล้วในปีนี้
    const approvedLeaves = await Leave.find({
      user: userId,
      status: 'approved',
      startDate: { $gte: yearStart, $lte: yearEnd }
    }).lean();

    // คำนวณจำนวนวันที่ใช้ไปแล้วแต่ละประเภท
    const usedDays = {
      annual: 0,
      sick: 0,
      personal: 0,
      special: 0,
      maternity: 0,
      paternity: 0
    };

    approvedLeaves.forEach(leave => {
      const startDate = new Date(leave.startDate);
      const endDate = new Date(leave.endDate);
      const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

      if (usedDays.hasOwnProperty(leave.leaveType)) {
        usedDays[leave.leaveType] += daysDiff;
      }
    });

    // คำนวณวันที่เหลือ
    const balance = {
      annual: {
        total: annualLeaveAllowance.annual,
        used: usedDays.annual,
        remaining: Math.max(0, annualLeaveAllowance.annual - usedDays.annual)
      },
      sick: {
        total: annualLeaveAllowance.sick,
        used: usedDays.sick,
        remaining: Math.max(0, annualLeaveAllowance.sick - usedDays.sick)
      },
      personal: {
        total: annualLeaveAllowance.personal,
        used: usedDays.personal,
        remaining: Math.max(0, annualLeaveAllowance.personal - usedDays.personal)
      },
      special: {
        total: annualLeaveAllowance.special,
        used: usedDays.special,
        remaining: Math.max(0, annualLeaveAllowance.special - usedDays.special)
      },
      maternity: {
        total: annualLeaveAllowance.maternity,
        used: usedDays.maternity,
        remaining: Math.max(0, annualLeaveAllowance.maternity - usedDays.maternity)
      },
      paternity: {
        total: annualLeaveAllowance.paternity,
        used: usedDays.paternity,
        remaining: Math.max(0, annualLeaveAllowance.paternity - usedDays.paternity)
      }
    };

    return res.json({
      success: true,
      data: {
        userId,
        year: currentYear,
        balance,
        policy: {
          name: currentPolicy.name,
          year: currentPolicy.year,
          effectiveDate: currentPolicy.effectiveDate,
          expiryDate: currentPolicy.expiryDate
        },
        summary: {
          totalAllowed: Object.values(annualLeaveAllowance).reduce((sum, val) => sum + val, 0),
          totalUsed: Object.values(usedDays).reduce((sum, val) => sum + val, 0),
          totalRemaining: Object.values(balance).reduce((sum, val) => sum + val.remaining, 0)
        }
      }
    });
  } catch (error) {
    console.error('getUserLeaveBalance error:', error);
    return res.status(500).json({
      success: false,
      error: 'ไม่สามารถดึงข้อมูลวันลาคงเหลือได้'
    });
  }
};
