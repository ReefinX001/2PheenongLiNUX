// controllers/productVariantController.js

const ProductVariant = require('../models/POS/ProductVariant');

/**
 * POST /api/product-variant
 * สร้าง Variant ใหม่ให้ Product
 */
exports.createVariant = async (req, res) => {
  const io = req.app.get('io');
  try {
    const {
      product_id,
      name,
      storage,
      color,
      price,
      model,
      item_code,
      barcode,
      warranty_period,
      reference_code,
      description,
      status
    } = req.body;

    // ตรวจสอบ field ที่จำเป็น
    if (!product_id) {
      return res.status(400).json({ error: 'product_id is required.' });
    }

    const newVariant = new ProductVariant({
      product_id,
      name: name || '',
      storage: storage || '',
      color: color || '',
      price: price || 0,
      model: model || '',
      item_code: item_code || '',
      barcode: barcode || '',
      warranty_period: warranty_period || '',
      reference_code: reference_code || '',
      description: description || '',
      status: status || 'active'
    });

    await newVariant.save();

    io.emit('newvariantCreated', {
      id: newVariant.save()._id,
      data: newVariant.save()
    });



    return res.json({ success: true, data: newVariant });
  } catch (err) {
    console.error('createVariant error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/product-variant
 * ดึง ProductVariant ทั้งหมด
 */
exports.getAllVariants = async (req, res) => {
  const io = req.app.get('io');
  try {
    // populate product_id ถ้าต้องการ
    const variants = await ProductVariant.find().limit(100).lean()
      .populate('product_id', 'name sku')  // สมมติ Product มีฟิลด์ name, sku
      .sort({ _id: -1 });

    return res.json({ success: true, data: variants });
  } catch (err) {
    console.error('getAllVariants error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/product-variant/product/:productId
 * ดึง Variant ทั้งหมดของสินค้าตัวนั้น
 */
exports.getVariantsByProduct = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { productId } = req.params;
    const variants = await ProductVariant.find({ product_id: productId }).limit(100).lean()
      .populate('product_id', 'name sku')
      .sort({ _id: -1 });

    return res.json({ success: true, data: variants });
  } catch (err) {
    console.error('getVariantsByProduct error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/product-variant/:id
 * ดึง Variant ตาม _id
 */
exports.getVariantById = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const variant = await ProductVariant.findById(id).lean()
      .populate('product_id', 'name sku');

    if (!variant) {
      return res.status(404).json({ error: 'ProductVariant not found' });
    }
    return res.json({ success: true, data: variant });
  } catch (err) {
    console.error('getVariantById error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * PATCH /api/product-variant/:id
 * อัปเดตข้อมูลบางส่วนของ Variant
 */
exports.updateVariant = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const {
      name,
      storage,
      color,
      price,
      model,
      item_code,
      barcode,
      warranty_period,
      reference_code,
      description,
      status
    } = req.body;

    const variant = await ProductVariant.findById(id).lean();
    if (!variant) {
      return res.status(404).json({ error: 'ProductVariant not found' });
    }

    if (name !== undefined) variant.name = name;
    if (storage !== undefined) variant.storage = storage;
    if (color !== undefined) variant.color = color;
    if (price !== undefined) variant.price = price;
    if (model !== undefined) variant.model = model;
    if (item_code !== undefined) variant.item_code = item_code;
    if (barcode !== undefined) variant.barcode = barcode;
    if (warranty_period !== undefined) variant.warranty_period = warranty_period;
    if (reference_code !== undefined) variant.reference_code = reference_code;
    if (description !== undefined) variant.description = description;
    if (status !== undefined) variant.status = status;

    await variant.save();

    io.emit('variantCreated', {
      id: variant.save()._id,
      data: variant.save()
    });



    return res.json({ success: true, data: variant });
  } catch (err) {
    console.error('updateVariant error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * DELETE /api/product-variant/:id
 * ลบออกจาก DB จริง
 */
exports.deleteVariant = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const variant = await ProductVariant.findById(id).lean();
    if (!variant) {
      return res.status(404).json({ error: 'ProductVariant not found' });
    }

    await variant.remove();
    return res.json({ success: true, data: variant });
  } catch (err) {
    console.error('deleteVariant error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
