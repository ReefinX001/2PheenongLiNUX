// File: controllers/leaveController.js

const Leave = require('../models/HR/Leave');

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
    // Mock leave data for HR Dashboard
    const mockLeaves = [
      {
        _id: '64f8b2c1234567890abcdef1',
        user: {
          _id: '64f8b2c1234567890abcdef0',
          employee: {
            _id: '64f8b2c1234567890abcdef0',
            name: 'นายสมชาย ใจดี',
            department: 'ฝ่ายขาย',
            photoUrl: '/uploads/employees/employee1.jpg'
          }
        },
        leaveType: 'sick',
        startDate: new Date('2024-12-20'),
        endDate: new Date('2024-12-21'),
        days: 2,
        reason: 'ป่วยไข้หวัด',
        status: 'pending',
        approvedBy: null,
        rejectReason: null,
        appliedDate: new Date('2024-12-18'),
        createdAt: new Date('2024-12-18'),
        updatedAt: new Date('2024-12-18')
      },
      {
        _id: '64f8b2c1234567890abcdef2',
        user: {
          _id: '64f8b2c1234567890abcdef1',
          employee: {
            _id: '64f8b2c1234567890abcdef1',
            name: 'นางสาวมาลี สวยงาม',
            department: 'ฝ่ายบุคคล',
            photoUrl: '/uploads/employees/employee2.jpg'
          }
        },
        leaveType: 'personal',
        startDate: new Date('2024-12-25'),
        endDate: new Date('2024-12-25'),
        days: 1,
        reason: 'ธุระส่วนตัว',
        status: 'pending',
        approvedBy: null,
        rejectReason: null,
        appliedDate: new Date('2024-12-20'),
        createdAt: new Date('2024-12-20'),
        updatedAt: new Date('2024-12-20')
      },
      {
        _id: '64f8b2c1234567890abcdef3',
        user: {
          _id: '64f8b2c1234567890abcdef2',
          employee: {
            _id: '64f8b2c1234567890abcdef2',
            name: 'นายวิชาย เจริญสุข',
            department: 'ฝ่าย IT',
            photoUrl: '/uploads/employees/employee3.jpg'
          }
        },
        leaveType: 'vacation',
        startDate: new Date('2024-12-30'),
        endDate: new Date('2025-01-03'),
        days: 5,
        reason: 'พักร้อนช่วงปีใหม่',
        status: 'pending',
        approvedBy: null,
        rejectReason: null,
        appliedDate: new Date('2024-12-15'),
        createdAt: new Date('2024-12-15'),
        updatedAt: new Date('2024-12-15')
      },
      {
        _id: '64f8b2c1234567890abcdef4',
        user: {
          _id: '64f8b2c1234567890abcdef3',
          employee: {
            _id: '64f8b2c1234567890abcdef3',
            name: 'นางสมหญิง รักษ์ชาติ',
            department: 'ฝ่ายการเงิน',
            photoUrl: '/uploads/employees/employee4.jpg'
          }
        },
        leaveType: 'emergency',
        startDate: new Date('2024-12-22'),
        endDate: new Date('2024-12-22'),
        days: 1,
        reason: 'ฉุกเฉิน - ญาติป่วย',
        status: 'pending',
        approvedBy: null,
        rejectReason: null,
        appliedDate: new Date('2024-12-21'),
        createdAt: new Date('2024-12-21'),
        updatedAt: new Date('2024-12-21')
      },
      {
        _id: '64f8b2c1234567890abcdef5',
        user: {
          _id: '64f8b2c1234567890abcdef4',
          employee: {
            _id: '64f8b2c1234567890abcdef4',
            name: 'นายอนันต์ มีความสุข',
            department: 'ฝ่ายการตลาด',
            photoUrl: '/uploads/employees/employee5.jpg'
          }
        },
        leaveType: 'annual',
        startDate: new Date('2024-12-16'),
        endDate: new Date('2024-12-18'),
        days: 3,
        reason: 'ลาพักร้อนประจำปี',
        status: 'approved',
        approvedBy: 'ผู้จัดการฝ่าย HR',
        rejectReason: null,
        appliedDate: new Date('2024-12-10'),
        createdAt: new Date('2024-12-10'),
        updatedAt: new Date('2024-12-12')
      }
    ];

    return res.json({
      success: true,
      data: mockLeaves,
      total: mockLeaves.length,
      message: 'Leave requests retrieved successfully'
    });
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
    // Get userId from request body or authenticated user (req.user.id from authJWT)
    const userId = req.body.userId || (req.user && req.user.id);
    const { leaveType = 'annual', startDate, endDate, reason = '' } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }

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

    // Get io instance first before using it
    const io = req.app.get('io');

    // Emit new leave created event
    if (io) {
      io.emit('newleaveCreated', {
        id: saved._id,
        data: saved
      });
    }

    const populated = await Leave.findById(saved._id).lean().populate(employeePopulate);

    // Real-time emit for populated data
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
      update.approvedBy = req.user.name;
      update.approvedAt = new Date();
    }
    if (status === 'rejected') {
      update.rejectedBy   = req.user.name;
      update.rejectedAt   = new Date();
      update.rejectReason = rejectReason;
    }

    const leave = await Leave.findByIdAndUpdate(id, update, { new: true })
      .populate(employeePopulate);

    if (!leave) {
      return res.status(404).json({ success: false, error: 'Leave not found' });
    }

    // Get io instance and emit events
    const io = req.app.get('io');
    if (io) {
      io.emit('leaveUpdated', {
        id: leave._id,
        data: leave
      });
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

    // Get io instance and emit events
    const io = req.app.get('io');
    if (io) {
      io.emit('leaveDeleted', {
        id: id,
        data: leave
      });
      io.emit('leave_deleted', id);
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('deleteLeave error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

// **New** อนุมัติคำขอลา
exports.approveLeave = async (req, res) => {
  try {
    const { id } = req.params;

    // Mock approval (simulate successful database update)
    const approvedLeave = {
      _id: id,
      status: 'approved',
      approvedBy: req.user?.name || 'ผู้จัดการฝ่าย HR',
      approvedAt: new Date(),
      user: {
        _id: '64f8b2c1234567890abcdef0',
        employee: {
          _id: '64f8b2c1234567890abcdef0',
          name: 'นายสมชาย ใจดี',
          department: 'ฝ่ายขาย',
          photoUrl: '/uploads/employees/employee1.jpg'
        }
      },
      leaveType: 'sick',
      startDate: new Date('2024-12-20'),
      endDate: new Date('2024-12-21'),
      days: 2,
      reason: 'ป่วยไข้หวัด',
      appliedDate: new Date('2024-12-18'),
      createdAt: new Date('2024-12-18'),
      updatedAt: new Date()
    };

    // Get io instance and emit events
    const io = req.app.get('io');
    if (io) {
      io.emit('leaveUpdated', {
        id: approvedLeave._id,
        data: approvedLeave
      });
      io.emit('leave_updated', approvedLeave);
    }

    return res.json({
      success: true,
      data: approvedLeave,
      message: 'Leave request approved successfully'
    });
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

    // Mock rejection (simulate successful database update)
    const rejectedLeave = {
      _id: id,
      status: 'rejected',
      rejectedBy: req.user?.name || 'ผู้จัดการฝ่าย HR',
      rejectedAt: new Date(),
      rejectReason: rejectReason,
      user: {
        _id: '64f8b2c1234567890abcdef0',
        employee: {
          _id: '64f8b2c1234567890abcdef0',
          name: 'นายสมชาย ใจดี',
          department: 'ฝ่ายขาย',
          photoUrl: '/uploads/employees/employee1.jpg'
        }
      },
      leaveType: 'sick',
      startDate: new Date('2024-12-20'),
      endDate: new Date('2024-12-21'),
      days: 2,
      reason: 'ป่วยไข้หวัด',
      appliedDate: new Date('2024-12-18'),
      createdAt: new Date('2024-12-18'),
      updatedAt: new Date()
    };

    // Get io instance and emit events
    const io = req.app.get('io');
    if (io) {
      io.emit('leaveUpdated', {
        id: rejectedLeave._id,
        data: rejectedLeave
      });
      io.emit('leave_updated', rejectedLeave);
    }

    return res.json({
      success: true,
      data: rejectedLeave,
      message: 'Leave request rejected successfully'
    });
  } catch (error) {
    console.error('rejectLeave error:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

/**
 * GET /api/leaves/me
 */
exports.getUserLeaves = async (req, res) => {
  const io = req.app.get('io');
  try {
    const userId = req.user.id; // Changed from req.user.userId to req.user.id
    const leaves = await Leave.find({ user: userId }).limit(100).lean().populate(employeePopulate);
    return res.json({ success: true, data: leaves });
  } catch (error) {
    console.error('getUserLeaves error:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

// ยกเลิกคำขอ (alias to deleteLeave)
exports.cancelLeave = exports.deleteLeave;
