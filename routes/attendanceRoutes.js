// routes/attendanceRoutes.js
const express    = require('express');
const router     = express.Router();
const authJWT    = require('../middlewares/authJWT');
const hasPermission = require('../middlewares/hasPermission');       // 👈 เพิ่ม
const Attendance = require('../models/HR/Attendance');
const { body, validationResult } = require('express-validator');

// --- validation middleware for checkin ---
const validateCheckin = [
  body('branch').notEmpty().withMessage('กรุณาระบุสาขา'),
  body('checkInType').optional().isIn(['normal', 'outside_area', 'other_branch']).withMessage('ประเภทการเช็กอินไม่ถูกต้อง'),
  body('isOT').optional().isBoolean().withMessage('สถานะ OT ต้องเป็น true หรือ false'),
  body('location').optional().isObject()
    .custom(value => {
      // Accept both lat/lng and latitude/longitude formats
      if ((value.lat != null && value.lng != null) ||
          (value.latitude != null && value.longitude != null)) {
        return true;
      }
      throw new Error('Location ต้องมี latitude และ longitude');
    }),
  body('note').optional().isString().trim(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success:false, errors: errors.array() });
    }
    next();
  }
];

// Test endpoint (no auth required)
router.get('/test', (req, res) => {
  console.log('🧪 Test endpoint called');
  res.json({ success: true, message: 'Attendance routes working!' });
});

// ทั้งหมดยกเว้น public routes ต้องล็อกอินก่อน
router.use(authJWT);

/**
 * GET /api/attendance/session/today
 * — คืนข้อมูลเช็คอิน/เช็คเอาท์ วันนี้ ของผู้ใช้ ที่ระบุสาขามาใน query string
 */
router.get('/session/today', async (req, res, next) => {
  try {
    console.log('📍 GET /api/attendance/session/today called');
    console.log('📍 User:', req.user?._id);
    console.log('📍 Branch:', req.query.branch);

    const userId = req.user._id;
    const { branch } = req.query;
    if (!branch) {
      console.log('❌ No branch provided');
      return res.status(400).json({ success: false, error: 'กรุณาระบุสาขา (branch) ใน query' });
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const session = await Attendance.findOne({
      user:    userId,
      branch,
      checkIn: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ checkIn: -1 });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบ session ที่เช็คอินค้างอยู่สำหรับสาขานี้ในวันนี้'
      });
    }

    return res.json({
      success: true,
      inTime:  session.checkIn,
      outTime: session.checkOut || null
    });
  } catch (err) {
    console.error('Error in GET /session/today:', err);
    next(err);
  }
});

/**
 * GET /api/attendance/branches/my-accessible
 * — คืนรายการสาขาที่ผู้ใช้สามารถเข้าถึงและเช็คอินได้
 */
router.get('/branches/my-accessible', async (req, res, next) => {
  try {
    const userId = req.user._id;

    // ดึงข้อมูลผู้ใช้เพื่อเช็ค accessibleBranches
    const User = require('../models/User/User');
    const user = await User.findById(userId).populate('accessibleBranches');

    if (!user) {
      return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลผู้ใช้' });
    }

    // ถ้าไม่มี accessibleBranches หรือเป็นอาร์เรย์ว่าง ให้ส่งสาขาทั้งหมดที่ active
    let branches;
    if (!user.accessibleBranches || user.accessibleBranches.length === 0) {
      const Zone = require('../models/HR/zoneModel');
      branches = await Zone.find({ isActive: true }).sort({ name: 1 });
    } else {
      branches = user.accessibleBranches.filter(branch => branch.isActive);
    }

    return res.json({
      success: true,
      data: branches
    });
  } catch (err) {
    console.error('Error in GET /branches/my-accessible:', err);
    next(err);
  }
});

/**
 * POST /api/attendance
 * — Generic สร้าง record ใหม่ (ต้องระบุ branch ใน query string)
 */
router.post('/', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { branch } = req.query;
    if (!branch) {
      return res.status(400).json({ success: false, error: 'กรุณาระบุสาขา (branch) ใน query' });
    }

    const { checkIn, checkOut, location, note } = req.body;
    const att = new Attendance({
      user:     userId,
      branch,
      checkIn:  checkIn  ? new Date(checkIn)  : new Date(),
      checkOut: checkOut ? new Date(checkOut) : undefined,
      location: location || {},
      note:     note     || ''
    });

    await att.save();
    return res.status(201).json({ success: true, attendance: att });
  } catch (err) {
    console.error('Error in POST /api/attendance:', err);
    next(err);
  }
});

