// controllers/supplierMappingController.js

const SupplierMapping = require('../models/Stock/SupplierMapping');

/**
 * POST /api/supplier-mapping
 * สร้าง SupplierMapping ใหม่ (เชื่อมโยง supplier-product-order)
 */
exports.createMapping = async (req, res) => {
  const io = req.app.get('io');
  try {
    const {
      order_id,
      supplier_id,
      product_id,
      quantity_ordered,
      price
    } = req.body;

    // ตรวจสอบ field ที่จำเป็น
    if (!order_id) {
      return res.status(400).json({ error: 'order_id is required.' });
    }
    if (!supplier_id) {
      return res.status(400).json({ error: 'supplier_id is required.' });
    }
    if (!product_id) {
      return res.status(400).json({ error: 'product_id is required.' });
    }

    const newMapping = new SupplierMapping({
      order_id,
      supplier_id,
      product_id,
      quantity_ordered: quantity_ordered || 0,
      price: price || 0
    });

    await newMapping.save();

    io.emit('newmappingCreated', {
      id: newMapping.save()._id,
      data: newMapping.save()
    });



    return res.json({ success: true, data: newMapping });
  } catch (err) {
    console.error('createMapping error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/supplier-mapping
 * ดึง SupplierMapping ทั้งหมด
 */
exports.getAllMappings = async (req, res) => {
  const io = req.app.get('io');
  try {
    // populate order_id, supplier_id, product_id ถ้าต้องการ
    const mappings = await SupplierMapping.find().limit(100).lean()
      .populate('order_id', 'status')     // สมมติ BranchSupplier มีฟิลด์ status
      .populate('supplier_id', 'name')    // Supplier มีฟิลด์ name
      .populate('product_id', 'name sku') // Product มีฟิลด์ name, sku
      .sort({ createdAt: -1 });

    return res.json({ success: true, data: mappings });
  } catch (err) {
    console.error('getAllMappings error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/supplier-mapping/:id
 * ดึง SupplierMapping ตาม _id
 */
exports.getMappingById = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const mapping = await SupplierMapping.findById(id).lean()
      .populate('order_id', 'status')
      .populate('supplier_id', 'name')
      .populate('product_id', 'name sku');

    if (!mapping) {
      return res.status(404).json({ error: 'SupplierMapping not found' });
    }
    return res.json({ success: true, data: mapping });
  } catch (err) {
    console.error('getMappingById error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/supplier-mapping/supplier/:supplierId
 * ดึง SupplierMapping เฉพาะซัพพลายเออร์
 */
exports.getMappingsBySupplier = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { supplierId } = req.params;
    const mappings = await SupplierMapping.find({ supplier_id: supplierId }).limit(100).lean()
      .populate('product_id', 'name sku')
      .sort({ createdAt: -1 });

    return res.json({ success: true, data: mappings });
  } catch (err) {
    console.error('getMappingsBySupplier error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/supplier-mapping/product/:productId
 * ดึง SupplierMapping เฉพาะสินค้าตัวนั้น
 */
exports.getMappingsByProduct = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { productId } = req.params;
    const mappings = await SupplierMapping.find({ product_id: productId }).limit(100).lean()
      .populate('supplier_id', 'name')
      .sort({ createdAt: -1 });

    return res.json({ success: true, data: mappings });
  } catch (err) {
    console.error('getMappingsByProduct error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/supplier-mapping/order/:orderId
 * ดึง SupplierMapping เฉพาะ order_id (BranchSupplier)
 */
exports.getMappingsByOrder = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { orderId } = req.params;
    const mappings = await SupplierMapping.find({ order_id: orderId }).limit(100).lean()
      .populate('supplier_id', 'name')
      .populate('product_id', 'name')
      .sort({ createdAt: -1 });

    return res.json({ success: true, data: mappings });
  } catch (err) {
    console.error('getMappingsByOrder error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * PATCH /api/supplier-mapping/:id
 * อัปเดตข้อมูลบางส่วน
 */
exports.updateMapping = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const { order_id, supplier_id, product_id, quantity_ordered, price } = req.body;

    const mapping = await SupplierMapping.findById(id).lean();
    if (!mapping) {
      return res.status(404).json({ error: 'SupplierMapping not found' });
    }

    if (order_id !== undefined) mapping.order_id = order_id;
    if (supplier_id !== undefined) mapping.supplier_id = supplier_id;
    if (product_id !== undefined) mapping.product_id = product_id;
    if (quantity_ordered !== undefined) mapping.quantity_ordered = quantity_ordered;
    if (price !== undefined) mapping.price = price;

    await mapping.save();

    io.emit('mappingCreated', {
      id: mapping.save()._id,
      data: mapping.save()
    });



    return res.json({ success: true, data: mapping });
  } catch (err) {
    console.error('updateMapping error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * DELETE /api/supplier-mapping/:id
 * ลบออกจาก DB จริง
 */
exports.deleteMapping = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const mapping = await SupplierMapping.findById(id).lean();
    if (!mapping) {
      return res.status(404).json({ error: 'SupplierMapping not found' });
    }

    await mapping.remove();
    return res.json({ success: true, data: mapping });
  } catch (err) {
    console.error('deleteMapping error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
