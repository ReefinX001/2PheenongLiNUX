const LeavePolicy = require('../../models/HR/LeavePolicy');
const mongoose = require('mongoose');

const leavePolicyController = {
  // GET /api/hr/leave-policy - ดึงนโยบายการลาปัจจุบัน
  getCurrentPolicy: async (req, res) => {
    try {
      console.log('🔍 Loading current leave policy');

      const { year } = req.query;
      const targetYear = year ? parseInt(year) : new Date().getFullYear();

      let policy = await LeavePolicy.getCurrentPolicy(targetYear);

      // If no policy found, create default policy
      if (!policy) {
        console.log('📝 No active policy found, creating default policy');

        // Get user ID from token or use admin
        const createdBy = req.user?._id || req.user?.userId || 'admin';

        policy = await LeavePolicy.createDefault(targetYear, createdBy);
        console.log('✅ Default policy created:', policy._id);
      }

      res.json({
        success: true,
        data: policy,
        summary: policy.getSummary(),
        message: 'Current leave policy retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching leave policy:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลนโยบายการลา',
        error: error.message
      });
    }
  },

  // GET /api/hr/leave-policy/history - ดึงประวัตินโยบายการลา
  getPolicyHistory: async (req, res) => {
    try {
      console.log('🔍 Loading leave policy history');

      const { year, limit = 10 } = req.query;

      let query = {};
      if (year) query.year = parseInt(year);

      const policies = await LeavePolicy.find(query)
        .populate('createdBy', 'username employee.name')
        .populate('updatedBy', 'username employee.name')
        .sort({ year: -1, createdAt: -1 })
        .limit(parseInt(limit));

      res.json({
        success: true,
        data: policies,
        total: policies.length,
        message: 'Leave policy history retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching leave policy history:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงประวัตินโยบายการลา',
        error: error.message
      });
    }
  },

  // POST /api/hr/leave-policy - สร้างนโยบายใหม่
  createPolicy: async (req, res) => {
    try {
      console.log('🔍 Creating new leave policy');

      const { name, year, policy, rules, notes, effectiveDate, expiryDate } = req.body;
      const createdBy = req.user?._id || req.user?.userId;

      if (!name || !year || !policy) {
        return res.status(400).json({
          success: false,
          message: 'กรุณาระบุชื่อนโยบาย ปี และรายละเอียดนโยบาย'
        });
      }

      const targetYear = parseInt(year);

      // ตรวจสอบว่ามีนโยบายที่ใช้งานอยู่สำหรับปีนี้แล้วหรือไม่
      const existingActivePolicy = await LeavePolicy.findOne({
        year: targetYear,
        isActive: true
      });

      if (existingActivePolicy) {
        // แทนที่จะ error ให้ปิดการใช้งานนโยบายเก่าและสร้างใหม่
        console.log(`📝 Deactivating existing policy for year ${targetYear}:`, existingActivePolicy._id);
        existingActivePolicy.isActive = false;
        existingActivePolicy.updatedBy = createdBy;
        await existingActivePolicy.save();
        console.log(`✅ Existing policy deactivated`);
      }

      // สร้างนโยบายใหม่
      const newPolicy = new LeavePolicy({
        name: name || `นโยบายการลาปี ${targetYear}`,
        year: targetYear,
        policy: {
          annual: {
            days: policy?.annual?.days || 6,
            description: policy?.annual?.description || 'ลาพักร้อน'
          },
          sick: {
            days: policy?.sick?.days || 30,
            description: policy?.sick?.description || 'ลาป่วย'
          },
          personal: {
            days: policy?.personal?.days || 3,
            description: policy?.personal?.description || 'ลากิจ'
          },
          special: {
            days: policy?.special?.days || 5,
            description: policy?.special?.description || 'ลาพิเศษ'
          },
          maternity: {
            days: policy?.maternity?.days || 98,
            description: policy?.maternity?.description || 'ลาคลอด'
          },
          paternity: {
            days: policy?.paternity?.days || 15,
            description: policy?.paternity?.description || 'ลาบิดา'
          }
        },
        rules: rules || {
          carryForward: { enabled: true, maxDays: 5, types: ['annual'] },
          advanceLeave: { enabled: false, maxDays: 5 },
          minimumNotice: { enabled: true, days: 1, excludeTypes: ['sick'] }
        },
        effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
        expiryDate: expiryDate ? new Date(expiryDate) : (() => {
          const nextYear = new Date();
          nextYear.setFullYear(nextYear.getFullYear() + 1);
          nextYear.setMonth(11, 31);
          return nextYear;
        })(),
        notes,
        createdBy,
        updatedBy: createdBy
      });

      const saved = await newPolicy.save();
      const populated = await LeavePolicy.findById(saved._id)
        .populate('createdBy', 'username employee.name')
        .populate('updatedBy', 'username employee.name');

      console.log('✅ Policy created successfully:', populated._id);

      res.status(201).json({
        success: true,
        data: {
          ...populated.toObject(),
          replacedExisting: !!existingActivePolicy
        },
        message: existingActivePolicy ?
          'สร้างนโยบายการลาใหม่เรียบร้อย (แทนที่นโยบายเดิม)' :
          'สร้างนโยบายการลาเรียบร้อยแล้ว'
      });
    } catch (error) {
      console.error('Error creating leave policy:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการสร้างนโยบายการลา',
        error: error.message
      });
    }
  },

  // PUT /api/hr/leave-policy/:id - อัปเดตนโยบาย
  updatePolicy: async (req, res) => {
    try {
      const { id } = req.params;
      console.log('🔍 Updating leave policy:', id);

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'รหัสนโยบายไม่ถูกต้อง'
        });
      }

      const { name, policy, rules, notes, isActive, effectiveDate, expiryDate } = req.body;
      const updatedBy = req.user?._id || req.user?.userId;

      const existingPolicy = await LeavePolicy.findById(id);
      if (!existingPolicy) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบนโยบายการลาที่ต้องการแก้ไข'
        });
      }

      // อัปเดตข้อมูล
      if (name !== undefined) existingPolicy.name = name;
      if (isActive !== undefined) existingPolicy.isActive = isActive;
      if (effectiveDate !== undefined) existingPolicy.effectiveDate = new Date(effectiveDate);
      if (expiryDate !== undefined) existingPolicy.expiryDate = new Date(expiryDate);
      if (notes !== undefined) existingPolicy.notes = notes;

      if (policy) {
        Object.keys(policy).forEach(type => {
          if (existingPolicy.policy[type]) {
            if (policy[type].days !== undefined) {
              existingPolicy.policy[type].days = policy[type].days;
            }
            if (policy[type].description !== undefined) {
              existingPolicy.policy[type].description = policy[type].description;
            }
          }
        });
        existingPolicy.markModified('policy');
      }

      if (rules) {
        existingPolicy.rules = { ...existingPolicy.rules, ...rules };
        existingPolicy.markModified('rules');
      }

      existingPolicy.updatedBy = updatedBy;

      const updated = await existingPolicy.save();
      const populated = await LeavePolicy.findById(updated._id)
        .populate('createdBy', 'username employee.name')
        .populate('updatedBy', 'username employee.name');

      console.log('✅ Policy updated successfully:', populated._id);

      res.json({
        success: true,
        data: populated,
        message: 'อัปเดตนโยบายการลาเรียบร้อยแล้ว'
      });
    } catch (error) {
      console.error('Error updating leave policy:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการอัปเดตนโยบายการลา',
        error: error.message
      });
    }
  },

  // DELETE /api/hr/leave-policy/:id - ลบนโยบาย (soft delete)
  deletePolicy: async (req, res) => {
    try {
      const { id } = req.params;
      console.log('🔍 Deleting leave policy:', id);

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'รหัสนโยบายไม่ถูกต้อง'
        });
      }

      const policy = await LeavePolicy.findById(id);
      if (!policy) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบนโยบายการลาที่ต้องการลบ'
        });
      }

      // ตรวจสอบว่าเป็นนโยบายที่ใช้งานอยู่หรือไม่
      if (policy.isActive) {
        return res.status(400).json({
          success: false,
          message: 'ไม่สามารถลบนโยบายที่ใช้งานอยู่ได้ กรุณาปิดการใช้งานก่อน'
        });
      }

      await LeavePolicy.findByIdAndDelete(id);

      console.log('✅ Policy deleted successfully:', id);

      res.json({
        success: true,
        message: 'ลบนโยบายการลาเรียบร้อยแล้ว'
      });
    } catch (error) {
      console.error('Error deleting leave policy:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการลบนโยบายการลา',
        error: error.message
      });
    }
  },

  // GET /api/hr/leave-policy/stats - ดึงสถิติการใช้นโยบาย
  getPolicyStats: async (req, res) => {
    try {
      console.log('🔍 Loading leave policy statistics');

      const { year } = req.query;
      const targetYear = year ? parseInt(year) : new Date().getFullYear();

      // Get current active policy
      const currentPolicy = await LeavePolicy.getCurrentPolicy(targetYear);

      if (!currentPolicy) {
        return res.status(404).json({
          success: false,
          message: `ไม่พบนโยบายการลาสำหรับปี ${targetYear}`
        });
      }

      // Calculate real stats from database
      const totalPolicies = await LeavePolicy.countDocuments();
      const activePolicies = await LeavePolicy.countDocuments({ isActive: true });

      // Get real employee data
      const Employee = require('../../models/HR/Employee');
      const totalEmployees = await Employee.countDocuments({ deleted_at: null });

      // Get real leave request data
      const Leave = require('../../models/HR/Leave');
      const totalLeaveRequests = await Leave.countDocuments({
        createdAt: {
          $gte: new Date(targetYear, 0, 1),
          $lte: new Date(targetYear, 11, 31)
        }
      });

      const pendingRequests = await Leave.countDocuments({
        status: 'pending',
        createdAt: {
          $gte: new Date(targetYear, 0, 1),
          $lte: new Date(targetYear, 11, 31)
        }
      });

      const approvedRequests = await Leave.countDocuments({
        status: 'approved',
        createdAt: {
          $gte: new Date(targetYear, 0, 1),
          $lte: new Date(targetYear, 11, 31)
        }
      });

      const rejectedRequests = await Leave.countDocuments({
        status: 'rejected',
        createdAt: {
          $gte: new Date(targetYear, 0, 1),
          $lte: new Date(targetYear, 11, 31)
        }
      });

      // Calculate usage statistics from actual leave requests
      const leaveUsageByType = await Leave.aggregate([
        {
          $match: {
            status: 'approved',
            createdAt: {
              $gte: new Date(targetYear, 0, 1),
              $lte: new Date(targetYear, 11, 31)
            }
          }
        },
        {
          $group: {
            _id: '$leaveType',
            totalDays: { $sum: '$totalDays' },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { totalDays: -1 }
        }
      ]);

      const mostUsedLeaveType = leaveUsageByType.length > 0 ? leaveUsageByType[0]._id : null;
      const totalLeaveDaysUsed = leaveUsageByType.reduce((sum, type) => sum + type.totalDays, 0);
      const averageLeaveDaysUsed = totalEmployees > 0 ? (totalLeaveDaysUsed / totalEmployees) : 0;

      const stats = {
        currentPolicy: {
          _id: currentPolicy._id,
          name: currentPolicy.name,
          year: currentPolicy.year,
          totalDays: currentPolicy.totalDays
        },
        policies: {
          total: totalPolicies,
          active: activePolicies,
          inactive: totalPolicies - activePolicies
        },
        employees: {
          total: totalEmployees,
          withLeaveRequests: await Leave.distinct('userId', {
            createdAt: {
              $gte: new Date(targetYear, 0, 1),
              $lte: new Date(targetYear, 11, 31)
            }
          }).then(users => users.length),
          withoutLeaveRequests: Math.max(0, totalEmployees - await Leave.distinct('userId', {
            createdAt: {
              $gte: new Date(targetYear, 0, 1),
              $lte: new Date(targetYear, 11, 31)
            }
          }).then(users => users.length))
        },
        usage: {
          mostUsedLeaveType,
          averageLeaveDaysUsed: Math.round(averageLeaveDaysUsed * 100) / 100,
          totalLeaveDaysUsed,
          leaveUsageByType,
          utilizationRate: currentPolicy.totalDays > 0 ?
            Math.round((averageLeaveDaysUsed / currentPolicy.totalDays) * 10000) / 100 : 0
        },
        requests: {
          total: totalLeaveRequests,
          pending: pendingRequests,
          approved: approvedRequests,
          rejected: rejectedRequests,
          approvalRate: totalLeaveRequests > 0 ?
            Math.round((approvedRequests / totalLeaveRequests) * 10000) / 100 : 0
        }
      };

      res.json({
        success: true,
        data: stats,
        message: 'Leave policy statistics retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching leave policy stats:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงสถิติ',
        error: error.message
      });
    }
  },

  // GET /api/hr/leave-policies - ดึงนโยบายทั้งหมด (รวมประวัติ)
  getAllPolicies: async (req, res) => {
    try {
      console.log('🔍 Loading all leave policies');

      const { year, active } = req.query;

      let query = {};
      if (year) query.year = parseInt(year);
      if (active !== undefined) query.isActive = active === 'true';

      const policies = await LeavePolicy.find(query)
        .populate('createdBy', 'username employee.name')
        .populate('updatedBy', 'username employee.name')
        .sort({ year: -1, createdAt: -1 });

      res.json({
        success: true,
        data: policies,
        total: policies.length,
        message: 'All leave policies retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching all leave policies:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลนโยบาย',
        error: error.message
      });
    }
  },

  // POST /api/hr/leave-policy/activate/:id - เปิดใช้งานนโยบาย
  activatePolicy: async (req, res) => {
    try {
      const { id } = req.params;
      console.log('🔍 Activating leave policy:', id);

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'รหัสนโยบายไม่ถูกต้อง'
        });
      }

      const updatedBy = req.user?._id || req.user?.userId;

      const policy = await LeavePolicy.findById(id);
      if (!policy) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบนโยบายการลาที่ต้องการเปิดใช้งาน'
        });
      }

      // ปิดการใช้งานนโยบายอื่นในปีเดียวกัน
      await LeavePolicy.updateMany(
        { year: policy.year, _id: { $ne: id } },
        { isActive: false, updatedBy }
      );

      // เปิดใช้งานนโยบายนี้
      policy.isActive = true;
      policy.updatedBy = updatedBy;
      await policy.save();

      const populated = await LeavePolicy.findById(policy._id)
        .populate('createdBy', 'username employee.name')
        .populate('updatedBy', 'username employee.name');

      console.log('✅ Policy activated successfully:', populated._id);

      res.json({
        success: true,
        data: populated,
        message: 'เปิดใช้งานนโยบายการลาเรียบร้อยแล้ว'
      });
    } catch (error) {
      console.error('Error activating leave policy:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการเปิดใช้งานนโยบาย',
        error: error.message
      });
    }
  },

  // POST /api/hr/leave-policy/duplicate/:id - ทำสำเนานโยบาย
  duplicatePolicy: async (req, res) => {
    try {
      const { id } = req.params;
      const { targetYear, newName } = req.body;

      console.log('🔍 Duplicating leave policy:', id, 'for year:', targetYear);

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'รหัสนโยบายไม่ถูกต้อง'
        });
      }

      if (!targetYear) {
        return res.status(400).json({
          success: false,
          message: 'กรุณาระบุปีสำหรับนโยบายใหม่'
        });
      }

      const createdBy = req.user?._id || req.user?.userId;
      const year = parseInt(targetYear);

      // ดึงนโยบายต้นฉบับ
      const sourcePolicy = await LeavePolicy.findById(id);
      if (!sourcePolicy) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบนโยบายการลาต้นฉบับ'
        });
      }

      // ตรวจสอบว่ามีนโยบายสำหรับปีใหม่แล้วหรือไม่
      const existingPolicy = await LeavePolicy.findOne({ year, isActive: true });
      if (existingPolicy) {
        return res.status(400).json({
          success: false,
          message: `มีนโยบายการลาที่ใช้งานอยู่สำหรับปี ${year} แล้ว`
        });
      }

      // สร้างสำเนานโยบาย
      const duplicatedPolicy = new LeavePolicy({
        name: newName || `${sourcePolicy.name} (คัดลอกสำหรับปี ${year})`,
        year,
        policy: sourcePolicy.policy,
        rules: sourcePolicy.rules,
        effectiveDate: new Date(year, 0, 1), // 1 มกราคม
        expiryDate: new Date(year, 11, 31), // 31 ธันวาคม
        notes: `คัดลอกจาก: ${sourcePolicy.name} (${sourcePolicy.year})`,
        createdBy,
        updatedBy: createdBy,
        isActive: false // เริ่มต้นเป็นไม่ใช้งาน ให้ HR เปิดเอง
      });

      const saved = await duplicatedPolicy.save();
      const populated = await LeavePolicy.findById(saved._id)
        .populate('createdBy', 'username employee.name')
        .populate('updatedBy', 'username employee.name');

      console.log('✅ Policy duplicated successfully:', populated._id);

      res.status(201).json({
        success: true,
        data: populated,
        message: `คัดลอกนโยบายการลาสำหรับปี ${year} เรียบร้อยแล้ว`
      });
    } catch (error) {
      console.error('Error duplicating leave policy:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการทำสำเนานโยบาย',
        error: error.message
      });
    }
  }
};

module.exports = leavePolicyController;