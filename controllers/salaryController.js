// File: controllers/salaryController.js

const Salary = require('../models/HR/Salary');

/**
 * GET /api/salaries
 * ดึงข้อมูลค่าจ้าง/เงินเดือนทั้งหมด
 * (หรือจะกรองตาม userId, status, month ก็ได้)
 */
exports.getAllSalaries = async (req, res) => {
  const io = req.app.get('io');
  try {
    // ตัวอย่าง: ถ้าอยากกรองตาม userId หรือ month
    // const { userId, month } = req.query;

    // เขียนเงื่อนไข filter
    // let filter = {};
    // if (userId) filter.user = userId;
    // if (month) filter.month = month;

    // ตัวอย่างง่าย ๆ: ดึงทั้งหมด
    const salaries = await Salary.find().limit(100).lean()
      .populate('user', 'name email') // populate ดึงชื่อ-เมลจาก User
      .sort({ createdAt: -1 });

    return res.json({ success: true, data: salaries });
  } catch (error) {
    console.error('getAllSalaries error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
