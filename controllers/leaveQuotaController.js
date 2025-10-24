// controllers/leaveQuotaController.js
const LeaveQuota = require('../models/HR/leaveQuotaModel');

exports.createLeaveQuota = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { leaveType, label, totalDays } = req.body;

    // Validate required fields
    if (!leaveType || !label || totalDays == null) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Create new quota
    const newQuota = await LeaveQuota.create({ leaveType, label, totalDays });

    // Emit event
    io.emit('leavequotaCreated', {
      id: newQuota._id,
      data: newQuota
    });

    return res.status(201).json({ success: true, data: newQuota });
  } catch (err) {
    if (err.code === 11000) {
      // Handle unique constraint error
      return res.status(400).json({ success: false, error: 'Leave type already exists' });
    }
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.create = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { leaveType, label, totalDays } = req.body;
    const quota = new LeaveQuota({ leaveType, label, totalDays });
    await quota.save();

    // Emit event
    io.emit('quotaCreated', {
      id: quota._id,
      data: quota
    });

    return res.status(201).json({ success: true, data: quota });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const quotas = await LeaveQuota.find().limit(100).lean();
    return res.json({ success: true, data: quotas });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.update = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { leaveType, label, totalDays } = req.body;
    const quota = await LeaveQuota.findByIdAndUpdate(
      req.params.id,
      { leaveType, label, totalDays },
      { new: true, runValidators: true }
    );

    // Emit event
    io.emit('leavequotaUpdated', {
      id: quota._id,
      data: quota
    });

    if (!quota) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    return res.json({ success: true, data: quota });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
};

exports.remove = async (req, res) => {
  const io = req.app.get('io');
  try {
    const quota = await LeaveQuota.findByIdAndDelete(req.params.id);

    // Emit event
    io.emit('leavequotaDeleted', {
      id: quota._id,
      data: quota
    });

    if (!quota) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
