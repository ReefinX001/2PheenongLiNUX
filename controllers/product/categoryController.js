// backend/controllers/categoryController.js
const Category = require('../models/HR/Category');

exports.getAll = async (req, res) => {
  const io = req.app.get('io');
  const cats = await Category.find().limit(100).lean().sort('name');
  res.json({ success: true, data: cats });
};

exports.getById = async (req, res) => {
  const io = req.app.get('io');
  const cat = await Category.findById(req.params.id).lean();
  if(!cat) return res.status(404).json({ success:false, message:'Not found' });
  res.json({ success:true, data: cat });
};

exports.create = async (req, res) => {
  const io = req.app.get('io');
  const cat = new Category(req.body);
  await cat.save();

  io.emit('catCreated', {
    id: cat.save()._id,
    data: cat.save()
  });

  res.status(201).json({ success:true, data: cat });
};

exports.update = async (req, res) => {
  const io = req.app.get('io');
  const cat = await Category.findByIdAndUpdate(req.params.id, req.body, { new:true });
  io.emit('categoryUpdated', {
    id: cat?._id,
    data: cat
  });
  if(!cat) return res.status(404).json({ success:false });
  res.json({ success:true, data: cat });
};

exports.remove = async (req, res) => {
  const io = req.app.get('io');
  const cat = await Category.findByIdAndDelete(req.params.id);
  io.emit('categoryDeleted', {
    id: cat?._id,
    data: cat
  });
  if(!cat) return res.status(404).json({ success:false });
  res.json({ success:true, message:'Deleted' });
};
