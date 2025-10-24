// controllers/eventController.js
const path = require('path');

// Try multiple paths for Event model
let Event;
try {
  Event = require('../models/HR/eventModel');
  console.log('✅ Event model loaded from: ../models/HR/eventModel');
} catch (err) {
  console.log('❌ Failed to load from ../models/HR/eventModel:', err.message);
  try {
    Event = require(path.join(__dirname, '../models/HR/eventModel'));
    console.log('✅ Event model loaded from absolute path');
  } catch (err2) {
    console.log('❌ Failed to load from absolute path:', err2.message);
    // Create a mock Event for testing
    const mongoose = require('mongoose');
    const eventSchema = new mongoose.Schema({
      title: { type: String, required: true },
      date: { type: Date, required: true },
      type: { type: String, enum: ['holiday','labor','other','meeting','training','social'], default: 'other' },
      description: { type: String },
      color: { type: String, required: true },
    }, { timestamps: true });

    try {
      Event = mongoose.model('Event');
      console.log('✅ Event model already exists, reusing it');
    } catch (err3) {
      Event = mongoose.model('Event', eventSchema);
      console.log('✅ Created inline Event model as fallback');
    }
  }
}

// Debug Event model
console.log('🔧 Event Model Debug:');
console.log('  - Event exists:', !!Event);
console.log('  - Event type:', typeof Event);
console.log('  - Event constructor:', Event.name);
console.log('  - Event prototype methods:', Object.getOwnPropertyNames(Event.prototype));

exports.getAll = async (req, res) => {
  const io = req.app.get('io');
  try {
    // Get events from database
    const { limit, type, status } = req.query;
    let query = {};

    if (type) query.type = type;

    let events = await Event.find(query).sort({ date: 1 });

    if (limit) {
      events = events.slice(0, parseInt(limit));
    }

    // Return real data from database only
    res.json({
      success: true,
      data: events,
      total: events.length,
      message: events.length > 0 ? 'Events retrieved successfully' : 'No events found'
    });
  } catch (err) {
    console.error('getAll events error:', err);
    res.status(500).json({ success: false, error: 'ไม่สามารถดึงข้อมูลเหตุการณ์ได้' });
  }
};

exports.create = async (req, res) => {
  const io = req.app.get('io');
  try {
    console.log('📝 Creating event with data:', req.body);

    const { title, date, type, description, color } = req.body;

    // Validate required fields
    if (!title || !date || !color) {
      console.log('❌ Validation failed:', { title: !!title, date: !!date, color: !!color });
      return res.status(400).json({
        success: false,
        error: 'กรุณากรอกข้อมูลที่จำเป็น: title, date, color'
      });
    }

    const eventData = {
      title: title.trim(),
      date: new Date(date),
      type: type || 'other',
      description: description || '',
      color
    };

    console.log('✅ Event data prepared:', eventData);
    console.log('🗓️ Date validation:', {
      originalDate: date,
      parsedDate: eventData.date,
      isValid: !isNaN(eventData.date.getTime())
    });

    // Additional validation
    if (isNaN(eventData.date.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'รูปแบบวันที่ไม่ถูกต้อง'
      });
    }

    console.log('🏗️ Creating new Event instance...');
    console.log('  - Event constructor available:', typeof Event);
    console.log('  - EventData to save:', eventData);

    const newEvent = new Event(eventData);
    console.log('✅ Event instance created:', {
      type: typeof newEvent,
      constructor: newEvent.constructor.name,
      hasSaveMethod: typeof newEvent.save
    });

    const saved = await newEvent.save();

    console.log('💾 Event saved successfully:', saved._id);

    // Emit socket event
    if (io) {
      io.emit('eventCreated', {
        id: saved._id,
        data: saved
      });
    }

    res.status(201).json({
      success: true,
      data: saved,
      message: 'เพิ่มเหตุการณ์เรียบร้อยแล้ว'
    });
  } catch (err) {
    console.error('❌ Create event error:', err);
    console.error('❌ Error details:', {
      name: err.name,
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });

    let errorMessage = err.message;
    if (err.name === 'ValidationError') {
      errorMessage = 'ข้อมูลไม่ถูกต้อง: ' + Object.values(err.errors).map(e => e.message).join(', ');
    }

    res.status(400).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? err : undefined
    });
  }
};

exports.update = async (req, res) => {
  const io = req.app.get('io');
  try {
    const eventId = req.params.id;
    const { title, date, type, description, color } = req.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (date !== undefined) updateData.date = date;
    if (type !== undefined) updateData.type = type;
    if (description !== undefined) updateData.description = description;
    if (color !== undefined) updateData.color = color;

    const updatedEvent = await Event.findByIdAndUpdate(
      eventId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedEvent) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบเหตุการณ์ที่ต้องการแก้ไข'
      });
    }

    // Emit socket event
    if (io) {
      io.emit('eventUpdated', {
        id: updatedEvent._id,
        data: updatedEvent
      });
    }

    res.json({
      success: true,
      data: updatedEvent,
      message: 'แก้ไขเหตุการณ์เรียบร้อยแล้ว'
    });
  } catch (err) {
    console.error('Update event error:', err);
    res.status(400).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการแก้ไขเหตุการณ์: ' + err.message
    });
  }
};

exports.remove = async (req, res) => {
  const io = req.app.get('io');
  try {
    const eventId = req.params.id;

    // Find and delete event
    const deletedEvent = await Event.findByIdAndDelete(eventId);

    if (!deletedEvent) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบเหตุการณ์ที่ต้องการลบ'
      });
    }

    // Emit socket event
    if (io) {
      io.emit('eventDeleted', {
        id: deletedEvent._id,
        data: deletedEvent
      });
    }

    res.json({
      success: true,
      message: 'ลบเหตุการณ์เรียบร้อยแล้ว',
      data: deletedEvent
    });
  } catch (err) {
    console.error('Remove event error:', err);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการลบเหตุการณ์'
    });
  }
};
