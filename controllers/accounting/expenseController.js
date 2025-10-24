// controllers/expenseController.js
const Expense = require('../models/Account/expenseModel');

exports.createExpense = async (req, res) => {
  const io = req.app.get('io');
  try {
    // เตรียม payload จาก req.body
    const data = { ...req.body };

    // คำนวณก่อนภาษี
    let before = 0;
    (data.items || []).forEach(i => {
      before += i.quantity * i.unitPrice - (i.discount * i.quantity);
    });

    // กำหนดทั้ง 3 ค่า
    data.amount = before; // ถ้าต้องการเก็บ amount
    data.totalBeforeTax = before;
    data.totalNet = before * (1 + data.vatRate / 100) - (data.deposit || 0);

    // สร้างและบันทึก
    const exp = new Expense(data);
    await exp.save();

    // ส่ง event หลังสร้างสำเร็จ
    io.emit('newexpenseCreated', {
      id: exp._id,
      data: exp
    });

    return res.status(201).json({
      success: true,
      data: exp,
      message: 'Expense created successfully!'
    });
  } catch (err) {
    console.error('Error creating expense:', err);
    return res.status(400).json({ error: err.message });
  }
};

exports.getAllExpenses = async (req, res) => {
  const io = req.app.get('io');
  try {
    const expenses = await Expense.find().limit(100).lean().sort({ createdAt: -1 });
    return res.json({
      success: true,
      data: expenses
    });
  } catch (err) {
    console.error('Error fetching expenses:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.deleteExpense = async (req, res) => {
  const io = req.app.get('io');
  try {
    const expenseId = req.params.id;
    // ลบก่อน และเช็คผลลัพธ์
    const deletedExpense = await Expense.findByIdAndDelete(expenseId);
    if (!deletedExpense) {
      return res.status(404).json({ success: false, error: 'Expense not found' });
    }
    // ส่ง event หลังลบสำเร็จ
    io.emit('expenseDeleted', {
      id: deletedExpense._id,
      data: deletedExpense
    });

    return res.json({
      success: true,
      message: 'Expense deleted successfully!'
    });
  } catch (err) {
    console.error('Error deleting expense:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// GET /api/expenses/:id
exports.getExpenseById = async (req, res) => {
  try {
    const exp = await Expense.findById(req.params.id).lean();
    if (!exp) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: exp });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/expenses/:id
exports.updateExpense = async (req, res) => {
  try {
    const exp = await Expense.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!exp) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: exp });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
