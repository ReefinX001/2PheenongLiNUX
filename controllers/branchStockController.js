const mongoose = require('mongoose');
const BranchStock = require('../models/POS/BranchStock');
const Branch = require('../models/Account/Branch');
const PurchaseOrder = require('../models/Stock/purchaseOrderModel'); // ใช้ชื่อที่ถูกต้องและสอดคล้อง
const BranchStockHistory = require('../models/POS/BranchStockHistory');
const Supplier = require('../models/Stock/Supplier');
const xlsx = require('xlsx');

// เพิ่มการ require ProductImage เพื่อดึงข้อมูลรูป/ราคา
const ProductImage = require('../models/Stock/ProductImage');

// เพิ่มการ require Product เพื่อดึงข้อมูลเกี่ยวกับสินค้า (brand, model, name, cost, categoryGroup, taxType)
const Product = require('../models/Stock/Product');
// เพิ่มการ require CategoryGroup เพื่อดึงค่า unitName
const CategoryGroup = require('../models/Stock/CategoryGroup');


/**
 * ฟังก์ชันช่วย escape อักขระพิเศษใน Regex (ป้องกัน regex injection)
 */
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * ฟังก์ชันช่วยค้นหา Supplier จากพารามิเตอร์ที่อาจเป็นทั้ง ObjectId หรือ ชื่อ (String)
 */
async function findSupplierByParam(supplierParam) {
  if (!supplierParam) {
    return { success: false, error: 'supplier is required.' };
  }
  // 1) ถ้าเป็น ObjectId => หาโดย _id
  if (mongoose.isValidObjectId(supplierParam)) {
    const foundById = await Supplier.findById(supplierParam).lean();
    if (!foundById) {
      return { success: false, error: `ไม่พบ Supplier ด้วย _id = ${supplierParam}` };
    }
    return { success: true, supplierDoc: foundById };
  }
  // 2) ไม่ใช่ ObjectId => treat เป็นชื่อ supplier
  const safeName = escapeRegExp(supplierParam.trim());
  const supRegex = new RegExp(`^${safeName}$`, 'i');
  const foundByName = await Supplier.findOne({ name: supRegex }).lean();
  if (!foundByName) {
    return { success: false, error: `ไม่พบ Supplier ด้วย name="${supplierParam}"` };
  }
  return { success: true, supplierDoc: foundByName };
}

/**
 * GET /api/branch-stock/all/:branchCode
 * ดึงข้อมูลสต็อกสินค้าทั้งหมดที่ "verified" สำหรับสาขาที่ระบุ
 */
