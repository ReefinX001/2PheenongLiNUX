// controllers/hr/overtimeController.js
const Overtime = require('../../models/HR/Overtime');
const Employee = require('../../models/HR/Employee');
const Zone = require('../../models/HR/zoneModel');
const WorkSchedule = require('../../models/HR/WorkSchedule');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');

// Validation rules for overtime
const validateOvertime = [
  body('date').isISO8601().withMessage('วันที่ไม่ถูกต้อง'),
  body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('เวลาเริ่มต้นไม่ถูกต้อง'),
  body('endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('เวลาสิ้นสุดไม่ถูกต้อง'),
  body('reason').notEmpty().withMessage('เหตุผลไม่สามารถว่างได้').trim().isLength({ max: 500 }),
  body('branch').notEmpty().withMessage('กรุณาระบุสาขา'),
  body('plannedHours').optional().isFloat({ min: 0.5, max: 12 }).withMessage('ชั่วโมงที่วางแผนต้องอยู่ระหว่าง 0.5-12'),
  body('overtimeType').optional().isIn(['regular', 'holiday', 'weekend', 'emergency']).withMessage('ประเภท OT ไม่ถูกต้อง'),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('ระดับความสำคัญไม่ถูกต้อง'),
];

const overtimeController = {
  // Get all overtime requests
  getAllOvertimes: async (req, res) => {
    try {
      const {
        branchId,
        employeeId,
        status,
        startDate,
        endDate,
        overtimeType,
        priority,
        page = 1,
        limit = 50
      } = req.query;

      let filter = { deleted_at: null };

      if (branchId) filter.branch = branchId;
      if (employeeId) filter.employee = employeeId;
      if (status) filter.approvalStatus = status;
      if (overtimeType) filter.overtimeType = overtimeType;
      if (priority) filter.priority = priority;

      // Date range filter
      if (startDate || endDate) {
        filter.date = {};
        if (startDate) filter.date.$gte = new Date(startDate);
        if (endDate) filter.date.$lte = new Date(endDate);
      }

      const skip = (page - 1) * limit;

      const overtimes = await Overtime.find(filter)
        .populate('employee', 'employeeId name email position department')
        .populate('user', 'username email')
        .populate('branch', 'name branch_code address')
        .populate('requestedBy', 'username email')
        .populate('approvedBy', 'username email')
        .populate('rejectedBy', 'username email')
        .sort({ requestedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Overtime.countDocuments(filter);

      res.json({
        success: true,
        data: overtimes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        message: 'Overtime requests retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching overtime requests:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลคำขอ OT',
        error: error.message
      });
    }
  },

  // Get overtime by ID
  getOvertimeById: async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'รหัสคำขอ OT ไม่ถูกต้อง'
        });
      }

      const overtime = await Overtime.findOne({ _id: id, deleted_at: null })
        .populate('employee', 'employeeId name email position department')
        .populate('user', 'username email')
        .populate('branch', 'name branch_code address')
        .populate('requestedBy', 'username email')
        .populate('approvedBy', 'username email')
        .populate('rejectedBy', 'username email');

      if (!overtime) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบคำขอ OT'
        });
      }

      res.json({
        success: true,
        data: overtime,
        message: 'Overtime request retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching overtime request:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลคำขอ OT',
        error: error.message
      });
    }
  },

  // Get pending approvals
  getPendingApprovals: async (req, res) => {
    try {
      const { branchId } = req.query;

      // Check permissions
      const userRole = req.user.role;
      const userPermissions = req.user.permissions || [];
      const canApprove = ['admin', 'superadmin', 'Super Admin', 'HR', 'hr'].includes(userRole) ||
                         userPermissions.includes('overtime:approve') ||
                         userPermissions.includes('hr:approve');

      if (!canApprove) {
        return res.status(403).json({
          success: false,
          message: 'คุณไม่มีสิทธิ์ในการดูรายการรออนุมัติ'
        });
      }

      let filter = {
        approvalStatus: 'pending',
        deleted_at: null
      };

      if (branchId) filter.branch = branchId;

      const pendingOvertimes = await Overtime.find(filter)
        .populate('employee', 'employeeId name email position department')
        .populate('user', 'username email')
        .populate('branch', 'name branch_code')
        .populate('requestedBy', 'username email')
        .sort({ requestedAt: 1 }); // Oldest first

      res.json({
        success: true,
        data: pendingOvertimes,
        message: 'Pending overtime approvals retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching pending overtime approvals:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลรายการรออนุมัติ',
        error: error.message
      });
    }
  },

  // Create overtime request
  createOvertimeRequest: [
    ...validateOvertime,
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({
            success: false,
            message: 'ข้อมูลไม่ถูกต้อง',
            errors: errors.array()
          });
        }

        const overtimeData = req.body;
        const requestedBy = req.user.userId;

        // Find employee record
        let employee;
        if (overtimeData.employee) {
          employee = await Employee.findOne({ _id: overtimeData.employee, deleted_at: null });
        } else {
          // Find employee by user ID
          employee = await Employee.findOne({ userId: requestedBy, deleted_at: null });
        }

        if (!employee) {
          return res.status(400).json({
            success: false,
            message: 'ไม่พบข้อมูลพนักงาน'
          });
        }

        // Validate branch
        const branch = await Zone.findOne({ _id: overtimeData.branch, deleted_at: null });
        if (!branch) {
          return res.status(400).json({
            success: false,
            message: 'ไม่พบสาขาที่ระบุ'
          });
        }

        // Validate time range
        const startTime = new Date(`2000-01-01 ${overtimeData.startTime}`);
        const endTime = new Date(`2000-01-01 ${overtimeData.endTime}`);

        if (endTime <= startTime) {
          return res.status(400).json({
            success: false,
            message: 'เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น'
          });
        }

        // Calculate planned hours if not provided
        const plannedHours = overtimeData.plannedHours ||
          Math.max(0, (endTime - startTime) / (1000 * 60 * 60));

        // Check for overlapping overtime requests
        const requestDate = new Date(overtimeData.date);
        const startOfDay = new Date(requestDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(requestDate);
        endOfDay.setHours(23, 59, 59, 999);

        const overlappingOT = await Overtime.findOne({
          employee: employee._id,
          date: { $gte: startOfDay, $lte: endOfDay },
          approvalStatus: { $in: ['pending', 'approved'] },
          deleted_at: null
        });

        if (overlappingOT) {
          return res.status(400).json({
            success: false,
            message: 'มีคำขอ OT ในวันนี้แล้ว'
          });
        }

        // Check branch OT settings
        if (branch.settings && !branch.settings.allowOvertimeRequests) {
          return res.status(400).json({
            success: false,
            message: 'สาขานี้ไม่อนุญาตให้ขอ OT'
          });
        }

        // Check max OT hours per day
        if (branch.settings && branch.settings.maxOvertimeHoursPerDay) {
          if (plannedHours > branch.settings.maxOvertimeHoursPerDay) {
            return res.status(400).json({
              success: false,
              message: `ชั่วโมง OT เกินกำหนดสูงสุด ${branch.settings.maxOvertimeHoursPerDay} ชั่วโมงต่อวัน`
            });
          }
        }

        const newOvertime = new Overtime({
          employee: employee._id,
          user: employee.userId || requestedBy,
          branch: overtimeData.branch,
          date: new Date(overtimeData.date),
          startTime: overtimeData.startTime,
          endTime: overtimeData.endTime,
          plannedHours,
          reason: overtimeData.reason,
          description: overtimeData.description || '',
          workDetails: overtimeData.workDetails || '',
          overtimeType: overtimeData.overtimeType || 'regular',
          priority: overtimeData.priority || 'normal',
          payRate: overtimeData.payRate || 1.5,
          requestedBy,
          location: overtimeData.location || {}
        });

        await newOvertime.save();

        const populatedOvertime = await Overtime.findById(newOvertime._id)
          .populate('employee', 'employeeId name email')
          .populate('branch', 'name branch_code')
          .populate('requestedBy', 'username email');

        // Emit socket event for real-time notification
        const io = req.app.get('io');
        if (io) {
          io.emit('overtimeRequestCreated', {
            overtime: populatedOvertime,
            message: `${employee.name} ขอ OT วันที่ ${overtimeData.date}`
          });
        }

        res.status(201).json({
          success: true,
          data: populatedOvertime,
          message: 'สร้างคำขอ OT สำเร็จ'
        });
      } catch (error) {
        console.error('Error creating overtime request:', error);
        res.status(500).json({
          success: false,
          message: 'เกิดข้อผิดพลาดในการสร้างคำขอ OT',
          error: error.message
        });
      }
    }
  ],

  // Approve overtime request
  approveOvertime: async (req, res) => {
    try {
      const { id } = req.params;
      const { approvalNote } = req.body;

      // Check permissions
      const userRole = req.user.role;
      const userPermissions = req.user.permissions || [];
      const canApprove = ['admin', 'superadmin', 'Super Admin', 'HR', 'hr'].includes(userRole) ||
                         userPermissions.includes('overtime:approve') ||
                         userPermissions.includes('hr:approve');

      if (!canApprove) {
        return res.status(403).json({
          success: false,
          message: 'คุณไม่มีสิทธิ์ในการอนุมัติคำขอ OT'
        });
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'รหัสคำขอ OT ไม่ถูกต้อง'
        });
      }

      const overtime = await Overtime.findOne({ _id: id, deleted_at: null })
        .populate('employee', 'name email')
        .populate('requestedBy', 'username email');

      if (!overtime) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบคำขอ OT'
        });
      }

      if (overtime.approvalStatus !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'คำขอ OT นี้ไม่สามารถอนุมัติได้'
        });
      }

      await overtime.approve(req.user.userId, approvalNote);

      // Emit socket event
      const io = req.app.get('io');
      if (io) {
        io.emit('overtimeApproved', {
          overtimeId: id,
          employeeId: overtime.employee._id,
          message: `คำขอ OT ของ ${overtime.employee.name} ได้รับการอนุมัติแล้ว`
        });
      }

      const updatedOvertime = await Overtime.findById(id)
        .populate('employee', 'employeeId name email')
        .populate('approvedBy', 'username email');

      res.json({
        success: true,
        data: updatedOvertime,
        message: 'อนุมัติคำขอ OT สำเร็จ'
      });
    } catch (error) {
      console.error('Error approving overtime:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการอนุมัติคำขอ OT',
        error: error.message
      });
    }
  },

  // Reject overtime request
  rejectOvertime: async (req, res) => {
    try {
      const { id } = req.params;
      const { approvalNote } = req.body;

      // Check permissions
      const userRole = req.user.role;
      const userPermissions = req.user.permissions || [];
      const canApprove = ['admin', 'superadmin', 'Super Admin', 'HR', 'hr'].includes(userRole) ||
                         userPermissions.includes('overtime:approve') ||
                         userPermissions.includes('hr:approve');

      if (!canApprove) {
        return res.status(403).json({
          success: false,
          message: 'คุณไม่มีสิทธิ์ในการปฏิเสธคำขอ OT'
        });
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'รหัสคำขอ OT ไม่ถูกต้อง'
        });
      }

      const overtime = await Overtime.findOne({ _id: id, deleted_at: null })
        .populate('employee', 'name email')
        .populate('requestedBy', 'username email');

      if (!overtime) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบคำขอ OT'
        });
      }

      if (overtime.approvalStatus !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'คำขอ OT นี้ไม่สามารถปฏิเสธได้'
        });
      }

      await overtime.reject(req.user.userId, approvalNote);

      // Emit socket event
      const io = req.app.get('io');
      if (io) {
        io.emit('overtimeRejected', {
          overtimeId: id,
          employeeId: overtime.employee._id,
          message: `คำขอ OT ของ ${overtime.employee.name} ถูกปฏิเสธ`
        });
      }

      const updatedOvertime = await Overtime.findById(id)
        .populate('employee', 'employeeId name email')
        .populate('rejectedBy', 'username email');

      res.json({
        success: true,
        data: updatedOvertime,
        message: 'ปฏิเสธคำขอ OT สำเร็จ'
      });
    } catch (error) {
      console.error('Error rejecting overtime:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการปฏิเสธคำขอ OT',
        error: error.message
      });
    }
  },

  // Start overtime work
  startOvertimeWork: async (req, res) => {
    try {
      const { id } = req.params;
      const { location } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'รหัสคำขอ OT ไม่ถูกต้อง'
        });
      }

      const overtime = await Overtime.findOne({ _id: id, deleted_at: null });

      if (!overtime) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบคำขอ OT'
        });
      }

      // Check permissions - only the employee or admin can start
      const isOwner = overtime.user.equals(req.user.userId) || overtime.requestedBy.equals(req.user.userId);
      const isAdmin = ['admin', 'superadmin', 'Super Admin', 'HR', 'hr'].includes(req.user.role);

      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'คุณไม่มีสิทธิ์เริ่มงาน OT นี้'
        });
      }

      if (overtime.approvalStatus !== 'approved') {
        return res.status(400).json({
          success: false,
          message: 'คำขอ OT ต้องได้รับการอนุมัติก่อน'
        });
      }

      if (overtime.actualStartTime) {
        return res.status(400).json({
          success: false,
          message: 'เริ่มงาน OT แล้ว'
        });
      }

      await overtime.startWork(location);

      // Emit socket event
      const io = req.app.get('io');
      if (io) {
        io.emit('overtimeStarted', {
          overtimeId: id,
          message: 'เริ่มงาน OT แล้ว'
        });
      }

      const updatedOvertime = await Overtime.findById(id)
        .populate('employee', 'employeeId name email');

      res.json({
        success: true,
        data: updatedOvertime,
        message: 'เริ่มงาน OT สำเร็จ'
      });
    } catch (error) {
      console.error('Error starting overtime work:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการเริ่มงาน OT',
        error: error.message
      });
    }
  },

  // End overtime work
  endOvertimeWork: async (req, res) => {
    try {
      const { id } = req.params;
      const { location } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'รหัสคำขอ OT ไม่ถูกต้อง'
        });
      }

      const overtime = await Overtime.findOne({ _id: id, deleted_at: null });

      if (!overtime) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบคำขอ OT'
        });
      }

      // Check permissions
      const isOwner = overtime.user.equals(req.user.userId) || overtime.requestedBy.equals(req.user.userId);
      const isAdmin = ['admin', 'superadmin', 'Super Admin', 'HR', 'hr'].includes(req.user.role);

      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'คุณไม่มีสิทธิ์จบงาน OT นี้'
        });
      }

      if (!overtime.actualStartTime) {
        return res.status(400).json({
          success: false,
          message: 'ต้องเริ่มงาน OT ก่อน'
        });
      }

      if (overtime.actualEndTime) {
        return res.status(400).json({
          success: false,
          message: 'จบงาน OT แล้ว'
        });
      }

      await overtime.endWork(location);

      // Emit socket event
      const io = req.app.get('io');
      if (io) {
        io.emit('overtimeCompleted', {
          overtimeId: id,
          actualHours: overtime.actualHours,
          message: 'จบงาน OT แล้ว'
        });
      }

      const updatedOvertime = await Overtime.findById(id)
        .populate('employee', 'employeeId name email');

      res.json({
        success: true,
        data: updatedOvertime,
        message: 'จบงาน OT สำเร็จ'
      });
    } catch (error) {
      console.error('Error ending overtime work:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการจบงาน OT',
        error: error.message
      });
    }
  },

  // Get my overtime history
  getMyOvertimeHistory: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { status, startDate, endDate, page = 1, limit = 50 } = req.query;

      // Find employee
      const employee = await Employee.findOne({ userId: userId, deleted_at: null });
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบข้อมูลพนักงาน'
        });
      }

      let filter = {
        employee: employee._id,
        deleted_at: null
      };

      if (status) filter.approvalStatus = status;
      if (startDate || endDate) {
        filter.date = {};
        if (startDate) filter.date.$gte = new Date(startDate);
        if (endDate) filter.date.$lte = new Date(endDate);
      }

      const skip = (page - 1) * limit;

      const overtimes = await Overtime.find(filter)
        .populate('branch', 'name branch_code')
        .populate('approvedBy', 'username email')
        .populate('rejectedBy', 'username email')
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Overtime.countDocuments(filter);

      res.json({
        success: true,
        data: overtimes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        message: 'Overtime history retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching overtime history:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงประวัติ OT',
        error: error.message
      });
    }
  },

  // Update overtime request (before approval)
  updateOvertimeRequest: async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'รหัสคำขอ OT ไม่ถูกต้อง'
        });
      }

      const overtime = await Overtime.findOne({ _id: id, deleted_at: null });

      if (!overtime) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบคำขอ OT'
        });
      }

      // Check permissions
      const isOwner = overtime.requestedBy.equals(req.user.userId);
      const isAdmin = ['admin', 'superadmin', 'Super Admin', 'HR', 'hr'].includes(req.user.role);

      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'คุณไม่มีสิทธิ์แก้ไขคำขอ OT นี้'
        });
      }

      if (overtime.approvalStatus !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'ไม่สามารถแก้ไขคำขอ OT ที่ไม่ใช่สถานะรออนุมัติได้'
        });
      }

      // Validate time if being updated
      if (updateData.startTime && updateData.endTime) {
        const startTime = new Date(`2000-01-01 ${updateData.startTime}`);
        const endTime = new Date(`2000-01-01 ${updateData.endTime}`);

        if (endTime <= startTime) {
          return res.status(400).json({
            success: false,
            message: 'เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น'
          });
        }

        // Recalculate planned hours
        updateData.plannedHours = Math.max(0, (endTime - startTime) / (1000 * 60 * 60));
      }

      const updatedOvertime = await Overtime.findByIdAndUpdate(
        id,
        { ...updateData, updatedAt: new Date() },
        { new: true, runValidators: true }
      ).populate('employee', 'employeeId name email')
       .populate('branch', 'name branch_code');

      res.json({
        success: true,
        data: updatedOvertime,
        message: 'อัปเดตคำขอ OT สำเร็จ'
      });
    } catch (error) {
      console.error('Error updating overtime request:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการอัปเดตคำขอ OT',
        error: error.message
      });
    }
  },

  // Delete overtime request
  deleteOvertimeRequest: async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'รหัสคำขอ OT ไม่ถูกต้อง'
        });
      }

      const overtime = await Overtime.findOne({ _id: id, deleted_at: null });

      if (!overtime) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบคำขอ OT'
        });
      }

      // Check permissions
      const isOwner = overtime.requestedBy.equals(req.user.userId);
      const isAdmin = ['admin', 'superadmin', 'Super Admin', 'HR', 'hr'].includes(req.user.role);

      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'คุณไม่มีสิทธิ์ลบคำขอ OT นี้'
        });
      }

      if (overtime.approvalStatus === 'approved' && overtime.actualStartTime) {
        return res.status(400).json({
          success: false,
          message: 'ไม่สามารถลบคำขอ OT ที่เริ่มงานแล้วได้'
        });
      }

      await overtime.softDelete();

      res.json({
        success: true,
        message: 'ลบคำขอ OT สำเร็จ'
      });
    } catch (error) {
      console.error('Error deleting overtime request:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการลบคำขอ OT',
        error: error.message
      });
    }
  }
};

module.exports = overtimeController;