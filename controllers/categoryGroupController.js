// controllers/categoryGroupController.js
const CategoryGroup = require('../models/Stock/CategoryGroup');

exports.getAllCategoryGroups = async (req, res) => {
  try {
    const categoryGroups = await CategoryGroup.find().lean();
    res.json({ success: true, data: categoryGroups });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getCategoryGroupById = async (req, res) => {
  try {
    const categoryGroup = await CategoryGroup.findById(req.params.id).lean();
    if (!categoryGroup) {
      return res.status(404).json({ success: false, error: 'Category group not found' });
    }
    res.json({ success: true, data: categoryGroup });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.createCategoryGroup = async (req, res) => {
  const io = req.app.get('io');
  try {
    const cg = new CategoryGroup({ name: req.body.name });
    await cg.save();

    io.emit('cgCreated', {
      id: cg._id,
      data: cg
    });

    res.json({ success: true, data: cg });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.getAllCategoryGroups = async (req, res) => {
  const io = req.app.get('io');
  try {
    // Get single category group by ID
    exports.getCategoryGroupById = async (req, res) => {
      try {
        const cg = await CategoryGroup.findById(req.params.id).lean();
        if (!cg) {
          return res.status(404).json({ success: false, error: 'Category Group not found' });
        }
        return res.json({ success: true, data: cg });
      } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
    };
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
