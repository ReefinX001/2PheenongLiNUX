// controllers/eventController.js
const Event = require('../models/HR/eventModel');

exports.getAll = async (req, res) => {
  const io = req.app.get('io');
  try {
    const events = await Event.find().limit(100).lean().sort('date');
    res.json({ success: true, data: events });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'ไม่สามารถดึงข้อมูลเหตุการณ์ได้' });
  }
};

exports.create = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { title, date, type, color } = req.body;
    const ev = new Event({ title, date, type, color });
    const saved = await ev.save();

    // แยก io.emit ออกมา ไม่ใช่ comma ต่อท้าย
    io.emit('evCreated', {
      id: saved._id,
      data: saved
    });

    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.update = async (req, res) => {
  const io = req.app.get('io');
  try {
    // อัปเดต แล้วแยก io.emit ออกมา
    const ev = await Event.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    io.emit('eventUpdated', {
      id: ev._id,
      data: ev
    });

    if (!ev) {
      return res.status(404).json({ success: false, error: 'ไม่พบเหตุการณ์' });
    }
    res.json({ success: true, data: ev });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.remove = async (req, res) => {
  const io = req.app.get('io');
  try {
    // ลบ แล้วแยก io.emit ออกมา
    const ev = await Event.findByIdAndDelete(req.params.id);
    io.emit('eventDeleted', {
      id: ev._id,
      data: ev
    });

    if (!ev) {
      return res.status(404).json({ success: false, error: 'ไม่พบเหตุการณ์' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};