/**
 * POST /api/attendance/action
 * — บันทึก action ต่างๆ (checkin, break_out, break_in, checkout)
 */
router.post('/action', validateCheckin, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { branch, location, note, checkInType = 'normal', isOT = false, actionType } = req.body;

    if (!actionType) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุ actionType (checkin, break_out, break_in, checkout)'
      });
    }

    // ตรวจสอบว่าผู้ใช้มีสิทธิ์เข้าถึงสาขานี้หรือไม่
    const User = require('../models/User/User');
    const user = await User.findById(userId).populate('checkinBranches');

    if (user && user.checkinBranches && user.checkinBranches.length > 0) {
      const hasAccess = user.checkinBranches.some(b => b._id.toString() === branch);
      if (!hasAccess && checkInType === 'normal') {
        return res.status(403).json({
          success: false,
          error: 'คุณไม่มีสิทธิ์เช็คอินปกติที่สาขานี้ กรุณาเลือกเช็คอินต่างสาขา'
        });
      }
    }

    // ตรวจสอบ action flow สำหรับวันนี้
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayActions = await Attendance.find({
      user: userId,
      branch,
      checkIn: { $gte: today, $lt: tomorrow }
    }).sort({ checkIn: 1 });

    // กำหนด expected action ถัดไป
    let expectedAction = 'checkin'; // เริ่มต้นต้องเข้างานก่อน
    if (todayActions.length > 0) {
      const lastAction = todayActions[todayActions.length - 1].actionType;
      const actionFlow = {
        'checkin': 'break_out',    // เข้างาน -> ออกพัก
        'break_out': 'break_in',   // ออกพัก -> เข้างาน
        'break_in': 'checkout',    // เข้างาน -> เลิกงาน
        'checkout': null           // เลิกงานแล้ว ไม่สามารถทำอะไรต่อได้
      };
      expectedAction = actionFlow[lastAction];
    }

    // ตรวจสอบว่า action ที่ส่งมาตรงกับ flow หรือไม่
    if (expectedAction === null) {
      return res.status(400).json({
        success: false,
        error: 'คุณได้เลิกงานวันนี้แล้ว'
      });
    }

    if (actionType !== expectedAction) {
      const actionLabels = {
        'checkin': 'เข้างาน',
        'break_out': 'ออกพัก',
        'break_in': 'เข้างาน (หลังพัก)',
        'checkout': 'เลิกงาน'
      };
      return res.status(400).json({
        success: false,
        error: `ขั้นตอนถัดไปควรเป็น "${actionLabels[expectedAction]}" แต่คุณเลือก "${actionLabels[actionType]}"`,
        expectedAction,
        currentAction: actionType
      });
    }

    // กำหนดสถานะการอนุมัติ
    let approvalStatus = 'not_required';
    if (checkInType === 'outside_area' || checkInType === 'other_branch') {
      approvalStatus = 'pending';
    }

    // Normalize location format
    const normalizedLocation = location ? {
      latitude: location.latitude || location.lat,
      longitude: location.longitude || location.lng
    } : undefined;

    const att = new Attendance({
      user: userId,
      branch,
      checkIn: new Date(),
      actionType,
      checkInType,
      isOT,
      approvalStatus,
      location: normalizedLocation,
      note: note || ''
    });

    await att.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('attendanceAction', att);
      if (approvalStatus === 'pending') {
        io.emit('attendanceApprovalRequired', {
          userId,
          attendanceId: att._id,
          checkInType,
          message: `${user.username} ขออนุมัติเช็คอิน${checkInType === 'outside_area' ? 'นอกพื้นที่' : 'ต่างสาขา'}`
        });
      }
    }

    return res.status(201).json({
      success: true,
      attendance: att,
      requiresApproval: approvalStatus === 'pending',
      nextAction: actionType === 'checkout' ? null : {
        'checkin': 'break_out',
        'break_out': 'break_in',
        'break_in': 'checkout'
      }[actionType]
    });
  } catch (err) {
    console.error('Error in POST /action:', err);
    next(err);
  }
});

/**
 * POST /api/attendance/checkin (backward compatibility)
 */
router.post('/checkin', validateCheckin, async (req, res, next) => {
  req.body.actionType = 'checkin';
  return router.handle(Object.assign(req, { url: '/action', method: 'POST' }), res, next);
});

