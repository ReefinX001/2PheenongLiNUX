// controllers/reviewController.js
const Review = require('../models/HR/Review');

exports.getAll = async (req, res) => {
  const io = req.app.get('io');
  try {
    const reviews = await Review.find().limit(100).lean();
    res.json({ success: true, data: reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
