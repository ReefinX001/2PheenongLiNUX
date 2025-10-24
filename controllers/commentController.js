// backend/controllers/commentController.js
const Comment = require('../models/HR/Comment');

exports.getPending = async (req, res) => {
  const io = req.app.get('io');
  const list = await Comment.find({ approved:false }).limit(100).lean().sort('-createdAt');
  res.json({ success:true, data: list });
};

exports.approve = async (req, res) => {
  const io = req.app.get('io');
  const c = await Comment.findByIdAndUpdate(req.params.id, { approved: true }, { new:true });
  io.emit('commentUpdated', {
    id: c._id,
    data: c
  });
  if(!c) return res.status(404).json({ success:false });
  res.json({ success:true, data: c });
};

exports.remove = async (req, res) => {
  const io = req.app.get('io');
  const c = await Comment.findByIdAndDelete(req.params.id);
  io.emit('commentDeleted', {
    id: c._id,
    data: c
  });
  if(!c) return res.status(404).json({ success:false });
  res.json({ success:true, message:'Deleted' });
};
