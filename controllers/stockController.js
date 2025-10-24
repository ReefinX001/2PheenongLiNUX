const Stock = require('../models/Stock/Stock');
const { StockValidator, THAI_VALIDATION_MESSAGES } = require('../middlewares/stockValidation');

/**
 * Create or Update Stock Entry
 *
 * Creates a new stock entry or updates existing quantity for a product in a branch.
 * Includes comprehensive validation, real-time notifications, and Thai language support.
 *
 * @async
 * @function createStock
 * @description สร้างหรืออัปเดตสต็อกสินค้า พร้อมการตรวจสอบข้อมูลที่เข้มงวด
 *
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing stock data
 * @param {string} req.body.product_id - Product ObjectId (required)
 * @param {string} req.body.branch_code - Branch code (required)
 * @param {number} [req.body.quantity=0] - Quantity to add/update (optional)
 * @param {string} [req.body.updated_by] - User ObjectId who made the update (optional)
 * @param {Object} [req.sanitizedData] - Sanitized data from validation middleware
 * @param {Array} [req.validationWarnings] - Validation warnings from middleware
 * @param {Object} req.app - Express app instance with Socket.IO
 *
 * @param {Object} res - Express response object
 *
 * @returns {Promise<Object>} JSON response with success/error status
 *
 * @example
 * // Request body
 * {
 *   "product_id": "60f7b3b3b3b3b3b3b3b3b3b3",
 *   "branch_code": "00001",
 *   "quantity": 5,
 *   "updated_by": "60f7b3b3b3b3b3b3b3b3b3b4"
 * }
 *
 * @example
 * // Success response
 * {
 *   "success": true,
 *   "data": {
 *     "_id": "60f7b3b3b3b3b3b3b3b3b3b5",
 *     "product_id": "60f7b3b3b3b3b3b3b3b3b3b3",
 *     "branch_code": "00001",
 *     "quantity": 5,
 *     "updated_by": "60f7b3b3b3b3b3b3b3b3b3b4",
 *     "updatedAt": "2025-01-20T10:30:00.000Z"
 *   },
 *   "message": "อัปเดตข้อมูลสต็อกสำเร็จ",
 *   "timestamp": "2025-01-20T10:30:00.000Z"
 * }
 *
 * @throws {400} Validation error - Invalid or missing required fields
 * @throws {500} Server error - Database operation failed
 *
 * @fires Socket#stockUpdated - Broadcasted to branch-{branch_code} room
 * @fires Socket#stock_quantity_changed - Broadcasted to stock-{branch_code} room
 *
 * @since 1.0.0
 * @version 1.0.0
 */
exports.createStock = async (req, res) => {
  const io = req.app.get('io');

  try {
    // Use sanitized data from validation middleware if available
    const data = req.sanitizedData || req.body;
    const { product_id, branch_code, quantity, updated_by } = data;

    // Enhanced validation with detailed error messages
    const validationErrors = [];

    // Validate required fields
    if (!product_id) {
      validationErrors.push({
        field: 'product_id',
        message: THAI_VALIDATION_MESSAGES.REQUIRED_PRODUCT_ID
      });
    }

    if (!branch_code) {
      validationErrors.push({
        field: 'branch_code',
        message: THAI_VALIDATION_MESSAGES.REQUIRED_BRANCH_CODE
      });
    }

    // Validate quantity if provided
    if (quantity !== undefined && quantity !== null) {
      const quantityValidation = StockValidator.validateNumber(
        quantity,
        'quantity',
        { min: 0, max: 999999, integer: true }
      );

      if (!quantityValidation.isValid) {
        validationErrors.push(...quantityValidation.errors);
      }
    }

    // Return validation errors if any
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบและแก้ไข',
        validation_errors: validationErrors
      });
    }

    // Perform database operation with error handling
    const stock = await Stock.findOneAndUpdate(
      { product_id, branch_code }, // ค้นหาสินค้าเดิม
      {
        $inc: { quantity: quantity || 0 }, // บวกจำนวนแทนการสร้างใหม่
        updated_by: updated_by || null,
        updatedAt: new Date()
      },
      { new: true, upsert: true } // ถ้ายังไม่มี ให้สร้างใหม่
    );

    // Enhanced real-time notifications with proper error handling
    try {
      // Broadcast to specific branch
      io.to(`branch-${branch_code}`).emit('stockUpdated', {
        id: stock._id,
        data: stock,
        action: 'create_or_update',
        timestamp: new Date().toISOString(),
        message: 'ข้อมูลสต็อกได้รับการอัปเดต'
      });

      // Broadcast to stock monitoring room
      io.to(`stock-${branch_code}`).emit('stock_quantity_changed', {
        product_id: product_id,
        branch_code: branch_code,
        new_quantity: stock.quantity,
        change: quantity || 0,
        timestamp: new Date().toISOString()
      });

      console.log(`✅ Stock updated: ${product_id} in branch ${branch_code}, quantity: ${stock.quantity}`);

    } catch (socketError) {
      console.error('❌ Socket.IO broadcast error:', socketError);
      // Continue with response even if socket broadcast fails
    }

    // Include validation warnings in response if any
    const response = {
      success: true,
      data: stock,
      message: 'อัปเดตข้อมูลสต็อกสำเร็จ',
      timestamp: new Date().toISOString()
    };

    if (req.validationWarnings && req.validationWarnings.length > 0) {
      response.warnings = req.validationWarnings;
    }

    return res.json(response);

  } catch (err) {
    console.error('❌ createStock error:', {
      error: err.message,
      stack: err.stack,
      data: req.body
    });

    // Enhanced error response with Thai messages
    const errorResponse = {
      success: false,
      error: 'ไม่สามารถสร้างหรืออัปเดตข้อมูลสต็อกได้',
      timestamp: new Date().toISOString()
    };

    // Add specific error details in development
    if (process.env.NODE_ENV === 'development') {
      errorResponse.details = err.message;
    }

    return res.status(500).json(errorResponse);
  }
};

