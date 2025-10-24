// controllers/userRoleController.js
const UserRole = require('../models/User/UserRole');

/**
 * POST /api/user-roles
 * สร้าง Role ใหม่ พร้อมกำหนด allowedPages และ allowedBranches
 */
exports.createRole = async (req, res) => {
  const io = req.app.get('io');
  try {
    const {
      name,
      description = '',
      allowedPages = [],
      allowedBranches = []
    } = req.validatedBody;

    if (await UserRole.findOne({ name, deleted_at: null }).lean()) {
      return res.status(400).json({ success: false, error: 'Role name is already in use' });
    }

    const newRole = new UserRole({
      name,
      description,
      allowedPages,
      allowedBranches,
      deleted_at: null
    });
    await newRole.save();

    io.emit('newroleCreated', {
      id: newRole.save()._id,
      data: newRole.save()
    });



    return res.status(201).json({ success: true, data: newRole });
  } catch (err) {
    console.error('createRole error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

/**
 * GET /api/user-roles
 */
exports.getAllRoles = async (req, res) => {
  const io = req.app.get('io');
  try {
    const roles = await UserRole.find({ deleted_at: null }).limit(100).lean().sort({ createdAt: -1 });
    return res.json({ success: true, data: roles });
  } catch (err) {
    console.error('getAllRoles error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

/**
 * GET /api/user-roles/:id
 */
exports.getRoleById = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const role = await UserRole.findOne({ _id: id, deleted_at: null }).lean();
    if (!role) {
      return res.status(404).json({ success: false, error: 'Role not found or deleted' });
    }
    return res.json({ success: true, data: role });
  } catch (err) {
    console.error('getRoleById error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

/**
 * PATCH /api/user-roles/:id
 * อัปเดตชื่อ, description, allowedPages, allowedBranches
 */
exports.updateRole = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const {
      name,
      description,
      allowedPages,
      allowedBranches
    } = req.validatedBody;

    const role = await UserRole.findOne({ _id: id, deleted_at: null }).lean();
    if (!role) {
      return res.status(404).json({ success: false, error: 'Role not found or deleted' });
    }

    if (name && name !== role.name) {
      if (await UserRole.findOne({ name, deleted_at: null, _id: { $ne: id } }).lean()) {
        return res.status(400).json({ success: false, error: 'Role name is already in use' });
      }
      role.name = name;
    }
    if (description !== undefined) role.description = description;
    if (allowedPages !== undefined) role.allowedPages = allowedPages;
    if (allowedBranches !== undefined) role.allowedBranches = allowedBranches;

    await role.save();

    io.emit('roleCreated', {
      id: role.save()._id,
      data: role.save()
    });





    return res.json({ success: true, data: role });
  } catch (err) {
    console.error('updateRole error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

/**
 * DELETE /api/user-roles/:id
 */
exports.deleteRole = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const role = await UserRole.findOne({ _id: id, deleted_at: null }).lean();
    if (!role) {
      return res.status(404).json({ success: false, error: 'Role not found or already deleted' });
    }

    if (typeof role.softDelete === 'function') {
      await role.softDelete();
    } else {
      role.deleted_at = new Date();
      await role.save();
      io.emit('roleCreated', {
        id: role._id,
        data: role
      });
    }

    return res.json({ success: true, data: role });
  } catch (err) {
    console.error('deleteRole error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

/**
 * PATCH /api/user-roles/:id/pages
 */
exports.updateAllowedPages = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const { page, allow } = req.validatedBody;

    const role = await UserRole.findOne({ _id: id, deleted_at: null }).lean();
    if (!role) {
      return res.status(404).json({ success: false, error: 'Role not found or deleted' });
    }

    const pages = role.allowedPages || [];
    if (allow) {
      if (!pages.includes(page)) pages.push(page);
      role.allowedPages = pages;
    } else {
      role.allowedPages = pages.filter(p => p !== page);
    }

    await role.save();

    io.emit('roleCreated', {
      id: role.save()._id,
      data: role.save()
    });



    return res.json({ success: true, data: role });
  } catch (err) {
    console.error('updateAllowedPages error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

/**
 * PATCH /api/user-roles/:id/branches
 */
exports.updateAllowedBranches = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const { branch, allow } = req.validatedBody;

    const role = await UserRole.findOne({ _id: id, deleted_at: null }).lean();
    if (!role) {
      return res.status(404).json({ success: false, error: 'Role not found or deleted' });
    }

    const list = role.allowedBranches || [];
    if (allow) {
      if (!list.includes(branch)) list.push(branch);
      role.allowedBranches = list;
    } else {
      role.allowedBranches = list.filter(b => b !== branch);
    }

    await role.save();

    io.emit('roleCreated', {
      id: role.save()._id,
      data: role.save()
    });



    return res.json({ success: true, data: role });
  } catch (err) {
    console.error('updateAllowedBranches error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

/**
 * DELETE /api/user-roles/:id/force
 */
exports.forceDeleteRole = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const role = await UserRole.findById(id).lean();
    if (!role) {
      return res.status(404).json({ success: false, error: 'Role not found' });
    }
    await role.remove();
    return res.json({ success: true, data: role });
  } catch (err) {
    console.error('forceDeleteRole error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};
