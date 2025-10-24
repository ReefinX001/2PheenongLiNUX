// routes/assetRoutes.js
const express = require('express');
const router = express.Router();
const Asset = require('../models/Account/Asset');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/assets');
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

// GET /api/assets/last-document-number - Get last document number for today
router.get('/last-document-number', async (req, res) => {
  try {
    const { date } = req.query; // Expected format: YYMMDD

    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'Date parameter is required (format: YYMMDD)'
      });
    }

    // Search for assets with document numbers containing the date
    const pattern = new RegExp(`^AP-${date}-\\d{3}$`);

    const lastAsset = await Asset.findOne({
      documentNumber: { $regex: pattern }
    }).sort({ documentNumber: -1 });

    let lastNumber = null;
    if (lastAsset && lastAsset.documentNumber) {
      lastNumber = lastAsset.documentNumber;
    }

    res.json({
      success: true,
      lastNumber: lastNumber,
      message: lastNumber ? 'Last document number found' : 'No document number found for this date'
    });

  } catch (error) {
    console.error('Error fetching last document number:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch last document number'
    });
  }
});

// GET /api/assets - Get all assets
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      status = 'all',
      search,
      sortBy = 'purchaseDate',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { assetNumber: { $regex: search, $options: 'i' } },
        { supplier: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const assets = await Asset.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy', 'username email')
      .populate('branch', 'name');

    // Get total count for pagination
    const total = await Asset.countDocuments(filter);

    // Calculate totals
    const totals = await Asset.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalPurchaseValue: { $sum: '$totalPrice' },
          totalBookValue: { $sum: '$bookValue' },
          totalDepreciation: { $sum: '$accumulatedDepreciation' }
        }
      }
    ]);

    res.json({
      success: true,
      data: assets,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total: total,
        limit: parseInt(limit)
      },
      totals: totals[0] || {
        totalPurchaseValue: 0,
        totalBookValue: 0,
        totalDepreciation: 0
      }
    });

  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสินทรัพย์',
      error: error.message
    });
  }
});

// GET /api/assets/:id - Get asset by ID
router.get('/:id', async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id)
      .populate('createdBy', 'username email')
      .populate('updatedBy', 'username email')
      .populate('branch', 'name');

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลสินทรัพย์'
      });
    }

    res.json({
      success: true,
      data: asset
    });

  } catch (error) {
    console.error('Error fetching asset:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสินทรัพย์',
      error: error.message
    });
  }
});

// POST /api/assets - Create new asset(s)
router.post('/', upload.array('fileUpload', 10), async (req, res) => {
  try {
    const {
      docNumber, // เพิ่มฟิลด์ documentNumber
      purchaseDate,
      supplier,
      referenceDoc,
      paymentTerms,
      paymentMethod,
      paymentDate,
      notes,
      assetName,
      assetCategory,
      quantity,
      unitPrice,
      discountValue,
      discountType,
      taxType,
      vatRate
    } = req.body;

    // Validate required fields
    if (!purchaseDate || !supplier || !docNumber) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกข้อมูลที่จำเป็น: เลขที่เอกสาร วันที่ซื้อ และผู้จำหน่าย'
      });
    }

    // Handle arrays - ensure they are arrays
    const names = Array.isArray(assetName) ? assetName : [assetName];
    const categories = Array.isArray(assetCategory) ? assetCategory : [assetCategory];
    const quantities = Array.isArray(quantity) ? quantity : [quantity];
    const unitPrices = Array.isArray(unitPrice) ? unitPrice : [unitPrice];
    const discountValues = Array.isArray(discountValue) ? discountValue : [discountValue || 0];
    const discountTypes = Array.isArray(discountType) ? discountType : [discountType || 'percent'];

    // Validate arrays have same length
    if (names.length !== quantities.length || names.length !== unitPrices.length) {
      return res.status(400).json({
        success: false,
        message: 'ข้อมูลรายการสินทรัพย์ไม่สอดคล้องกัน'
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

    // Create assets
    const createdAssets = [];

    for (let i = 0; i < names.length; i++) {
      if (!names[i] || !quantities[i] || !unitPrices[i]) {
        continue; // Skip empty rows
      }

      const qty = parseFloat(quantities[i]) || 1;
      const price = parseFloat(unitPrices[i]) || 0;
      const discountVal = parseFloat(discountValues[i]) || 0;
      const discountTyp = discountTypes[i] || 'percent';

      // Calculate discount amount
      let discountAmount = 0;
      if (discountVal > 0) {
        if (discountTyp === 'percent') {
          discountAmount = (qty * price) * (discountVal / 100);
        } else {
          discountAmount = discountVal;
        }
      }

      const totalBeforeDiscount = qty * price;
      const totalAfterDiscount = Math.max(0, totalBeforeDiscount - discountAmount);

      // Calculate tax
      let vatAmount = 0;
      let finalTotal = totalAfterDiscount;

      if (taxType && taxType !== 'no_tax') {
        const vatRateNum = parseFloat(vatRate) || 7;
        if (taxType === 'exclude_tax') {
          vatAmount = totalAfterDiscount * (vatRateNum / 100);
          finalTotal = totalAfterDiscount + vatAmount;
        } else if (taxType === 'include_tax') {
          finalTotal = totalAfterDiscount;
          vatAmount = totalAfterDiscount - (totalAfterDiscount / (1 + vatRateNum / 100));
        }
      }

      const assetData = {
        documentNumber: docNumber, // เพิ่มเลขที่เอกสาร
        name: names[i],
        category: categories[i] || 'equipment',
        purchaseDate: new Date(purchaseDate),
        quantity: qty,
        unitPrice: price,
        discountValue: discountVal,
        discountType: discountTyp,
        discountAmount: discountAmount,
        totalPrice: totalAfterDiscount,
        vatAmount: vatAmount,
        finalTotal: finalTotal,
        taxType: taxType || 'exclude_tax',
        vatRate: parseFloat(vatRate) || 7,
        supplier: supplier,
        referenceDoc: referenceDoc || '',
        paymentTerms: paymentTerms || 'cash',
        paymentMethod: paymentMethod || 'cash_on_hand',
        paymentDate: paymentDate ? new Date(paymentDate) : null,
        notes: notes || '',
        attachments: attachments, // Attach files to each asset
        createdBy: req.user?.id || null,
        branch: req.user?.branch || null
      };

      const asset = new Asset(assetData);
      const savedAsset = await asset.save();
      createdAssets.push(savedAsset);
    }

    if (createdAssets.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกข้อมูลรายการสินทรัพย์อย่างน้อย 1 รายการ'
      });
    }

    res.status(201).json({
      success: true,
      message: `บันทึกสินทรัพย์สำเร็จ จำนวน ${createdAssets.length} รายการ`,
      data: createdAssets
    });

  } catch (error) {
    console.error('Error creating assets:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการบันทึกสินทรัพย์',
      error: error.message
    });
  }
});

