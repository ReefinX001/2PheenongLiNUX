const Expense  = require('../../models/Account/Expense');
const Supplier = require('../../models/Account/Customers_Supplier');

// คำนวณยอดรวมก่อนและหลังภาษี
function calcTotals(exp) {
  let before = 0;
  exp.items.forEach(i => {
    const line = i.quantity * i.unitPrice - (i.discount * i.quantity);
    before += line;
  });
  const vatAmount = before * (exp.vatRate/100);
  exp.totalBeforeTax = before;
  exp.totalNet       = before + vatAmount - exp.deposit;
}

// สร้างบันทึกใหม่
exports.createExpense = async (req, res) => {
  try {
    const exp = new Expense(req.body);
    calcTotals(exp);
    await exp.save();
    return res.status(201).json(exp);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

// อ่านรายการทั้งหมด (พร้อม supplier)
exports.getAllExpenses = async (req, res) => {
  try {
    const list = await Expense.find().limit(100).lean()
      .populate('supplier', 'name');
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// อ่านรายการเดียว
exports.getExpenseById = async (req, res) => {
  try {
    const exp = await Expense.findById(req.params.id).lean()
      .populate('supplier');
    if (!exp) return res.status(404).json({ error: 'Not found' });
    return res.json(exp);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// แก้ไขรายการ
exports.updateExpense = async (req, res) => {
  try {
    const exp = await Expense.findById(req.params.id).lean();
    if (!exp) return res.status(404).json({ error: 'Not found' });
    Object.assign(exp, req.body);
    calcTotals(exp);
    await exp.save();
    return res.json(exp);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

// ลบรายการ
exports.deleteExpense = async (req, res) => {
  try {
    await Expense.findByIdAndDelete(req.params.id);
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
