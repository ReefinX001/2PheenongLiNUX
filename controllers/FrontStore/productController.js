const Product = require('../../models/FrontStore/Product');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/frontstore/products');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `product-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit for product images and videos
  },
  fileFilter: (req, file, cb) => {
    const allowedImageTypes = /jpeg|jpg|png|webp/;
    const allowedVideoTypes = /mp4|webm|mov|avi/;
    const extname = path.extname(file.originalname).toLowerCase();
    const isImage = allowedImageTypes.test(extname) && file.mimetype.startsWith('image/');
    const isVideo = allowedVideoTypes.test(extname) && file.mimetype.startsWith('video/');

    if (isImage || isVideo) {
      return cb(null, true);
    } else {
      cb(new Error('กรุณาอัปโหลดไฟล์รูปภาพ (JPEG, PNG, WebP) หรือวิดีโอ (MP4, WebM, MOV, AVI) เท่านั้น'));
    }
  }
});

const productController = {
  // Get all products
  getAll: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        isActive,
        category,
        isFeatured
      } = req.query;

      const query = {};
      if (search) {
        query.$text = { $search: search };
      }
      if (isActive !== undefined) {
        query.isActive = isActive === 'true';
      }
      if (category) {
        query.category = category;
      }
      if (isFeatured !== undefined) {
        query.isFeatured = isFeatured === 'true';
      }

      const products = await Product.find(query)
        .sort({ order: 1, isFeatured: -1, createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('createdBy', 'name')
        .populate('updatedBy', 'name')
        .exec();

      const total = await Product.countDocuments(query);

      res.json({
        success: true,
        data: products,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสินค้า',
        error: error.message
      });
    }
  },

  // Get active products for frontend
  getActive: async (req, res) => {
    try {
      const { category, featured, limit = 20 } = req.query;

      const query = { isActive: true };

      if (category) {
        query.category = category;
      }
      if (featured !== undefined) {
        query.isFeatured = featured === 'true';
      }

      const products = await Product.find(query)
        .sort({ order: 1, isFeatured: -1, createdAt: -1 })
        .limit(parseInt(limit))
        .select('-createdBy -updatedBy -clickCount')
        .exec();

      res.json({
        success: true,
        data: products
      });
    } catch (error) {
      console.error('Error fetching active products:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสินค้า',
        error: error.message
      });
    }
  },

  // Get product by ID
  getById: async (req, res) => {
    try {
      const product = await Product.findById(req.params.id)
        .populate('createdBy', 'name')
        .populate('updatedBy', 'name');

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบสินค้าที่ระบุ'
        });
      }

      res.json({
        success: true,
        data: product
      });
    } catch (error) {
      console.error('Error fetching product:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสินค้า',
        error: error.message
      });
    }
  },

  // Create new product
  create: [
    (req, res, next) => {
      upload.single('image')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              success: false,
              message: 'ไฟล์ใหญ่เกินไป (สูงสุด 100MB)'
            });
          }
          return res.status(400).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์: ' + err.message
          });
        } else if (err) {
          return res.status(400).json({
            success: false,
            message: err.message
          });
        }
        next();
      });
    },
    async (req, res) => {
      try {
        const {
          name,
          name_en,
          tagline,
          price,
          subtitle,
          category,
          order,
          isFeatured,
          tags,
          specifications
        } = req.body;

        const userId = req.user?.id; // Only use if authenticated

        if (!req.file) {
          return res.status(400).json({
            success: false,
            message: 'กรุณาอัปโหลดรูปภาพสินค้า'
          });
        }

        const productData = {
          name: name || `Product ${Date.now()}`,
          name_en,
          tagline,
          price,
          subtitle,
          category,
          order: order ? parseInt(order) : 0,
          isFeatured: isFeatured === 'true',
          tags: tags ? JSON.parse(tags) : [],
          specifications: specifications ? JSON.parse(specifications) : {}
        };

        // Only add createdBy if user is authenticated
        if (userId) {
          productData.createdBy = userId;
        }

        // Handle image upload
        const imagePath = `/uploads/frontstore/products/${req.file.filename}`;
        productData.image = imagePath;

        const product = new Product(productData);
        await product.save();

        const populatedProduct = await Product.findById(product._id)
          .populate('createdBy', 'name');

        res.status(201).json({
          success: true,
          message: 'สร้างสินค้าสำเร็จ',
          data: populatedProduct
        });
      } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({
          success: false,
          message: 'เกิดข้อผิดพลาดในการสร้างสินค้า',
          error: error.message
        });
      }
    }
  ],

  // Update product
  update: [
    upload.single('image'),
    async (req, res) => {
      try {
        const { id } = req.params;
        const {
          name,
          name_en,
          tagline,
          price,
          subtitle,
          category,
          isActive,
          isFeatured,
          order,
          tags,
          specifications
        } = req.body;

        const userId = req.user?.id;

        const product = await Product.findById(id);
        if (!product) {
          return res.status(404).json({
            success: false,
            message: 'ไม่พบสินค้าที่ระบุ'
          });
        }

        // Update fields
        if (name !== undefined) product.name = name;
        if (name_en !== undefined) product.name_en = name_en;
        if (tagline !== undefined) product.tagline = tagline;
        if (price !== undefined) product.price = price;
        if (subtitle !== undefined) product.subtitle = subtitle;
        if (category !== undefined) product.category = category;
        if (isActive !== undefined) product.isActive = isActive === 'true';
        if (isFeatured !== undefined) product.isFeatured = isFeatured === 'true';
        if (order !== undefined) product.order = parseInt(order);
        if (tags) product.tags = JSON.parse(tags);
        if (specifications) product.specifications = JSON.parse(specifications);

        // Only set updatedBy if user is authenticated
        if (userId) {
          product.updatedBy = userId;
        }

        // Handle image upload
        if (req.file) {
          // Delete old image file
          if (product.image) {
            const oldImagePath = path.join(__dirname, '../../', product.image);
            try {
              await fs.unlink(oldImagePath);
            } catch (err) {
              console.log('Could not delete old image file:', err.message);
            }
          }

          // Set new image - no thumbnail creation
          product.image = `/uploads/frontstore/products/${req.file.filename}`;
        }

        await product.save();

        const updatedProduct = await Product.findById(id)
          .populate('createdBy', 'name')
          .populate('updatedBy', 'name');

        res.json({
          success: true,
          message: 'อัปเดตสินค้าสำเร็จ',
          data: updatedProduct
        });
      } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({
          success: false,
          message: 'เกิดข้อผิดพลาดในการอัปเดตสินค้า',
          error: error.message
        });
      }
    }
  ],

  // Delete product
  delete: async (req, res) => {
    try {
      const { id } = req.params;

      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบสินค้าที่ระบุ'
        });
      }

      // Delete image file
      if (product.image) {
        const imagePath = path.join(__dirname, '../../', product.image);
        try {
          await fs.unlink(imagePath);
        } catch (err) {
          console.log('Could not delete image file:', err.message);
        }
      }

      await Product.findByIdAndDelete(id);

      res.json({
        success: true,
        message: 'ลบสินค้าสำเร็จ'
      });
    } catch (error) {
      console.error('Error deleting product:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการลบสินค้า',
        error: error.message
      });
    }
  },

  // Middleware for file upload
  uploadMiddleware: upload.single('image')
};

module.exports = productController;
