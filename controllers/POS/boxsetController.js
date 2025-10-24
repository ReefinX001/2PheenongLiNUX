const Boxset = require('../../models/POS/Boxset');
const BranchStock = require('../../models/POS/BranchStock');
const CategoryGroup = require('../../models/Stock/CategoryGroup');

/**
 * สร้าง Boxset ใหม่
 * POST /api/boxset
 */
exports.createBoxset = async (req, res) => {
  try {
    console.log('🔍 Creating new boxset:', req.body);
    console.log('🔍 totalCost received:', req.body.totalCost);
    console.log('🔍 products received:', req.body.products);

    const {
      name,
      description,
      boxsetType,
      branchCode,
      products,
      boxsetPrice,
      purchaseTypes,
      installmentConfig,
      categoryGroup,
      totalCost,
      saleTypes
    } = req.body;

    // Validate required fields
    if (!name || !branchCode || !products || products.length === 0 || !boxsetPrice) {
      return res.status(400).json({
        success: false,
        error: 'กรุณากรอกข้อมูลให้ครบถ้วน (ชื่อ, สาขา, สินค้า, ราคา)'
      });
    }

    // Validate products exist in branch stock
    const productIds = products.map(p => p.productId);
    const stockProducts = await BranchStock.find({
      _id: { $in: productIds },
      branch_code: branchCode,
      verified: true,
      stock_value: { $gt: 0 }
    });

    if (stockProducts.length !== products.length) {
      return res.status(400).json({
        success: false,
        error: 'มีสินค้าบางรายการที่ไม่มีในสต็อกหรือหมดแล้ว'
      });
    }

    // Check if boxset name already exists in branch
    const existingBoxset = await Boxset.findOne({
      name: name,
      branchCode: branchCode,
      status: { $ne: 'inactive' }
    });

    if (existingBoxset) {
      return res.status(400).json({
        success: false,
        error: 'ชื่อ Boxset นี้มีอยู่แล้วในสาขา'
      });
    }

    // Create boxset
    const boxset = new Boxset({
      name,
      description,
      boxsetType: boxsetType || 'normal',
      branchCode,
      products,
      boxsetPrice,
      purchaseTypes: purchaseTypes || saleTypes || ['cash'],
      saleTypes: saleTypes || purchaseTypes || ['cash'],
      installmentConfig,
      categoryGroup,
      totalCost: totalCost,
      createdBy: req.user?._id || req.body.createdBy
    });

    await boxset.save();

    // Populate the created boxset
    const populatedBoxset = await Boxset.findById(boxset._id)
      .populate('products.productId', 'name brand model imei price cost')
      .populate('createdBy', 'name username')
      .populate('categoryGroup', 'name unitName');

    console.log('✅ Boxset created successfully:', populatedBoxset._id);

    res.status(201).json({
      success: true,
      data: populatedBoxset,
      message: 'สร้าง Boxset สำเร็จ'
    });

  } catch (error) {
    console.error('❌ Error creating boxset:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการสร้าง Boxset',
      message: error.message
    });
  }
};

/**
 * ดึงข้อมูล Boxset ทั้งหมดของสาขา
 * GET /api/boxset?branchCode=xxx
 */
exports.getBoxsets = async (req, res) => {
  try {
    const { branchCode, status = 'active' } = req.query;

    if (!branchCode) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุรหัสสาขา'
      });
    }

    const filter = { branchCode };
    if (status !== 'all') {
      filter.status = status;
    }

    const boxsets = await Boxset.find(filter)
      .populate('products.productId', 'name brand model imei price cost image')
      .populate('createdBy', 'name username')
      .populate('categoryGroup', 'name unitName')
      .sort({ created_at: -1 });

    res.json({
      success: true,
      data: boxsets,
      total: boxsets.length
    });

  } catch (error) {
    console.error('❌ Error getting boxsets:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูล Boxset',
      message: error.message
    });
  }
};

/**
 * ดึงข้อมูล Boxset ตาม ID
 * GET /api/boxset/:id
 */
exports.getBoxsetById = async (req, res) => {
  try {
    const { id } = req.params;

    const boxset = await Boxset.findById(id)
      .populate('products.productId', 'name brand model imei price cost image stockType')
      .populate('createdBy', 'name username')
      .populate('updatedBy', 'name username')
      .populate('categoryGroup', 'name unitName');

    if (!boxset) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบ Boxset ที่ระบุ'
      });
    }

    res.json({
      success: true,
      data: boxset
    });

  } catch (error) {
    console.error('❌ Error getting boxset by ID:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูล Boxset',
      message: error.message
    });
  }
};

/**
 * อัพเดต Boxset
 * PUT /api/boxset/:id
 */
exports.updateBoxset = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Set updated by
    updateData.updatedBy = req.user?._id || req.body.updatedBy;
    updateData.updated_at = new Date();

    const boxset = await Boxset.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('products.productId', 'name brand model imei price cost image')
      .populate('createdBy', 'name username')
      .populate('updatedBy', 'name username')
      .populate('categoryGroup', 'name unitName');

    if (!boxset) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบ Boxset ที่ระบุ'
      });
    }

    res.json({
      success: true,
      data: boxset,
      message: 'อัพเดต Boxset สำเร็จ'
    });

  } catch (error) {
    console.error('❌ Error updating boxset:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการอัพเดต Boxset',
      message: error.message
    });
  }
};

/**
 * ลบ Boxset (Soft Delete)
 * DELETE /api/boxset/:id
 */
