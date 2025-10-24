// backend/controllers/analyticsController.js
const News = require('../models/HR/News');

exports.getViews = async (req, res) => {
  const io = req.app.get('io');
  const { groupBy='day', from, to } = req.query;
  // ตัวอย่าง aggregate: แบ่งยอดวิวตามวัน
  const fmt = groupBy === 'month' ? '%Y-%m' : '%Y-%m-%d';
  const match = {};
  if (from) match.createdAt = { $gte: new Date(from) };
  if (to)   match.createdAt = { ...match.createdAt, $lte: new Date(to) };

  const data = await News.aggregate([
    { $match: match },
    { $group: {
        _id: { $dateToString: { format: fmt, date: '$createdAt' } },
        views: { $sum: '$views' }
    }},
    { $sort: { _id: 1 } }
  ]);
  res.json({ success:true, data });
};
