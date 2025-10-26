// routes/goodsReceiptRoutes.js
const express = require('express');
const router = express.Router();
const GoodsReceipt = require('../models/Account/GoodsReceipt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/goods-receipts');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg', 'image/png', 'image/jpg',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('ประเภทไฟล์ไม่ถูกต้อง'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// GET /api/goods-receipts/generate-document-number - Generate new document number
router.get('/generate-document-number', async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();

    const documentNumber = await GoodsReceipt.generateDocumentNumber(targetDate);

    res.json({
      success: true,
      documentNumber: documentNumber,
      message: 'Document number generated successfully'
    });

  } catch (error) {
    console.error('Error generating document number:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate document number',
      message: error.message
    });
  }
});

// GET /api/goods-receipts - Get all goods receipts
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status = 'all',
      supplierId,
      poReference,
      search,
      startDate,
      endDate,
      sortBy = 'documentDate',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (supplierId) {
      filter.supplierId = supplierId;
    }

    if (poReference) {
      filter.poReference = poReference;
    }

    if (search) {
      filter.$or = [
        { documentNumber: { $regex: search, $options: 'i' } },
        { supplierName: { $regex: search, $options: 'i' } },
        { poReference: { $regex: search, $options: 'i' } }
      ];
    }

    // Date range filter
    if (startDate || endDate) {
      filter.documentDate = {};
      if (startDate) {
        filter.documentDate.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.documentDate.$lte = new Date(endDate);
      }
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const goodsReceipts = await GoodsReceipt.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('supplierId', 'name taxId address phone email')
      .populate('purchaseOrderId', 'documentNumber')
      .populate('createdBy', 'username email')
      .populate('branch', 'name');

    // Get total count for pagination
    const total = await GoodsReceipt.countDocuments(filter);

    // Calculate totals
    const totals = await GoodsReceipt.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$grandTotal' },
          totalItems: { $sum: { $size: '$items' } }
        }
      }
    ]);

    res.json({
      success: true,
      data: goodsReceipts,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total: total,
        limit: parseInt(limit)
      },
      totals: totals[0] || {
        totalAmount: 0,
        totalItems: 0
      }
    });

  } catch (error) {
    console.error('Error fetching goods receipts:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลใบรับสินค้า',
      error: error.message
    });
  }
});

// GET /api/goods-receipts/:id - Get goods receipt by ID
router.get('/:id', async (req, res) => {
  try {
    const goodsReceipt = await GoodsReceipt.findById(req.params.id)
      .populate('supplierId', 'name taxId address phone email contact')
      .populate('purchaseOrderId', 'documentNumber items')
      .populate('createdBy', 'username email')
      .populate('updatedBy', 'username email')
      .populate('branch', 'name');

    if (!goodsReceipt) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลใบรับสินค้า'
      });
    }

    res.json({
      success: true,
      data: goodsReceipt
    });

  } catch (error) {
    console.error('Error fetching goods receipt:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลใบรับสินค้า',
      error: error.message
    });
  }
});

// POST /api/goods-receipts - Create new goods receipt
router.post('/', upload.array('attachments', 10), async (req, res) => {
  try {
    const {
      documentNumber,
      documentDate,
      receiveDate,
      supplierId,
      supplierName,
      supplierTaxId,
      supplierAddress,
      supplierPhone,
      supplierEmail,
      supplierContact,
      poReference,
      purchaseOrderId,
      items,
      discountAmount,
      discountType,
      vatType,
      notes,
      status
    } = req.body;

    // Validate required fields
    if (!documentNumber || !supplierId || !supplierName) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกข้อมูลที่จำเป็น: เลขที่เอกสาร ผู้จำหน่าย'
      });
    }

    // Parse items (if sent as JSON string)
    let parsedItems = [];
    try {
      parsedItems = typeof items === 'string' ? JSON.parse(items) : items;
    } catch (e) {
      return res.status(400).json({
        success: false,
        message: 'รูปแบบข้อมูลรายการสินค้าไม่ถูกต้อง'
      });
    }

    if (!parsedItems || parsedItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ'
      });
    }

    // Process file uploads
    const attachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        attachments.push({
          fileName: file.filename,
          originalName: file.originalname,
          filePath: file.path,
          fileSize: file.size,
          mimeType: file.mimetype
        });
      }
    }

    // Create goods receipt
    const goodsReceiptData = {
      documentNumber,
      documentDate: documentDate ? new Date(documentDate) : new Date(),
      receiveDate: receiveDate ? new Date(receiveDate) : new Date(),
      supplierId,
      supplierName,
      supplierTaxId,
      supplierAddress,
      supplierPhone,
      supplierEmail,
      supplierContact,
      poReference,
      purchaseOrderId: purchaseOrderId || null,
      items: parsedItems,
      discountAmount: parseFloat(discountAmount) || 0,
      discountType: discountType || 'amount',
      vatType: vatType || 'excluded',
      notes: notes || '',
      status: status || 'draft',
      attachments: attachments,
      createdBy: req.user?.id || null,
      branch: req.user?.branch || null
    };

    const goodsReceipt = new GoodsReceipt(goodsReceiptData);
    const savedGoodsReceipt = await goodsReceipt.save();

    // Populate references before returning
    await savedGoodsReceipt.populate('supplierId', 'name taxId address phone email');

    res.status(201).json({
      success: true,
      message: 'บันทึกใบรับสินค้าสำเร็จ',
      data: savedGoodsReceipt
    });

  } catch (error) {
    console.error('Error creating goods receipt:', error);

    // Check for duplicate document number
    if (error.code === 11000 && error.keyPattern?.documentNumber) {
      return res.status(400).json({
        success: false,
        message: 'เลขที่เอกสารซ้ำ กรุณาใช้เลขที่เอกสารอื่น'
      });
    }

    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการบันทึกใบรับสินค้า',
      error: error.message
    });
  }
});

