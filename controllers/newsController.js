// backend/controllers/newsController.js
const News = require('../models/HR/News');

// GET /api/news
exports.getAllNews = async (req, res) => {
  const io = req.app.get('io');
  try {
    const news = await News.find().limit(100).lean()
                           .populate('type', 'name slug')    // ดึงชื่อและ slug ของ Category
                           .sort({ createdAt: -1 });
    res.json(news);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching news' });
  }
};

// GET /api/news/:id
exports.getNewsById = async (req, res) => {
  const io = req.app.get('io');
  try {
    const item = await News.findById(req.params.id).lean()
                           .populate('type', 'name slug');
    if (!item) return res.status(404).json({ message: 'News not found' });
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching news item' });
  }
};

// POST /api/news
exports.createNews = async (req, res) => {
  const io = req.app.get('io');
  try {
    const newItem = new News({
      title:       req.body.title,
      description: req.body.description,
      type:        req.body.type,        // ต้องเป็น ObjectId ของ Category
      date:        req.body.date,
      time:        req.body.time,
      endTime:     req.body.endTime,
      location:    req.body.location,
      important:   req.body.important,
      image:       req.body.image
    });
    const saved = await newItem.save();

    io.emit('newitemCreated', {
      id: saved._id,
      data: saved
    });

    io.emit('newitemCreated', {
      id: saved._id,
      data: saved
    });

    io.emit('newitemCreated', {
      id: saved._id,
      data: saved
    });

    // populate หลัง save
    await saved.populate('type', 'name slug');
    res.status(201).json(saved);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Error creating news', error: err.message });
  }
};

// PUT /api/news/:id
exports.updateNews = async (req, res) => {
  const io = req.app.get('io');
  try {
    const updated = await News.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).populate('type', 'name slug');    // populate หลัง update

    io.emit('newsUpdated', {
      id: updated._id,
      data: updated
    });

    io.emit('newsUpdated', {
      id: updated._id,
      data: updated
    });

    io.emit('newsUpdated', {
      id: updated._id,
      data: updated
    });

    if (!updated) return res.status(404).json({ message: 'News not found' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Error updating news', error: err.message });
  }
};

// DELETE /api/news/:id
exports.deleteNews = async (req, res) => {
  const io = req.app.get('io');
  try {
    const deleted = await News.findByIdAndDelete(req.params.id);

    io.emit('newsDeleted', {
      id: deleted._id,
      data: deleted
    });

    io.emit('newsDeleted', {
      id: deleted._id,
      data: deleted
    });

    io.emit('newsDeleted', {
      id: deleted._id,
      data: deleted
    });

    if (!deleted) return res.status(404).json({ message: 'News not found' });
    res.json({ message: 'News deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error deleting news' });
  }
};
