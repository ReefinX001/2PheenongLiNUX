// controllers/userRoleController.js
const UserRole = require('../models/User/UserRole');
const mongoose = require('mongoose');

/**
 * Helper function: Sync ข้อมูลผู้ใช้งานที่ใช้บทบาทที่ถูกอัปเดต
 */
async function syncUsersWithUpdatedRole(roleId, updatedRole, io) {
  try {
    const User = require('../models/User/User');

    // ดึงผู้ใช้งานทั้งหมดที่ใช้บทบาทนี้
    const usersWithRole = await User.find({
      role: roleId,
      deleted_at: null
    })
    .populate('employee', 'name email imageUrl position department')
    .populate('role', 'name allowedPages permissions')
    .populate('allowedBranches', 'name branch_code')
    .populate('defaultBranches', 'name branch_code')
    .select('-password -currentSession.token')
    .lean();

    console.log(`🔄 Syncing ${usersWithRole.length} users with updated role: ${updatedRole.name}`);

    // ส่ง event ไปยังผู้ใช้งานแต่ละคนที่ใช้บทบาทนี้
    if (io && usersWithRole.length > 0) {
      usersWithRole.forEach(user => {
        // ส่ง event เฉพาะเจาะจงไปยังผู้ใช้งานแต่ละคน
        io.emit('userRoleUpdated', {
          userId: user._id,
          username: user.username,
          updatedRole: {
            _id: updatedRole._id,
            name: updatedRole.name,
            description: updatedRole.description,
            allowedPages: updatedRole.allowedPages,
            permissions: updatedRole.permissions
          },
          timestamp: new Date()
        });
      });

      // ส่ง event รวมสำหรับ admin/HR
      io.emit('roleUsersUpdated', {
        roleId: roleId,
        roleName: updatedRole.name,
        affectedUsers: usersWithRole.map(u => ({
          userId: u._id,
          username: u.username,
          employeeName: u.employee?.name || u.username
        })),
        timestamp: new Date()
      });
    }

    return {
      success: true,
      affectedUsers: usersWithRole.length,
      users: usersWithRole.map(u => ({
        userId: u._id,
        username: u.username,
        employeeName: u.employee?.name || u.username
      }))
    };

  } catch (error) {
    console.error('Error in syncUsersWithUpdatedRole:', error);
    throw error;
  }
}

/**
 * POST /api/user-role
 * สร้าง Role ใหม่ พร้อมกำหนด allowedPages และ allowedBranches
 */
exports.createRole = async (req, res) => {
  try {
    const {
      name,
      description = '',
      allowedPages = [],
      allowedBranches = [],
      permissions = []
    } = req.body;

    // ตรวจสอบว่าชื่อ role ซ้ำหรือไม่
    const existingRole = await UserRole.findOne({
      name: name,
      deleted_at: null
    });

    if (existingRole) {
      return res.status(400).json({
        success: false,
        error: 'ชื่อบทบาทนี้มีอยู่แล้ว กรุณาใช้ชื่ออื่น'
      });
    }

    // สร้าง role ใหม่
    const newRole = new UserRole({
      name: name.trim(),
      description: description.trim(),
      allowedPages,
      allowedBranches,
      permissions
    });

    await newRole.save();

    // ส่ง event ผ่าน Socket.IO (ถ้ามี)
    const io = req.app.get('io');
    if (io) {
      io.emit('roleCreated', {
        id: newRole._id,
        data: newRole
      });
    }

    return res.status(201).json({
      success: true,
      data: newRole,
      message: `สร้างบทบาท "${name}" สำเร็จ`
    });

  } catch (err) {
    console.error('createRole error:', err);
    return res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์',
      details: err.message
    });
  }
};

/**
 * GET /api/user-role
 * ดึงรายการ Role ทั้งหมด (ไม่รวมที่ถูกลบ)
 */
exports.getAllRoles = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 100,
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // สร้าง query สำหรับค้นหา
    const query = { deleted_at: null };

    if (search.trim()) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // สร้าง sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // ดึงข้อมูล roles
    const roles = await UserRole.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    // นับจำนวนทั้งหมด
    const total = await UserRole.countDocuments(query);

    return res.json({
      success: true,
      data: roles,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (err) {
    console.error('getAllRoles error:', err);
    return res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลบทบาท',
      details: err.message
    });
  }
};

/**
 * GET /api/user-role/:id
 * ดึงข้อมูล Role ตาม ID
 */
exports.getRoleById = async (req, res) => {
  try {
    const { id } = req.params;

    // ตรวจสอบรูปแบบ ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'รูปแบบ ID ไม่ถูกต้อง'
      });
    }

    const role = await UserRole.findOne({
      _id: id,
      deleted_at: null
    }).lean();

    if (!role) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบบทบาทที่ระบุ หรือถูกลบแล้ว'
      });
    }

    return res.json({
      success: true,
      data: role
    });

  } catch (err) {
    console.error('getRoleById error:', err);
    return res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลบทบาท',
      details: err.message
    });
  }
};

