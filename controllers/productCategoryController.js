// controllers/productCategoryController.js

const ProductCategory = require('../models/Stock/ProductCategory');

/**
 * POST /api/product-category
 * สร้าง Category ใหม่
 */
exports.createCategory = async (req, res) => {
  const io = req.app.get('io');
  try {
    const {
      parent_id,
      name,
      slug,
      priority,
      description,
      status
    } = req.body;

    // คุณอาจบังคับว่าต้องมี name หรือไม่
    if (!name) {
      return res.status(400).json({ error: 'name is required.' });
    }

    const newCategory = new ProductCategory({
      parent_id: parent_id || null,
      name,
      slug: slug || '',
      priority: priority || 0,
      description: description || '',
      status: status || 'active',
      deleted_at: null
    });

    await newCategory.save();

    io.emit('newcategoryCreated', {
      id: newCategory.save()._id,
      data: newCategory.save()
    });



    return res.json({ success: true, data: newCategory });
  } catch (err) {
    console.error('createCategory error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/product-category
 * ดึง Category ทั้งหมด (ที่ยังไม่ถูกลบ)
 */
exports.getAllCategories = async (req, res) => {
  const io = req.app.get('io');
  try {
    // populate parent_id ถ้าต้องการ
    const categories = await ProductCategory.find({ deleted_at: null }).limit(100).lean()
      .populate('parentCategory', 'name') // หรือจะ populate fields อื่นด้วย
      .sort({ createdAt: -1 });

    return res.json({ success: true, data: categories });
  } catch (err) {
    console.error('getAllCategories error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/product-category/:id
 * ดึง Category ตาม _id (ต้องไม่ถูกลบ)
 */
exports.getCategoryById = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    // populate virtuals หรือ parent, children ตามต้องการ
    // .populate('children').populate('products')
    const category = await ProductCategory.findOne({
      _id: id,
      deleted_at: null
    })
      .populate('parentCategory', 'name')
      .exec();

    if (!category) {
      return res.status(404).json({ error: 'Category not found or deleted' });
    }

    return res.json({ success: true, data: category });
  } catch (err) {
    console.error('getCategoryById error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * PATCH /api/product-category/:id
 * อัปเดตข้อมูลบางส่วนของ Category
 */
exports.updateCategory = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const {
      parent_id,
      name,
      slug,
      priority,
      description,
      status
    } = req.body;

    const category = await ProductCategory.findOne({
      _id: id,
      deleted_at: null
    });
    if (!category) {
      return res.status(404).json({ error: 'Category not found or deleted' });
    }

    // อัปเดตเฉพาะฟิลด์ที่ส่งมา
    if (parent_id !== undefined) category.parent_id = parent_id;
    if (name !== undefined) category.name = name;
    if (slug !== undefined) category.slug = slug;
    if (priority !== undefined) category.priority = priority;
    if (description !== undefined) category.description = description;
    if (status !== undefined) category.status = status;

    await category.save();

    io.emit('categoryCreated', {
      id: category.save()._id,
      data: category.save()
    });



    return res.json({ success: true, data: category });
  } catch (err) {
    console.error('updateCategory error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * DELETE /api/product-category/:id
 * Soft Delete => set deleted_at = now()
 */
exports.deleteCategory = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const category = await ProductCategory.findOne({
      _id: id,
      deleted_at: null
    });
    if (!category) {
      return res.status(404).json({ error: 'Category not found or already deleted' });
    }

    await category.softDelete(); // ฟังก์ชันจาก Schema
    return res.json({ success: true, data: category });
  } catch (err) {
    console.error('deleteCategory error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * (Optional) DELETE /api/product-category/:id/force
 * ลบออกจาก DB จริง
 */
exports.forceDeleteCategory = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const category = await ProductCategory.findById(id).lean();
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    await category.remove();
    return res.json({ success: true, data: category });
  } catch (err) {
    console.error('forceDeleteCategory error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