exports.deleteBoxset = async (req, res) => {
  try {
    const { id } = req.params;

    const boxset = await Boxset.findByIdAndUpdate(
      id,
      {
        status: 'inactive',
        updatedBy: req.user?._id || req.body.updatedBy,
        updated_at: new Date()
      },
      { new: true }
    );

    if (!boxset) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบ Boxset ที่ระบุ'
      });
    }

    res.json({
      success: true,
      data: boxset,
      message: 'ลบ Boxset สำเร็จ'
    });

  } catch (error) {
    console.error('❌ Error deleting boxset:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการลบ Boxset',
      message: error.message
    });
  }
};

/**
 * ดึงข้อมูล Boxset ในรูปแบบที่ใช้กับ POS (เหมือน BranchStock)
 * GET /api/boxset/stock-format?branchCode=xxx
 */
exports.getBoxsetsForPOS = async (req, res) => {
  try {
    const { branchCode, purchaseType } = req.query;

    if (!branchCode) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุรหัสสาขา'
      });
    }

    let filter = {
      branchCode,
      status: 'active',
      stock_value: { $gt: 0 }
    };

    // Filter by purchase type if specified
    if (purchaseType) {
      const types = purchaseType.split(',').map(t => t.trim());
      filter.purchaseTypes = { $in: types };
    }

    const boxsets = await Boxset.find(filter)
      .populate('products.productId', 'name brand model imei price cost image')
      .populate('categoryGroup', 'name unitName')
      .sort({ created_at: -1 });

    // Convert to stock format for POS compatibility
    const stockFormatData = boxsets.map(boxset => boxset.toStockFormat());

    res.json({
      success: true,
      data: stockFormatData,
      total: stockFormatData.length
    });

  } catch (error) {
    console.error('❌ Error getting boxsets for POS:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูล Boxset สำหรับ POS',
      message: error.message
    });
  }
};

/**
 * อัพเดตสต็อก Boxset
 * PATCH /api/boxset/:id/stock
 */
exports.updateBoxsetStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { stock_value, operation = 'set' } = req.body;

    const boxset = await Boxset.findById(id);
    if (!boxset) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบ Boxset ที่ระบุ'
      });
    }

    let newStockValue;
    switch (operation) {
      case 'decrease':
        newStockValue = Math.max(0, boxset.stock_value - (stock_value || 1));
        break;
      case 'increase':
        newStockValue = boxset.stock_value + (stock_value || 1);
        break;
      case 'set':
      default:
        newStockValue = stock_value;
        break;
    }

    await boxset.updateStock(newStockValue);

    res.json({
      success: true,
      data: {
        _id: boxset._id,
        name: boxset.name,
        previousStock: boxset.stock_value,
        newStock: newStockValue,
        operation
      },
      message: 'อัพเดตสต็อก Boxset สำเร็จ'
    });

  } catch (error) {
    console.error('❌ Error updating boxset stock:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการอัพเดตสต็อก Boxset',
      message: error.message
    });
  }
};

/**
 * ค้นหา Boxset
 * GET /api/boxset/search?branchCode=xxx&q=yyy
 */
exports.searchBoxsets = async (req, res) => {
  try {
    const { branchCode, q, purchaseType } = req.query;

    if (!branchCode || !q) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุรหัสสาขาและคำค้นหา'
      });
    }

    let filter = {
      branchCode,
      status: 'active',
      stock_value: { $gt: 0 },
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ]
    };

    // Filter by purchase type if specified
    if (purchaseType) {
      const types = purchaseType.split(',').map(t => t.trim());
      filter.purchaseTypes = { $in: types };
    }

    const boxsets = await Boxset.find(filter)
      .populate('products.productId', 'name brand model imei price cost image')
      .populate('categoryGroup', 'name unitName')
      .limit(20)
      .sort({ created_at: -1 });

    res.json({
      success: true,
      data: boxsets,
      total: boxsets.length,
      query: q
    });

  } catch (error) {
    console.error('❌ Error searching boxsets:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการค้นหา Boxset',
      message: error.message
    });
  }
};

/**
 * ตรวจสอบความพร้อมของสินค้าใน Boxset
 * POST /api/boxset/check-availability
 */
exports.checkBoxsetAvailability = async (req, res) => {
  try {
    const { boxsetId, branchCode } = req.body;

    const boxset = await Boxset.findById(boxsetId)
      .populate('products.productId', 'name brand model imei stock_value verified');

    if (!boxset) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบ Boxset ที่ระบุ'
      });
    }

    if (boxset.branchCode !== branchCode) {
      return res.status(400).json({
        success: false,
        error: 'Boxset ไม่อยู่ในสาขาที่ระบุ'
      });
    }

    // Check availability of each product
    const availability = [];
    let allAvailable = true;

    for (const product of boxset.products) {
      const stockItem = product.productId;
      const isAvailable = stockItem &&
                         stockItem.verified &&
                         stockItem.stock_value >= product.quantity;

      availability.push({
        productId: stockItem?._id,
        name: stockItem?.name || 'Unknown',
        brand: stockItem?.brand,
        model: stockItem?.model,
        imei: stockItem?.imei,
        requiredQuantity: product.quantity,
        availableQuantity: stockItem?.stock_value || 0,
        isAvailable
      });

      if (!isAvailable) {
        allAvailable = false;
      }
    }

    res.json({
      success: true,
      data: {
        boxsetId: boxset._id,
        boxsetName: boxset.name,
        allAvailable,
        boxsetAvailable: allAvailable && boxset.stock_value > 0,
        boxsetStock: boxset.stock_value,
        productsAvailability: availability
      }
    });

  } catch (error) {
    console.error('❌ Error checking boxset availability:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการตรวจสอบความพร้อม Boxset',
      message: error.message
    });
  }
};