exports.getAllStockForBranch = async (req, res) => {
  try {
    const { branchCode } = req.params;

    if (!branchCode) {
      return res.status(400).json({ success: false, error: 'branchCode is required.' });
    }

    const stockItems = await BranchStock.find({ branch_code: branchCode, verified: true })
      .select('_id name brand model price downAmount downInstallment imei')
      .lean();

    if (!stockItems) {
      return res.status(404).json({ success: false, error: 'ไม่พบสต็อกสินค้าในสาขานี้' });
    }

    res.status(200).json({ success: true, data: stockItems });

  } catch (err) {
    console.error('❌ Error in getAllStockForBranch:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};


const { StockValidator, THAI_VALIDATION_MESSAGES } = require('../middlewares/stockValidation');

/**
 * POST /api/branch-stock
 * สร้างหรืออัปเดตสต็อกสินค้าสาขา พร้อมการตรวจสอบข้อมูลแบบครอบคลุม
 *
 * Features:
 * - Enhanced input validation with Thai error messages
 * - IMEI and barcode validation
 * - Business logic validation
 * - Real-time notifications with error handling
 * - Comprehensive logging
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createStock = async (req, res) => {
  const io = req.app.get('io');

  try {
    // Use sanitized data from validation middleware if available
    const data = req.sanitizedData || req.body;

    // รับค่าจาก request body พร้อมการตรวจสอบ
    const {
      branch_code,
      brand,
      model,
      name,
      price,
      cost,
      imei,
      updated_by,
      poNumber,
      invoiceNumber,
      supplier,
      barcode,
      category, // รองรับ category จาก frontend
      taxType
    } = req.body;
    let { categoryGroup } = req.body; // รับค่า categoryGroup จาก request

    // 🔥 Fix: Map category field to categoryGroup for frontend compatibility
    if (!categoryGroup && category) {
      categoryGroup = category;
      req.body.categoryGroup = category;
    }

    // Enhanced validation with Thai error messages
    const validationErrors = [];
    const validationWarnings = [];

    // 1) Validate branch_code with enhanced error message
    if (!branch_code) {
      validationErrors.push({
        field: 'branch_code',
        message: THAI_VALIDATION_MESSAGES.REQUIRED_BRANCH_CODE
      });
      return res.status(400).json({
        success: false,
        error: 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบและแก้ไข',
        validation_errors: validationErrors
      });
    }

    // หา branch จาก branch_code - รองรับ Quick Sale
    let foundBranch = await Branch.findOne({ branch_code }).lean();

    // 🔥 สำหรับ Quick Sale: ถ้าไม่พบ branch ให้ใช้ branch_code ที่ส่งมา
    // รองรับ branch code แบบ '00000' (สำนักงานใหญ่) สำหรับ Quick Sale
    if (!foundBranch && (req.body.type === 'quick_sale' || branch_code === '00000')) {
      console.log(`⚠️ Quick Sale: Branch ${branch_code} not found in DB, using as-is`);
      foundBranch = { branch_code: branch_code, name: branch_code === '00000' ? 'สำนักงานใหญ่' : `สาขา ${branch_code}` }; // สร้าง mock branch
    }

    if (!foundBranch) {
      return res.status(404).json({
        success: false,
        error: `ไม่พบสาขาด้วย branch_code ${branch_code}`,
      });
    }
    const realBranchCode = foundBranch.branch_code;

    // (A) ถ้ายังไม่มี brand, model, name => ลองหาใน Product ด้วย barcode
    if (!req.body.brand && !req.body.model && !req.body.name) {
      if (barcode) {
        const productQuery = {};
        if (barcode) productQuery.barcode = barcode;
        const foundProd = await Product.findOne(productQuery).lean();
        if (foundProd) {
          if (!req.body.brand) req.body.brand = foundProd.brand;
          if (!req.body.model) req.body.model = foundProd.model;
          if (!req.body.name) req.body.name = foundProd.name;
          // ไม่ต้องเซต color, capacity
          if ((!req.body.cost || req.body.cost === 0) && foundProd.cost) {
            req.body.cost = foundProd.cost;
          }
          // หาก Product มีค่า categoryGroup แต่ยังไม่ได้ส่งมา ให้ใช้จาก Product
          if (!categoryGroup && foundProd.categoryGroup) {
            categoryGroup = foundProd.categoryGroup;
            req.body.categoryGroup = foundProd.categoryGroup;
          }
          // หาก Product มีค่า taxType แต่ยังไม่ได้ส่งมา ให้ใช้จาก Product
          if (!req.body.taxType && foundProd.taxType) {
            req.body.taxType = foundProd.taxType;
          }
        }
      }
    }

    // 2) Enhanced validation for product information with Quick Sale support
    const isQuickSale = req.body.type === 'quick_sale' || req.body.urgentSale === true;

    if (!isQuickSale) {
      // Regular product validation - need at least one field
      if (!req.body.brand && !req.body.model && !req.body.name) {
        validationErrors.push({
          field: 'product_info',
          message: 'กรุณาระบุ ยี่ห้อ รุ่น หรือ ชื่อสินค้า อย่างน้อย 1 อย่าง'
        });
      }
    } else {
      // Quick Sale validation - only need name
      if (!req.body.name || req.body.name.trim() === '') {
        validationErrors.push({
          field: 'name',
          message: 'สำหรับขายด่วน กรุณาระบุชื่อสินค้า'
        });
      }
    }

    // Validate numeric fields if provided
    const numericFields = [
      { field: 'price', value: req.body.price, min: 0, max: 9999999 },
      { field: 'cost', value: req.body.cost, min: 0, max: 9999999 }
    ];

    numericFields.forEach(({ field, value, min, max }) => {
      if (value !== undefined && value !== null && value !== '') {
        const numValidation = StockValidator.validateNumber(value, field, { min, max });
        if (!numValidation.isValid) {
          validationErrors.push(...numValidation.errors);
        }
      }
    });

    // Validate IMEI if provided
    if (imei) {
      const imeiValidation = StockValidator.validateIMEI(imei, 'imei');
      if (!imeiValidation.isValid) {
        validationErrors.push(...imeiValidation.errors);
      }
    }

    // Validate barcode if provided
    if (barcode) {
      const barcodeValidation = StockValidator.validateBarcode(barcode, 'barcode');
      if (!barcodeValidation.isValid) {
        validationErrors.push(...barcodeValidation.errors);
      }
    }

    // Business logic validation - price vs cost
    if (req.body.price && req.body.cost) {
      const priceNum = parseFloat(req.body.price);
      const costNum = parseFloat(req.body.cost);
      if (!isNaN(priceNum) && !isNaN(costNum) && priceNum < costNum) {
        validationWarnings.push({
          field: 'price',
          message: THAI_VALIDATION_MESSAGES.PRICE_LOWER_THAN_COST
        });
      }
    }

    // Return validation errors if any critical errors found
    if (validationErrors.length > 0) {
      console.log('❌ Validation errors for Quick Sale:', {
        branch_code,
        type: req.body.type,
        name: req.body.name,
        brand: req.body.brand,
        model: req.body.model,
        validationErrors
      });
      return res.status(400).json({
        success: false,
        error: 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบและแก้ไข',
        validation_errors: validationErrors,
        warnings: validationWarnings
      });
    }

    // ตรวจสอบ supplier (ยกเว้นสำหรับ Quick Sale)
    let foundSupplier = null;
    const { type } = req.body; // เพิ่มการรับ type จาก request body

    if (!isQuickSale && supplier) {
      // ตรวจสอบ supplier เฉพาะเมื่อไม่ใช่ Quick Sale และมี supplier
      const supCheck = await findSupplierByParam(supplier);
      if (!supCheck.success) {
        return res.status(400).json({ success: false, error: supCheck.error });
      }
      foundSupplier = supCheck.supplierDoc;
    } else if (isQuickSale) {
      // สำหรับ Quick Sale ไม่ต้องการ supplier
      console.log('🚀 Quick Sale detected - skipping supplier validation');
    }

    // ตรวจสอบ poNumber หากส่งมา (ยกเว้น Quick Sale)
    const isQuickSaleDoc = req.body.documentNumber && req.body.documentNumber.includes('ขายด่วน');

    if (poNumber && !isQuickSale && !isQuickSaleDoc) {
      const foundPO = await PurchaseOrder.findOne({ poNumber }).lean();
      if (!foundPO) {
        return res.status(400).json({
          success: false,
          error: `ไม่พบ PurchaseOrder ที่มี poNumber = ${poNumber}`,
        });
      }
    } else if (isQuickSale || isQuickSaleDoc) {
      console.log('🚀 Quick Sale detected - skipping PO validation for poNumber:', poNumber);
      console.log('🚀 Quick Sale documentNumber:', req.body.documentNumber);
    }

    // 3) ค้นหา stock เดิม
    const filter = {
      branch_code: realBranchCode,
      brand:       req.body.brand || '',
      model:       req.body.model || '',
      name:        req.body.name || ''
    };
    let existingStock = await BranchStock.findOne(filter).lean();

    // 3.1) ถ้ามี stock เดิม แต่ยัง pending หรือ stock_value=0 -> รออนุมัติต่อ
    if (existingStock && (existingStock.pending || existingStock.stock_value === 0)) {
      return res.status(200).json({
        success: true,
        data: existingStock,
        message: 'มีรายการนี้อยู่แล้วและกำลังรออนุมัติ'
      });
    }

    // 3.2) ไม่พบ stock เดิม -> สร้างใหม่ pending=true, stock_value=0
    // หาก req.body.categoryGroup ไม่ถูกส่งมา ลองดึงจาก Product โดยจับคู่ด้วย name
    let finalCategoryGroup = categoryGroup || null;
    if (!finalCategoryGroup && req.body.name) {
      const foundProd = await Product.findOne({ name: req.body.name }).lean();
      if (foundProd && foundProd.categoryGroup) {
        finalCategoryGroup = foundProd.categoryGroup;
      }
    }
    // หากยังไม่มี finalCategoryGroup ลอง fallback จาก PurchaseOrder โดยใช้ poNumber (จาก req.body) - ยกเว้น Quick Sale
    if (!finalCategoryGroup && req.body.poNumber && !isQuickSale && !isQuickSaleDoc) {
      const foundPO = await PurchaseOrder.findOne({ poNumber: req.body.poNumber }).lean();
      if (foundPO && foundPO.categoryGroup) {
        finalCategoryGroup = foundPO.categoryGroup;
      }
    }

    // หาก taxType ไม่ได้ส่งเข้ามา ให้ลองดึงจาก Product ก่อน จากนั้นถ้าไม่พบให้ fallback จาก PurchaseOrder - ยกเว้น Quick Sale
    let finalTaxType = taxType;
    if (!finalTaxType) {
      const foundProd = await Product.findOne({ name }).lean();
      if (foundProd && foundProd.taxType) {
        finalTaxType = foundProd.taxType;
      } else if (req.body.poNumber && !isQuickSale) {
        const foundPO = await PurchaseOrder.findOne({ poNumber: req.body.poNumber }).lean();
        if (foundPO && foundPO.taxType) {
          finalTaxType = foundPO.taxType;
        }
      }
    }

    // createStock → tokenUserId รับค่า fallback จาก scanned_by
    const tokenUserId = req.user
      ? req.user._id
      : (updated_by || req.body.scanned_by || null);

    // ไม่พบ => สร้าง BranchStock ใหม่ (ดึงราคาผ่อนจาก ProductImage)
    let pi = null;
    if (req.body.name) {
      pi = await ProductImage.findOne({
        name: new RegExp(`^${escapeRegExp(req.body.name)}$`, 'i')
      }).lean();
    }

    const newStock = new BranchStock({
      branch_code:   realBranchCode,
      brand:         req.body.brand || '',
      model:         req.body.model || '',
      name:          req.body.name || '',
      barcode:       req.body.barcode || '',

      price:         pi?.price ?? (price || 0),
      cost:          pi?.cost  ?? (cost  || 0),
      imei:          imei || '',
      stock_value:   0,               // ← เก็บ 0
      pending:       true,            // ← ตั้ง pending
      updated_by:    tokenUserId,
      scanned_by:    req.body.scanned_by || tokenUserId,  // ← เพิ่ม
      last_updated:  new Date(),
      verified:      false,
      invoiceNumber: invoiceNumber || '',

      // 🔥 เพิ่ม PO Number และ Document Number สำหรับ Quick Sale
      poNumber:       poNumber || '',
      documentNumber: isQuickSale ? req.body.documentNumber : '',
      type:           req.body.type || 'normal',           // เพิ่ม type สำหรับ quick_sale
      urgentSale:     req.body.urgentSale || false,        // เพิ่ม urgentSale flag
      requiresPONumber: req.body.requiresPONumber || false, // เพิ่ม requiresPONumber flag
      quickSaleDate:  req.body.quickSaleDate || null,     // เพิ่ม quickSaleDate

      supplier:      foundSupplier ? foundSupplier._id : null, // ใช้ null ถ้าไม่มี supplier (Quick Sale)
      categoryGroup: mongoose.isValidObjectId(finalCategoryGroup)
                      ? new mongoose.Types.ObjectId(finalCategoryGroup)
                      : null,
      taxType:       (finalTaxType && ['ไม่มีภาษี','แยกภาษี','รวมภาษี'].includes(finalTaxType))
                      ? finalTaxType
                      : 'แยกภาษี',
      stockType:     pi?.stockType || 'imei'  // ← เพิ่ม stockType จาก ProductImage
    });
    // ...tag productModel/product_id/image if pi...
    const savedStock = await newStock.save();
    io.emit('branchstockCreated', { id: savedStock._id, data: savedStock });

    // บันทึก BranchStockHistory change_type=IN_PENDING
    await BranchStockHistory.create({
      branch_code: realBranchCode,
      change_type: 'IN_PENDING',     // ← สถานะรออนุมัติ
      reason:      'สร้างรายการใหม่ รออนุมัติ',
      performed_by: tokenUserId,
      performed_at: new Date(),
      supplier:    foundSupplier ? foundSupplier._id : null, // ใช้ null ถ้าไม่มี supplier (Quick Sale)
      items: [{
        name:           newStock.name,
        brand:          newStock.brand,
        model:          newStock.model,
        imei:           newStock.imei,
        qty:            0,
        remainQty:      0,
        cost:           newStock.cost,
        price:          newStock.price,
        invoiceNumber:  newStock.invoiceNumber,
        unit:           '',          // ถ้าต้องการ unit ให้ดึงจาก CategoryGroup เพิ่มเติม
        poNumber:       newStock.poNumber || '',
        documentNumber: newStock.documentNumber || ''
      }],
      quantity:    0,
      stock_value: 0
    });

    return res.json({
      success: true,
      data: savedStock,
      message: 'สร้างรายการใหม่ รออนุมัติเรียบร้อย'
    });
  } catch (err) {
    console.error('addStock error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};


/**
 * POST /api/branch-stock/decrement
 * ลดจำนวนสต๊อกสินค้าโดยใช้ branch_code หรือ branch_id
 * ทำ FIFO โดยอ้างอิงจาก remainQty ใน BranchStockHistory (change_type='IN')
 */
exports.decrementStock = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { branch_code, poNumber, qty, order_id } = req.body;
    if (!branch_code || !poNumber || !qty || !order_id) {
      return res.status(400).json({
        success: false,
        error: '❌ ต้องระบุ branch_code, poNumber, qty และ order_id',
      });
    }

    let remainQty = qty;
    let usedCostEntries = [];
    let lastUsedCost = 0;

    const inDocs = await BranchStockHistory.find({
      branch_code,
      change_type: 'IN',
      'items.poNumber': poNumber,
      'items.remainQty': { $gt: 0 },
    }).sort({ performed_at: 1 });

    if (inDocs.length === 0) {
      return res.status(400).json({ success: false, error: '❌ ไม่พบสินค้า IN ที่สามารถใช้งานได้' });
    }

    let brand = '';
    let name = '';
    let model = '';

    for (const record of inDocs) {
      let docChanged = false;
      for (const inItem of record.items) {
        if (inItem.poNumber === poNumber && inItem.remainQty > 0) {
          brand = inItem.brand || brand;
          name = inItem.name || name;
          model = inItem.model || model;
          const usedQty = Math.min(inItem.remainQty, remainQty);
          lastUsedCost = inItem.cost;
          remainQty -= usedQty;
          inItem.remainQty -= usedQty;
          docChanged = true;
          usedCostEntries.push({ usedQty, cost: inItem.cost });
          if (remainQty === 0) break;
        }
      }
      if (docChanged) {
        await record.save();
        io.emit('recordCreated', {
          id: record._id,
          data: record
        });
      }
      if (remainQty === 0) break;
    }

    if (remainQty > 0) {
      return res.status(400).json({ success: false, error: '❌ สต๊อก IN ไม่เพียงพอ' });
    }

    // เปลี่ยน invoice_no ➔ invoiceNumber
    const outRecord = {
      branch_code,
      change_type: 'OUT',
      reason: 'ขายสินค้า',
      performed_by: req.user ? req.user._id : null,
      performed_at: new Date(),
      order_id,
      invoiceNumber: '',    // ← ปรับชื่อให้ตรง schema
      items: [{
        brand,
        name,
        model,
        poNumber,
        qty,
        cost: lastUsedCost,
        price: 0,
        documentNumber: inDocs[0]?.documentNumber || '',
      }],
      quantity: qty,
    };

    // สร้างประวัติ OUT
    const doc = await BranchStockHistory.create(outRecord);
    io.emit('branchstockhistoryCreated', {
      id: doc._id,
      data: doc
    });

    // ลบสต๊อกที่ขายแล้ว
    await BranchStock.deleteMany({ branch_code, poNumber });
    io.emit('branchstockDeleted', {
      id: `${branch_code}|${poNumber}`, // or any identifier you prefer
      data: { branch_code, poNumber }
    });

    return res.json({
      success: true,
      message: '✅ ลดสต๊อกสำเร็จ พร้อมย้ายไปประวัติและลบใน BranchStock',
      data: { usedCostEntries, doc },
    });
  } catch (err) {
    console.error('🔥 decrementStock error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};



/**
 * PUT /api/branch-stock/:id
 * อัปเดต BranchStock
 */
// แก้ไขส่วนของ updateStock ใน branchStockController.js
exports.updateStock = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;

    // Define Quick Sale detection variable
    const isQuickSaleForCategory = req.body.documentNumber && req.body.documentNumber.includes('ขายด่วน');
    const {
      brand,
      model,
      name,
      price,
      cost,
      imei,
      verified,
      updated_by,
      poNumber,
      invoiceNumber,
      supplier,
      categoryGroup,
      taxType,
      barcode,
      sku
    } = req.body;

    const stock = await BranchStock.findById(id);
    if (!stock) {
      return res.status(404).json({ success: false, error: 'BranchStock not found' });
    }

    const wasVerified = stock.verified;
    const isBeingVerified = (verified === true && !wasVerified);
    const imeiWasUpdated = (imei !== undefined && imei !== stock.imei);

    // อัปเดตฟิลด์ต่างๆ
    if (brand !== undefined) stock.brand = brand;
    if (model !== undefined) stock.model = model;
    if (name !== undefined) stock.name = name;
    if (price !== undefined) stock.price = price;
    if (cost !== undefined) stock.cost = cost;
    if (imei !== undefined) stock.imei = imei;
    if (verified !== undefined) stock.verified = verified;
    if (updated_by !== undefined) stock.updated_by = updated_by;
    if (barcode !== undefined) stock.barcode = barcode;


    if (poNumber !== undefined) {
      stock.poNumber = poNumber;

      // สำหรับ Quick Sale ให้ใช้ documentNumber ที่ส่งมาจาก frontend
      if (isQuickSaleForCategory) {
        stock.documentNumber = 'ขายด่วน';
        console.log('🚀 Quick Sale Update - using documentNumber from frontend:', stock.documentNumber);
      } else {
        // สำหรับ PO ปกติ ให้หา documentNumber จาก PurchaseOrder
        const po = await PurchaseOrder.findOne({ poNumber: poNumber.trim().lean() });
        if (po && po.documentNumber) {
          stock.documentNumber = po.documentNumber;
        } else {
          stock.documentNumber = '';
        }
      }
    }

    if (invoiceNumber !== undefined) stock.invoiceNumber = invoiceNumber;

    // ตรวจสอบ supplier
    if (supplier !== undefined) {
      if (!supplier) {
        return res.status(400).json({ success: false, error: 'supplier is required (update)' });
      }
      const supCheck = await findSupplierByParam(supplier);
      if (!supCheck.success) {
        return res.status(400).json({ success: false, error: supCheck.error });
      }
      stock.supplier = supCheck.supplierDoc._id;
    }

    // อัปเดต taxType
    if (taxType !== undefined) {
      stock.taxType = (['ไม่มีภาษี', 'แยกภาษี', 'รวมภาษี'].includes(taxType))
        ? taxType
        : stock.taxType;
    }

    // --- move & fix verified_by here (before save) ---
    if (verified !== undefined) {
      stock.verified = verified;
      if (verified === true && !stock.verified_by) {
        stock.verified_by = req.user
          ? req.user._id    // fixed typo
          : (req.body.verified_by || null);
      }
    }

    stock.last_updated = new Date();
    const savedStock = await stock.save();

    io.emit('stockUpdated', { id: savedStock._id, data: savedStock });

    // ถ้า IMEI ถูกเปลี่ยน => บันทึกประวัติ UPDATE_IMEI
    if (imeiWasUpdated && !isBeingVerified) {
      await BranchStockHistory.create({
        branch_code: stock.branch_code,
        change_type: 'UPDATE_IMEI',
        reason: 'Updated IMEI',
        performed_by: updated_by || null,
        performed_at: new Date(),
        supplier: stock.supplier,
        items: [{
          product_id: stock._id,
          name: stock.name || '-',
          brand: stock.brand || '',
          model: stock.model || '',
          imei: imei || stock.imei || '',
          qty: 0, // ไม่เปลี่ยนจำนวน
          remainQty: 0, // ไม่เปลี่ยนจำนวน
          cost: stock.cost || 0,
          price: stock.price || 0,
          poNumber: stock.poNumber || '',
          invoiceNumber: stock.invoiceNumber || '',
          documentNumber: stock.documentNumber || '',
          unit: stock.unit || 'ชิ้น'
        }],
        quantity: 0,
        stock_value: stock.stock_value || 0,
      });
    }

    return res.json({ success: true, data: savedStock });
  } catch (err) {
    console.error('updateStock error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * PUT /api/branch-stock/:id/price
 * อัปเดตเฉพาะราคาสินค้า (หรือฟิลด์ที่เกี่ยวข้องกับราคา)
 */

exports.updatePrice = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const {
      price,
      downAmount,
      downInstallmentCount,
      downInstallment,
      creditThreshold,
      payUseInstallmentCount,
      payUseInstallment,
    } = req.body;

    // อัปเดตราคา
    const updatedStock = await BranchStock.findByIdAndUpdate(
      id,
      {
        price,
        downAmount,
        downInstallmentCount,
        downInstallment,
        creditThreshold,
        payUseInstallmentCount,
        payUseInstallment,
        last_updated: new Date(),
      },
      { new: true }
    );

    // ถ้าไม่เจอ ให้ส่ง 404
    if (!updatedStock) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบสต๊อกที่ต้องการอัปเดต'
      });
    }

    // ส่ง event ผ่าน socket
    io.emit('branchstockUpdated', {
      id: updatedStock._id,
      data: updatedStock
    });

    // ตอบกลับ client
    return res.json({
      success: true,
      data: updatedStock
    });

  } catch (err) {
    console.error('updatePrice error:', err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};


/**
 * DELETE /api/branch-stock/:id
 * ลบ BranchStock ตาม _id (Physical Delete)
 */
exports.deleteStock = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;

    // Check if this is a pending product rejection - only check roles for pending products
    const stockToCheck = await BranchStock.findById(id);
    if (stockToCheck && stockToCheck.pending) {
      // Check if user has permission to reject pending products
      const allowedRoles = [
        'Admin', 'admin',
        'ผู้จัดการร้าน', 'Store Manager',
        'นักพัฒนา', 'Developer',
        'CEO',
        'Super Admin', 'SuperAdmin', 'super admin'
      ];

      const userRole = req.user ? req.user.role : null;
      const hasPermission = allowedRoles.some(role =>
        userRole && userRole.toLowerCase() === role.toLowerCase()
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'คุณไม่มีสิทธิ์ปฏิเสธสินค้าที่รออนุมัติ'
        });
      }
    }

    // ลบสต๊อกตาม id
    const stock = await BranchStock.findByIdAndDelete(id);

    // ถ้าไม่เจอ ให้ส่ง 404
    if (!stock) {
      return res.status(404).json({
        success: false,
        error: 'BranchStock not found'
      });
    }

    // ส่ง event ผ่าน socket
    io.emit('branchstockDeleted', {
      id: stock._id,
      data: stock
    });

    // ตอบกลับ client
    return res.json({
      success: true,
      data: stock
    });
  } catch (err) {
    console.error('deleteStock error:', err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

/**
 * POST /api/branch-stock/add
 * เพิ่มสินค้าใหม่ (verified=false) ในสต๊อก (Flow แยกต่างหาก)
 */
exports.addStock = async (req, res) => {
  const io = req.app.get('io');
  try {
    const {
      branch_code,
      brand,
      model,
      name,
      // ไม่รับ color, capacity
      price,
      cost,
      imei,
      reason,
      invoiceNumber,
      supplier,
      taxType  // รับ taxType จาก body
    } = req.body;
    let { categoryGroup } = req.body; // รับค่า categoryGroup จาก request

    const tokenUserId = req.user ? req.user._id : null;

    if (!branch_code) {
      return res.status(400).json({ success: false, error: 'branch_code is required.' });
    }

    const foundBranch = await Branch.findOne({ branch_code }).lean();
    if (!foundBranch) {
      return res.status(404).json({ success: false, error: `ไม่พบสาขาด้วย branch_code ${branch_code}` });
    }
    const realBranchCode = foundBranch.branch_code;

    const supCheck = await findSupplierByParam(supplier);
    if (!supCheck.success) {
      return res.status(400).json({ success: false, error: supCheck.error });
    }
    const foundSupplier = supCheck.supplierDoc;

    // หาก req.body.categoryGroup ไม่ถูกส่งมา ให้ลองดึงจาก Product โดยจับคู่ด้วย name
    let finalCategoryGroup = categoryGroup || null;
    if (!finalCategoryGroup && name) {
      const foundProd = await Product.findOne({ name }).lean();
      if (foundProd && foundProd.categoryGroup) {
        finalCategoryGroup = foundProd.categoryGroup;
      }
    }
    // หากยังไม่มี finalCategoryGroup ลอง fallback จาก PurchaseOrder โดยใช้ poNumber (จาก req.body) - ยกเว้น Quick Sale
    const isQuickSaleForCategory = req.body.documentNumber && req.body.documentNumber.includes('ขายด่วน');
    if (!finalCategoryGroup && req.body.poNumber && !isQuickSaleForCategory) {
      const foundPO = await PurchaseOrder.findOne({ poNumber: req.body.poNumber }).lean();
      if (foundPO && foundPO.categoryGroup) {
        finalCategoryGroup = foundPO.categoryGroup;
      }
    }

    // หาก taxType ไม่ได้ส่งเข้ามา ให้ลองดึงจาก Product ก่อน จากนั้นถ้าไม่พบให้ fallback จาก PurchaseOrder - ยกเว้น Quick Sale
    let finalTaxType = taxType;
    if (!finalTaxType) {
      const foundProd = await Product.findOne({ name }).lean();
      if (foundProd && foundProd.taxType) {
        finalTaxType = foundProd.taxType;
      } else if (req.body.poNumber && !isQuickSaleForCategory) {
        const foundPO = await PurchaseOrder.findOne({ poNumber: req.body.poNumber }).lean();
        if (foundPO && foundPO.taxType) {
          finalTaxType = foundPO.taxType;
        }
      }
    }

    // ดึงข้อมูลจาก ProductImage เพื่อใช้ stockType
    let pi = null;
    if (req.body.name) {
      pi = await ProductImage.findOne({
        name: new RegExp(`^${escapeRegExp(req.body.name)}$`, 'i')
      }).lean();
    }

    const newStock = new BranchStock({
      branch_code: realBranchCode,
      brand: req.body.brand || '',
      model: req.body.model || '',
      name: req.body.name || '',
      barcode: req.body.barcode || '',

      // ไม่เซต color, capacity
      price: price || 0,
      cost: cost || 0,
      imei: imei || '',
      stock_value: 1,
      updated_by: tokenUserId,
      scanned_by: req.body.scanned_by || tokenUserId,  // ← เพิ่ม
      last_updated: new Date(),
      verified: false,
      invoiceNumber: invoiceNumber || '',
      supplier: foundSupplier._id,
      categoryGroup: mongoose.isValidObjectId(finalCategoryGroup)
        ? new mongoose.Types.ObjectId(finalCategoryGroup)
        : null,
      taxType: (finalTaxType && ['ไม่มีภาษี', 'แยกภาษี', 'รวมภาษี'].includes(finalTaxType))
        ? finalTaxType
        : 'แยกภาษี',
      stockType: pi?.stockType || 'imei'  // ← เพิ่ม stockType จาก ProductImage
    });

    // หาก req.body.poNumber ถูกส่งมา ให้เซ็ตค่า poNumber, documentNumber และ fallback สำหรับ taxType จาก PurchaseOrder - ยกเว้น Quick Sale
    if (req.body.poNumber && req.body.poNumber.trim() !== '') {
      newStock.poNumber = req.body.poNumber;

      // สำหรับ Quick Sale ให้ใช้ documentNumber ที่ส่งมาจาก frontend
      if (isQuickSaleForCategory) {
        newStock.documentNumber = 'ขายด่วน';
        console.log('🚀 Quick Sale - using documentNumber from frontend:', newStock.documentNumber);
      } else {
        // สำหรับ PO ปกติ ให้หา documentNumber จาก PurchaseOrder
        const po = await PurchaseOrder.findOne({ poNumber: req.body.poNumber.trim().lean() });
        if (po) {
          if (po.documentNumber) {
            newStock.documentNumber = po.documentNumber;
          }
          if (po.taxType) {
            newStock.taxType = po.taxType;
          }
        }
      }
    }

    // ดึงรูปจาก ProductImage หากยังไม่มี image
    if (!newStock.image && newStock.name) {
      const foundImg = await ProductImage.findOne({ name: newStock.name }).lean();
      if (foundImg) {
        newStock.image = foundImg.image;
        newStock.productModel = 'ProductImage';
        newStock.product_id = foundImg._id;
      } else {
        newStock.productModel = 'Product';
      }
    }

    // บันทึก newStock เพียงครั้งเดียว
    const savedStock = await newStock.save();
    io.emit('newstockCreated', {
      id: savedStock._id,
      data: savedStock
    });

    // ดึง unit จาก CategoryGroup แบบ synchronous ก่อนบันทึกประวัติ
    let finalUnit = '';
    if (newStock.categoryGroup) {
      const catg = await CategoryGroup.findById(newStock.categoryGroup).lean();
      if (catg && catg.unitName) {
        finalUnit = catg.unitName;
      }
    }

    // สร้างประวัติ IN (เพิ่ม documentNumber ใน items)
    const historyData = {
      branch_code: realBranchCode,
      change_type: 'IN',
      reason: reason || 'Add Stock (verified=false)',
      performed_by: tokenUserId || null,
      performed_at: new Date(),
      supplier: foundSupplier._id,
      items: [
        {
          name: newStock.name || '-',
          brand: newStock.brand || '',         // ← เพิ่มตรงนี้
          model: newStock.model || '',
          imei: newStock.imei || '',
          qty: 1,
          remainQty: 1,
          cost: newStock.cost || 0,
          price: newStock.price || 0,
          invoiceNumber: invoiceNumber || '',
          unit: finalUnit,
          poNumber: newStock.poNumber || '',
          documentNumber: newStock.documentNumber || '',
        },
      ],
      quantity: 1,
      stock_value: 1,
    };
    const savedHistory = await BranchStockHistory.create(historyData);
    io.emit('branchstockhistoryCreated', {
      id: savedHistory._id,
      data: savedHistory
    });

    return res.json({ success: true, data: newStock });
  } catch (err) {
    console.error('addStock error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};



/**
 * GET /api/branch-stock/:id
 * ดึงข้อมูลสต๊อกตาม _id
 */
exports.getStockById = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid id format' });
    }
    const stock = await BranchStock.findById(id).lean()
      .populate('supplier', 'name')
      .populate({
        path: 'product_id',
        select: 'name image stockType brand model price cost'
      })
      .populate('categoryGroup', 'name unitName');
    if (!stock) {
      return res.status(404).json({ success: false, error: 'BranchStock not found' });
    }
    return res.json({ success: true, data: stock });
  } catch (err) {
    console.error('getStockById error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/branch-stock/cost
 * ตัวอย่าง: /api/branch-stock/cost?branch_code=xxx&poNumber=PO-123
 */
exports.getCostByPoNumber = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { branch_code, poNumber } = req.query;
    if (!branch_code || !poNumber) {
      return res.status(400).json({ success: false, error: 'branch_code และ poNumber เป็นฟิลด์บังคับ' });
    }
    const doc = await BranchStock.findOne({ branch_code, poNumber }).lean();
    if (!doc) {
      return res.status(404).json({ success: false, error: `ไม่พบ BranchStock (branch_code=${branch_code}, poNumber=${poNumber})` });
    }
    return res.json({
      success: true,
      data: {
        cost: doc.cost || 0,
        price: doc.price || 0,
        stock_value: doc.stock_value || 0,
        documentNumber: doc.documentNumber || ''
      }
    });
  } catch (err) {
    console.error('getCostByPoNumber error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.commitInstallment = async (req, res) => {
  const io = req.app.get('io');
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      branch_code,
      installment_id,
      salespersonId,
      items  // [{ productId, imei, qty, downAmount, …, name, brand, model, unit }]
    } = req.body;

    if (!branch_code || !installment_id || !items?.length) {
      return res.status(400).json({
        success: false,
        error: 'ต้องระบุ branch_code, installment_id และรายการ items อย่างน้อย 1 รายการ'
      });
    }

    // สร้าง history record (บันทึก OUT แต่ไม่ลดสต็อก)
    const [history] = await BranchStockHistory.create([{
      branch_code,
      change_type:   'OUT',
      reason:        'ขายผ่อน (บันทึกประวัติโดยไม่ลดสต๊อก)',
      performed_by:  salespersonId,
      performed_at:  new Date(),
      order_id:      installment_id,
      installment_id,
      items: items.map(it => ({
        product_id:             it.productId,
        imei:                   it.imei,
        qty:                    it.qty,
        cost:                   it.cost,
        price:                  it.price,
        downAmount:             it.downAmount,
        downInstallmentCount:   it.downInstallmentCount,
        downInstallment:        it.downInstallment,
        creditThreshold:        it.creditThreshold,
        payUseInstallmentCount: it.payUseInstallmentCount,
        payUseInstallment:      it.payUseInstallment,
        poNumber:               it.poNumber || '',
        documentNumber:         it.documentNumber || '',
        name:                   it.name,
        brand:                  it.brand,
        model:                  it.model,
        unit:                   it.unit
      })),
      quantity: items.reduce((sum, i) => sum + i.qty, 0),
      stock_value: 0
    }], { session });

    // ส่ง event ผ่าน socket
    io.emit('branchstockhistoryCreated', {
      id: history._id,
      data: history
    });

    await session.commitTransaction();
    session.endSession();

    return res.json({
      success: true,
      message: 'บันทึกประวัติการผ่อนเรียบร้อยโดยไม่ลดสต๊อก',
      data: history
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('commitInstallment error:', err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

/**
 * POST /api/branch-stock/:id/approve
 * อนุมัติรายการที่ pending = true ให้เข้า stock จริง
 */
exports.approveStock = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const userId = req.user ? req.user._id : null;

    // Check if user has permission to approve products
    const allowedRoles = [
      'Admin', 'admin',
      'ผู้จัดการร้าน', 'Store Manager',
      'นักพัฒนา', 'Developer',
      'CEO',
      'Super Admin', 'SuperAdmin', 'super admin'
    ];

    const userRole = req.user ? req.user.role : null;
    const hasPermission = allowedRoles.some(role =>
      userRole && userRole.toLowerCase() === role.toLowerCase()
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'คุณไม่มีสิทธิ์อนุมัติสินค้า'
      });
    }

    // 1) ดึง BranchStock ที่ขออนุมัติ (ไม่ใช้ .lean() เพื่อให้สามารถ save ได้)
    const stock = await BranchStock.findById(id);
    if (!stock) {
      return res.status(404).json({ success: false, error: 'ไม่พบสินค้ารายการนี้' });
    }

    // 2) ตรวจว่ารายการกำลัง pending หรือไม่
    console.log('🔍 Stock validation:', {
      id: stock._id,
      pending: stock.pending,
      stock_value: stock.stock_value,
      verified: stock.verified,
      poNumber: stock.poNumber,
      type: stock.type,
      urgentSale: stock.urgentSale
    });

    // 🔥 แก้ไขเงื่อนไข: สำหรับ quick sale ให้ดูแค่ pending flag
    // ไม่ต้องดู stock_value เพราะ quick sale อาจจะมี stock_value = 1 อยู่แล้ว
    if (!stock.pending) {
      console.log('❌ Stock validation failed:', {
        pending: stock.pending,
        stock_value: stock.stock_value,
        verified: stock.verified,
        message: 'รายการนี้ไม่อยู่ในสถานะรออนุมัติ (pending=false)'
      });
      return res.status(400).json({
        success: false,
        error: 'รายการนี้ไม่อยู่ในสถานะรออนุมัติ',
        details: {
          pending: stock.pending,
          stock_value: stock.stock_value,
          verified: stock.verified,
          reason: 'สินค้านี้ได้รับการอนุมัติไปแล้ว หรือไม่ได้อยู่ในสถานะรออนุมัติ'
        }
      });
    }

    // 🔥 เพิ่มการตรวจสอบสำหรับสินค้าที่ verified แล้ว
    if (stock.verified) {
      console.log('❌ Stock already verified:', {
        pending: stock.pending,
        verified: stock.verified,
        message: 'รายการนี้ได้รับการอนุมัติไปแล้ว'
      });
      return res.status(400).json({
        success: false,
        error: 'รายการนี้ได้รับการอนุมัติไปแล้ว',
        details: {
          pending: stock.pending,
          verified: stock.verified,
          verified_by: stock.verified_by,
          last_updated: stock.last_updated
        }
      });
    }

    // 3) เปลี่ยนสถานะให้เข้า stock จริง
    stock.pending      = false;
    stock.stock_value  = 1;
    stock.verified     = true;
    stock.verified_by  = userId;                          // ← เพิ่ม
    stock.last_updated = new Date();
    const savedStock = await stock.save();

    // 4) สร้างประวัติ IN (จริง)
    const savedHistory = await BranchStockHistory.create({
      branch_code:   savedStock.branch_code,
      change_type:   'IN',
      reason:        'อนุมัติสินค้ารายการนี้เข้า stock',
      performed_by:  userId,
      performed_at:  new Date(),
      supplier:      savedStock.supplier,
      items: [{
        product_id:     savedStock._id,
        name:           savedStock.name || '-',
        brand:          savedStock.brand || '',
        model:          savedStock.model || '',
        imei:           savedStock.imei || '',
        qty:            1,
        remainQty:      1,
        cost:           savedStock.cost || 0,
        price:          savedStock.price || 0,
        invoiceNumber:  savedStock.invoiceNumber || '',
        unit:           savedStock.unit || '',
        poNumber:       savedStock.poNumber || '',
        documentNumber: savedStock.documentNumber || '',
      }],
      quantity:    1,
      stock_value: savedStock.stock_value,
    });

    // Convert to plain object before sending to frontend
    const stockData = savedStock.toObject();

    // 5) ส่ง socket event ให้ front-end รีโหลด
    io.emit('branchstockApproved', {
      id:   savedStock._id,
      data: stockData
    });
    io.emit('branchstockhistoryCreated', {
      id:   savedHistory._id,
      data: savedHistory
    });

    return res.json({ success: true, data: stockData, message: 'อนุมัติสินค้าเข้า stock เรียบร้อย' });
  } catch (err) {
    console.error('approveStock error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/branch-stock/check-boxset
 * ตรวจสอบสต๊อกสินค้าทั้งหมดใน Boxset สำหรับการตัดสต๊อก
 */
exports.checkBoxsetStock = async (req, res) => {
  try {
    const { contractNo, branchCode } = req.body;

    if (!contractNo || !branchCode) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุ contractNo และ branchCode'
      });
    }

    // หาข้อมูลสัญญา
    const Contract = require('../models/Load/Contract');
    const contract = await Contract.findOne({ contractNo }).lean().populate('items.productId');

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบสัญญา'
      });
    }

    // ตรวจสอบว่าเป็นสัญญาผ่อนหมดรับของ และชำระครบ 100%
    if (contract.planType !== 'plan3' || contract.paymentStatus !== 'COMPLETED') {
      return res.status(400).json({
        success: false,
        error: 'สัญญานี้ไม่ใช่ผ่อนหมดรับของ หรือยังชำระไม่ครบ'
      });
    }

    // รวบรวมสินค้าทั้งหมดจาก boxset
    const allItems = [];
    for (const item of contract.items) {
      if (item.productType === 'boxset') {
        // ดึงรายการสินค้าใน boxset
        const boxset = await ProductImage.findById(item.productId).lean();

        if (boxset && boxset.boxsetProducts) {
          allItems.push(...boxset.boxsetProducts);
        }
      } else {
        allItems.push(item);
      }
    }

    // กรองเฉพาะสินค้าที่มีภาษี
    const taxableItems = allItems.filter(item =>
      item.taxType && item.taxType !== 'ไม่มีภาษี'
    );

    // ตรวจสอบสต๊อกแต่ละรายการ
    const stockChecks = [];
    for (const item of taxableItems) {
      const stock = await BranchStock.findOne({
        branch_code: branchCode,
        name: item.name,
        verified: true,
        pending: false
      });

      stockChecks.push({
        name: item.name,
        required: 1,
        available: stock ? stock.stock_value : 0,
        sufficient: stock && stock.stock_value > 0,
        stock: stock
      });
    }

    const allSufficient = stockChecks.every(check => check.sufficient);

    res.json({
      success: true,
      data: {
        contractNo,
        allSufficient,
        items: stockChecks,
        summary: {
          totalItems: stockChecks.length,
          availableItems: stockChecks.filter(c => c.sufficient).length,
          missingItems: stockChecks.filter(c => !c.sufficient).length
        }
      }
    });

  } catch (error) {
    console.error('Check boxset stock error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/branch-stock/deduct-boxset
 * ตัดสต๊อกสินค้าใน Boxset สำหรับการส่งมอบ
 */
exports.deductBoxsetStock = async (req, res) => {
  const io = req.app.get('io');
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { contractNo, branchCode, performedBy } = req.body;

    if (!contractNo || !branchCode) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุ contractNo และ branchCode'
      });
    }

    // ตรวจสอบสต๊อกก่อน
    const checkReq = { body: { contractNo, branchCode } };
    const checkRes = {
      json: (data) => data,
      status: (code) => ({ json: (data) => ({ ...data, statusCode: code }) })
    };

    // เรียกใช้ฟังก์ชันตรวจสอบสต๊อก
    await this.checkBoxsetStock(checkReq, checkRes);

    // หาข้อมูลสัญญาอีกครั้งเพื่อตัดสต๊อก
    const Contract = require('../models/Load/Contract');
    const contract = await Contract.findOne({ contractNo }).lean();

    if (!contract) {
      throw new Error('ไม่พบสัญญา');
    }

    // รวบรวมสินค้าทั้งหมดจาก boxset
    const allItems = [];
    for (const item of contract.items) {
      if (item.productType === 'boxset') {
        const boxset = await ProductImage.findById(item.productId).lean();
        if (boxset && boxset.boxsetProducts) {
          allItems.push(...boxset.boxsetProducts);
        }
      } else {
        allItems.push(item);
      }
    }

    // กรองเฉพาะสินค้าที่มีภาษี
    const taxableItems = allItems.filter(item =>
      item.taxType && item.taxType !== 'ไม่มีภาษี'
    );

    // ตัดสต๊อกแต่ละรายการ
    const deductionResults = [];
    for (const item of taxableItems) {
      const stock = await BranchStock.findOne({
        branch_code: branchCode,
        name: item.name,
        verified: true,
        pending: false
      }).session(session);

      if (stock && stock.stock_value > 0) {
        const updatedStock = await BranchStock.findByIdAndUpdate(
          stock._id,
          {
            $inc: { stock_value: -1 },
            last_updated: new Date()
          },
          { new: true, session }
        );

        // บันทึกประวัติการตัดสต๊อก
        await BranchStockHistory.create([{
          branch_code: branchCode,
          change_type: 'OUT_BOXSET',
          reason: `ตัดสต๊อก Boxset สัญญา ${contractNo}`,
          performed_by: performedBy || req.user?._id,
          performed_at: new Date(),
          items: [{
            product_id: stock._id,
            name: item.name,
            qty: 1,
            remainQty: updatedStock.stock_value,
            cost: stock.cost || 0,
            price: stock.price || 0
          }],
          quantity: -1,
          stock_value: updatedStock.stock_value,
          contractNo
        }], { session });

        deductionResults.push({
          name: item.name,
          success: true,
          remainingStock: updatedStock.stock_value
        });

        // ส่ง socket event
        if (io) {
          io.emit('stockDeducted', {
            id: updatedStock._id,
            data: updatedStock,
            contractNo
          });
        }
      } else {
        deductionResults.push({
          name: item.name,
          success: false,
          error: 'ไม่มีสต๊อกเพียงพอ'
        });
      }
    }

    await session.commitTransaction();
    session.endSession();

    const successCount = deductionResults.filter(r => r.success).length;
    const totalCount = deductionResults.length;

    res.json({
      success: successCount === totalCount,
      data: {
        contractNo,
        deductedItems: successCount,
        totalItems: totalCount,
        results: deductionResults
      },
      message: successCount === totalCount
        ? 'ตัดสต๊อก Boxset เรียบร้อย'
        : `ตัดสต๊อกได้ ${successCount}/${totalCount} รายการ`
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Deduct boxset stock error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET /api/branch-stock/boxset-status/:contractNo
 * ตรวจสอบสถานะสต๊อก Boxset สำหรับสัญญาที่ระบุ
 */
exports.getBoxsetStockStatus = async (req, res) => {
  try {
    const { contractNo } = req.params;
    const { branchCode } = req.query;

    if (!contractNo) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุหมายเลขสัญญา'
      });
    }

    // เรียกใช้ฟังก์ชันตรวจสอบสต๊อก
    const checkReq = { body: { contractNo, branchCode } };
    const checkRes = {
      json: (data) => data,
      status: (code) => ({ json: (data) => ({ ...data, statusCode: code }) })
    };

    const result = await this.checkBoxsetStock(checkReq, checkRes);

    res.json({
      success: true,
      data: result.data || result,
      message: 'ตรวจสอบสถานะสต๊อก Boxset เรียบร้อย'
    });

  } catch (error) {
    console.error('Get boxset stock status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET /api/branch-stock/po-history
 * ดึงสินค้าที่สร้าง PO แล้วสำหรับสาขา
 */
exports.getPOHistory = async (req, res) => {
  try {
    const { branch_code } = req.query;

    if (!branch_code) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุ branch_code'
      });
    }

    // ค้นหาสินค้าที่มี poCreatedInSystem = true
    const historyProducts = await BranchStock.find({
      branch_code: branch_code,
      poCreatedInSystem: true,
      status: 'active'
    })
    .populate('supplier', 'name code')
    .populate('categoryGroup', 'name')
    .sort({ updatedAt: -1 }) // เรียงตามวันที่อัพเดทล่าสุด
    .lean();

    // ดึงข้อมูล PO สำหรับแต่ละสินค้า
    const enrichedProducts = await Promise.all(historyProducts.map(async (product) => {
      let poInfo = null;

      if (product.poSystemId) {
        const po = await PurchaseOrder.findOne({
          poNumber: product.poSystemId
        })
        .populate('supplier', 'name')
        .select('poNumber docDate supplier status totalAmount')
        .lean();

        if (po) {
          poInfo = {
            poNumber: po.poNumber,
            poDate: po.docDate,
            supplierName: po.supplier?.name || 'ไม่ระบุ',
            status: po.status,
            totalAmount: po.totalAmount
          };
        }
      }

      return {
        ...product,
        poInfo: poInfo || {
          poNumber: product.poSystemId || 'ไม่ระบุ',
          poDate: product.updatedAt,
          supplierName: product.supplier?.name || 'ไม่ระบุ',
          status: 'Unknown',
          totalAmount: 0
        }
      };
    }));

    res.json({
      success: true,
      data: enrichedProducts,
      count: enrichedProducts.length,
      message: `ดึงประวัติสินค้าที่สร้าง PO แล้วสำหรับสาขา ${branch_code} เรียบร้อย`
    });

  } catch (error) {
    console.error('Get PO history error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
