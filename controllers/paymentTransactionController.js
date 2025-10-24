// controllers/paymentTransactionController.js

const PaymentTransaction = require('../models/POS/PaymentTransaction');

/**
 * POST /api/payment-transaction
 * สร้าง PaymentTransaction ใหม่
 */
exports.createTransaction = async (req, res) => {
  const io = req.app.get('io');
  try {
    const {
      order_id,
      payment_method_id,
      amount,
      currency,
      transaction_date,
      status,
      reference_number,
      fee,
      net_amount,
      remark
    } = req.body;

    // คุณอาจเช็กความจำเป็นตาม requirement
    // เช่น order_id หรือ payment_method_id หรือ amount
    // ถ้าต้องการบังคับ
    // if (!order_id) return res.status(400).json({ error: 'order_id is required.' });

    const newTx = new PaymentTransaction({
      order_id: order_id || null,
      payment_method_id: payment_method_id || null,
      amount: amount || 0,
      currency: currency || 'USD',
      transaction_date: transaction_date ? new Date(transaction_date) : new Date(),
      status: status || 'pending',
      reference_number: reference_number || '',
      fee: fee || 0,
      net_amount: net_amount || 0,
      remark: remark || ''
    });

    await newTx.save();

    io.emit('newtxCreated', {
      id: newTx.save()._id,
      data: newTx.save()
    });



    return res.json({ success: true, data: newTx });
  } catch (err) {
    console.error('createTransaction error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/payment-transaction
 * ดึงรายการ PaymentTransaction ทั้งหมด
 */
exports.getAllTransactions = async (req, res) => {
  const io = req.app.get('io');
  try {
    // populate order_id, payment_method_id ได้หากต้องการ
    const txs = await PaymentTransaction.find().limit(100).lean()
      .populate('order_id', 'order_number')
      .populate('payment_method_id', 'name transaction_fee')
      .sort({ transaction_date: -1 });

    return res.json({ success: true, data: txs });
  } catch (err) {
    console.error('getAllTransactions error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/payment-transaction/:id
 * ดึง Transaction ตาม _id
 */
exports.getTransactionById = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const tx = await PaymentTransaction.findById(id).lean()
      .populate('order_id', 'order_number')
      .populate('payment_method_id', 'name transaction_fee');

    if (!tx) {
      return res.status(404).json({ error: 'PaymentTransaction not found' });
    }
    return res.json({ success: true, data: tx });
  } catch (err) {
    console.error('getTransactionById error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * PATCH /api/payment-transaction/:id
 * อัปเดตข้อมูลบางส่วนของ Transaction
 */
exports.updateTransaction = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const {
      order_id,
      payment_method_id,
      amount,
      currency,
      transaction_date,
      status,
      reference_number,
      fee,
      net_amount,
      remark
    } = req.body;

    const tx = await PaymentTransaction.findById(id).lean();
    if (!tx) {
      return res.status(404).json({ error: 'PaymentTransaction not found' });
    }

    if (order_id !== undefined) tx.order_id = order_id;
    if (payment_method_id !== undefined) tx.payment_method_id = payment_method_id;
    if (amount !== undefined) tx.amount = amount;
    if (currency !== undefined) tx.currency = currency;
    if (transaction_date !== undefined) tx.transaction_date = new Date(transaction_date);
    if (status !== undefined) tx.status = status;
    if (reference_number !== undefined) tx.reference_number = reference_number;
    if (fee !== undefined) tx.fee = fee;
    if (net_amount !== undefined) tx.net_amount = net_amount;
    if (remark !== undefined) tx.remark = remark;

    await tx.save();

    io.emit('txCreated', {
      id: tx.save()._id,
      data: tx.save()
    });



    return res.json({ success: true, data: tx });
  } catch (err) {
    console.error('updateTransaction error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * DELETE /api/payment-transaction/:id
 * ลบออกจาก DB จริง
 */
exports.deleteTransaction = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const tx = await PaymentTransaction.findById(id).lean();
    if (!tx) {
      return res.status(404).json({ error: 'PaymentTransaction not found' });
    }

    await tx.remove();
    return res.json({ success: true, data: tx });
  } catch (err) {
    console.error('deleteTransaction error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