/**
 * POST /api/attendance/checkout (backward compatibility)
 */
router.post('/checkout', async (req, res, next) => {
  req.body.actionType = 'checkout';
  return router.handle(Object.assign(req, { url: '/action', method: 'POST' }), res, next);
});

/**
 * GET /api/attendance/pending-approvals
 * — ดูรายการเช็คอินที่รออนุมัติ (สำหรับ HR)
 */
router.get('/pending-approvals', async (req, res, next) => {
  try {
    // Allow admin, superadmin, HR role, and users with attendance permissions
    const userRole = req.user.role;
    const userPermissions = req.user.permissions || [];
    const canApprove = ['admin', 'superadmin', 'Super Admin', 'HR', 'hr'].includes(userRole) ||
                       userPermissions.includes('attendance:approve') ||
                       userPermissions.includes('attendance:read') ||
                       userPermissions.includes('hr:read');

    if (!canApprove) {
      return res.status(403).json({
        success: false,
        error: 'คุณไม่มีสิทธิ์ในการดูรายการรออนุมัติ',
        userRole,
        userPermissions,
        required: ['attendance:approve', 'attendance:read', 'hr:read', 'HR role']
      });
    }

    const pendingAttendances = await Attendance.find({
      approvalStatus: 'pending'
    })
    .populate('user', 'username employee')
    .populate('branch', 'name branch_code')
    .sort({ checkIn: -1 });

    return res.json({
      success: true,
      data: pendingAttendances
    });
  } catch (err) {
    console.error('Error in GET /pending-approvals:', err);
    next(err);
  }
});

/**
 * POST /api/attendance/:id/approve
 * — อนุมัติการเช็คอิน (สำหรับ HR)
 */
router.post('/:id/approve', async (req, res, next) => {
  try {
    // Allow admin, superadmin, HR role, and users with attendance permissions
    const userRole = req.user.role;
    const userPermissions = req.user.permissions || [];
    const canApprove = ['admin', 'superadmin', 'Super Admin', 'HR', 'hr'].includes(userRole) ||
                       userPermissions.includes('attendance:approve') ||
                       userPermissions.includes('hr:approve');

    if (!canApprove) {
      return res.status(403).json({
        success: false,
        error: 'คุณไม่มีสิทธิ์ในการอนุมัติการเช็คอิน',
        userRole,
        userPermissions,
        required: ['attendance:approve', 'hr:approve', 'HR role']
      });
    }

    const { id } = req.params;
    const { approvalNote } = req.body;
    const approverId = req.user._id;

    const attendance = await Attendance.findById(id);
    if (!attendance) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบข้อมูลการเช็คอิน'
      });
    }

    if (attendance.approvalStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'การเช็คอินนี้ไม่ต้องการอนุมัติหรืออนุมัติแล้ว'
      });
    }

    attendance.approvalStatus = 'approved';
    attendance.approvedBy = approverId;
    attendance.approvedAt = new Date();
    attendance.approvalNote = approvalNote || '';

    await attendance.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('attendanceApproved', {
        attendanceId: id,
        userId: attendance.user,
        approvedBy: approverId
      });
    }

    return res.json({
      success: true,
      attendance
    });
  } catch (err) {
    console.error('Error in POST /:id/approve:', err);
    next(err);
  }
});

/**
 * POST /api/attendance/:id/reject
 * — ปฏิเสธการเช็คอิน (สำหรับ HR)
 */
router.post('/:id/reject', async (req, res, next) => {
  try {
    // Allow admin, superadmin, HR role, and users with attendance permissions
    const userRole = req.user.role;
    const userPermissions = req.user.permissions || [];
    const canApprove = ['admin', 'superadmin', 'Super Admin', 'HR', 'hr'].includes(userRole) ||
                       userPermissions.includes('attendance:approve') ||
                       userPermissions.includes('hr:approve');

    if (!canApprove) {
      return res.status(403).json({
        success: false,
        error: 'คุณไม่มีสิทธิ์ในการปฏิเสธการเช็คอิน',
        userRole,
        userPermissions,
        required: ['attendance:approve', 'hr:approve', 'HR role']
      });
    }

    const { id } = req.params;
    const { approvalNote } = req.body;
    const approverId = req.user._id;

    const attendance = await Attendance.findById(id);
    if (!attendance) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบข้อมูลการเช็คอิน'
      });
    }

    if (attendance.approvalStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'การเช็คอินนี้ไม่ต้องการอนุมัติหรืออนุมัติแล้ว'
      });
    }

    attendance.approvalStatus = 'rejected';
    attendance.approvedBy = approverId;
    attendance.approvedAt = new Date();
    attendance.approvalNote = approvalNote || '';

    await attendance.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('attendanceRejected', {
        attendanceId: id,
        userId: attendance.user,
        rejectedBy: approverId
      });
    }

    return res.json({
      success: true,
      attendance
    });
  } catch (err) {
    console.error('Error in POST /:id/reject:', err);
    next(err);
  }
});

