// controllers/paymentMethodController.js

const PaymentMethod = require('../models/POS/PaymentMethod');

/**
 * POST /api/payment-method
 * สร้าง PaymentMethod ใหม่
 */
exports.createPaymentMethod = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { name, description, transaction_fee, currency_supported, is_active } = req.body;

    // ตรวจสอบ field ที่จำเป็น (ถ้าต้องการ)
    if (!name) {
      return res.status(400).json({ error: 'name is required.' });
    }

    const newMethod = new PaymentMethod({
      name,
      description: description || '',
      transaction_fee: transaction_fee || 0,
      currency_supported: currency_supported || [],
      is_active: is_active !== undefined ? is_active : true
    });

    await newMethod.save();

    io.emit('newmethodCreated', {
      id: newMethod.save()._id,
      data: newMethod.save()
    });



    return res.json({ success: true, data: newMethod });
  } catch (err) {
    console.error('createPaymentMethod error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/payment-method
 * ดึง PaymentMethod ทั้งหมด
 */
exports.getAllPaymentMethods = async (req, res) => {
  const io = req.app.get('io');
  try {
    const methods = await PaymentMethod.find().limit(100).lean().sort({ _id: -1 });
    return res.json({ success: true, data: methods });
  } catch (err) {
    console.error('getAllPaymentMethods error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/payment-method/:id
 * ดึง PaymentMethod ตาม _id
 */
exports.getPaymentMethodById = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const method = await PaymentMethod.findById(id).lean();
    if (!method) {
      return res.status(404).json({ error: 'PaymentMethod not found' });
    }
    return res.json({ success: true, data: method });
  } catch (err) {
    console.error('getPaymentMethodById error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * PATCH /api/payment-method/:id
 * อัปเดตข้อมูลบางส่วน
 */
exports.updatePaymentMethod = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const { name, description, transaction_fee, currency_supported, is_active } = req.body;

    const method = await PaymentMethod.findById(id).lean();
    if (!method) {
      return res.status(404).json({ error: 'PaymentMethod not found' });
    }

    if (name !== undefined) method.name = name;
    if (description !== undefined) method.description = description;
    if (transaction_fee !== undefined) method.transaction_fee = transaction_fee;
    if (currency_supported !== undefined) method.currency_supported = currency_supported;
    if (is_active !== undefined) method.is_active = is_active;

    await method.save();

    io.emit('methodCreated', {
      id: method.save()._id,
      data: method.save()
    });



    return res.json({ success: true, data: method });
  } catch (err) {
    console.error('updatePaymentMethod error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * DELETE /api/payment-method/:id
 * ลบออกจาก DB จริง
 */
exports.deletePaymentMethod = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const method = await PaymentMethod.findById(id).lean();
    if (!method) {
      return res.status(404).json({ error: 'PaymentMethod not found' });
    }

    await method.remove();
    return res.json({ success: true, data: method });
  } catch (err) {
    console.error('deletePaymentMethod error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
