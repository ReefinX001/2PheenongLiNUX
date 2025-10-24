// controllers/fulfillmentController.js

const Fulfillment = require('../models/Fulfillment');

/**
 * POST /api/fulfillment
 * สร้าง Fulfillment ใหม่ให้ Order
 */
exports.createFulfillment = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { order_id, fulfillment_date, tracking_number, carrier, status } = req.body;

    if (!order_id) {
      return res.status(400).json({ error: 'order_id is required.' });
    }

    const newFulfillment = new Fulfillment({
      order_id,
      fulfillment_date: fulfillment_date ? new Date(fulfillment_date) : new Date(),
      tracking_number: tracking_number || '',
      carrier: carrier || '',
      status: status || 'pending'
    });

    await newFulfillment.save();

    io.emit('newfulfillmentCreated', {
      id: newFulfillment.save()._id,
      data: newFulfillment.save()
    });



    return res.json({ success: true, data: newFulfillment });
  } catch (err) {
    console.error('createFulfillment error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/fulfillment
 * ดึง Fulfillments ทั้งหมด
 */
exports.getAllFulfillments = async (req, res) => {
  const io = req.app.get('io');
  try {
    // populate order_id หากต้องการ
    const fulfillments = await Fulfillment.find().limit(100).lean()
      .populate('order_id', 'order_number customer_id') // สมมติ order model มี order_number, ...
      .sort({ fulfillment_date: -1 });

    return res.json({ success: true, data: fulfillments });
  } catch (err) {
    console.error('getAllFulfillments error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/fulfillment/order/:orderId
 * ดึง Fulfillment เฉพาะ order_id
 */
exports.getFulfillmentsByOrder = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { orderId } = req.params;
    const fulfillments = await Fulfillment.find({ order_id: orderId }).limit(100).lean()
      .sort({ fulfillment_date: -1 });

    return res.json({ success: true, data: fulfillments });
  } catch (err) {
    console.error('getFulfillmentsByOrder error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/fulfillment/:id
 * ดึง Fulfillment ตาม _id
 */
exports.getFulfillmentById = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const fulfillment = await Fulfillment.findById(id).lean()
      .populate('order_id', 'order_number');

    if (!fulfillment) {
      return res.status(404).json({ error: 'Fulfillment not found' });
    }
    return res.json({ success: true, data: fulfillment });
  } catch (err) {
    console.error('getFulfillmentById error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * PATCH /api/fulfillment/:id
 * อัปเดตข้อมูลบางส่วนของ Fulfillment
 */
exports.updateFulfillment = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const { fulfillment_date, tracking_number, carrier, status } = req.body;

    const fulfillment = await Fulfillment.findById(id).lean();
    if (!fulfillment) {
      return res.status(404).json({ error: 'Fulfillment not found' });
    }

    if (fulfillment_date !== undefined) {
      fulfillment.fulfillment_date = new Date(fulfillment_date);
    }
    if (tracking_number !== undefined) {
      fulfillment.tracking_number = tracking_number;
    }
    if (carrier !== undefined) {
      fulfillment.carrier = carrier;
    }
    if (status !== undefined) {
      fulfillment.status = status;
    }

    await fulfillment.save();

    io.emit('fulfillmentCreated', {
      id: fulfillment.save()._id,
      data: fulfillment.save()
    });



    return res.json({ success: true, data: fulfillment });
  } catch (err) {
    console.error('updateFulfillment error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * DELETE /api/fulfillment/:id
 * ลบ Fulfillment ออกจาก DB จริง
 */
exports.deleteFulfillment = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const fulfillment = await Fulfillment.findById(id).lean();
    if (!fulfillment) {
      return res.status(404).json({ error: 'Fulfillment not found' });
    }

    await fulfillment.remove();
    return res.json({ success: true, data: fulfillment });
  } catch (err) {
    console.error('deleteFulfillment error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