/**
 * GET /api/attendance/my-history
 * — ดูประวัติการเช็คอินของตนเอง
 */
router.get('/my-history', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20, branch, status } = req.query;

    const query = { user: userId };
    if (branch) query.branch = branch;
    if (status) query.approvalStatus = status;

    const attendances = await Attendance.find(query)
      .populate('branch', 'name branch_code')
      .populate('approvedBy', 'username')
      .sort({ checkIn: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Attendance.countDocuments(query);

    return res.json({
      success: true,
      data: attendances,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Error in GET /my-history:', err);
    next(err);
  }
});

/**
 * GET /api/attendance
 * — ดูทั้งหมด (Admin, HR หรือผู้มีสิทธิ์)
 */
router.get('/',
  async (req, res, next) => {
    try {
      // Allow admin, superadmin, HR role, and users with attendance permissions
      const userRole = req.user.role;
      const userPermissions = req.user.permissions || [];
      const canRead = ['admin', 'superadmin', 'Super Admin', 'HR', 'hr'].includes(userRole) ||
                      userPermissions.includes('attendance:read') ||
                      userPermissions.includes('attendance:approve') ||
                      userPermissions.includes('hr:read');

      if (!canRead) {
        return res.status(403).json({
          success: false,
          error: 'คุณไม่มีสิทธิ์ในการดูข้อมูลการเช็คอิน',
          userRole,
          userPermissions,
          required: ['attendance:read', 'attendance:approve', 'hr:read', 'HR role']
        });
      }

      const list = await Attendance.find()
        .populate('user', 'username employee')
        .populate('branch', 'name branch_code')
        .sort({ checkIn: -1 });
      return res.json({ success: true, attendance: list });
    } catch (err) {
      console.error('Error in GET /api/attendance:', err);
      next(err);
    }
  }
);

/**
 * GET /api/attendance/summary/:period
 */
router.get('/summary/:period', hasPermission('attendance:read'), async (req, res, next) => {
  try {
    // รองรับ admin ดูของคนอื่น
    const targetUserId = req.query.userId || req.user._id;
    if (targetUserId !== req.user._id) {
      if (!req.user.permissions?.includes('attendance:read-all')) {
        return res.status(403).json({
          success: false,
          error: 'ไม่มีสิทธิ์ดูข้อมูลของผู้อื่น'
        });
      }
    }
    const { period } = req.params;
    const { date } = req.query;
    const { start, end } = calculateDateRange(period, date);
    const sessions = await Attendance.find({
      user: targetUserId,
      checkIn: { $gte: start, $lte: end }
    });
    const summary = {
      totalSessions: sessions.length,
      totalHours: calculateTotalHours(sessions),
      avgCheckInTime: calculateAvgTime(sessions, 'checkIn'),
      avgCheckOutTime: calculateAvgTime(sessions, 'checkOut')
    };
    return res.json({ success: true, summary });
  } catch (err) {
    next(err);
  }
});

// --- helper functions for summary route ---
function calculateDateRange(period, date) {
  const ref = date ? new Date(date) : new Date();
  let start, end;

  if (period === 'daily') {
    const base = new Date(ref);            // สร้างสำเนา
    start = new Date(base);
    start.setHours(0, 0, 0, 0);
    end = new Date(base);
    end.setHours(23, 59, 59, 999);
  } else if (period === 'weekly') {
    const day = ref.getDay();
    start = new Date(ref);
    start.setDate(ref.getDate() - day);
    start.setHours(0,0,0,0);
    end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23,59,59,999);
  } else if (period === 'monthly') {
    start = new Date(ref.getFullYear(), ref.getMonth(), 1);
    end   = new Date(ref.getFullYear(), ref.getMonth()+1, 0, 23,59,59,999);
  } else {
    start = new Date(0);
    end = new Date();
  }
  return { start, end };
}

