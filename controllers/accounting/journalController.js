// controllers/journalController.js

const JournalEntry = require('../models/Account/JournalEntry');
// สมมติคุณมีโมเดล JournalEntry ในไฟล์ models/JournalEntry.js
// ตัวอย่างโครงสร้างใน JournalEntry.js:
//
// const mongoose = require('mongoose');
// const { Schema } = mongoose;
// const journalEntrySchema = new Schema({
//   date: { type: Date, default: Date.now },
//   reference: String,
//   lines: [{
//     account_id: { type: Schema.Types.ObjectId, ref: 'ChartOfAccount' },
//     debit: Number,
//     credit: Number,
//     description: String
//   }]
// }, { timestamps: true });
// module.exports = mongoose.model('JournalEntry', journalEntrySchema);

/**
 * GET /api/journals
 * ดึงข้อมูล Journal Entry ทั้งหมด
 */
exports.getAllJournals = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const journals = await JournalEntry.find().lean()
      .populate('lines.account_id', 'name code')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await JournalEntry.countDocuments();

    return res.json({
      success: true,
      data: journals,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Error getting all journals:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/journals/:id
 * ดึงข้อมูล Journal Entry ตาม id
 */
exports.getJournalById = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const journal = await JournalEntry.findById(id).lean().populate('lines.account_id');
    if (!journal) {
      return res.status(404).json({ error: 'Journal not found' });
    }
    return res.json({
      success: true,
      data: journal
    });
  } catch (err) {
    console.error('Error getting journal by ID:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * POST /api/journals
 * สร้างข้อมูล Journal Entry ใหม่
 */
exports.createJournal = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { date, reference, lines } = req.body;

    // lines ควรเป็น array ของ { account_id, debit, credit, description }

    // ตรวจสอบว่า lines เป็น array?
    if (!Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ error: 'Lines is required and must be an array' });
    }

    const newJournal = new JournalEntry({
      date: date || new Date(),
      reference,
      lines
    });
    await newJournal.save();

    io.emit('newjournalCreated', {
      id: newJournal.save()._id,
      data: newJournal.save()
    });

    return res.json({
      success: true,
      data: newJournal,
      message: 'Journal created successfully!'
    });
  } catch (err) {
    console.error('Error creating journal:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * PATCH/PUT /api/journals/:id
 * อัปเดตข้อมูล Journal Entry บางส่วน (PATCH) หรือทั้งหมด (PUT)
 */
exports.updateJournal = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const { date, reference, lines } = req.body;

    const updated = await JournalEntry.findByIdAndUpdate(
            id,
            { date, reference, lines },
            { new: true, runValidators: true } // new: true => ส่งค่าที่อัปเดตกลับ
          );
    io.emit('journalentryUpdated', {
      id: updated?._id,
      data: updated
    });

    if (!updated) {
      return res.status(404).json({ error: 'Journal not found' });
    }

    return res.json({
      success: true,
      data: updated,
      message: 'Journal updated successfully!'
    });
  } catch (err) {
    console.error('Error updating journal:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * DELETE /api/journals/:id
 * ลบ Journal Entry ออกจาก DB (Hard delete)
 * ถ้าต้องการ soft delete ต้องปรับโค้ดตาม Schema
 */
exports.deleteJournal = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const deleted = await JournalEntry.findByIdAndDelete(id);
    io.emit('journalentryDeleted', {
      id: deleted._id,
      data: deleted
    });
    if (!deleted) {
      return res.status(404).json({ error: 'Journal not found' });
    }
    return res.json({
      success: true,
      message: 'Journal deleted successfully!'
    });
  } catch (err) {
    console.error('Error deleting journal:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
