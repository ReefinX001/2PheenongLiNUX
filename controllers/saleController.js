// controllers/saleController.js

const Sale = require('../models/POS/Sale');

/**
 * POST /api/sale
 * สร้างการขาย (Sale) ใหม่
 */
exports.createSale = async (req, res) => {
  const io = req.app.get('io');
  try {
    const {
      product_id,
      saleType,
      customerName,
      totalPrice,
      downPayment,
      monthlyPayment,
      months,
      isPaidOff
    } = req.body;

    // ตรวจสอบ field ที่จำเป็น
    if (!product_id) {
      return res.status(400).json({ error: 'product_id is required.' });
    }

    // saleType อาจรับค่า 'cash' หรือ 'installment'
    // ถ้าต้องการบังคับเพิ่มเติม เช่นต้องมี totalPrice เมื่อเป็น cash, หรือมี downPayment เมื่อเป็น installment ก็ดู requirement เพิ่ม

    const newSale = new Sale({
      product_id,
      saleType: saleType || 'cash',
      customerName: customerName || '',
      totalPrice: totalPrice || 0,
      downPayment: downPayment || 0,
      monthlyPayment: monthlyPayment || 0,
      months: months || 0,
      isPaidOff: isPaidOff || false,
      deleted_at: null
    });

    await newSale.save();

    io.emit('newsaleCreated', {
      id: newSale.save()._id,
      data: newSale.save()
    });



    return res.json({ success: true, data: newSale });
  } catch (err) {
    console.error('createSale error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/sale
 * ดึงรายการ Sale ทั้งหมดที่ยังไม่ถูกลบ (deleted_at = null)
 */
exports.getAllSales = async (req, res) => {
  const io = req.app.get('io');
  try {
    // populate product_id ถ้าต้องการข้อมูลสินค้า
    const sales = await Sale.find({ deleted_at: null }).limit(100).lean()
      .populate('product_id', 'name sku') // สมมติ Product มีฟิลด์ name, sku
      .sort({ createdAt: -1 });

    return res.json({ success: true, data: sales });
  } catch (err) {
    console.error('getAllSales error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/sale/:id
 * ดึงการขาย (Sale) ตาม _id (ต้องไม่ถูกลบ)
 */
exports.getSaleById = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    // populate ถ้าต้องการ virtual payments หรือ product_id
    const sale = await Sale.findOne({
      _id: id,
      deleted_at: null
    })
      .populate('product_id', 'name')
      // .populate('payments') // ถ้าคุณมีโมเดล InstallmentPayment
      .exec();

    if (!sale) {
      return res.status(404).json({ error: 'Sale not found or deleted' });
    }

    return res.json({ success: true, data: sale });
  } catch (err) {
    console.error('getSaleById error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * PATCH /api/sale/:id
 * อัปเดตข้อมูลบางส่วนของการขาย (Sale)
 */
exports.updateSale = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const {
      saleType,
      customerName,
      totalPrice,
      downPayment,
      monthlyPayment,
      months,
      isPaidOff
    } = req.body;

    const sale = await Sale.findOne({
      _id: id,
      deleted_at: null
    });
    if (!sale) {
      return res.status(404).json({ error: 'Sale not found or deleted' });
    }

    // อัปเดตเฉพาะฟิลด์ที่ส่งมา
    if (saleType !== undefined) sale.saleType = saleType;
    if (customerName !== undefined) sale.customerName = customerName;
    if (totalPrice !== undefined) sale.totalPrice = totalPrice;
    if (downPayment !== undefined) sale.downPayment = downPayment;
    if (monthlyPayment !== undefined) sale.monthlyPayment = monthlyPayment;
    if (months !== undefined) sale.months = months;
    if (isPaidOff !== undefined) sale.isPaidOff = isPaidOff;

    await sale.save();

    io.emit('saleCreated', {
      id: sale.save()._id,
      data: sale.save()
    });



    return res.json({ success: true, data: sale });
  } catch (err) {
    console.error('updateSale error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * DELETE /api/sale/:id
 * Soft Delete => set deleted_at = now()
 */
exports.deleteSale = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const sale = await Sale.findOne({
      _id: id,
      deleted_at: null
    });
    if (!sale) {
      return res.status(404).json({ error: 'Sale not found or already deleted' });
    }

    await sale.softDelete(); // ฟังก์ชันจาก Schema
    return res.json({ success: true, data: sale });
  } catch (err) {
    console.error('deleteSale error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * (Optional) DELETE /api/sale/:id/force
 * ลบออกจาก DB จริง
 */
exports.forceDeleteSale = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const sale = await Sale.findById(id).lean();
    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    await sale.remove();
    return res.json({ success: true, data: sale });
  } catch (err) {
    console.error('forceDeleteSale error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
