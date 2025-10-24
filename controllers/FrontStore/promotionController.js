const Promotion = require('../../models/FrontStore/Promotion');
const Category = require('../../models/FrontStore/Category');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/frontstore/promotions');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `promotion-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น (JPEG, PNG, WebP)'));
    }
  }
});

// Thumbnail creation removed - using original images only

const promotionController = {
  // Get all promotions
  getAll: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        isActive,
        promotionType,
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
      if (promotionType) {
        query.promotionType = promotionType;
      }
      if (category) {
        query.category = category;
      }
      if (isFeatured !== undefined) {
        query.isFeatured = isFeatured === 'true';
      }

      const promotions = await Promotion.find(query)
        .sort({ order: 1, isFeatured: -1, createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('category', 'name color')
        .populate('createdBy', 'name')
        .populate('updatedBy', 'name')
        .exec();

      const total = await Promotion.countDocuments(query);

      res.json({
        success: true,
        data: promotions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching promotions:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลโปรโมชั่น',
        error: error.message
      });
    }
  },

  // Get active promotions for frontend
  getActive: async (req, res) => {
    try {
      const { category, featured, limit = 20 } = req.query;

      const query = {
        isActive: true,
        $or: [
          { startDate: { $lte: new Date() } },
          { startDate: null }
        ],
        $or: [
          { endDate: { $gte: new Date() } },
          { endDate: null }
        ]
      };

      if (category) {
        query.category = category;
      }
      if (featured !== undefined) {
        query.isFeatured = featured === 'true';
      }

      const promotions = await Promotion.find(query)
        .sort({ order: 1, isFeatured: -1, createdAt: -1 })
        .limit(parseInt(limit))
        .populate('category', 'name color')
        .select('-createdBy -updatedBy -clickCount')
        .exec();

      res.json({
        success: true,
        data: promotions
      });
    } catch (error) {
      console.error('Error fetching active promotions:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลโปรโมชั่น',
        error: error.message
      });
    }
  },

  // Get promotion by ID
  getById: async (req, res) => {
    try {
      const promotion = await Promotion.findById(req.params.id)
        .populate('category', 'name color')
        .populate('createdBy', 'name')
        .populate('updatedBy', 'name');

      if (!promotion) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบโปรโมชั่นที่ระบุ'
        });
      }

      res.json({
        success: true,
        data: promotion
      });
    } catch (error) {
      console.error('Error fetching promotion:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลโปรโมชั่น',
        error: error.message
      });
    }
  },

  // Create new promotion
  create: async (req, res) => {
    try {
      const {
        title,
        subtitle,
        description,
        price,
        originalPrice,
        discountPercent,
        promotionType,
        category,
        startDate,
        endDate,
        isFeatured,
        order,
        link,
        cardStyle,
        tags
      } = req.body;

      const userId = req.user?.id; // Only use if authenticated

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'กรุณาอัปโหลดรูปภาพโปรโมชั่น'
        });
      }

      const promotionData = {
        title,
        subtitle,
        description,
        price,
        originalPrice,
        discountPercent: discountPercent ? parseInt(discountPercent) : undefined,
        promotionType: promotionType || 'general',
        category: category || undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        isFeatured: isFeatured === 'true',
        order: order ? parseInt(order) : 0,
        link,
        cardStyle: cardStyle ? JSON.parse(cardStyle) : undefined,
        tags: tags ? JSON.parse(tags) : []
      };

      // Only add createdBy if user is authenticated
      if (userId) {
        promotionData.createdBy = userId;
      }

      // Handle image upload
      const imagePath = `/uploads/frontstore/promotions/${req.file.filename}`;
      promotionData.image = imagePath;

      // No thumbnail creation - using original image only

      const promotion = new Promotion(promotionData);
      await promotion.save();

      const populatedPromotion = await Promotion.findById(promotion._id)
        .populate('category', 'name color')
        .populate('createdBy', 'name');

      res.status(201).json({
        success: true,
        message: 'สร้างโปรโมชั่นสำเร็จ',
        data: populatedPromotion
      });
    } catch (error) {
      console.error('Error creating promotion:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการสร้างโปรโมชั่น',
        error: error.message
      });
    }
  },

  // Update promotion
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        title,
        subtitle,
        description,
        price,
        originalPrice,
        discountPercent,
        promotionType,
        category,
        startDate,
        endDate,
        isActive,
        isFeatured,
        order,
        link,
        cardStyle,
        tags
      } = req.body;

      const userId = req.user?.id; // Only use if authenticated

      const promotion = await Promotion.findById(id);
      if (!promotion) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบโปรโมชั่นที่ระบุ'
        });
      }

      // Update fields
      if (title) promotion.title = title;
      if (subtitle !== undefined) promotion.subtitle = subtitle;
      if (description !== undefined) promotion.description = description;
      if (price !== undefined) promotion.price = price;
      if (originalPrice !== undefined) promotion.originalPrice = originalPrice;
      if (discountPercent !== undefined) promotion.discountPercent = parseInt(discountPercent);
      if (promotionType) promotion.promotionType = promotionType;
      if (category !== undefined) promotion.category = category || undefined;
      if (startDate !== undefined) promotion.startDate = startDate ? new Date(startDate) : undefined;
      if (endDate !== undefined) promotion.endDate = endDate ? new Date(endDate) : undefined;
      if (isActive !== undefined) promotion.isActive = isActive === 'true';
      if (isFeatured !== undefined) promotion.isFeatured = isFeatured === 'true';
      if (order !== undefined) promotion.order = parseInt(order);
      if (link !== undefined) promotion.link = link;
      if (cardStyle) promotion.cardStyle = JSON.parse(cardStyle);
      if (tags) promotion.tags = JSON.parse(tags);

      // Only set updatedBy if user is authenticated
      if (userId) {
        promotion.updatedBy = userId;
      }

      // Handle image upload
      if (req.file) {
        // Delete old image files
        if (promotion.image) {
          const oldImagePath = path.join(__dirname, '../../', promotion.image);
          try {
            await fs.unlink(oldImagePath);
          } catch (err) {
            console.log('Could not delete old image file:', err.message);
          }
        }
        if (promotion.thumbnailImage) {
          const oldThumbnailPath = path.join(__dirname, '../../', promotion.thumbnailImage);
          try {
            await fs.unlink(oldThumbnailPath);
          } catch (err) {
            console.log('Could not delete old thumbnail file:', err.message);
          }
        }

        // Set new image - no thumbnail creation
        promotion.image = `/uploads/frontstore/promotions/${req.file.filename}`;
      }

      await promotion.save();

      const updatedPromotion = await Promotion.findById(id)
        .populate('category', 'name color')
        .populate('createdBy', 'name')
        .populate('updatedBy', 'name');

      res.json({
        success: true,
        message: 'อัปเดตโปรโมชั่นสำเร็จ',
        data: updatedPromotion
      });
    } catch (error) {
      console.error('Error updating promotion:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการอัปเดตโปรโมชั่น',
        error: error.message
      });
    }
  },

  // Delete promotion
  delete: async (req, res) => {
    try {
      const { id } = req.params;

      const promotion = await Promotion.findById(id);
      if (!promotion) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบโปรโมชั่นที่ระบุ'
        });
      }

      // Delete image files
      if (promotion.image) {
        const imagePath = path.join(__dirname, '../../', promotion.image);
        try {
          await fs.unlink(imagePath);
        } catch (err) {
          console.log('Could not delete image file:', err.message);
        }
      }
      if (promotion.thumbnailImage) {
        const thumbnailPath = path.join(__dirname, '../../', promotion.thumbnailImage);
        try {
          await fs.unlink(thumbnailPath);
        } catch (err) {
          console.log('Could not delete thumbnail file:', err.message);
        }
      }

      await Promotion.findByIdAndDelete(id);

      res.json({
        success: true,
        message: 'ลบโปรโมชั่นสำเร็จ'
      });
    } catch (error) {
      console.error('Error deleting promotion:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการลบโปรโมชั่น',
        error: error.message
      });
    }
  },

  // Increment click count
  incrementClick: async (req, res) => {
    try {
      const { id } = req.params;

      await Promotion.findByIdAndUpdate(id, {
        $inc: { clickCount: 1 }
      });

      res.json({
        success: true,
        message: 'บันทึกการคลิกสำเร็จ'
      });
    } catch (error) {
      console.error('Error incrementing click count:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการบันทึกการคลิก',
        error: error.message
      });
    }
  },

  // Reorder promotions
  reorder: async (req, res) => {
    try {
      const { promotions } = req.body; // Array of { id, order }
      const userId = req.user?.id; // Only use if authenticated

      const updatePromises = promotions.map(({ id, order }) => {
        const updateData = { order };
        // Only set updatedBy if user is authenticated
        if (userId) {
          updateData.updatedBy = userId;
        }
        return Promotion.findByIdAndUpdate(id, updateData, { new: true });
      });

      await Promise.all(updatePromises);

      res.json({
        success: true,
        message: 'เรียงลำดับโปรโมชั่นสำเร็จ'
      });
    } catch (error) {
      console.error('Error reordering promotions:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการเรียงลำดับโปรโมชั่น',
        error: error.message
      });
    }
  },

  // Upload middleware
  uploadImage: upload.single('image')
};

module.exports = promotionController;
