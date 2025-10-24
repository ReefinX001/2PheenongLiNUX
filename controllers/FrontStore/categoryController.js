const Category = require('../../models/FrontStore/Category');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/frontstore/categories');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `category-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|svg|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น (JPEG, PNG, SVG, WebP)'));
    }
  }
});

const categoryController = {
  // Get all categories
  getAll: async (req, res) => {
    try {
      const { page = 1, limit = 10, search, isActive } = req.query;

      const query = {};
      if (search) {
        query.$text = { $search: search };
      }
      if (isActive !== undefined) {
        query.isActive = isActive === 'true';
      }

      const categories = await Category.find(query)
        .sort({ order: 1, createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('createdBy', 'name')
        .populate('updatedBy', 'name')
        .exec();

      const total = await Category.countDocuments(query);

      res.json({
        success: true,
        data: categories,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลหมวดหมู่',
        error: error.message
      });
    }
  },

  // Get active categories for frontend
  getActive: async (req, res) => {
    try {
      const categories = await Category.find({ isActive: true })
        .sort({ order: 1 })
        .select('name name_en icon color slug totalProducts')
        .exec();

      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('Error fetching active categories:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลหมวดหมู่',
        error: error.message
      });
    }
  },

  // Get category by ID
  getById: async (req, res) => {
    try {
      const { id } = req.params;
      // Validate ObjectId format early to avoid CastError 500
      if (!id || !require('mongoose').Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'รหัสหมวดหมู่ไม่ถูกต้อง'
        });
      }

      const category = await Category.findById(id)
        .populate('createdBy', 'name')
        .populate('updatedBy', 'name');

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบหมวดหมู่ที่ระบุ'
        });
      }

      res.json({
        success: true,
        data: category
      });
    } catch (error) {
      console.error('Error fetching category by id:', req.params?.id, error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลหมวดหมู่',
        error: error.message
      });
    }
  },

  // Create new category
  create: async (req, res) => {
    try {
      const { name, name_en, description, color, order } = req.body;
      const userId = req.user?.id; // Only use if authenticated

      // Check if category name already exists
      const existingCategory = await Category.findOne({ name });
      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'ชื่อหมวดหมู่นี้มีอยู่แล้ว'
        });
      }

      const categoryData = {
        name,
        name_en,
        description,
        color,
        order: order || 0
      };

      // Only add createdBy if user is authenticated
      if (userId) {
        categoryData.createdBy = userId;
      }

      // Handle icon upload
      if (req.file) {
        categoryData.icon = `/uploads/frontstore/categories/${req.file.filename}`;
      }

      const category = new Category(categoryData);
      await category.save();

      const populatedCategory = await Category.findById(category._id)
        .populate('createdBy', 'name');

      res.status(201).json({
        success: true,
        message: 'สร้างหมวดหมู่สำเร็จ',
        data: populatedCategory
      });
    } catch (error) {
      console.error('Error creating category:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการสร้างหมวดหมู่',
        error: error.message
      });
    }
  },

  // Update category
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, name_en, description, color } = req.body;
      // Normalize numeric & boolean fields coming from multipart/form-data
      let { order, isActive } = req.body;
      if (order !== undefined) {
        const parsedOrder = parseInt(order, 10);
        order = isNaN(parsedOrder) ? 0 : parsedOrder;
      }
      if (isActive !== undefined) {
        // Accept many truthy strings ("true","on","1")
        isActive = (isActive === true || isActive === 'true' || isActive === 'on' || isActive === '1');
      }
      const userId = req.user?.id; // Only use if authenticated

      if (!id || !require('mongoose').Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'รหัสหมวดหมู่ไม่ถูกต้อง'
        });
      }

      const category = await Category.findById(id);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบหมวดหมู่ที่ระบุ'
        });
      }

      // Check if new name conflicts with existing categories
      if (name && name !== category.name) {
        const existingCategory = await Category.findOne({ name, _id: { $ne: id } });
        if (existingCategory) {
          return res.status(400).json({
            success: false,
            message: 'ชื่อหมวดหมู่นี้มีอยู่แล้ว'
          });
        }
      }

      // Update fields
      if (name) category.name = name;
      if (name_en !== undefined) category.name_en = name_en;
      if (description !== undefined) category.description = description;
  if (color) category.color = color;
  if (order !== undefined) category.order = order;
  if (isActive !== undefined) category.isActive = isActive;

      // Only set updatedBy if user is authenticated
      if (userId) {
        category.updatedBy = userId;
      }

      // Handle icon upload
      if (req.file) {
        // Delete old icon file if exists
        if (category.icon) {
          const oldIconPath = path.join(__dirname, '../../', category.icon);
          try {
            await fs.unlink(oldIconPath);
          } catch (err) {
            console.log('Could not delete old icon file:', err.message);
          }
        }
        category.icon = `/uploads/frontstore/categories/${req.file.filename}`;
      }

      await category.save();

      const updatedCategory = await Category.findById(id)
        .populate('createdBy', 'name')
        .populate('updatedBy', 'name');

      res.json({
        success: true,
        message: 'อัปเดตหมวดหมู่สำเร็จ',
        data: updatedCategory
      });
    } catch (error) {
      // Duplicate slug / name handling
      if (error.code === 11000 && (error.keyPattern?.slug || error.keyPattern?.name)) {
        return res.status(400).json({
          success: false,
          message: 'ชื่อหรือ slug ของหมวดหมู่ซ้ำ'
        });
      }
      // Validation errors (e.g. required name)
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
            message: Object.values(error.errors).map(e=>e.message).join(', ')
        });
      }
      console.error('Error updating category id:', req.params?.id, 'body:', req.body, error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการอัปเดตหมวดหมู่',
        error: error.message
      });
    }
  },

  // Delete category
  delete: async (req, res) => {
    try {
      const { id } = req.params;

      const category = await Category.findById(id);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบหมวดหมู่ที่ระบุ'
        });
      }

      // Delete icon file if exists
      if (category.icon) {
        const iconPath = path.join(__dirname, '../../', category.icon);
        try {
          await fs.unlink(iconPath);
        } catch (err) {
          console.log('Could not delete icon file:', err.message);
        }
      }

      await Category.findByIdAndDelete(id);

      res.json({
        success: true,
        message: 'ลบหมวดหมู่สำเร็จ'
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการลบหมวดหมู่',
        error: error.message
      });
    }
  },

  // Reorder categories
  reorder: async (req, res) => {
    try {
      const { categories } = req.body; // Array of { id, order }
      const userId = req.user?.id; // Only use if authenticated

      const updatePromises = categories.map(({ id, order }) => {
        const updateData = { order };
        // Only set updatedBy if user is authenticated
        if (userId) {
          updateData.updatedBy = userId;
        }
        return Category.findByIdAndUpdate(id, updateData, { new: true });
      });

      await Promise.all(updatePromises);

      res.json({
        success: true,
        message: 'เรียงลำดับหมวดหมู่สำเร็จ'
      });
    } catch (error) {
      console.error('Error reordering categories:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการเรียงลำดับหมวดหมู่',
        error: error.message
      });
    }
  },

  // Upload middleware
  uploadIcon: upload.single('icon')
};

module.exports = categoryController;