// PUT /api/assets/:id - Update asset
router.put('/:id', upload.array('fileUpload', 10), async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลสินทรัพย์'
      });
    }

    // Update fields
    const updateData = { ...req.body };

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
      updateData.attachments = [...(asset.attachments || []), ...newAttachments];
    }

    // Calculate total price if quantity or unit price changed
    if (updateData.quantity || updateData.unitPrice) {
      const qty = parseFloat(updateData.quantity) || asset.quantity;
      const price = parseFloat(updateData.unitPrice) || asset.unitPrice;
      updateData.totalPrice = qty * price;
    }

    updateData.updatedBy = req.user?.id || null;

    const updatedAsset = await Asset.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'อัปเดตข้อมูลสินทรัพย์สำเร็จ',
      data: updatedAsset
    });

  } catch (error) {
    console.error('Error updating asset:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัปเดตสินทรัพย์',
      error: error.message
    });
  }
});

// PATCH /api/assets/:id/status - Update asset status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;

    // Validate status
    const validStatuses = ['active', 'inactive', 'disposed', 'sold'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'สถานะไม่ถูกต้อง กรุณาเลือกสถานะที่ถูกต้อง'
      });
    }

    const asset = await Asset.findByIdAndUpdate(
      req.params.id,
      {
        status: status,
        updatedBy: req.user?.id || null,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลสินทรัพย์'
      });
    }

    res.json({
      success: true,
      message: 'อัปเดตสถานะสินทรัพย์สำเร็จ',
      data: asset
    });

  } catch (error) {
    console.error('Error updating asset status:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัปเดตสถานะ',
      error: error.message
    });
  }
});

// DELETE /api/assets/:id - Delete asset
router.delete('/:id', async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลสินทรัพย์'
      });
    }

    // Delete attached files
    if (asset.attachments && asset.attachments.length > 0) {
      for (const attachment of asset.attachments) {
        try {
          if (fs.existsSync(attachment.filePath)) {
            fs.unlinkSync(attachment.filePath);
          }
        } catch (fileError) {
          console.warn('Warning: Could not delete file:', attachment.filePath);
        }
      }
    }

    await Asset.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'ลบสินทรัพย์สำเร็จ'
    });

  } catch (error) {
    console.error('Error deleting asset:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบสินทรัพย์',
      error: error.message
    });
  }
});

// GET /api/assets/summary/stats - Get assets summary statistics
router.get('/summary/stats', async (req, res) => {
  try {
    const summary = await Asset.getSummary();

    const categoryStats = await Asset.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalValue: { $sum: '$totalPrice' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        statusSummary: summary,
        categorySummary: categoryStats
      }
    });

  } catch (error) {
    console.error('Error getting assets summary:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสรุป',
      error: error.message
    });
  }
});

// PUT /api/assets/:id/depreciation - Update depreciation
router.put('/:id/depreciation', async (req, res) => {
  try {
    const { accumulatedDepreciation } = req.body;

    const asset = await Asset.findByIdAndUpdate(
      req.params.id,
      {
        accumulatedDepreciation: parseFloat(accumulatedDepreciation) || 0,
        updatedBy: req.user?.id || null
      },
      { new: true, runValidators: true }
    );

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลสินทรัพย์'
      });
    }

    res.json({
      success: true,
      message: 'อัปเดตค่าเสื่อมสะสมสำเร็จ',
      data: asset
    });

  } catch (error) {
    console.error('Error updating depreciation:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัปเดตค่าเสื่อม',
      error: error.message
    });
  }
});

// PATCH /api/assets/:id/status - Update asset status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['active', 'inactive', 'disposed', 'sold'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'สถานะไม่ถูกต้อง'
      });
    }

    const asset = await Asset.findByIdAndUpdate(
      id,
      {
        status: status,
        updatedBy: req.user?.id || null,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลสินทรัพย์'
      });
    }

    res.json({
      success: true,
      message: 'อัปเดตสถานะสินทรัพย์สำเร็จ',
      data: asset
    });

  } catch (error) {
    console.error('Error updating asset status:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัปเดตสถานะ',
      error: error.message
    });
  }
});

module.exports = router;
