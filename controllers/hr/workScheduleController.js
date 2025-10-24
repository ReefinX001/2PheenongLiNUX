// controllers/hr/workScheduleController.js
const WorkSchedule = require('../../models/HR/WorkSchedule');
const Employee = require('../../models/HR/Employee');
const Zone = require('../../models/HR/zoneModel');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');

// Validation rules for work schedule
const validateWorkSchedule = [
  body('name').notEmpty().withMessage('ชื่อตารางเวลาไม่สามารถว่างได้').trim(),
  body('branchId').notEmpty().withMessage('กรุณาระบุสาขา'),
  body('scheduleType').isIn(['regular', 'shift', 'flexible', 'remote']).withMessage('ประเภทตารางเวลาไม่ถูกต้อง'),
  body('workDays').isArray({ min: 1 }).withMessage('กรุณาระบุวันทำงานอย่างน้อย 1 วัน'),
  body('workDays.*.day').isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']).withMessage('วันทำงานไม่ถูกต้อง'),
  body('workDays.*.startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('เวลาเริ่มงานไม่ถูกต้อง'),
  body('workDays.*.endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('เวลาเลิกงานไม่ถูกต้อง'),
  body('startDate').isISO8601().withMessage('วันที่เริ่มต้นไม่ถูกต้อง'),
  body('maxOvertimeHours').optional().isNumeric().isFloat({ min: 0, max: 12 }).withMessage('ชั่วโมง OT สูงสุดต้องอยู่ระหว่าง 0-12'),
];

const workScheduleController = {
  // Get all work schedules
  getAllWorkSchedules: async (req, res) => {
    try {
      const { branchId, employeeId, status, isTemplate, page = 1, limit = 50 } = req.query;

      let filter = { deleted_at: null };

      if (branchId) filter.branchId = branchId;
      if (employeeId) filter.employeeId = employeeId;
      if (status) filter.status = status;
      if (isTemplate !== undefined) filter.isTemplate = isTemplate === 'true';

      const skip = (page - 1) * limit;

      const workSchedules = await WorkSchedule.find(filter)
        .populate('employeeId', 'employeeId name email position')
        .populate('userId', 'username email')
        .populate('createdBy', 'username email')
        .populate('approvedBy', 'username email')
        .sort({ isTemplate: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await WorkSchedule.countDocuments(filter);

      res.json({
        success: true,
        data: workSchedules,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        message: 'Work schedules retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching work schedules:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลตารางเวลาทำงาน',
        error: error.message
      });
    }
  },

  // Get work schedule by ID
  getWorkScheduleById: async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'รหัสตารางเวลาไม่ถูกต้อง'
        });
      }

      const workSchedule = await WorkSchedule.findOne({ _id: id, deleted_at: null })
        .populate('employeeId', 'employeeId name email position department')
        .populate('userId', 'username email')
        .populate('createdBy', 'username email')
        .populate('approvedBy', 'username email');

      if (!workSchedule) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบตารางเวลาทำงาน'
        });
      }

      res.json({
        success: true,
        data: workSchedule,
        message: 'Work schedule retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching work schedule:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลตารางเวลาทำงาน',
        error: error.message
      });
    }
  },

  // Get work schedule templates
  getWorkScheduleTemplates: async (req, res) => {
    try {
      const { branchId } = req.query;

      let filter = {
        isTemplate: true,
        deleted_at: null,
        status: 'active'
      };

      if (branchId) filter.branchId = branchId;

      const templates = await WorkSchedule.find(filter)
        .populate('createdBy', 'username email')
        .sort({ templateName: 1, createdAt: -1 });

      res.json({
        success: true,
        data: templates,
        message: 'Work schedule templates retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching work schedule templates:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลเทมเพลต',
        error: error.message
      });
    }
  },

  // Get active schedule for user (Enhanced to support both userId and employeeId)
  getUserActiveSchedule: async (req, res) => {
    try {
      const { userId } = req.params;
      const { branchId } = req.query;

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        console.log('Invalid user ID format:', userId);
        return res.status(400).json({
          success: false,
          message: 'รหัสผู้ใช้ไม่ถูกต้อง - รูปแบบ ObjectId ไม่ถูกต้อง',
          data: null,
          error: process.env.NODE_ENV === 'development' ? `Invalid ObjectId: ${userId}` : undefined
        });
      }

      console.log(`🔍 Looking for schedule - userId: ${userId}, branchId: ${branchId}`);

      // Step 1: Try to find Employee record with this userId or _id
      let employeeRecord = null;
      try {
        employeeRecord = await Employee.findOne({
          $or: [
            { userId: userId },
            { _id: userId }
          ],
          deleted_at: null
        });

        if (employeeRecord) {
          console.log(`✅ Found employee: ${employeeRecord.name} (employeeId: ${employeeRecord._id})`);
        } else {
          console.log(`⚠️ No employee found with userId or _id: ${userId}`);
        }
      } catch (error) {
        console.warn(`⚠️ Error finding employee: ${error.message}`);
      }

      // Step 2: Build search filter for WorkSchedule
      let filter = {
        $and: [
          { status: 'active' },
          { deleted_at: null },
          { startDate: { $lte: new Date() } },
          {
            $or: [
              { endDate: null },
              { endDate: { $gte: new Date() } }
            ]
          }
        ]
      };

      // Step 3: Add user/employee matching to filter (Enhanced)
      const userMatchConditions = [
        { userId: userId },  // Direct userId match
        { employeeId: userId }  // Try userId as employeeId (common case)
      ];

      if (employeeRecord) {
        // If we found an employee, also search by its actual employeeId
        userMatchConditions.push({ employeeId: employeeRecord._id });
        console.log(`🔍 Added employee record search: ${employeeRecord._id}`);
      }

      console.log(`🔍 Search conditions: userId=${userId}, employeeId=${userId}${employeeRecord ? `, actualEmployeeId=${employeeRecord._id}` : ''}`);

      filter.$and.unshift({ $or: userMatchConditions });

      // Enhanced branchId filtering - allow flexible matching
      if (branchId) {
        // Try exact match first, then flexible match
        filter.$and.push({
          $or: [
            { branchId: branchId },                    // Exact branch match
            { branchId: { $regex: branchId, $options: 'i' } }  // Case-insensitive partial match
          ]
        });
        console.log(`🔍 Added branchId filter: ${branchId}`);
      }

      console.log(`🔍 Search filter:`, JSON.stringify(filter, null, 2));

      const schedule = await WorkSchedule.findOne(filter)
        .populate('employeeId', 'employeeId name')
        .populate('userId', 'username name')
        .sort({ startDate: -1 });

      if (!schedule) {
        // Enhanced debugging for no schedule found
        console.log('❌ No active work schedule found. Debug info:', {
          userId,
          branchId,
          employeeFound: !!employeeRecord,
          employeeName: employeeRecord?.name,
          employeeId: employeeRecord?._id,
          queryDate: new Date().toISOString(),
          searchConditions: userMatchConditions
        });

        // Try to find any schedule for this user (ignore date/status) for debugging
        const anySchedule = await WorkSchedule.findOne({
          $or: userMatchConditions
        }).populate('employeeId', 'employeeId name');

        if (anySchedule) {
          console.log(`📋 Found inactive/expired schedule: ${anySchedule._id} (status: ${anySchedule.status}, startDate: ${anySchedule.startDate}, endDate: ${anySchedule.endDate})`);
        } else {
          console.log(`📋 No schedule found at all for this user`);
        }

        return res.status(404).json({
          success: false,
          message: 'ไม่พบตารางเวลาทำงานที่ใช้งานอยู่สำหรับผู้ใช้นี้',
          data: null,
          debug: process.env.NODE_ENV === 'development' ? {
            userId,
            branchId,
            employeeFound: !!employeeRecord,
            employeeName: employeeRecord?.name,
            employeeId: employeeRecord?._id,
            searchCriteria: 'Active schedule for current date range',
            anyScheduleFound: !!anySchedule,
            anyScheduleId: anySchedule?._id,
            anyScheduleStatus: anySchedule?.status
          } : undefined
        });
      }

      console.log(`✅ Found active schedule: ${schedule._id} for employee: ${schedule.employeeId?.name}`);

      res.json({
        success: true,
        data: schedule,
        message: 'Active work schedule retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching active work schedule:', {
        userId: req.params.userId,
        branchId: req.query.branchId,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });

      // Handle different types of errors
      let statusCode = 500;
      let errorMessage = 'เกิดข้อผิดพลาดในการดึงข้อมูลตารางเวลาทำงาน';

      if (error.name === 'CastError') {
        statusCode = 400;
        errorMessage = 'รหัสผู้ใช้หรือสาขาไม่ถูกต้อง';
      } else if (error.name === 'ValidationError') {
        statusCode = 400;
        errorMessage = 'ข้อมูลที่ส่งมาไม่ถูกต้อง';
      }

      res.status(statusCode).json({
        success: false,
        message: errorMessage,
        data: null,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Create new work schedule
  createWorkSchedule: [
    ...validateWorkSchedule,
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

        const scheduleData = req.body;
        const createdBy = req.user.userId;

        // Validate branch exists
        if (scheduleData.branchId) {
          const branch = await Zone.findOne({ _id: scheduleData.branchId, deleted_at: null });
          if (!branch) {
            return res.status(400).json({
              success: false,
              message: 'ไม่พบสาขาที่ระบุ'
            });
          }
        }

        // Validate employee exists if specified
        if (scheduleData.employeeId) {
          const employee = await Employee.findOne({ _id: scheduleData.employeeId, deleted_at: null });
          if (!employee) {
            return res.status(400).json({
              success: false,
              message: 'ไม่พบพนักงานที่ระบุ'
            });
          }
          scheduleData.userId = employee.userId;
        }

        // Validate work days times
        for (const workDay of scheduleData.workDays) {
          const startTime = new Date(`2000-01-01 ${workDay.startTime}`);
          const endTime = new Date(`2000-01-01 ${workDay.endTime}`);

          if (endTime <= startTime) {
            return res.status(400).json({
              success: false,
              message: `เวลาเลิกงานต้องมากกว่าเวลาเริ่มงานสำหรับวัน ${workDay.day}`
            });
          }
        }

        // Check for overlapping schedules for the same employee
        if (scheduleData.employeeId && !scheduleData.isTemplate) {
          const overlappingSchedule = await WorkSchedule.findOne({
            employeeId: scheduleData.employeeId,
            status: 'active',
            deleted_at: null,
            startDate: { $lte: new Date(scheduleData.endDate || '2099-12-31') },
            $or: [
              { endDate: null },
              { endDate: { $gte: new Date(scheduleData.startDate) } }
            ]
          });

          if (overlappingSchedule) {
            return res.status(400).json({
              success: false,
              message: 'พนักงานคนนี้มีตารางเวลาทำงานที่ทับซ้อนกันอยู่แล้ว'
            });
          }
        }

        const newSchedule = new WorkSchedule({
          ...scheduleData,
          createdBy
        });

        await newSchedule.save();

        const populatedSchedule = await WorkSchedule.findById(newSchedule._id)
          .populate('employeeId', 'employeeId name email')
          .populate('createdBy', 'username email');

        res.status(201).json({
          success: true,
          data: populatedSchedule,
          message: 'สร้างตารางเวลาทำงานสำเร็จ'
        });
      } catch (error) {
        console.error('Error creating work schedule:', error);
        res.status(500).json({
          success: false,
          message: 'เกิดข้อผิดพลาดในการสร้างตารางเวลาทำงาน',
          error: error.message
        });
      }
    }
  ],

  // Update work schedule
  updateWorkSchedule: [
    ...validateWorkSchedule,
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

        const { id } = req.params;
        const updateData = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: 'รหัสตารางเวลาไม่ถูกต้อง'
          });
        }

        const existingSchedule = await WorkSchedule.findOne({ _id: id, deleted_at: null });
        if (!existingSchedule) {
          return res.status(404).json({
            success: false,
            message: 'ไม่พบตารางเวลาทำงาน'
          });
        }

        // Check permissions
        const userRole = req.user.role;
        const canEdit = ['admin', 'superadmin', 'Super Admin', 'HR', 'hr'].includes(userRole) ||
                        req.user.permissions?.includes('workschedule:edit') ||
                        existingSchedule.createdBy.equals(req.user.userId);

        if (!canEdit) {
          return res.status(403).json({
            success: false,
            message: 'คุณไม่มีสิทธิ์แก้ไขตารางเวลาทำงานนี้'
          });
        }

        // Validate work days times
        if (updateData.workDays) {
          for (const workDay of updateData.workDays) {
            const startTime = new Date(`2000-01-01 ${workDay.startTime}`);
            const endTime = new Date(`2000-01-01 ${workDay.endTime}`);

            if (endTime <= startTime) {
              return res.status(400).json({
                success: false,
                message: `เวลาเลิกงานต้องมากกว่าเวลาเริ่มงานสำหรับวัน ${workDay.day}`
              });
            }
          }
        }

        // Check for overlapping schedules if changing employee or dates
        if ((updateData.employeeId || updateData.startDate || updateData.endDate) && !updateData.isTemplate) {
          const employeeId = updateData.employeeId || existingSchedule.employeeId;
          const startDate = updateData.startDate || existingSchedule.startDate;
          const endDate = updateData.endDate || existingSchedule.endDate;

          const overlappingSchedule = await WorkSchedule.findOne({
            _id: { $ne: id },
            employeeId: employeeId,
            status: 'active',
            deleted_at: null,
            startDate: { $lte: new Date(endDate || '2099-12-31') },
            $or: [
              { endDate: null },
              { endDate: { $gte: new Date(startDate) } }
            ]
          });

          if (overlappingSchedule) {
            return res.status(400).json({
              success: false,
              message: 'พนักงานคนนี้มีตารางเวลาทำงานที่ทับซ้อนกันอยู่แล้ว'
            });
          }
        }

        const updatedSchedule = await WorkSchedule.findByIdAndUpdate(
          id,
          { ...updateData, updatedAt: new Date() },
          { new: true, runValidators: true }
        ).populate('employeeId', 'employeeId name email')
         .populate('createdBy', 'username email')
         .populate('approvedBy', 'username email');

        res.json({
          success: true,
          data: updatedSchedule,
          message: 'อัปเดตตารางเวลาทำงานสำเร็จ'
        });
      } catch (error) {
        console.error('Error updating work schedule:', error);
        res.status(500).json({
          success: false,
          message: 'เกิดข้อผิดพลาดในการอัปเดตตารางเวลาทำงาน',
          error: error.message
        });
      }
    }
  ],

  // Delete work schedule (soft delete)
  deleteWorkSchedule: async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'รหัสตารางเวลาไม่ถูกต้อง'
        });
      }

      const schedule = await WorkSchedule.findOne({ _id: id, deleted_at: null });
      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบตารางเวลาทำงาน'
        });
      }

      // Check permissions
      const userRole = req.user.role;
      const canDelete = ['admin', 'superadmin', 'Super Admin', 'HR', 'hr'].includes(userRole) ||
                        req.user.permissions?.includes('workschedule:delete') ||
                        schedule.createdBy.equals(req.user.userId);

      if (!canDelete) {
        return res.status(403).json({
          success: false,
          message: 'คุณไม่มีสิทธิ์ลบตารางเวลาทำงานนี้'
        });
      }

      await schedule.softDelete();

      res.json({
        success: true,
        message: 'ลบตารางเวลาทำงานสำเร็จ'
      });
    } catch (error) {
      console.error('Error deleting work schedule:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการลบตารางเวลาทำงาน',
        error: error.message
      });
    }
  },

  // Clone schedule from template
  cloneFromTemplate: async (req, res) => {
    try {
      const { templateId } = req.params;
      const { employeeId, startDate, endDate, branchId } = req.body;

      if (!mongoose.Types.ObjectId.isValid(templateId)) {
        return res.status(400).json({
          success: false,
          message: 'รหัสเทมเพลตไม่ถูกต้อง'
        });
      }

      const template = await WorkSchedule.findOne({
        _id: templateId,
        isTemplate: true,
        deleted_at: null
      });

      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบเทมเพลตที่ระบุ'
        });
      }

      // Validate employee
      const employee = await Employee.findOne({ _id: employeeId, deleted_at: null });
      if (!employee) {
        return res.status(400).json({
          success: false,
          message: 'ไม่พบพนักงานที่ระบุ'
        });
      }

      // Check for overlapping schedules
      const overlappingSchedule = await WorkSchedule.findOne({
        employeeId: employeeId,
        status: 'active',
        deleted_at: null,
        startDate: { $lte: new Date(endDate || '2099-12-31') },
        $or: [
          { endDate: null },
          { endDate: { $gte: new Date(startDate) } }
        ]
      });

      if (overlappingSchedule) {
        return res.status(400).json({
          success: false,
          message: 'พนักงานคนนี้มีตารางเวลาทำงานที่ทับซ้อนกันอยู่แล้ว'
        });
      }

      const newSchedule = new WorkSchedule({
        employeeId,
        userId: employee.userId,
        branchId: branchId || template.branchId,
        scheduleType: template.scheduleType,
        name: `${template.name} - ${employee.name}`,
        description: template.description,
        workDays: template.workDays,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        status: 'active',
        isTemplate: false,
        overtimeAllowed: template.overtimeAllowed,
        maxOvertimeHours: template.maxOvertimeHours,
        createdBy: req.user.userId
      });

      await newSchedule.save();

      const populatedSchedule = await WorkSchedule.findById(newSchedule._id)
        .populate('employeeId', 'employeeId name email')
        .populate('createdBy', 'username email');

      res.status(201).json({
        success: true,
        data: populatedSchedule,
        message: 'สร้างตารางเวลาจากเทมเพลตสำเร็จ'
      });
    } catch (error) {
      console.error('Error cloning work schedule from template:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการสร้างตารางเวลาจากเทมเพลต',
        error: error.message
      });
    }
  }
};

module.exports = workScheduleController;