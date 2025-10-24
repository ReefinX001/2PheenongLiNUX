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
 * POST /api/branch-stock
 * สร้างหรืออัปเดต Stock (createStock) สำหรับสินค้าเข้าทีละ 1 ชิ้น
 */
exports.createStock = async (req, res) => {
  const io = req.app.get('io');
  try {
    // รับค่าจาก request body (รวม taxType เข้ามาด้วย)
    const {
      branch_code,
      brand,
      model,
      name,
      // ไม่รับ color, capacity อีกต่อไป
      price,
      cost,
      imei,
      updated_by,
      poNumber,
      invoiceNumber,
      supplier,
      barcode,
      sku,
      taxType
    } = req.body;
    let { categoryGroup } = req.body; // รับค่า categoryGroup จาก request

    // 1) ต้องมี branch_code
    if (!branch_code) {
      return res.status(400).json({ success: false, error: 'branch_code is required.' });
    }

    // หา branch จาก branch_code
    const foundBranch = await Branch.findOne({ branch_code }).lean();
    if (!foundBranch) {
      return res.status(404).json({
        success: false,
        error: `ไม่พบสาขาด้วย branch_code ${branch_code}`,
      });
    }
    const realBranchCode = foundBranch.branch_code;

    // (A) ถ้ายังไม่มี brand, model, name => ลองหาใน Product ด้วย barcode/sku
    if (!brand && !model && !name) {
      if (barcode || sku) {
        const productQuery = {};
        if (barcode) productQuery.barcode = barcode;
        if (sku) productQuery.sku = sku;
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
          }
          // หาก Product มีค่า taxType แต่ยังไม่ได้ส่งมา ให้ใช้จาก Product
          if (!taxType && foundProd.taxType) {
            req.body.taxType = foundProd.taxType;
          }
        }
      }
    }

    // 2) ตรวจสอบว่าอย่างน้อยมีค่า brand, model หรือ name
    if (!req.body.brand && !req.body.model && !req.body.name) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุ brand, model หรือ name อย่างน้อย 1 อย่าง',
      });
    }

    // ตรวจสอบ supplier
    const supCheck = await findSupplierByParam(supplier);
    if (!supCheck.success) {
      return res.status(400).json({ success: false, error: supCheck.error });
    }
    const foundSupplier = supCheck.supplierDoc;

    // ตรวจสอบ poNumber หากส่งมา
    if (poNumber) {
      const foundPO = await PurchaseOrder.findOne({ poNumber }).lean();
      if (!foundPO) {
        return res.status(400).json({
          success: false,
          error: `ไม่พบ PurchaseOrder ที่มี poNumber = ${poNumber}`,
        });
      }
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
    if (!finalCategoryGroup && name) {
      const foundProd = await Product.findOne({ name }).lean();
      if (foundProd && foundProd.categoryGroup) {
        finalCategoryGroup = foundProd.categoryGroup;
      }
    }
    // หากยังไม่มี finalCategoryGroup ลอง fallback จาก PurchaseOrder โดยใช้ poNumber (จาก req.body)
    if (!finalCategoryGroup && req.body.poNumber) {
      const foundPO = await PurchaseOrder.findOne({ poNumber: req.body.poNumber }).lean();
      if (foundPO && foundPO.categoryGroup) {
        finalCategoryGroup = foundPO.categoryGroup;
      }
    }

    // หาก taxType ไม่ได้ส่งเข้ามา ให้ลองดึงจาก Product ก่อน จากนั้นถ้าไม่พบให้ fallback จาก PurchaseOrder
    let finalTaxType = taxType;
    if (!finalTaxType) {
      const foundProd = await Product.findOne({ name }).lean();
      if (foundProd && foundProd.taxType) {
        finalTaxType = foundProd.taxType;
      } else if (req.body.poNumber) {
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
      sku:           req.body.sku || '',
      price:         pi?.price ?? (price || 0),
      cost:          cost || 0,  // ← ใช้ cost จาก request โดยตรง ไม่ต้องดูจาก pi
      imei:          imei || '',
      stock_value:   0,               // ← เก็บ 0
      pending:       true,            // ← ตั้ง pending
      updated_by:    tokenUserId,
      scanned_by:    req.body.scanned_by || tokenUserId,  // ← เพิ่ม
      last_updated:  new Date(),
      verified:      false,
      invoiceNumber: invoiceNumber || '',
      supplier:      foundSupplier._id,
      categoryGroup: mongoose.isValidObjectId(finalCategoryGroup)
                      ? new mongoose.Types.ObjectId(finalCategoryGroup)
                      : null,
      taxType:       (finalTaxType && ['ไม่มีภาษี','แยกภาษี','รวมภาษี'].includes(finalTaxType))
                      ? finalTaxType
                      : 'แยกภาษี',
      stockType:     pi?.stockType || 'imei',  // ← เพิ่ม stockType จาก ProductImage
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
      supplier:    foundSupplier._id,
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
    if (sku !== undefined) stock.sku = sku;

    if (poNumber !== undefined) {
      stock.poNumber = poNumber;
      const po = await PurchaseOrder.findOne({ poNumber: poNumber.trim().lean() });
      if (po && po.documentNumber) {
        stock.documentNumber = po.documentNumber;
      } else {
        stock.documentNumber = '';
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
    // หากยังไม่มี finalCategoryGroup ลอง fallback จาก PurchaseOrder โดยใช้ poNumber (จาก req.body)
    if (!finalCategoryGroup && req.body.poNumber) {
      const foundPO = await PurchaseOrder.findOne({ poNumber: req.body.poNumber }).lean();
      if (foundPO && foundPO.categoryGroup) {
        finalCategoryGroup = foundPO.categoryGroup;
      }
    }

    // หาก taxType ไม่ได้ส่งเข้ามา ให้ลองดึงจาก Product ก่อน จากนั้นถ้าไม่พบให้ fallback จาก PurchaseOrder
    let finalTaxType = taxType;
    if (!finalTaxType) {
      const foundProd = await Product.findOne({ name }).lean();
      if (foundProd && foundProd.taxType) {
        finalTaxType = foundProd.taxType;
      } else if (req.body.poNumber) {
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
      sku: req.body.sku || '',
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

    // หาก req.body.poNumber ถูกส่งมา ให้เซ็ตค่า poNumber, documentNumber และ fallback สำหรับ taxType จาก PurchaseOrder
    if (req.body.poNumber && req.body.poNumber.trim() !== '') {
      newStock.poNumber = req.body.poNumber;
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

    // 1) ดึง BranchStock ที่ขออนุมัติ (ไม่ใช้ .lean() เพื่อให้สามารถ save ได้)
    const stock = await BranchStock.findById(id);
    if (!stock) {
      return res.status(404).json({ success: false, error: 'ไม่พบสินค้ารายการนี้' });
    }

    // 2) ตรวจว่ารายการกำลัง pending หรือไม่
    if (!stock.pending || stock.stock_value > 0) {
      return res.status(400).json({ success: false, error: 'รายการนี้ไม่อยู่ในสถานะรออนุมัติ' });
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
