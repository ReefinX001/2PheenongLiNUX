// controllers/orderItemController.js

const OrderItem = require('../models/POS/OrderItem');

/**
 * POST /api/order-item
 * สร้าง OrderItem ใหม่ (สินค้าในคำสั่งซื้อ)
 */
exports.createOrderItem = async (req, res) => {
  const io = req.app.get('io');
  try {
    const {
      order_id,
      product_id,
      quantity,
      price,
      discount,
      subtotal
    } = req.body;

    if (!order_id || !product_id) {
      return res.status(400).json({
        error: 'order_id and product_id are required.'
      });
    }

    const newItem = new OrderItem({
      order_id,
      product_id,
      quantity: quantity || 0,
      price: price || 0,
      discount: discount || 0,
      subtotal: subtotal || 0
    });

    await newItem.save();

    io.emit('newitemCreated', {
      id: newItem.save()._id,
      data: newItem.save()
    });



    return res.json({ success: true, data: newItem });
  } catch (err) {
    console.error('createOrderItem error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/order-item
 * ดึง OrderItem ทั้งหมด
 */
exports.getAllOrderItems = async (req, res) => {
  const io = req.app.get('io');
  try {
    // populate order หรือ product หากต้องการ
    const items = await OrderItem.find().limit(100).lean()
      .populate('order_id', 'order_number')
      .populate('product_id', 'product_name price') // สมมติว่าโมเดล Product มีฟิลด์เหล่านี้
      .sort({ _id: -1 });

    return res.json({ success: true, data: items });
  } catch (err) {
    console.error('getAllOrderItems error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/order-item/order/:orderId
 * ดึง OrderItem เฉพาะคำสั่งซื้อนั้น
 */
exports.getItemsByOrder = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { orderId } = req.params;
    const items = await OrderItem.find({ order_id: orderId }).limit(100).lean()
      .populate('product_id', 'product_name price')
      .sort({ _id: -1 });

    return res.json({ success: true, data: items });
  } catch (err) {
    console.error('getItemsByOrder error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/order-item/:id
 * ดึง OrderItem ตาม _id
 */
exports.getOrderItemById = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const item = await OrderItem.findById(id).lean()
      .populate('order_id', 'order_number')
      .populate('product_id', 'product_name price');

    if (!item) {
      return res.status(404).json({ error: 'OrderItem not found' });
    }
    return res.json({ success: true, data: item });
  } catch (err) {
    console.error('getOrderItemById error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * PATCH /api/order-item/:id
 * อัปเดตบางส่วนของ OrderItem
 */
exports.updateOrderItem = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const { quantity, price, discount, subtotal } = req.body;

    const item = await OrderItem.findById(id).lean();
    if (!item) {
      return res.status(404).json({ error: 'OrderItem not found' });
    }

    if (quantity !== undefined) item.quantity = quantity;
    if (price !== undefined) item.price = price;
    if (discount !== undefined) item.discount = discount;
    if (subtotal !== undefined) item.subtotal = subtotal;

    await item.save();

    io.emit('itemCreated', {
      id: item.save()._id,
      data: item.save()
    });



    return res.json({ success: true, data: item });
  } catch (err) {
    console.error('updateOrderItem error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * DELETE /api/order-item/:id
 * ลบ OrderItem ออกจาก DB จริง (ถ้าต้องการ Soft Delete, ต้องปรับ Schema)
 */
exports.deleteOrderItem = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const item = await OrderItem.findById(id).lean();
    if (!item) {
      return res.status(404).json({ error: 'OrderItem not found' });
    }

    await item.remove();
    return res.json({ success: true, data: item });
  } catch (err) {
    console.error('deleteOrderItem error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