/**
 * PATCH /api/user-role/:id
 * อัปเดตข้อมูล Role
 */
exports.updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      allowedPages,
      allowedBranches,
      permissions
    } = req.body;

    // ตรวจสอบรูปแบบ ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'รูปแบบ ID ไม่ถูกต้อง'
      });
    }

    // หา role ที่ต้องการอัปเดต (ไม่ใช้ lean เพื่อให้ save ได้)
    const role = await UserRole.findOne({
      _id: id,
      deleted_at: null
    });

    if (!role) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบบทบาทที่ระบุ หรือถูกลบแล้ว'
      });
    }

    // ตรวจสอบชื่อซ้ำ (ถ้ามีการเปลี่ยนชื่อ)
    if (name && name.trim() !== role.name) {
      const existingRole = await UserRole.findOne({
        name: name.trim(),
        deleted_at: null,
        _id: { $ne: id }
      });

      if (existingRole) {
        return res.status(400).json({
          success: false,
          error: 'ชื่อบทบาทนี้มีอยู่แล้ว กรุณาใช้ชื่ออื่น'
        });
      }
      role.name = name.trim();
    }

    // อัปเดตข้อมูลอื่นๆ
    if (description !== undefined) role.description = description.trim();
    if (allowedPages !== undefined) role.allowedPages = allowedPages;
    if (allowedBranches !== undefined) role.allowedBranches = allowedBranches;
    if (permissions !== undefined) role.permissions = permissions;

    // บันทึกการเปลี่ยนแปลง
    await role.save();

    // ส่ง event ผ่าน Socket.IO (ถ้ามี)
    const io = req.app.get('io');
    if (io) {
      io.emit('roleUpdated', {
        id: role._id,
        data: role
      });
    }

    // 🔄 Sync ข้อมูลผู้ใช้งานที่ใช้บทบาทนี้
    try {
      await syncUsersWithUpdatedRole(role._id, role, io);
    } catch (syncError) {
      console.error('Error syncing users with updated role:', syncError);
      // ไม่ return error เพราะ role update สำเร็จแล้ว
    }

    return res.json({
      success: true,
      data: role,
      message: `อัปเดตบทบาท "${role.name}" สำเร็จ`
    });

  } catch (err) {
    console.error('updateRole error:', err);
    return res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการอัปเดตบทบาท',
      details: err.message
    });
  }
};

/**
 * DELETE /api/user-role/:id
 * ลบ Role (Soft Delete)
 */
exports.deleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    // ตรวจสอบรูปแบบ ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'รูปแบบ ID ไม่ถูกต้อง'
      });
    }

    // หา role ที่ต้องการลบ
    const role = await UserRole.findOne({
      _id: id,
      deleted_at: null
    });

    if (!role) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบบทบาทที่ระบุ หรือถูกลบแล้ว'
      });
    }

    // ตรวจสอบว่า role นี้ถูกใช้งานอยู่หรือไม่
    const User = require('../models/User/User'); // ต้อง import User model
    const usersUsingRole = await User.countDocuments({
      role: id,
      deleted_at: null
    });

    if (usersUsingRole > 0) {
      return res.status(400).json({
        success: false,
        error: `ไม่สามารถลบบทบาทนี้ได้ เนื่องจากมีผู้ใช้งาน ${usersUsingRole} คนกำลังใช้บทบาทนี้อยู่`
      });
    }

    // ลบด้วย soft delete
    if (typeof role.softDelete === 'function') {
      await role.softDelete();
    } else {
      role.deleted_at = new Date();
      await role.save();
    }

    // ส่ง event ผ่าน Socket.IO (ถ้ามี)
    const io = req.app.get('io');
    if (io) {
      io.emit('roleDeleted', {
        id: role._id,
        data: role
      });
    }

    return res.json({
      success: true,
      data: role,
      message: `ลบบทบาท "${role.name}" สำเร็จ`
    });

  } catch (err) {
    console.error('deleteRole error:', err);
    return res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการลบบทบาท',
      details: err.message
    });
  }
};

/**
 * GET /api/user-role/stats
 * ดึงสถิติของ Role
 */
exports.getRoleStats = async (req, res) => {
  try {
    const totalRoles = await UserRole.countDocuments({ deleted_at: null });
    const adminRoles = await UserRole.countDocuments({
      deleted_at: null,
      $or: [
        { allowedPages: { $in: ['*'] } },
        { name: { $regex: /(admin|ceo|super)/i } }
      ]
    });
    const deletedRoles = await UserRole.countDocuments({ deleted_at: { $ne: null } });

    return res.json({
      success: true,
      data: {
        total: totalRoles,
        admin: adminRoles,
        deleted: deletedRoles,
        active: totalRoles - deletedRoles
      }
    });

  } catch (err) {
    console.error('getRoleStats error:', err);
    return res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงสถิติบทบาท',
      details: err.message
    });
  }
};

