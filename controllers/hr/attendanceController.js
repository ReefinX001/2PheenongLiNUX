// controllers/hr/attendanceController.js
const Attendance = require('../../models/HR/Attendance');
const Employee = require('../../models/HR/Employee');
const Zone = require('../../models/HR/zoneModel');
const WorkSchedule = require('../../models/HR/WorkSchedule');
const User = require('../../models/User/User');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');

const attendanceController = {
  // Get attendance data with comprehensive filtering and pagination
  getAttendance: async (req, res) => {
    try {
      const {
        branchId,
        employeeId,
        userId,
        startDate,
        endDate,
        status,
        checkInType,
        page = 1,
        limit = 50
      } = req.query;

      // Build filter
      let filter = {};

      if (branchId) filter.branch = branchId;
      if (employeeId) filter.user = employeeId; // Legacy support
      if (userId) filter.user = userId;
      if (status) filter.approvalStatus = status;
      if (checkInType) filter.checkInType = checkInType;

      // Date range filter
      if (startDate || endDate) {
        filter.checkIn = {};
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          filter.checkIn.$gte = start;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          filter.checkIn.$lte = end;
        }
      }

      // Check permissions for branch access
      const userRole = req.user.role;
      const canViewAll = ['admin', 'superadmin', 'Super Admin', 'HR', 'hr'].includes(userRole) ||
                         req.user.permissions?.includes('attendance:read-all');

      if (!canViewAll) {
        // Regular users can only see their own attendance
        filter.user = req.user.userId;
      }

      const skip = (page - 1) * limit;

      // Get attendance records
      const attendanceRecords = await Attendance.find(filter)
        .populate('user', 'username email employee')
        .populate('branch', 'name branch_code address')
        .populate('approvedBy', 'username email')
        .sort({ checkIn: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Attendance.countDocuments(filter);

      // Calculate statistics
      const totalHours = attendanceRecords.reduce((sum, record) => {
        if (record.checkOut && record.checkIn) {
          const hours = (record.checkOut - record.checkIn) / (1000 * 60 * 60);
          return sum + hours;
        }
        return sum;
      }, 0);

      const completedSessions = attendanceRecords.filter(record => record.checkOut).length;
      const pendingApprovals = attendanceRecords.filter(record => record.approvalStatus === 'pending').length;

      res.json({
        success: true,
        data: attendanceRecords,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        statistics: {
          totalRecords: total,
          totalHours: Math.round(totalHours * 100) / 100,
          completedSessions,
          pendingApprovals,
          avgHoursPerSession: completedSessions > 0 ? Math.round((totalHours / completedSessions) * 100) / 100 : 0
        },
        message: 'Attendance data retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการเข้าทำงาน',
        error: error.message
      });
    }
  },

  // Get today's attendance for current user by branch
  getTodayAttendance: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { branchId } = req.query;

      if (!branchId || !mongoose.Types.ObjectId.isValid(branchId)) {
        return res.status(400).json({
          success: false,
          message: 'กรุณาระบุรหัสสาขาที่ถูกต้อง'
        });
      }

      // Check if user has access to this branch
      const employee = await Employee.findOne({ userId: userId, deleted_at: null });
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบข้อมูลพนักงาน'
        });
      }

      const hasAccess =
        employee.primaryBranch && employee.primaryBranch.toString() === branchId ||
        employee.accessibleBranches.includes(branchId) ||
        employee.checkinBranches.includes(branchId);

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'คุณไม่มีสิทธิ์เข้าถึงสาขานี้'
        });
      }

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const todayAttendance = await Attendance.find({
        user: userId,
        branch: branchId,
        checkIn: { $gte: startOfDay, $lte: endOfDay }
      })
      .populate('branch', 'name branch_code')
      .sort({ checkIn: -1 });

      res.json({
        success: true,
        data: todayAttendance,
        message: 'Today attendance retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching today attendance:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการเข้าทำงานวันนี้',
        error: error.message
      });
    }
  },

  // Check current attendance session
  getCurrentSession: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { branchId } = req.query;

      let filter = {
        user: userId,
        checkOut: { $exists: false }
      };

      if (branchId) filter.branch = branchId;

      const currentSession = await Attendance.findOne(filter)
        .populate('branch', 'name branch_code')
        .sort({ checkIn: -1 });

      if (!currentSession) {
        return res.json({
          success: true,
          data: null,
          message: 'No active session found'
        });
      }

      res.json({
        success: true,
        data: currentSession,
        message: 'Current session retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching current session:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูล session ปัจจุบัน',
        error: error.message
      });
    }
  },

  // Check in
  checkIn: async (req, res) => {
    try {
      const userId = req.user.userId;
      const {
        branch,
        location,
        note,
        checkInType = 'normal',
        isOT = false
      } = req.body;

      if (!branch || !mongoose.Types.ObjectId.isValid(branch)) {
        return res.status(400).json({
          success: false,
          message: 'กรุณาระบุรหัสสาขาที่ถูกต้อง'
        });
      }

      // Check if user has access to this branch
      const employee = await Employee.findOne({ userId: userId, deleted_at: null });
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบข้อมูลพนักงาน'
        });
      }

      // Validate branch access
      const branchData = await Zone.findOne({ _id: branch, deleted_at: null });
      if (!branchData) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบสาขาที่ระบุ'
        });
      }

      const hasAccess =
        employee.primaryBranch && employee.primaryBranch.toString() === branch ||
        employee.accessibleBranches.includes(branch) ||
        employee.checkinBranches.includes(branch);

      if (!hasAccess && checkInType === 'normal') {
        return res.status(403).json({
          success: false,
          message: 'คุณไม่มีสิทธิ์เช็คอินปกติที่สาขานี้ กรุณาเลือกเช็คอินต่างสาขา'
        });
      }

      // Check for existing open session
      const existingSession = await Attendance.findOne({
        user: userId,
        checkOut: { $exists: false }
      });

      if (existingSession) {
        return res.status(400).json({
          success: false,
          message: 'คุณมี session ที่ยังไม่ได้ checkout อยู่',
          existingSession: {
            checkInTime: existingSession.checkIn,
            branch: existingSession.branch
          }
        });
      }

      // Check location if required
      let approvalStatus = 'not_required';
      if (location && location.latitude && location.longitude) {
        const distance = branchData.distanceFrom(location.latitude, location.longitude);

        if (distance > branchData.radius) {
          if (checkInType === 'normal') {
            return res.status(400).json({
              success: false,
              message: `คุณอยู่นอกพื้นที่สาขา (ห่าง ${Math.round(distance)} เมตร) กรุณาเลือกเช็คอินนอกพื้นที่`,
              distance: Math.round(distance),
              allowedRadius: branchData.radius
            });
          }
          approvalStatus = 'pending';
        }
      }

      if (checkInType === 'outside_area' || checkInType === 'other_branch') {
        approvalStatus = 'pending';
      }

      // Create attendance record
      const attendance = new Attendance({
        user: userId,
        branch,
        checkIn: new Date(),
        checkInType,
        isOT,
        approvalStatus,
        location: {
          latitude: location?.latitude || null,
          longitude: location?.longitude || null
        },
        note: note || ''
      });

      await attendance.save();

      // Populate and return
      const populatedAttendance = await Attendance.findById(attendance._id)
        .populate('branch', 'name branch_code')
        .populate('user', 'username email');

      // Emit socket event
      const io = req.app.get('io');
      if (io) {
        io.emit('attendanceCheckedIn', {
          attendance: populatedAttendance,
          message: `${employee.name} เช็คอินที่ ${branchData.name}`
        });

        // Notify for approval if needed
        if (approvalStatus === 'pending') {
          io.emit('attendanceApprovalRequired', {
            userId,
            attendanceId: attendance._id,
            checkInType,
            employee: employee.name,
            branch: branchData.name,
            message: `${employee.name} ขออนุมัติเช็คอิน${checkInType === 'outside_area' ? 'นอกพื้นที่' : 'ต่างสาขา'}`
          });
        }
      }

      res.status(201).json({
        success: true,
        data: populatedAttendance,
        requiresApproval: approvalStatus === 'pending',
        message: 'เช็คอินสำเร็จ'
      });
    } catch (error) {
      console.error('Error in check in:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการเช็คอิน',
        error: error.message
      });
    }
  },

  // Check out
  checkOut: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { branchId, location } = req.body;

      // Find active session
      let filter = {
        user: userId,
        checkOut: { $exists: false }
      };

      if (branchId) filter.branch = branchId;

      const session = await Attendance.findOne(filter)
        .sort({ checkIn: -1 });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบ session ที่เช็คอินค้างอยู่ให้เช็คเอาท์'
        });
      }

      // Update session
      session.checkOut = new Date();
      if (location) {
        session.location = {
          ...session.location,
          ...location
        };
      }

      await session.save();

      // Populate and return
      const populatedSession = await Attendance.findById(session._id)
        .populate('branch', 'name branch_code')
        .populate('user', 'username email');

      // Emit socket event
      const io = req.app.get('io');
      if (io) {
        io.emit('attendanceCheckedOut', {
          attendance: populatedSession,
          duration: populatedSession.durationMinutes,
          message: 'เช็คเอาท์สำเร็จ'
        });
      }

      res.json({
        success: true,
        data: populatedSession,
        message: 'เช็คเอาท์สำเร็จ'
      });
    } catch (error) {
      console.error('Error in check out:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการเช็คเอาท์',
        error: error.message
      });
    }
  },

  // Get accessible branches for user
  getAccessibleBranches: async (req, res) => {
    try {
      const userId = req.user.userId;

      // Find employee
      const employee = await Employee.findOne({ userId: userId, deleted_at: null })
        .populate('primaryBranch accessibleBranches checkinBranches hrZones');

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบข้อมูลพนักงาน'
        });
      }

      // Collect all accessible branches
      const branchIds = new Set();

      if (employee.primaryBranch) {
        branchIds.add(employee.primaryBranch._id.toString());
      }

      employee.accessibleBranches.forEach(branch => branchIds.add(branch._id.toString()));
      employee.checkinBranches.forEach(branch => branchIds.add(branch._id.toString()));
      employee.hrZones.forEach(zone => branchIds.add(zone._id.toString()));

      // If no specific branches assigned, return all active branches
      let branches = [];
      if (branchIds.size === 0) {
        branches = await Zone.find({ isActive: true, deleted_at: null })
          .sort({ name: 1 });
      } else {
        branches = await Zone.find({
          _id: { $in: Array.from(branchIds) },
          isActive: true,
          deleted_at: null
        }).sort({ name: 1 });
      }

      res.json({
        success: true,
        data: branches,
        message: 'Accessible branches retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching accessible branches:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสาขาที่เข้าถึงได้',
        error: error.message
      });
    }
  },

  // Get attendance statistics
  getAttendanceStatistics: async (req, res) => {
    try {
      const {
        period = 'monthly',
        branchId,
        employeeId,
        startDate,
        endDate
      } = req.query;

      // Calculate date range
      let dateFilter = {};
      const now = new Date();

      if (startDate && endDate) {
        dateFilter = {
          checkIn: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        };
      } else {
        switch (period) {
          case 'daily':
            const startOfDay = new Date(now);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(now);
            endOfDay.setHours(23, 59, 59, 999);
            dateFilter.checkIn = { $gte: startOfDay, $lte: endOfDay };
            break;
          case 'weekly':
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay());
            startOfWeek.setHours(0, 0, 0, 0);
            dateFilter.checkIn = { $gte: startOfWeek };
            break;
          case 'monthly':
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            dateFilter.checkIn = { $gte: startOfMonth };
            break;
          case 'yearly':
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            dateFilter.checkIn = { $gte: startOfYear };
            break;
        }
      }

      // Build aggregation pipeline
      const matchStage = { ...dateFilter };
      if (branchId) matchStage.branch = new mongoose.Types.ObjectId(branchId);
      if (employeeId) matchStage.user = new mongoose.Types.ObjectId(employeeId);

      const stats = await Attendance.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalSessions: { $sum: 1 },
            completedSessions: {
              $sum: { $cond: [{ $ne: ['$checkOut', null] }, 1, 0] }
            },
            pendingApprovals: {
              $sum: { $cond: [{ $eq: ['$approvalStatus', 'pending'] }, 1, 0] }
            },
            totalMinutes: {
              $sum: {
                $cond: [
                  { $ne: ['$checkOut', null] },
                  { $divide: [{ $subtract: ['$checkOut', '$checkIn'] }, 60000] },
                  0
                ]
              }
            },
            overtimeSessions: {
              $sum: { $cond: [{ $eq: ['$isOT', true] }, 1, 0] }
            },
            outsideAreaCheckins: {
              $sum: { $cond: [{ $eq: ['$checkInType', 'outside_area'] }, 1, 0] }
            }
          }
        }
      ]);

      const statistics = stats[0] || {
        totalSessions: 0,
        completedSessions: 0,
        pendingApprovals: 0,
        totalMinutes: 0,
        overtimeSessions: 0,
        outsideAreaCheckins: 0
      };

      // Calculate additional metrics
      const totalHours = Math.round((statistics.totalMinutes / 60) * 100) / 100;
      const avgHoursPerSession = statistics.completedSessions > 0
        ? Math.round((totalHours / statistics.completedSessions) * 100) / 100
        : 0;

      res.json({
        success: true,
        data: {
          period,
          dateRange: dateFilter,
          ...statistics,
          totalHours,
          avgHoursPerSession,
          ongoingSessions: statistics.totalSessions - statistics.completedSessions
        },
        message: 'Attendance statistics retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching attendance statistics:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงสถิติการเข้าทำงาน',
        error: error.message
      });
    }
  },

  // Approve attendance (for HR)
  approveAttendance: async (req, res) => {
    try {
      const { id } = req.params;
      const { approvalNote } = req.body;

      // Check permissions
      const userRole = req.user.role;
      const userPermissions = req.user.permissions || [];
      const canApprove = ['admin', 'superadmin', 'Super Admin', 'HR', 'hr'].includes(userRole) ||
                         userPermissions.includes('attendance:approve') ||
                         userPermissions.includes('hr:approve');

      if (!canApprove) {
        return res.status(403).json({
          success: false,
          message: 'คุณไม่มีสิทธิ์ในการอนุมัติการเช็คอิน'
        });
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'รหัสการเช็คอินไม่ถูกต้อง'
        });
      }

      const attendance = await Attendance.findById(id)
        .populate('user', 'username email')
        .populate('branch', 'name branch_code');

      if (!attendance) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบข้อมูลการเช็คอิน'
        });
      }

      if (attendance.approvalStatus !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'การเช็คอินนี้ไม่ต้องการอนุมัติหรืออนุมัติแล้ว'
        });
      }

      attendance.approvalStatus = 'approved';
      attendance.approvedBy = req.user.userId;
      attendance.approvedAt = new Date();
      attendance.approvalNote = approvalNote || '';

      await attendance.save();

      // Emit socket event
      const io = req.app.get('io');
      if (io) {
        io.emit('attendanceApproved', {
          attendanceId: id,
          userId: attendance.user._id,
          approvedBy: req.user.userId,
          message: 'การเช็คอินได้รับการอนุมัติแล้ว'
        });
      }

      res.json({
        success: true,
        data: attendance,
        message: 'อนุมัติการเช็คอินสำเร็จ'
      });
    } catch (error) {
      console.error('Error approving attendance:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการอนุมัติการเช็คอิน',
        error: error.message
      });
    }
  },

  // Reject attendance (for HR)
  rejectAttendance: async (req, res) => {
    try {
      const { id } = req.params;
      const { approvalNote } = req.body;

      // Check permissions
      const userRole = req.user.role;
      const userPermissions = req.user.permissions || [];
      const canApprove = ['admin', 'superadmin', 'Super Admin', 'HR', 'hr'].includes(userRole) ||
                         userPermissions.includes('attendance:approve') ||
                         userPermissions.includes('hr:approve');

      if (!canApprove) {
        return res.status(403).json({
          success: false,
          message: 'คุณไม่มีสิทธิ์ในการปฏิเสธการเช็คอิน'
        });
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'รหัสการเช็คอินไม่ถูกต้อง'
        });
      }

      const attendance = await Attendance.findById(id)
        .populate('user', 'username email')
        .populate('branch', 'name branch_code');

      if (!attendance) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบข้อมูลการเช็คอิน'
        });
      }

      if (attendance.approvalStatus !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'การเช็คอินนี้ไม่ต้องการอนุมัติหรือดำเนินการแล้ว'
        });
      }

      attendance.approvalStatus = 'rejected';
      attendance.approvedBy = req.user.userId;
      attendance.approvedAt = new Date();
      attendance.approvalNote = approvalNote || '';

      await attendance.save();

      // Emit socket event
      const io = req.app.get('io');
      if (io) {
        io.emit('attendanceRejected', {
          attendanceId: id,
          userId: attendance.user._id,
          rejectedBy: req.user.userId,
          message: 'การเช็คอินถูกปฏิเสธ'
        });
      }

      res.json({
        success: true,
        data: attendance,
        message: 'ปฏิเสธการเช็คอินสำเร็จ'
      });
    } catch (error) {
      console.error('Error rejecting attendance:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการปฏิเสธการเช็คอิน',
        error: error.message
      });
    }
  }
};

module.exports = attendanceController;