const Zone = require('../models/HR/zoneModel');

// GET /api/zone
exports.getAll = async (req, res) => {
  const io = req.app.get('io');
  try {
    const zones = await Zone.find().limit(100).lean();
    res.json({ success: true, data: zones });
  } catch (err) {
    console.error('getAll zones error:', err);
    res.status(500).json({ success: false, error: 'ไม่สามารถดึงข้อมูลพื้นที่ได้' });
  }
};

// GET /api/zone/:id
exports.getOne = async (req, res) => {
  const io = req.app.get('io');
  try {
    const zone = await Zone.findById(req.params.id).lean();
    if (!zone) return res.status(404).json({ success: false, error: 'ไม่พบพื้นที่' });
    res.json({ success: true, data: zone });
  } catch (err) {
    console.error('getOne zone error:', err);
    res.status(500).json({ success: false, error: 'Error fetching zone' });
  }
};

// POST /api/zone
exports.create = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { name, center, radius, isActive } = req.body;
    const zone = new Zone({ name, center, radius, isActive });
    const savedZone = await zone.save();
    io.emit('zoneCreated', {
      id: savedZone._id,
      data: savedZone
    });
    res.status(201).json({ success: true, data: savedZone });
  } catch (err) {
    console.error('create zone error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
};

// PATCH /api/zone/:id
exports.update = async (req, res) => {
  const io = req.app.get('io');
  try {
    const updates = (({ name, center, radius, isActive }) => ({ name, center, radius, isActive }))(req.body);
    const zone = await Zone.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );
    io.emit('zoneUpdated', {
      id: zone._id,
      data: zone
    });
    if (!zone) return res.status(404).json({ success: false, error: 'ไม่พบพื้นที่' });
    res.json({ success: true, data: zone });
  } catch (err) {
    console.error('update zone error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
};

// DELETE /api/zone/:id
exports.remove = async (req, res) => {
  const io = req.app.get('io');
  try {
    const zone = await Zone.findByIdAndDelete(req.params.id);
    io.emit('zoneDeleted', {
      id: zone._id,
      data: zone
    });
    if (!zone) return res.status(404).json({ success: false, error: 'ไม่พบพื้นที่' });
    res.json({ success: true, data: zone });
  } catch (err) {
    console.error('delete zone error:', err);
    res.status(500).json({ success: false, error: 'ไม่สามารถลบพื้นที่ได้' });
  }
};
