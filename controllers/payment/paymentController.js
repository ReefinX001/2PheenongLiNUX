const Payment = require('../models/Account/paymentModel');

// POST /api/payment
exports.createPayment = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { amount, description } = req.body;
    if (!amount) {
      return res.status(400).json({ error: 'Amount is required' });
    }
    const newPay = new Payment({ amount, description });
    await newPay.save();

    io.emit('newpayCreated', {
      id: newPay.save()._id,
      data: newPay.save()
    });



    res.json({ success: true, data: newPay });
  } catch (err) {
    console.error('createPayment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/payment
exports.getAllPayments = async (req, res) => {
  const io = req.app.get('io');
  try {
    const pays = await Payment.find().limit(100).lean().sort({ createdAt: -1 });
    res.json({ success: true, data: pays });
  } catch (err) {
    console.error('getAllPayments error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
