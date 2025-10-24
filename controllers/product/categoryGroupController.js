// controllers/categoryGroupController.js
// controllers/categoryController.js
const CategoryGroup = require('../models/Stock/CategoryGroup');

exports.createCategoryGroup = async (req, res) => {
  const io = req.app.get('io');
  try {
    // body: { name: "มือถือ" }
    const cg = new CategoryGroup({ name: req.body.name });
    await cg.save();

    io.emit('cgCreated', {
      id: cg.save()._id,
      data: cg.save()
    });

    res.json({ success: true, data: cg });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.getAllCategoryGroups = async (req, res) => {
  const io = req.app.get('io');
  try {
    const groups = await CategoryGroup.find().limit(100).lean().sort({ createdAt: -1 });
    res.json({ success: true, data: groups });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.updateCategoryGroup = async (req, res) => {
  const io = req.app.get('io');
  try {
    // body: { name: "หูฟัง" }
    const cg = await CategoryGroup.findByIdAndUpdate(req.params.id, { name: req.body.name }, { new: true });
    io.emit('categorygroupUpdated', {
      id: cg._id,
      data: cg
    });
    if (!cg) {
      return res.status(404).json({ success: false, error: 'Category Group not found' });
    }
    res.json({ success: true, data: cg });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.deleteCategoryGroup = async (req, res) => {
  const io = req.app.get('io');
  try {
    const cg = await CategoryGroup.findByIdAndDelete(req.params.id);
    io.emit('categorygroupDeleted', {
      id: cg._id,
      data: cg
    });
    if (!cg) {
      return res.status(404).json({ success: false, error: 'Category Group not found' });
    }
    res.json({ success: true, message: 'Deleted category group' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.getAllCategoryGroups = async (req, res) => {
  const io = req.app.get('io');
  try {
    const groups = await CategoryGroup.find({}, '_id name').limit(100).lean();
    return res.json({ success: true, data: groups });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
