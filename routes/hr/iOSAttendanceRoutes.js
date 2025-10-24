// routes/hr/iOSAttendanceRoutes.js
const express = require('express');
const router = express.Router();
const authJWT = require('../../middlewares/authJWT');
const Attendance = require('../../models/HR/Attendance');
const User = require('../../models/User/User');
const { body, validationResult } = require('express-validator');

// iOS specific validation middleware
const validateIOSCheckin = [
  body('branchId').notEmpty().withMessage('กรุณาระบุ ID สาขา'),
  body('checkInType').optional().isIn(['normal', 'outside_area', 'other_branch']).withMessage('ประเภทการเช็กอินไม่ถูกต้อง'),
  body('isOT').optional().isBoolean().withMessage('สธานะ OT ต้องเป็น true หรือ false'),
  body('location').isObject().withMessage('กรุณาระบุตำแหน่งที่ตั้ง')
    .custom(value => {
      if (value.latitude != null && value.longitude != null) return true;
      throw new Error('Location ต้องมี latitude และ longitude');
    }),
  body('note').optional().isString().trim(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'ข้อมูลไม่ถูกต้อง',
        errors: errors.array()
      });
    }
    next();
  }
];

// ใช้ JWT authentication
router.use(authJWT);

/**
 * POST /api/hr/ios-attendance/checkin
 * — เช็คอินจาก iOS App
 */
router.post('/checkin', validateIOSCheckin, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { branchId, location, note, checkInType = 'normal', isOT = false } = req.body;

    // ตรวจสอบผู้ใช้และสิทธิ์
    const user = await User.findById(userId).populate('accessibleBranches');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบข้อมูลผู้ใช้'
      });
    }

    // ตรวจสอบสิทธิ์เข้าถึงสาขา
    if (checkInType === 'normal' && user.accessibleBranches && user.accessibleBranches.length > 0) {
      const hasAccess = user.accessibleBranches.some(b => b._id.toString() === branchId);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'คุณไม่มีสิทธิ์เช็คอินปกติที่สาขานี้ กรุณาเลือกเช็คอินต่างสาขา',
          suggestedType: 'other_branch'
        });
      }
    }

    // ตรวจสอบ session ที่ยังไม่ได้ checkout
    const existing = await Attendance.findOne({
      user: userId,
      checkOut: { $exists: false }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'คุณมี session ที่ยังไม่ได้ checkout อยู่',
        existingSession: {
          id: existing._id,
          checkInTime: existing.checkIn,
          branch: existing.branch,
          checkInType: existing.checkInType
        }
      });
    }

    // กำหนดสถานะการอนุมัติ
    let approvalStatus = 'not_required';
    if (checkInType === 'outside_area' || checkInType === 'other_branch') {
      approvalStatus = 'pending';
    }

    // สร้างการเช็คอิน
    const attendance = new Attendance({
      user: userId,
      branch: branchId,
      checkIn: new Date(),
      checkInType,
      isOT,
      approvalStatus,
      location: {
        latitude: location.latitude,
        longitude: location.longitude
      },
      note: note || ''
    });

    await attendance.save();

    // Populate ข้อมูลสำหรับส่งกลับ
    await attendance.populate([
      { path: 'user', select: 'username employee' },
      { path: 'branch', select: 'name branch_code' }
    ]);

    // ส่งแจ้งเตือนผ่าน Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('attendanceCheckedIn', attendance);

      // แจ้งเตือน HR ถ้าต้องการอนุมัติ
      if (approvalStatus === 'pending') {
        io.emit('attendanceApprovalRequired', {
          userId,
          attendanceId: attendance._id,
          checkInType,
          username: user.username,
          message: `${user.username} ขออนุมัติเช็คอิน${checkInType === 'outside_area' ? 'นอกพื้นที่' : 'ต่างสาขา'}`
        });
      }
    }

    return res.status(201).json({
      success: true,
      message: approvalStatus === 'pending'
        ? 'เช็คอินสำเร็จ รอการอนุมัติจากฝ่าย HR'
        : 'เช็คอินสำเร็จ',
      data: {
        attendanceId: attendance._id,
        checkInTime: attendance.checkIn,
        checkInType: attendance.checkInType,
        isOT: attendance.isOT,
        approvalStatus: attendance.approvalStatus,
        requiresApproval: approvalStatus === 'pending',
        branch: attendance.branch,
        location: attendance.location
      }
    });

  } catch (err) {
    console.error('Error in iOS checkin:', err);
    next(err);
  }
});

/**
 * POST /api/hr/ios-attendance/checkout
 * — เช็คเอาท์จาก iOS App
 */
