// controllers/productAttributeController.js

const ProductAttribute = require('../models/Stock/ProductAttribute');

/**
 * POST /api/product-attribute
 * สร้าง ProductAttribute ใหม่
 */
exports.createAttribute = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { product_id, attribute_name, attribute_value, locale } = req.body;

    // ตรวจสอบ field ที่จำเป็น
    if (!product_id) {
      return res.status(400).json({ error: 'product_id is required.' });
    }

    const newAttr = new ProductAttribute({
      product_id,
      attribute_name: attribute_name || '',
      attribute_value: attribute_value || '',
      locale: locale || ''
    });

    await newAttr.save();

    io.emit('newattrCreated', {
      id: newAttr.save()._id,
      data: newAttr.save()
    });



    return res.json({ success: true, data: newAttr });
  } catch (err) {
    console.error('createAttribute error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/product-attribute
 * ดึง ProductAttribute ทั้งหมด
 */
exports.getAllAttributes = async (req, res) => {
  const io = req.app.get('io');
  try {
    // populate product_id ถ้าต้องการ
    const attributes = await ProductAttribute.find().limit(100).lean()
      .populate('product_id', 'name sku') // สมมติ Product มีฟิลด์ name, sku
      .sort({ _id: -1 });

    return res.json({ success: true, data: attributes });
  } catch (err) {
    console.error('getAllAttributes error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/product-attribute/product/:productId
 * ดึงแอตทริบิวต์เฉพาะสินค้านั้น
 */
exports.getAttributesByProduct = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { productId } = req.params;
    const attributes = await ProductAttribute.find({ product_id: productId }).limit(100).lean()
      .populate('product_id', 'name');
    return res.json({ success: true, data: attributes });
  } catch (err) {
    console.error('getAttributesByProduct error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/product-attribute/:id
 * ดึง ProductAttribute ตาม _id
 */
exports.getAttributeById = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const attribute = await ProductAttribute.findById(id).lean()
      .populate('product_id', 'name sku');

    if (!attribute) {
      return res.status(404).json({ error: 'ProductAttribute not found' });
    }
    return res.json({ success: true, data: attribute });
  } catch (err) {
    console.error('getAttributeById error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * PATCH /api/product-attribute/:id
 * อัปเดตข้อมูลบางส่วนของแอตทริบิวต์
 */
exports.updateAttribute = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const { attribute_name, attribute_value, locale } = req.body;

    const attribute = await ProductAttribute.findById(id).lean();
    if (!attribute) {
      return res.status(404).json({ error: 'ProductAttribute not found' });
    }

    if (attribute_name !== undefined) attribute.attribute_name = attribute_name;
    if (attribute_value !== undefined) attribute.attribute_value = attribute_value;
    if (locale !== undefined) attribute.locale = locale;

    await attribute.save();

    io.emit('attributeCreated', {
      id: attribute.save()._id,
      data: attribute.save()
    });



    return res.json({ success: true, data: attribute });
  } catch (err) {
    console.error('updateAttribute error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * DELETE /api/product-attribute/:id
 * ลบออกจาก DB จริง
 */
exports.deleteAttribute = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const attribute = await ProductAttribute.findById(id).lean();
    if (!attribute) {
      return res.status(404).json({ error: 'ProductAttribute not found' });
    }

    await attribute.remove();
    return res.json({ success: true, data: attribute });
  } catch (err) {
    console.error('deleteAttribute error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
