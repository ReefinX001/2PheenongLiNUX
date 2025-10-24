const LeaveAllocation = require('../../models/HR/LeaveAllocation');
const User = require('../../models/User/User');

/**
 * GET /api/hr/leave-allocations
 * ดึงรายการการกำหนดวันลาทั้งหมด
 */
exports.getAllAllocations = async (req, res) => {
  try {
    const { year, search } = req.query;
    const currentYear = year || new Date().getFullYear();

    // สร้างการค้นหา
    let matchCondition = { year: parseInt(currentYear) };

    // ถ้ามีการค้นหา ให้ค้นหาชื่อพนักงาน
    if (search) {
      const users = await User.find({
        $or: [
          { username: new RegExp(search, 'i') },
          { email: new RegExp(search, 'i') },
          { 'employee.name': new RegExp(search, 'i') }
        ]
      }).select('_id');

      matchCondition.user = { $in: users.map(u => u._id) };
    }

    const allocations = await LeaveAllocation.find(matchCondition)
      .populate({
        path: 'user',
        select: 'username email employee',
        populate: {
          path: 'employee',
          select: 'name department photoUrl position'
        }
      })
      .populate('createdBy', 'username employee.name')
      .populate('updatedBy', 'username employee.name')
      .sort('user.employee.name');

    // รวมข้อมูลพนักงานที่ยังไม่ได้กำหนดวันลา
    const allocatedUserIds = allocations.map(a => a.user._id.toString());
    const allUsers = await User.find({
      _id: { $nin: allocatedUserIds },
      employee: { $exists: true }
    }).populate('employee', 'name department photoUrl position');

    const unallocatedUsers = allUsers.map(user => ({
      user,
      year: currentYear,
      allocation: { annual: 0, sick: 0, personal: 0, special: 0 },
      isAllocated: false
    }));

    return res.json({
      success: true,
      data: {
        allocations,
        unallocated: unallocatedUsers,
        stats: {
          totalUsers: allocations.length + unallocatedUsers.length,
          allocatedUsers: allocations.length,
          unallocatedUsers: unallocatedUsers.length,
          year: currentYear
        }
      }
    });
  } catch (error) {
    console.error('getAllAllocations error:', error);
    return res.status(500).json({
      success: false,
      error: 'ไม่สามารถดึงข้อมูลการกำหนดวันลาได้'
    });
  }
};

/**
 * GET /api/hr/leave-allocations/:userId
 * ดึงการกำหนดวันลาของผู้ใช้คนใดคนหนึ่ง
 */
exports.getUserAllocation = async (req, res) => {
  try {
    const { userId } = req.params;
    const { year } = req.query;
    const targetYear = year || new Date().getFullYear();

    const allocation = await LeaveAllocation.findByUserAndYear(userId, targetYear);

    if (!allocation) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบการกำหนดวันลาสำหรับผู้ใช้และปีที่ระบุ'
      });
    }

    return res.json({
      success: true,
      data: allocation
    });
  } catch (error) {
    console.error('getUserAllocation error:', error);
    return res.status(500).json({
      success: false,
      error: 'ไม่สามารถดึงข้อมูลการกำหนดวันลาได้'
    });
  }
};

/**
 * POST /api/hr/leave-allocations
 * สร้างการกำหนดวันลาใหม่
 */
exports.createAllocation = async (req, res) => {
  try {
    const { userId, year, allocation, notes } = req.body;
    const createdBy = req.user._id || req.user.userId;

    // ตรวจสอบว่ามีการกำหนดวันลาสำหรับผู้ใช้และปีนี้แล้วหรือไม่
    const existingAllocation = await LeaveAllocation.findOne({
      user: userId,
      year: year || new Date().getFullYear()
    });

    if (existingAllocation) {
      return res.status(400).json({
        success: false,
        error: 'มีการกำหนดวันลาสำหรับผู้ใช้และปีนี้แล้ว'
      });
    }

    // ตรวจสอบว่าผู้ใช้มีอยู่จริง
    const user = await User.findById(userId).populate('employee');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบผู้ใช้ที่ระบุ'
      });
    }

    const newAllocation = new LeaveAllocation({
      user: userId,
      year: year || new Date().getFullYear(),
      allocation: {
        annual: allocation?.annual || 10,
        sick: allocation?.sick || 30,
        personal: allocation?.personal || 3,
        special: allocation?.special || 5
      },
      notes,
      createdBy,
      updatedBy: createdBy
    });

    const saved = await newAllocation.save();
    const populated = await LeaveAllocation.findById(saved._id)
      .populate({
        path: 'user',
        select: 'username email employee',
        populate: {
          path: 'employee',
          select: 'name department photoUrl position'
        }
      })
      .populate('createdBy', 'username employee.name')
      .populate('updatedBy', 'username employee.name');

    // Real-time notification
    const io = req.app.get('io');
    if (io) {
      io.emit('leave_allocation_created', populated);
    }

    return res.status(201).json({
      success: true,
      data: populated,
      message: 'สร้างการกำหนดวันลาเรียบร้อยแล้ว'
    });
  } catch (error) {
    console.error('createAllocation error:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'มีการกำหนดวันลาสำหรับผู้ใช้และปีนี้แล้ว'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'ไม่สามารถสร้างการกำหนดวันลาได้'
    });
  }
};

