// controllers/incomeController.js

const Income = require('../models/incomeModel');
const JournalEntry = require('../models/Account/JournalEntry'); // ถ้าต้องการบันทึกบัญชีอัตโนมัติ ต้องมีโมเดลนี้
// สมมติเรามีโมเดล ChartOfAccount และรู้ _id ของบัญชีรายได้/บัญชีเงินสด
// หรือคุณอาจดึงจาก DB/config แทนการฮาร์ดโค้ด
const accountIdForRevenue = '63fabc...'; // _id บัญชีรายได้
const accountIdForCash = '63fabd...';   // _id บัญชีเงินสด

/**
 * POST /api/income
 * สร้างข้อมูลรายรับ (Income) + โพสต์รายการเข้าสมุดรายวัน (JournalEntry)
 */
exports.createIncome = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { amount, description } = req.body;
    if (!amount) {
      return res.status(400).json({ error: 'Amount is required' });
    }

    // 1) บันทึกข้อมูล Income
    const newIncome = new Income({ amount, description });
    // บันทึก Income ก่อน แล้วเก็บผลลัพธ์
    const createdIncome = await newIncome.save();
    // emit event หลังสร้าง Income
    io.emit('newincomeCreated', {
      id: createdIncome._id,
      data: createdIncome
    });

    // 2) ถ้าต้องการบันทึกบัญชี (JournalEntry) อัตโนมัติ
    //    เดบิต บัญชีเงินสด, เครดิต บัญชีรายได้
    const createdJournal = await JournalEntry.create({
      date: new Date(),
      reference: 'Income #' + createdIncome._id,
      lines: [
        {
          account_id: accountIdForRevenue,
          credit: amount,
          debit: 0,
          description: description || 'Auto post from createIncome'
        },
        {
          account_id: accountIdForCash,
          credit: 0,
          debit: amount,
          description: 'รับเงินสด'
        },
      ]
    });
    io.emit('journalentryCreated', {
      id: createdJournal._id,
      data: createdJournal
    });

    return res.json({
      success: true,
      data: createdIncome,
      message: 'Income created and posted to Journal successfully!'
    });
  } catch (err) {
    console.error('Error creating income & posting journal:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/income
 * ดึงข้อมูลรายรับทั้งหมด (option เสริม)
 */
exports.getAllIncomes = async (req, res) => {
  const io = req.app.get('io');
  try {
    const incomes = await Income.find().limit(100).lean().sort({ createdAt: -1 });
    return res.json({
      success: true,
      data: incomes,
    });
  } catch (err) {
    console.error('Error fetching incomes:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