function calculateTotalHours(sessions) {
  return sessions.reduce((sum, s) => {
    const out = s.checkOut || new Date();
    return sum + ((out - s.checkIn) / 36e5);
  }, 0);
}

function calculateAvgTime(sessions, field) {
  // กรองเฉพาะ sessions ที่มีค่า field
  const valid = sessions.filter(s => s[field]);
  if (valid.length === 0) return null;
  const total = valid.reduce((sum, s) => sum + new Date(s[field]).getTime(), 0);
  return new Date(total / valid.length).toISOString();
}

/**
 * GET /api/attendance/my-history
 * — ประวัติการเช็คอิน/เช็คเอาท์ ของผู้ใช้ปัจจุบัน
 */
router.get('/my-history', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { startDate, endDate, branch, limit = 50 } = req.query;
    const q = { user: userId };
    if (branch) q.branch = branch;
    if (startDate || endDate) {
      q.checkIn = {};
      if (startDate) q.checkIn.$gte = new Date(startDate);
      if (endDate)   q.checkIn.$lte = new Date(endDate);
    }
    const history = await Attendance.find(q)
      .populate('branch', 'name')
      .sort({ checkIn: -1 })
      .limit(parseInt(limit));
    return res.json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/attendance/statistics
 * — สถิติการเช็คอินของผู้ใช้ปัจจุบัน
 */
router.get('/statistics', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { period = 'monthly' } = req.query;

    // คำนวณช่วงเวลา
    const now = new Date();
    let startDate, endDate;

    if (period === 'weekly') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      endDate = now;
    } else if (period === 'monthly') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (period === 'yearly') {
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear() + 1, 0, 0);
    } else {
      // Default to last 30 days
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 30);
      endDate = now;
    }

    const sessions = await Attendance.find({
      user: userId,
      checkIn: { $gte: startDate, $lte: endDate }
    }).populate('branch', 'name');

    // คำนวณสถิติ
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(s => s.checkOut).length;
    const totalHours = sessions.reduce((sum, session) => {
      if (session.checkOut) {
        const hours = (new Date(session.checkOut) - new Date(session.checkIn)) / (1000 * 60 * 60);
        return sum + hours;
      }
      return sum;
    }, 0);

    const avgHoursPerDay = totalHours / Math.max(1, completedSessions);
    const branches = [...new Set(sessions.map(s => s.branch?.name).filter(Boolean))];

    const statistics = {
      period,
      startDate,
      endDate,
      totalSessions,
      completedSessions,
      ongoingSessions: totalSessions - completedSessions,
      totalHours: Math.round(totalHours * 100) / 100,
      avgHoursPerDay: Math.round(avgHoursPerDay * 100) / 100,
      activeBranches: branches,
      sessionsData: sessions.map(s => ({
        date: s.checkIn,
        branch: s.branch?.name,
        checkIn: s.checkIn,
        checkOut: s.checkOut,
        hours: s.checkOut ? Math.round(((new Date(s.checkOut) - new Date(s.checkIn)) / (1000 * 60 * 60)) * 100) / 100 : null,
        note: s.note
      }))
    };

    return res.json({ success: true, data: statistics });
  } catch (err) {
    console.error('Error in GET /statistics:', err);
    next(err);
  }
});

/**
 * PUT /api/attendance/:id
 * — อัปเดต record ของตัวเอง
 */
router.put('/:id', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const updates = {};
    if (req.body.checkIn)  updates.checkIn  = new Date(req.body.checkIn);
    if (req.body.checkOut) updates.checkOut = new Date(req.body.checkOut);
    if (req.body.location) updates.location = req.body.location;
    if (req.body.note)     updates.note     = req.body.note;

    const updated = await Attendance.findOneAndUpdate(
      { _id: id, user: userId },
      updates,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบ record นี้ หรือไม่ได้เป็นเจ้าของ'
      });
    }

    return res.json({ success: true, attendance: updated });
  } catch (err) {
    console.error('Error in PUT /:id:', err);
    next(err);
  }
});

/**
 * DELETE /api/attendance/:id
 * — ลบ record ของตัวเอง
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const deleted = await Attendance.findOneAndDelete({ _id: id, user: userId });
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบ record นี้ หรือไม่ได้เป็นเจ้าของ'
      });
    }

    return res.json({ success: true, message: 'ลบสำเร็จ' });
  } catch (err) {
    console.error('Error in DELETE /:id:', err);
    next(err);
  }
});

module.exports = router;