/**
 * PUT /api/hr/leave-allocations/:id
 * อัปเดตการกำหนดวันลา
 */
exports.updateAllocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { allocation, notes } = req.body;
    const updatedBy = req.user._id || req.user.userId;

    const existingAllocation = await LeaveAllocation.findById(id);
    if (!existingAllocation) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบการกำหนดวันลาที่ต้องการแก้ไข'
      });
    }

    // อัปเดตข้อมูล
    if (allocation) {
      existingAllocation.allocation = {
        annual: allocation.annual ?? existingAllocation.allocation.annual,
        sick: allocation.sick ?? existingAllocation.allocation.sick,
        personal: allocation.personal ?? existingAllocation.allocation.personal,
        special: allocation.special ?? existingAllocation.allocation.special
      };
    }

    if (notes !== undefined) existingAllocation.notes = notes;
    existingAllocation.updatedBy = updatedBy;

    const updated = await existingAllocation.save();
    const populated = await LeaveAllocation.findById(updated._id)
      .populate({
        path: 'user',
        select: 'username email employee',
        populate: {
          path: 'employee',
          select: 'name department photoUrl position'
        }
      })
      .populate('createdBy', 'username employee.name')
      .populate('updatedBy', 'username employee.name');

    // Real-time notification
    const io = req.app.get('io');
    if (io) {
      io.emit('leave_allocation_updated', populated);
    }

    return res.json({
      success: true,
      data: populated,
      message: 'อัปเดตการกำหนดวันลาเรียบร้อยแล้ว'
    });
  } catch (error) {
    console.error('updateAllocation error:', error);
    return res.status(500).json({
      success: false,
      error: 'ไม่สามารถอัปเดตการกำหนดวันลาได้'
    });
  }
};

/**
 * DELETE /api/hr/leave-allocations/:id
 * ลบการกำหนดวันลา
 */
exports.deleteAllocation = async (req, res) => {
  try {
    const { id } = req.params;

    const allocation = await LeaveAllocation.findById(id);
    if (!allocation) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบการกำหนดวันลาที่ต้องการลบ'
      });
    }

    await LeaveAllocation.findByIdAndDelete(id);

    // Real-time notification
    const io = req.app.get('io');
    if (io) {
      io.emit('leave_allocation_deleted', { id, userId: allocation.user });
    }

    return res.json({
      success: true,
      message: 'ลบการกำหนดวันลาเรียบร้อยแล้ว'
    });
  } catch (error) {
    console.error('deleteAllocation error:', error);
    return res.status(500).json({
      success: false,
      error: 'ไม่สามารถลบการกำหนดวันลาได้'
    });
  }
};

/**
 * POST /api/hr/leave-allocations/bulk
 * สร้างการกำหนดวันลาแบบ bulk สำหรับหลายคน
 */
exports.createBulkAllocations = async (req, res) => {
  try {
    const { userIds, year, allocation, notes } = req.body;
    const createdBy = req.user._id || req.user.userId;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุรายชื่อผู้ใช้'
      });
    }

    const targetYear = year || new Date().getFullYear();
    const defaultAllocation = {
      annual: allocation?.annual || 10,
      sick: allocation?.sick || 30,
      personal: allocation?.personal || 3,
      special: allocation?.special || 5
    };

    const results = [];
    const errors = [];

    for (const userId of userIds) {
      try {
        // ตรวจสอบว่ามีการกำหนดแล้วหรือไม่
        const existing = await LeaveAllocation.findOne({
          user: userId,
          year: targetYear
        });

        if (existing) {
          errors.push({
            userId,
            error: 'มีการกำหนดวันลาแล้ว'
          });
          continue;
        }

        const newAllocation = await LeaveAllocation.create({
          user: userId,
          year: targetYear,
          allocation: defaultAllocation,
          notes,
          createdBy,
          updatedBy: createdBy
        });

        results.push(newAllocation._id);
      } catch (err) {
        errors.push({
          userId,
          error: err.message
        });
      }
    }

    return res.json({
      success: true,
      data: {
        created: results.length,
        errors,
        message: `สร้างการกำหนดวันลาสำเร็จ ${results.length} รายการ`
      }
    });
  } catch (error) {
    console.error('createBulkAllocations error:', error);
    return res.status(500).json({
      success: false,
      error: 'ไม่สามารถสร้างการกำหนดวันลาแบบ bulk ได้'
    });
  }
};