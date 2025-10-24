const Payroll = require('../models/HR/payrollModel');

// POST /api/payroll
exports.createPayroll = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { employee, amount } = req.body;
    if (!employee || !amount) {
      return res.status(400).json({ error: 'Employee name & amount are required' });
    }
    const newPayroll = new Payroll({ employee, amount });
    await newPayroll.save();

    io.emit('newpayrollCreated', {
      id: newPayroll.save()._id,
      data: newPayroll.save()
    });



    res.json({ success: true, data: newPayroll });
  } catch (err) {
    console.error('createPayroll error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/payroll
exports.getAllPayrolls = async (req, res) => {
  const io = req.app.get('io');
  try {
    const payrolls = await Payroll.find().limit(100).lean().sort({ createdAt: -1 });
    res.json({ success: true, data: payrolls });
  } catch (err) {
    console.error('getAllPayrolls error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
