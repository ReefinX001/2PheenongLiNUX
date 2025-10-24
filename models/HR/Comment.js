// backend/models/Comment.js
const mongoose = require('mongoose');
const commentSchema = new mongoose.Schema({
  newsId:    { type: mongoose.Schema.Types.ObjectId, ref:'News', required: true },
  author:    { type: String, required: true },
  content:   { type: String, required: true },
  approved:  { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Comment', commentSchema);