router.post('/checkout', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { location, note } = req.body;

    // ค้นหา session ล่าสุดที่ยังไม่ checkout
    const session = await Attendance.findOne({
      user: userId,
      checkOut: { $exists: false }
    })
    .populate([
      { path: 'user', select: 'username employee' },
      { path: 'branch', select: 'name branch_code' }
    ])
    .sort({ checkIn: -1 });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบ session ที่เช็คอินค้างอยู่ให้เช็คเอาท์'
      });
    }

    // อัพเดท checkout
    session.checkOut = new Date();
    if (note) {
      session.note = session.note ? `${session.note} | เช็คเอาท์: ${note}` : `เช็คเอาท์: ${note}`;
    }

    // อัพเดทตำแหน่งถ้ามี
    if (location && location.latitude && location.longitude) {
      session.location = {
        latitude: location.latitude,
        longitude: location.longitude
      };
    }

    await session.save();

    // คำนวณชั่วโมงทำงาน
    const workingHours = (session.checkOut - session.checkIn) / (1000 * 60 * 60);
    const regularHours = Math.min(workingHours, 8);
    const overtimeHours = Math.max(workingHours - 8, 0);

    // ส่งแจ้งเตือนผ่าน Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('attendanceCheckedOut', session);
    }

    return res.json({
      success: true,
      message: 'เช็คเอาท์สำเร็จ',
      data: {
        attendanceId: session._id,
        checkInTime: session.checkIn,
        checkOutTime: session.checkOut,
        workingHours: parseFloat(workingHours.toFixed(2)),
        regularHours: parseFloat(regularHours.toFixed(2)),
        overtimeHours: parseFloat(overtimeHours.toFixed(2)),
        checkInType: session.checkInType,
        isOT: session.isOT,
        approvalStatus: session.approvalStatus,
        branch: session.branch
      }
    });

  } catch (err) {
    console.error('Error in iOS checkout:', err);
    next(err);
  }
});

/**
 * GET /api/hr/ios-attendance/status
 * — ตรวจสอบสถานะการเช็คอินปัจจุบัน
 */
router.get('/status', async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // ค้นหา session ปัจจุบันที่ยังไม่ checkout
    const currentSession = await Attendance.findOne({
      user: userId,
      checkOut: { $exists: false }
    })
    .populate('branch', 'name branch_code')
    .sort({ checkIn: -1 });

    return res.json({
      success: true,
      data: {
        isCheckedIn: !!currentSession,
        currentSession: currentSession ? {
          id: currentSession._id,
          checkInTime: currentSession.checkIn,
          checkInType: currentSession.checkInType,
          isOT: currentSession.isOT,
          approvalStatus: currentSession.approvalStatus,
          branch: currentSession.branch,
          workingDuration: new Date() - new Date(currentSession.checkIn)
        } : null
      }
    });

  } catch (err) {
    console.error('Error getting attendance status:', err);
    next(err);
  }
});

/**
 * GET /api/hr/ios-attendance/history
 * — ดูประวัติการเช็คอินของตนเอง (สำหรับ iOS)
 */
router.get('/history', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20, days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const attendances = await Attendance.find({
      user: userId,
      checkIn: { $gte: startDate }
    })
    .populate('branch', 'name branch_code')
    .populate('approvedBy', 'username')
    .sort({ checkIn: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    const total = await Attendance.countDocuments({
      user: userId,
      checkIn: { $gte: startDate }
    });

    const formattedData = attendances.map(att => {
      const workingHours = att.checkOut ? (new Date(att.checkOut) - new Date(att.checkIn)) / (1000 * 60 * 60) : 0;
      return {
        id: att._id,
        checkInTime: att.checkIn,
        checkOutTime: att.checkOut,
        checkInType: att.checkInType,
        isOT: att.isOT,
        approvalStatus: att.approvalStatus,
        workingHours: parseFloat(workingHours.toFixed(2)),
        branch: att.branch,
        note: att.note,
        approvedBy: att.approvedBy,
        approvedAt: att.approvedAt,
        approvalNote: att.approvalNote
      };
    });

    return res.json({
      success: true,
      data: formattedData,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (err) {
    console.error('Error getting attendance history:', err);
    next(err);
  }
});

/**
 * GET /api/hr/ios-attendance/branches
 * — ดูรายการสาขาที่ผู้ใช้สามารถเข้าถึงได้
 */
router.get('/branches', async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId).populate('accessibleBranches');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบข้อมูลผู้ใช้'
      });
    }

    let branches = [];
    if (!user.accessibleBranches || user.accessibleBranches.length === 0) {
      // ถ้าไม่มีการจำกัดสาขา ให้ส่งสาขาทั้งหมดที่ active
      const Zone = require('../../models/HR/zoneModel');
      branches = await Zone.find({ isActive: true }).sort({ name: 1 });
    } else {
      branches = user.accessibleBranches.filter(branch => branch.isActive);
    }

    return res.json({
      success: true,
      data: branches.map(branch => ({
        id: branch._id,
        name: branch.name,
        code: branch.branch_code || branch.code,
        location: branch.location,
        isActive: branch.isActive
      }))
    });

  } catch (err) {
    console.error('Error getting branches:', err);
    next(err);
  }
});

module.exports = router;
