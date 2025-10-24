// controllers/branchController.js

const Branch = require('../models/Account/Branch');

/**
 * POST /api/branch
 * สร้าง Branch ใหม่
 */
exports.createBranch = async (req, res) => {
  const io = req.app.get('io');
  try {
    const {
      branch_code,
      name,
      phone,
      email,
      address,
      manager_id,
      operating_hours,
      status
    } = req.body;

    if (!branch_code || !name) {
      return res.status(400).json({ error: 'branch_code and name are required.' });
    }

    // สร้าง Branch
    const newBranch = new Branch({
      branch_code,
      name,
      phone: phone || '',
      email: email || '',
      address: address || '',
      manager_id: manager_id || null,
      operating_hours: operating_hours || '',
      status: status || 'active',
      deleted_at: null
    });

    await newBranch.save();

    io.emit('newbranchCreated', {
      id: newBranch._id,
      data: newBranch
    });




    return res.json({ success: true, data: newBranch });
  } catch (err) {
    console.error('createBranch error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/branch
 * ดึง Branch ทั้งหมด (ที่ยังไม่ถูกลบ)
 */
exports.getAllBranches = async (req, res) => {
  const io = req.app.get('io');
  try {
    // เงื่อนไข: deleted_at = null => ไม่แสดงสาขาที่ลบไปแล้ว (soft delete)
    const branches = await Branch.find({ deleted_at: null }).limit(100).lean()
      .populate('manager_id', 'username') // populate manager ถ้าต้องการ
      .sort({ createdAt: -1 });

    return res.json({ success: true, data: branches });
  } catch (err) {
    console.error('getAllBranches error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/branch/:id
 * ดึง Branch ตาม _id (ที่ยังไม่ลบ)
 */
exports.getBranchById = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    // หา branch ที่ deleted_at == null
    const branch = await Branch.findOne({ _id: id, deleted_at: null }).lean()
      .populate('manager_id', 'username');
    if (!branch) {
      return res.status(404).json({ error: 'Branch not found or deleted' });
    }
    return res.json({ success: true, data: branch });
  } catch (err) {
    console.error('getBranchById error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * PATCH /api/branch/:id
 * อัปเดตข้อมูลสาขา
 */
exports.updateBranch = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const {
      branch_code,
      name,
      phone,
      email,
      address,
      manager_id,
      operating_hours,
      status
    } = req.body;

    // ดึงเป็น Mongoose Document แทน lean() เพื่อให้สามารถ .save() ได้
    const branch = await Branch.findOne({ _id: id, deleted_at: null });
    if (!branch) {
      return res.status(404).json({ error: 'Branch not found or deleted' });
    }

    // อัปเดตเฉพาะฟิลด์ที่ส่งมา
    if (branch_code !== undefined) branch.branch_code = branch_code;
    if (name !== undefined) branch.name = name;
    if (phone !== undefined) branch.phone = phone;
    if (email !== undefined) branch.email = email;
    if (address !== undefined) branch.address = address;
    if (manager_id !== undefined) branch.manager_id = manager_id;
    if (operating_hours !== undefined) branch.operating_hours = operating_hours;
    if (status !== undefined) branch.status = status;

    await branch.save();

    io.emit('branchUpdated', {
      id: branch._id,
      data: branch
    });


    return res.json({ success: true, data: branch });
  } catch (err) {
    console.error('updateBranch error:', err);
    // Duplicate key error (e.g., branch_code unique)
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Branch code already exists' });
    }
    // Invalid ObjectId or cast errors
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid branch ID' });
    }
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * DELETE /api/branch/:id
 * Soft Delete Branch (ตั้ง deleted_at = now)
 */
exports.deleteBranch = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    // ดึงเป็น Mongoose Document เพื่อให้ใช้ softDelete() ได้
    const branch = await Branch.findOne({ _id: id, deleted_at: null });
    if (!branch) {
      return res.status(404).json({ error: 'Branch not found or already deleted' });
    }

    // เรียกฟังก์ชัน softDelete() ที่ประกาศใน Schema
    await branch.softDelete();
    return res.json({ success: true, data: branch });
  } catch (err) {
    console.error('deleteBranch error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * (Optional) DELETE /api/branch/:id/force
 * ลบออกจาก DB จริง ๆ
 */
exports.forceDeleteBranch = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    // ดึงเป็น Mongoose Document เพื่อให้ใช้ remove() ได้
    const branch = await Branch.findById(id);
    if (!branch) {
      return res.status(404).json({ error: 'Branch not found' });
    }

    await branch.remove();
    return res.json({ success: true, data: branch });
  } catch (err) {
    console.error('forceDeleteBranch error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
