// controllers/OrderController.js

const Order = require('../models/POS/Order');
const Customer = require('../models/Customer/Customer'); // ตรวจสอบว่าโมเดล Customer มีอยู่จริง

/**
 * POST /api/order
 * สร้างคำสั่งซื้อ (Order) ใหม่
 */
exports.createOrder = async (req, res) => {
  const io = req.app.get('io');
  try {
    let {
      customer_id,
      customer,
      order_number,
      order_date,
      status,
      total_amount,
      tax_amount,
      discount,
      payment_status,
      items
    } = req.body;

    // หากไม่มี order_number ให้สร้างอัตโนมัติ
    if (!order_number) {
      order_number = 'POS' + Date.now();
    }

    // ถ้ามี items ให้คำนวณ subTotal
    if (items && Array.isArray(items) && items.length > 0) {
      let subTotal = items.reduce((sum, item) => {
        const price = parseFloat(item.price) || 0;
        const qty = parseInt(item.qty, 10) || 0;
        return sum + (price * qty);
      }, 0);

      if (!discount) discount = 0;
      if (!tax_amount) tax_amount = subTotal * 0.07; // สมมติ VAT 7%

      total_amount = (subTotal - discount) + tax_amount;
    }

    // ถ้าไม่มี customer_id แต่ส่ง customer object => สร้าง Customer ใหม่
    if (!customer_id && customer) {
      const newCustomer = new Customer({
        prefix: customer.prefix || '',
        first_name: customer.firstName || '',
        last_name: customer.lastName || '',
        phone_number: customer.phone || '', // หรือฟิลด์ phone_number
        // เพิ่มฟิลด์ address, taxId หรือฟิลด์อื่น ๆ ตาม schema ของ Customer ได้
      });
      await newCustomer.save();

      io.emit('newcustomerCreated', {
        id: newCustomer.save()._id,
        data: newCustomer.save()
      });



      customer_id = newCustomer._id;
    }

    if (!customer_id) {
      return res.status(400).json({ error: 'customer_id is required or send customer object to create new.' });
    }

    // สร้าง Order
    const newOrder = new Order({
      customer_id,
      order_number,
      order_date: order_date ? new Date(order_date) : new Date(),
      status: status || 'pending',
      total_amount: total_amount || 0,
      tax_amount: tax_amount || 0,
      discount: discount || 0,
      payment_status: payment_status || 'unpaid',
      deleted_at: null,
      items: items || []  // ถ้า Schema ของ Order รองรับการเก็บ items ภายใน
    });

    await newOrder.save();

    io.emit('neworderCreated', {
      id: newOrder.save()._id,
      data: newOrder.save()
    });



    return res.json({ success: true, data: newOrder });
  } catch (err) {
    console.error('createOrder error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/order
 * ดึงรายการ Order ทั้งหมดที่ยังไม่ถูกลบ
 */
exports.getAllOrders = async (req, res) => {
  const io = req.app.get('io');
  try {
    const orders = await Order.find({ deleted_at: null }).limit(100).lean()
      .populate('customer_id', 'first_name last_name email')
      .sort({ createdAt: -1 });
    return res.json({ success: true, data: orders });
  } catch (err) {
    console.error('getAllOrders error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/order/:id
 * ดึงข้อมูล Order ตาม _id (ที่ยังไม่ถูกลบ)
 */
exports.getOrderById = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const order = await Order.findOne({ _id: id, deleted_at: null }).lean()
      .populate('customer_id', 'first_name last_name')
      .exec();

    if (!order) {
      return res.status(404).json({ error: 'Order not found or deleted' });
    }

    return res.json({ success: true, data: order });
  } catch (err) {
    console.error('getOrderById error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * PATCH /api/order/:id
 * อัปเดตข้อมูลบางส่วนของ Order
 */
exports.updateOrder = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const {
      order_number,
      order_date,
      status,
      total_amount,
      tax_amount,
      discount,
      payment_status
    } = req.body;

    const order = await Order.findOne({ _id: id, deleted_at: null }).lean();
    if (!order) {
      return res.status(404).json({ error: 'Order not found or deleted' });
    }

    if (order_number !== undefined) order.order_number = order_number;
    if (order_date !== undefined) order.order_date = new Date(order_date);
    if (status !== undefined) order.status = status;
    if (total_amount !== undefined) order.total_amount = total_amount;
    if (tax_amount !== undefined) order.tax_amount = tax_amount;
    if (discount !== undefined) order.discount = discount;
    if (payment_status !== undefined) order.payment_status = payment_status;

    await order.save();

    io.emit('orderCreated', {
      id: order.save()._id,
      data: order.save()
    });



    return res.json({ success: true, data: order });
  } catch (err) {
    console.error('updateOrder error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * DELETE /api/order/:id
 * Soft Delete => กำหนด deleted_at ให้เป็นวันที่ปัจจุบัน
 */
exports.deleteOrder = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const order = await Order.findOne({ _id: id, deleted_at: null }).lean();
    if (!order) {
      return res.status(404).json({ error: 'Order not found or already deleted' });
    }

    order.deleted_at = new Date();
    await order.save();



    return res.json({ success: true, data: order });
  } catch (err) {
    console.error('deleteOrder error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * (Optional) DELETE /api/order/:id/force
 * ลบจริงจากฐานข้อมูล (Hard Delete)
 */
exports.forceDeleteOrder = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const order = await Order.findById(id).lean();
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    await order.remove();
    return res.json({ success: true, data: order });
  } catch (err) {
    console.error('forceDeleteOrder error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/pdf/orders
 * (ตัวอย่าง) คืนแค่อาร์เรย์ของ order_id เท่านั้น
 * เพื่อให้ตรงกับ router.get('/orders', OrderController.getOrderIds);
 */
exports.getOrderIds = async (req, res) => {
  const io = req.app.get('io');
  try {
    // หาทุก order ที่ deleted_at == null
    const orders = await Order.find({ deleted_at: null }, { _id: 1 }).limit(100).lean()
      .lean();

    // map เหลือแค่ _id ในรูป string
    const orderIds = orders.map(o => o._id.toString());

    io.emit('resourcefunction toString() { [native code] }', {
      id: orderIds._id,
      data: orderIds
    });

    io.emit('resourcefunction toString() { [native code] }', {
      id: orderIds._id,
      data: orderIds
    });

    io.emit('resourcefunction toString() { [native code] }', {
      id: orderIds._id,
      data: orderIds
    });

    return res.json({ success: true, data: orderIds });
  } catch (err) {
    console.error('getOrderIds error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