/**
 * ✅ GET /api/stock
 * ถ้ามี ?branch_id=xxx ให้กรองเฉพาะสาขานั้น
 */
exports.getAllStocks = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { branch_code } = req.query;
    const filter = branch_code ? { branch_code } : {};

    const stocks = await Stock.find(filter).limit(100).lean()
      .populate('product_id', 'name sku brand model capacity color price status')
      .populate('branch_code', 'name branch_code')
      .sort({ updatedAt: -1 });

    return res.json({ success: true, data: stocks });
  } catch (err) {
    console.error('getAllStocks error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * ✅ GET /api/stock/:id
 * ดึง Stock ตาม _id
 */
exports.getStockById = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const stock = await Stock.findById(id).lean()
      .populate('product_id', 'name')
      .populate('branch_code', 'name')
      .populate('updated_by', 'username');

    if (!stock) {
      return res.status(404).json({ error: 'Stock not found' });
    }
    return res.json({ success: true, data: stock });
  } catch (err) {
    console.error('getStockById error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * ✅ PATCH /api/stock/:id
 * อัปเดตข้อมูลสต๊อก
 */
exports.updateStock = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const { branch_code, quantity, updated_by } = req.body;

    const stock = await Stock.findById(id).lean();
    if (!stock) {
      return res.status(404).json({ error: 'Stock not found' });
    }

    if (branch_code !== undefined) stock.branch_code = branch_code;
    if (quantity !== undefined) stock.quantity = quantity;
    if (updated_by !== undefined) stock.updated_by = updated_by;

    stock.updatedAt = new Date(); // อัปเดต updatedAt

    await stock.save();

    io.emit('stockCreated', {
      id: stock.save()._id,
      data: stock.save()
    });

    return res.json({ success: true, data: stock });
  } catch (err) {
    console.error('updateStock error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * ✅ DELETE /api/stock/:id
 * ลบ Stock ออกจาก DB จริง
 */
exports.deleteStock = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const stock = await Stock.findById(id).lean();
    if (!stock) {
      return res.status(404).json({ error: 'Stock not found' });
    }

    // เปลี่ยนจาก stock.remove() เป็น stock.deleteOne() เพื่อให้ทำงานได้ใน Mongoose เวอร์ชันใหม่
    await stock.deleteOne();

    io.emit('stockDeleted', {
      id: stock.deleteOne()._id,
      data: stock.deleteOne()
    });

    return res.json({ success: true, data: stock });
  } catch (err) {
    console.error('deleteStock error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * ✅ POST /api/stock/check-after-sale
 * ตรวจสอบและหักสต๊อกหลังการขาย
 */
exports.checkAfterSale = async (req, res) => {
  const io = req.app.get('io');
  try {
    console.log('🚨 STOCK UPDATE REQUEST RECEIVED AT:', new Date().toISOString());
    console.log('🚨 Full request body:', JSON.stringify(req.body, null, 2));

    const { items, branch_code, allowNegativeStock = false, continueOnError = false, checkOnly = false } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุรายการสินค้า'
      });
    }

    if (!branch_code) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุรหัสสาขา'
      });
    }

    console.log('📦 Stock check options:', { allowNegativeStock, continueOnError, checkOnly });
    console.log('📦 CheckOnly value:', checkOnly, 'Type:', typeof checkOnly);
    console.log('📦 Items to check:', items);

    const checkResults = [];
    const stockUpdates = [];

    // Import BranchStock model
    const BranchStock = require('../models/POS/BranchStock');

    for (const item of items) {
      const { product_id, quantity, imei } = item;

      if (!product_id || !quantity) {
        checkResults.push({
          product_id,
          imei,
          success: false,
          error: 'ข้อมูลสินค้าไม่ครบถ้วน'
        });
        continue;
      }

      // ตรวจสอบใน BranchStock แทน Stock
      let branchStock;

      // Log query parameters
      console.log(`🔍 Searching BranchStock with:`, {
        product_id,
        imei,
        branch_code,
        has_imei: !!imei
      });

      if (imei) {
        // ถ้ามี IMEI ให้ค้นหาด้วย IMEI
        console.log(`🔍 Query by IMEI: { branch_code: '${branch_code}', imei: '${imei}' }`);
        branchStock = await BranchStock.findOne({
          branch_code,
          imei
          // Removed verified requirement for now - can be added back if needed
        });

        // If not found, also try with barcode field
        if (!branchStock) {
          console.log(`🔍 Trying query by barcode: { branch_code: '${branch_code}', barcode: '${imei}' }`);
          branchStock = await BranchStock.findOne({
            branch_code,
            barcode: imei
          });
        }
      } else {
        // ถ้าไม่มี IMEI ให้ค้นหาด้วย _id
        console.log(`🔍 Query by _id: { _id: '${product_id}', branch_code: '${branch_code}' }`);
        try {
          branchStock = await BranchStock.findOne({
            _id: product_id,
            branch_code
            // Removed verified requirement for now
          });
        } catch (err) {
          console.log(`⚠️ Error querying by _id, trying without _id conversion:`, err.message);
          // Try alternative query if _id fails
          branchStock = null;
        }
      }

      console.log(`📦 Found BranchStock for ${product_id}:`, branchStock ? {
        id: branchStock._id,
        stock_value: branchStock.stock_value,
        imei: branchStock.imei,
        name: branchStock.name
      } : 'not found');

      if (!branchStock) {
        checkResults.push({
          product_id,
          imei,
          success: false,
          error: 'ไม่พบสินค้าในสต๊อกสาขา'
        });
        continue;
      }

      // ตรวจสอบจำนวนสต๊อก (ใช้ stock_value แทน quantity)
      if (branchStock.stock_value < quantity) {
        // ไม่อนุญาตให้ขายเกินสต๊อกที่มีอยู่
        checkResults.push({
          product_id,
          imei,
          success: false,
          error: `สต๊อกไม่เพียงพอ (มีอยู่ ${branchStock.stock_value} หน่วย)`,
          availableQuantity: branchStock.stock_value,
          requestedQuantity: quantity
        });
        continue; // ข้ามไปรายการถัดไป ไม่ตัดสต๊อก
      }

      // เตรียมข้อมูลสำหรับหักสต๊อก
      stockUpdates.push({
        stockId: branchStock._id,
        product_id,
        imei,
        quantity: quantity,
        newQuantity: branchStock.stock_value - quantity
      });

      checkResults.push({
        product_id,
        imei,
        success: true,
        message: 'ตรวจสอบสต๊อกสำเร็จ',
        availableQuantity: branchStock.stock_value,
        afterSaleQuantity: branchStock.stock_value - quantity
      });
    }

    // นับจำนวนรายการที่สำเร็จและล้มเหลว
    const successCount = checkResults.filter(r => r.success).length;
    const failCount = checkResults.filter(r => !r.success).length;

    // หากมีรายการที่ล้มเหลว ไม่ตัดสต๊อกเลย
    if (failCount > 0) {
      console.log(`❌ Stock check failed: ${failCount}/${checkResults.length} items have insufficient stock`);

      // ส่งผลลัพธ์กลับโดยไม่ตัดสต๊อก
      return res.json({
        success: false,
        data: {
          summary: {
            total: checkResults.length,
            success: successCount,
            failed: failCount
          },
          results: checkResults
        },
        message: `ไม่สามารถดำเนินการได้: มีสินค้า ${failCount} รายการที่สต๊อกไม่เพียงพอ`
      });
    }

    // หักสต๊อกสำหรับรายการที่ผ่านการตรวจสอบ (ทำเฉพาะเมื่อ checkOnly = false)
    if (!checkOnly) {
      console.log('💰 Processing actual stock deduction...');
      console.log('📦 Stock updates to perform:', stockUpdates);

      for (const update of stockUpdates) {
        const oldStock = await BranchStock.findById(update.stockId);
        console.log(`📦 Before update - Stock ID ${update.stockId}: ${oldStock.stock_value} units`);

        const updatedStock = await BranchStock.findByIdAndUpdate(
          update.stockId,
          {
            stock_value: update.newQuantity,
            updatedAt: new Date()
          },
          { new: true }
        );

        console.log(`✅ After update - Stock ID ${update.stockId}: ${updatedStock.stock_value} units (was ${oldStock.stock_value}, now ${update.newQuantity})`);

        // ส่งข้อมูลผ่าน Socket.IO
        io.emit('stockUpdated', {
          id: update.stockId,
          product_id: update.product_id,
          imei: update.imei,
          quantity: update.newQuantity
        });
      }
    } else {
      console.log('👁️ Check only mode - no stock deduction performed');
    }

    return res.json({
      success: true,
      data: {
        summary: {
          total: checkResults.length,
          success: successCount,
          failed: 0,
          checkOnly: checkOnly
        },
        results: checkResults
      },
      message: checkOnly
        ? `ตรวจสอบสต๊อกสำเร็จ ${successCount} รายการ (พร้อมขาย)`
        : `ตัดสต๊อกสำเร็จทั้งหมด ${successCount} รายการ`
    });

  } catch (err) {
    console.error('checkAfterSale error:', err);
    return res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการตรวจสอบสต๊อก'
    });
  }
};