/**
 * POST /api/user-role/seed
 * Seed ข้อมูลบทบาทเริ่มต้น (สำหรับ API call)
 */
exports.seedDefaultRoles = async (req, res) => {
  try {
    const { seedRoles } = require('../seeders/roleSeeder');

    // ตรวจสอบสิทธิ์ (อาจจะต้องเป็น admin เท่านั้น)
    // const user = req.user;
    // if (!user || !user.role || user.role.name !== 'Admin') {
    //   return res.status(403).json({
    //     success: false,
    //     error: 'ไม่มีสิทธิ์ในการ seed ข้อมูล'
    //   });
    // }

    await seedRoles();

    return res.json({
      success: true,
      message: 'Seed ข้อมูลบทบาทเริ่มต้นสำเร็จ'
    });

  } catch (err) {
    console.error('seedDefaultRoles error:', err);
    return res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการ seed ข้อมูล',
      details: err.message
    });
  }
};

/**
 * POST /api/user-role/sync-users
 * Sync ข้อมูลผู้ใช้งานทั้งหมดกับบทบาทใหม่ (สำหรับ force sync)
 */
exports.syncAllUsersWithRoles = async (req, res) => {
  try {
    const User = require('../models/User/User');
    const io = req.app.get('io');

    // ดึงผู้ใช้งานทั้งหมด
    const users = await User.find({ deleted_at: null })
      .populate('role', 'name allowedPages permissions')
      .populate('employee', 'name email')
      .select('-password -currentSession.token')
      .lean();

    const syncResults = [];

    // Sync ผู้ใช้งานแต่ละคน
    for (const user of users) {
      if (user.role) {
        // ส่ง event ไปยังผู้ใช้งาน
        if (io) {
          io.emit('userRoleUpdated', {
            userId: user._id,
            username: user.username,
            updatedRole: {
              _id: user.role._id,
              name: user.role.name,
              allowedPages: user.role.allowedPages,
              permissions: user.role.permissions
            },
            timestamp: new Date()
          });
        }

        syncResults.push({
          userId: user._id,
          username: user.username,
          roleName: user.role.name,
          synced: true
        });
      }
    }

    // ส่ง event รวม
    if (io) {
      io.emit('allUsersSynced', {
        totalUsers: users.length,
        syncedUsers: syncResults.length,
        timestamp: new Date()
      });
    }

    return res.json({
      success: true,
      message: `Sync ข้อมูลผู้ใช้งาน ${syncResults.length} คนสำเร็จ`,
      data: {
        totalUsers: users.length,
        syncedUsers: syncResults.length,
        results: syncResults
      }
    });

  } catch (err) {
    console.error('syncAllUsersWithRoles error:', err);
    return res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการ sync ข้อมูลผู้ใช้งาน',
      details: err.message
    });
  }
};

/**
 * GET /api/user-role/:id/users
 * ดึงรายชื่อผู้ใช้งานที่ใช้บทบาทนี้
 */
exports.getUsersByRole = async (req, res) => {
  try {
    const { id } = req.params;

    // ตรวจสอบรูปแบบ ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'รูปแบบ ID ไม่ถูกต้อง'
      });
    }

    // ตรวจสอบว่า role มีอยู่จริง
    const role = await UserRole.findOne({
      _id: id,
      deleted_at: null
    }).lean();

    if (!role) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบบทบาทที่ระบุ'
      });
    }

    // ดึงผู้ใช้งานที่ใช้บทบาทนี้
    const User = require('../models/User/User');
    const users = await User.find({
      role: id,
      deleted_at: null
    })
    .populate('employee', 'name email imageUrl position department')
    .populate('allowedBranches', 'name branch_code')
    .populate('defaultBranches', 'name branch_code')
    .select('-password -currentSession.token')
    .sort({ createdAt: -1 })
    .lean();

    const usersList = users.map(user => ({
      _id: user._id,
      username: user.username,
      employee: user.employee,
      allowedBranches: user.allowedBranches,
      defaultBranches: user.defaultBranches,
      isOnline: user.isOnline,
      lastSeen: user.lastSeen,
      createdAt: user.createdAt
    }));

    return res.json({
      success: true,
      data: {
        role: {
          _id: role._id,
          name: role.name,
          description: role.description,
          allowedPages: role.allowedPages
        },
        users: usersList,
        totalUsers: usersList.length
      }
    });

  } catch (err) {
    console.error('getUsersByRole error:', err);
    return res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้งาน',
      details: err.message
    });
  }
};