// PUT /api/goods-receipts/:id - Update goods receipt
router.put('/:id', upload.array('attachments', 10), async (req, res) => {
  try {
    const goodsReceipt = await GoodsReceipt.findById(req.params.id);

    if (!goodsReceipt) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลใบรับสินค้า'
      });
    }

    // Don't allow updates to completed receipts
    if (goodsReceipt.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'ไม่สามารถแก้ไขใบรับสินค้าที่บันทึกเรียบร้อยแล้ว'
      });
    }

    // Update fields
    const updateData = { ...req.body };

    // Parse items if needed
    if (updateData.items && typeof updateData.items === 'string') {
      try {
        updateData.items = JSON.parse(updateData.items);
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: 'รูปแบบข้อมูลรายการสินค้าไม่ถูกต้อง'
        });
      }
    }

    // Handle file uploads
    if (req.files && req.files.length > 0) {
      const newAttachments = [];
      for (const file of req.files) {
        newAttachments.push({
          fileName: file.filename,
          originalName: file.originalname,
          filePath: file.path,
          fileSize: file.size,
          mimeType: file.mimetype
        });
      }
      updateData.attachments = [...(goodsReceipt.attachments || []), ...newAttachments];
    }

    updateData.updatedBy = req.user?.id || null;

    const updatedGoodsReceipt = await GoodsReceipt.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('supplierId', 'name taxId address phone email');

    res.json({
      success: true,
      message: 'อัปเดตข้อมูลใบรับสินค้าสำเร็จ',
      data: updatedGoodsReceipt
    });

  } catch (error) {
    console.error('Error updating goods receipt:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัปเดตใบรับสินค้า',
      error: error.message
    });
  }
});

// PATCH /api/goods-receipts/:id/status - Update status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;

    // Validate status
    const validStatuses = ['draft', 'completed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'สถานะไม่ถูกต้อง'
      });
    }

    const goodsReceipt = await GoodsReceipt.findByIdAndUpdate(
      req.params.id,
      {
        status: status,
        updatedBy: req.user?.id || null,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!goodsReceipt) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลใบรับสินค้า'
      });
    }

    res.json({
      success: true,
      message: 'อัปเดตสถานะใบรับสินค้าสำเร็จ',
      data: goodsReceipt
    });

  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัปเดตสถานะ',
      error: error.message
    });
  }
});

// DELETE /api/goods-receipts/:id - Delete goods receipt
router.delete('/:id', async (req, res) => {
  try {
    const goodsReceipt = await GoodsReceipt.findById(req.params.id);

    if (!goodsReceipt) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลใบรับสินค้า'
      });
    }

    // Don't allow deletion of completed receipts
    if (goodsReceipt.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'ไม่สามารถลบใบรับสินค้าที่บันทึกเรียบร้อยแล้ว'
      });
    }

    // Delete attached files
    if (goodsReceipt.attachments && goodsReceipt.attachments.length > 0) {
      for (const attachment of goodsReceipt.attachments) {
        try {
          if (fs.existsSync(attachment.filePath)) {
            fs.unlinkSync(attachment.filePath);
          }
        } catch (fileError) {
          console.warn('Warning: Could not delete file:', attachment.filePath);
        }
      }
    }

    await GoodsReceipt.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'ลบใบรับสินค้าสำเร็จ'
    });

  } catch (error) {
    console.error('Error deleting goods receipt:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบใบรับสินค้า',
      error: error.message
    });
  }
});

// GET /api/goods-receipts/summary/stats - Get summary statistics
router.get('/summary/stats', async (req, res) => {
  try {
    const summary = await GoodsReceipt.getSummary();

    const monthlyStats = await GoodsReceipt.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$documentDate' },
            month: { $month: '$documentDate' }
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$grandTotal' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    res.json({
      success: true,
      data: {
        statusSummary: summary,
        monthlySummary: monthlyStats
      }
    });

  } catch (error) {
    console.error('Error getting summary:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสรุป',
      error: error.message
    });
  }
});

module.exports = router;
