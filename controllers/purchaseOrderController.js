const mongoose = require('mongoose');
const branchStockController = require('./branchStockController');
const branchStockHistoryController = require('./branchStockHistoryController');
const Counter = require('../models/POS/Counter'); // นำเข้า Model Counter

const PurchaseOrder = require('../models/Stock/purchaseOrderModel');
const Product = require('../models/Stock/Product');
const CategoryGroup = require('../models/Stock/CategoryGroup');
const Branch = require('../models/Account/Branch');
const Customer = require('../models/Customer/Customer');
const Supplier = require('../models/Stock/Supplier');
const ProductImage = require('../models/Stock/ProductImage'); // สำหรับดึงรูป
const User          = require('../models/User/User');           // ← ต้องมี import User
const BranchStock   = require('../models/POS/BranchStock');     // ← เพิ่ม import BranchStock
const QuickSale     = require('../models/QuickSale');           // ← เพิ่ม import QuickSale
const jwt           = require('jsonwebtoken');

/**
 * ฟังก์ชันสร้างเลข PO ตัวอย่าง
 */
async function generatePONumber() {
  const prefix = 'PO-';
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  // หา PO ล่าสุด แล้ว +1
  const lastPO = await PurchaseOrder.findOne().lean().sort({ createdAt: -1 });
  let runningNumber = 1;
  if (lastPO) {
    // สมมติเลข PO เก็บแบบ "PO-2025030001"
    const lastNumberStr = lastPO.poNumber.slice(-4); // ดึง 4 ตัวท้าย
    const lastNumber = parseInt(lastNumberStr, 10) || 0;
    runningNumber = lastNumber + 1;
  }
  return `${prefix}${year}${month}${String(runningNumber).padStart(4, '0')}`;
}

/**
 * ฟังก์ชันสร้าง SKU สำหรับสินค้าที่ไม่มีการระบุ SKU โดยผู้ใช้
 * เมื่อ skuValue < 1000 จะ pad ด้วย 3 หลัก แต่ถ้าเกิน 999 จะแสดงเป็นเลขปกติ
 */
function formatSKU(skuValue) {
  if (skuValue < 1000) {
    return `SKU-${String(skuValue).padStart(3, '0')}`;
  } else {
    return `SKU-${skuValue}`;
  }
}

/**
 * GET /api/purchase-order/cost-report
 * ดึงข้อมูลต้นทุนสินค้าสำหรับรายงาน
 */
async function getCostReport(req, res) {
  try {
    const { startDate, endDate, category, supplier, branch } = req.query;

    // สร้าง filter criteria
    let matchCriteria = {
      status: { $in: ['Approved', 'Completed'] }, // เฉพาะ PO ที่อนุมัติแล้ว
      'items.0': { $exists: true } // ต้องมีสินค้าอย่างน้อย 1 รายการ
    };

    // กรองตามวันที่
    if (startDate || endDate) {
      matchCriteria.docDate = {};
      if (startDate) {
        matchCriteria.docDate.$gte = new Date(startDate);
      }
      if (endDate) {
        matchCriteria.docDate.$lte = new Date(endDate);
      }
    }

    // กรองตาม supplier
    if (supplier) {
      matchCriteria.supplier = new mongoose.Types.ObjectId(supplier);
    }

    // กรองตาม branch
    if (branch) {
      matchCriteria.branch = new mongoose.Types.ObjectId(branch);
    }

    // Aggregation pipeline สำหรับคำนวณต้นทุนสินค้า
    const pipeline = [
      { $match: matchCriteria },
      { $unwind: '$items' },
      {
        $match: category ? { 'items.category': category } : {}
      },
      {
        $group: {
          _id: {
            productName: '$items.name',
            productCode: '$items.barcode',
            category: '$items.category',
            brand: '$items.brand'
          },
          totalQuantity: { $sum: '$items.qty' },
          totalCost: { $sum: { $multiply: ['$items.cost', '$items.qty'] } },
          totalAmount: { $sum: '$items.totalItemAmount' },
          avgCost: { $avg: '$items.cost' },
          minCost: { $min: '$items.cost' },
          maxCost: { $max: '$items.cost' },
          purchaseCount: { $sum: 1 },
          lastPurchaseDate: { $max: '$docDate' },
          suppliers: { $addToSet: '$supplier' }
        }
      },
      {
        $lookup: {
          from: 'tb_pi_suppliers',
          localField: 'suppliers',
          foreignField: '_id',
          as: 'supplierDetails'
        }
      },
      {
        $project: {
          productName: '$_id.productName',
          productCode: '$_id.productCode',
          category: '$_id.category',
          brand: '$_id.brand',
          totalQuantity: 1,
          totalCost: 1,
          totalAmount: 1,
          avgCost: { $round: ['$avgCost', 2] },
          minCost: 1,
          maxCost: 1,
          purchaseCount: 1,
          lastPurchaseDate: 1,
          supplierNames: {
            $map: {
              input: '$supplierDetails',
              as: 'supplier',
              in: '$$supplier.name'
            }
          }
        }
      },
      { $sort: { totalAmount: -1 } }
    ];

    const costData = await PurchaseOrder.aggregate(pipeline);

    // คำนวณสถิติรวม
    const summary = {
      totalProducts: costData.length,
      totalQuantity: costData.reduce((sum, item) => sum + item.totalQuantity, 0),
      totalCost: costData.reduce((sum, item) => sum + item.totalCost, 0),
      totalAmount: costData.reduce((sum, item) => sum + item.totalAmount, 0),
      avgCostPerUnit: costData.length > 0 ?
        costData.reduce((sum, item) => sum + item.avgCost, 0) / costData.length : 0
    };

    res.json({
      success: true,
      data: {
        items: costData,
        summary: summary,
        filters: {
          startDate,
          endDate,
          category,
          supplier,
          branch
        }
      }
    });

  } catch (error) {
    console.error('Error in getCostReport:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลรายงานต้นทุนสินค้า',
      error: error.message
    });
  }
}

/**
 * POST /api/purchase_order
 * - สร้าง PO ใหม่ พร้อมคำนวณภาษีในแต่ละรายการสินค้า
 */
exports.createPO = async (req, res) => {
  const io = req.app.get('io');
  try {
    const {
      branch_code,
      supplierId,
      customerId,
      categoryGroup,
      notes,
      items,
      // รับข้อมูลผู้สร้างจาก Frontend (ถ้ามี)
      createdBy,
      createdByName,
      createdByEmail,
      creator,
      userId,
      userName
    } = req.body;

    // ตรวจสอบและจัดการ docDate
    let docDateValue;
    if (req.body.docDate) {
      const parsed = new Date(req.body.docDate);
      if (!isNaN(parsed.valueOf())) {
        docDateValue = parsed;
      } else {
        docDateValue = new Date();
      }
    } else {
      docDateValue = new Date();
    }

    // === เพิ่มส่วนจัดการข้อมูลผู้สร้าง ===
    // ดึงข้อมูลผู้ใช้จาก JWT token (req.user มาจาก middleware authenticate)
    let creatorData = {
      id: null,
      name: '',
      email: ''
    };

    // ลำดับความสำคัญ: 1. จาก token, 2. จาก request body
    if (req.user) {
      // ถ้ามี user จาก JWT token (best practice)
      creatorData.id = req.user._id || req.user.id;
      creatorData.name = req.user.name || req.user.fullName || req.user.email || 'ไม่ระบุ';
      creatorData.email = req.user.email || '';
    } else if (createdBy || userId) {
      // ถ้าไม่มี token แต่ส่งมาจาก frontend
      creatorData.id = createdBy || userId;
      creatorData.name = createdByName || creator || userName || 'ไม่ระบุ';
      creatorData.email = createdByEmail || '';
    }

    // console.log('Creator data:', creatorData); // Debug

    // บังคับว่าต้องมี branch_code เสมอ
    if (!branch_code) {
      return res.status(400).json({
        success: false,
        error: 'branch_code is required.'
      });
    }

    // หา branch จาก branch_code หรือ _id
    let foundBranch = await Branch.findOne({ branch_code }).lean();
    if (!foundBranch && mongoose.Types.ObjectId.isValid(branch_code)) {
      foundBranch = await Branch.findById(branch_code).lean();
    }
    if (!foundBranch) {
      return res.status(404).json({
        success: false,
        error: `ไม่พบสาขาด้วย branch_code หรือ _id: ${branch_code}`
      });
    }

    // ตรวจสอบ supplier
    if (!supplierId) {
      return res.status(400).json({
        success: false,
        error: 'Supplier ID is required.'
      });
    }

    // ตรวจสอบ items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No items found in request body.'
      });
    }

    // ตรวจซ้ำ SKU / IMEI ในระดับ input (เฉพาะใน request)
    const inputSkus = new Set();
    const inputImeis = new Set();
    for (const it of items) {
      const inputSKU = it.sku ? it.sku.trim() : '';
      const imei = it.imei ? it.imei.trim() : '';
      if (inputSKU) {
        if (inputSkus.has(inputSKU)) {
          return res.status(400).json({
            success: false,
            error: `Duplicate SKU "${inputSKU}" found in input items.`
          });
        }
        inputSkus.add(inputSKU);
      }
      if (imei) {
        if (inputImeis.has(imei)) {
          return res.status(400).json({
            success: false,
            error: `Duplicate IMEI "${imei}" found in input items.`
          });
        }
        inputImeis.add(imei);
      }
    }

    // สร้างเลข PO
    const poNumber = await generatePONumber();
    // คำนวณจำนวนสินค้าที่ต้องใช้ global SKU (สำหรับ items ที่ไม่มีการระบุ SKU จาก input)
    let totalGlobalUnits = 0;
    for (const it of items) {
      const qty = parseFloat(it.qty) || 1;
      if (!(it.sku && it.sku.trim())) {
        totalGlobalUnits += qty;
      }
    }
    let globalStart = 0;
    if (totalGlobalUnits > 0) {
      // อัปเดต counter ใน collection Counter แบบ atomic
      const counterDoc = await Counter.findOneAndUpdate(
        { key: 'sku' },
        { $inc: { value: totalGlobalUnits } },
        { new: true, upsert: true }
      );

      io.emit('counterUpdated', {
        id: counterDoc._id,
        data: counterDoc
      });

      globalStart = counterDoc.value - totalGlobalUnits + 1;
    }
    let globalIndex = 0; // สำหรับนับ SKU global ใน PO นี้

    let total = 0;
    const finalItems = [];
    const productPrices = [];

    // สร้างรายการสินค้าแยกชิ้น (qty=1)
    for (const it of items) {
      const name     = it.name     || '';
      const brand    = it.brand    || '';
      const model    = it.model    || '';
      // capacity, color ถูกลบออกแล้ว
      const barcode  = it.barcode  || '';
      const sku      = it.sku      || '';
      const imei     = it.imei     || '';
      const category = it.category || '';

      const qty      = parseFloat(it.qty)      || 1;
      const cost     = parseFloat(it.cost)     || 0;
      const discount = parseFloat(it.discount) || 0;
      const taxRate  = it.taxRate !== undefined ? parseFloat(it.taxRate) : 7;

      // Newly added: declare wh and status, using defaults if not provided.
      const wh     = (typeof it.wh === 'string' && it.wh.trim() !== '') ? it.wh.trim() : 'ยังไม่ระบุ';
      const status = (typeof it.status === 'string' && it.status.trim() !== '') ? it.status.trim() : 'active';

      // ให้ใช้ taxType ของแต่ละ item แทนของ PO-level
      let itemTaxType = (typeof it.taxType === 'string' && ['แยกภาษี','รวมภาษี','ไม่มีภาษี'].includes(it.taxType))
                        ? it.taxType
                        : 'แยกภาษี';

      // ค้นหา ProductImage จากชื่อสินค้า (ถ้ามี)
      let imagePath = '';
      let productImageId = null;
      let stockType = 'imei'; // default
      if (name) {
        const foundImg = await ProductImage.findOne({ name }).lean();
        if (foundImg) {
          imagePath = foundImg.image;
          productImageId = foundImg._id;
          stockType = foundImg.stockType || 'imei';
        }
      }

      // สำหรับแต่ละชิ้น (qty 1 ต่อชิ้น)
      for (let piece = 0; piece < qty; piece++) {
        let uniqueSku;
        if (it.sku && it.sku.trim()) {
          uniqueSku = `${it.sku.trim()}-${piece + 1}`;
        } else {
          uniqueSku = formatSKU(globalStart + globalIndex);
          globalIndex++;
        }

        // คำนวณ base price สำหรับชิ้นนั้น (ต้นทุน - ส่วนลด)
        const base = cost - discount;
        let net = 0, tax = 0;
        if (itemTaxType === 'ไม่มีภาษี') {
          net = base;
          tax = 0;
        } else if (itemTaxType === 'แยกภาษี') {
          net = base;
          tax = base * (taxRate / 100);
        } else { // รวมภาษี
          net = base / (1 + taxRate / 100);
          tax = base - net;
        }
        const totalItem = net + tax;
        total += totalItem;
        finalItems.push({
          productImageId: productImageId, // เพิ่ม productImageId
          barcode,
          sku:              uniqueSku,
          imei:             stockType === 'quantity' ? '' : imei, // ถ้าเป็น quantity ไม่เก็บ IMEI
          name,
          brand,
          model,
          qty:               1,
          cost,
          discount,
          taxRate,
          taxType: itemTaxType,   // เก็บ taxType ของแต่ละ item ที่มาจาก it.taxType
          wh,                   // Newly inserted variable
          status,               // Newly inserted variable
          category,
          image:             imagePath || '',
          stockType:         stockType,  // เพิ่ม stockType
          netAmount:         net,
          taxAmount:         tax,
          totalItemAmount:   totalItem
        });
        productPrices.push(it.price ? parseFloat(it.price) : 0);
      }
    }

    // === สร้าง PO พร้อมข้อมูลผู้สร้าง ===
    const newPO = new PurchaseOrder({
      poNumber,
      branch:        foundBranch._id,
      branch_code:   foundBranch.branch_code,
      supplier:      supplierId,
      customer:      customerId || null,
      categoryGroup: categoryGroup || null,
      notes:         notes || '',
      items:         finalItems,
      totalAmount:   total,
      status:        'Pending',
      invoiceRef:    null,
      docDate:       docDateValue,
      // === เพิ่มข้อมูลผู้สร้าง ===
      createdBy: creatorData.id,
      createdByName: creatorData.name,
      // === เพิ่ม history การสร้าง ===
      history: [{
        oldStatus: '',
        newStatus: 'Pending',
        changedBy: creatorData.id,
        changedByName: creatorData.name,
        changedAt: new Date(),
        note: 'สร้างใบสั่งซื้อ'
      }]
    });

    await newPO.save();

    // Populate ข้อมูลก่อนส่งกลับ
    await newPO.populate('supplier', 'name code');
    await newPO.populate('categoryGroup', 'name');
    await newPO.populate('branch', 'name');

    // ถ้ามี createdBy ID ให้ populate ข้อมูล user
    if (newPO.createdBy) {
      await newPO.populate('createdBy', 'name email fullName');
    }

    io.emit('newpoCreated', { id: newPO._id, data: newPO });

    // สร้าง Product สำหรับแต่ละสินค้าที่อยู่ใน PO
    for (let i = 0; i < newPO.items.length; i++) {
      const it = newPO.items[i];

      // ตรวจชื่อสินค้าไม่ให้เป็นค่าว่าง
      if (!it.name || typeof it.name !== 'string' || it.name.trim() === '') {
        return res.status(400).json({
          success: false,
          error: `ไม่สามารถสร้างสินค้าได้: รายการที่ ${i + 1} ไม่มีชื่อ (name) หรือค่าว่าง`
        });
      }

      // ดึงข้อมูลจาก ProductImage โดยใช้ชื่อสินค้า
      let productData = {
        price: productPrices[i] || 0,
        downAmount: 0,
        downInstallmentCount: 0,
        downInstallment: 0,
        creditThreshold: 0,
        payUseInstallmentCount: 0,
        payUseInstallment: 0,
        pricePayOff: 0,
        docFee: 0,
        purchaseType: '',
        image: ''
      };

      // ค้นหาข้อมูลเพิ่มเติมจาก ProductImage
      const foundImg = await ProductImage.findOne({ name: it.name.trim() }).lean();
      if (foundImg) {
        // ถ้าพบ ProductImage ให้ใช้ข้อมูลจากที่นั่น
        productData = {
          price: foundImg.price || productData.price,
          downAmount: foundImg.downAmount || 0,
          downInstallmentCount: foundImg.downInstallmentCount || 0,
          downInstallment: foundImg.downInstallment || 0,
          creditThreshold: foundImg.creditThreshold || 0,
          payUseInstallmentCount: foundImg.payUseInstallmentCount || 0,
          payUseInstallment: foundImg.payUseInstallment || 0,
          pricePayOff: foundImg.pricePayOff || 0,
          docFee: foundImg.docFee || 0,
          purchaseType: foundImg.purchaseType || '',
          image: foundImg.image || ''
        };
      }

      const newProduct = new Product({
        poNumber: newPO.poNumber,
        barcode: it.barcode || '',
        sku: it.sku || '',
        imei: it.imei || '',
        name: it.name.trim(),
        brand: it.brand || '',
        model: it.model || '',
        price: productData.price,
        cost: it.cost,
        status: it.status || 'active',
        category: it.category || '',
        supplier: supplierId,
        branch: foundBranch._id,
        branch_code: foundBranch.branch_code,
        qty: it.qty,
        // Add additional fields from ProductImage
        downAmount: productData.downAmount,
        downInstallmentCount: productData.downInstallmentCount,
        downInstallment: productData.downInstallment,
        creditThreshold: productData.creditThreshold,
        payUseInstallmentCount: productData.payUseInstallmentCount,
        payUseInstallment: productData.payUseInstallment,
        pricePayOff: productData.pricePayOff,
        docFee: productData.docFee,
        purchaseType: productData.purchaseType,
        image: productData.image
      });

      await newProduct.save();
      io.emit('newproductCreated', {
        id: newProduct._id,
        data: newProduct
      });

      it.productId = newProduct._id;
    }

    await newPO.save();

    return res.json({
      success: true,
      data: newPO,
      message: 'Purchase Order created successfully. Products have been created.'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to create Purchase Order.'
    });
  }
};

/**
 * ฟังก์ชัน stockIn (ตัวอย่าง ไม่เปลี่ยนแปลง)
 */
exports.stockIn = async (data) => {
  const io = req.app.get('io');
  try {
    const newPurchaseOrder = new PurchaseOrder(data);
    const savedPO = await newPurchaseOrder.save();

    io.emit('newpurchaseorderCreated', {
      id: savedPO._id,
      data: savedPO
    });

    return savedPO;
  } catch (err) {
    throw err;
  }
};

/**
 * GET /api/purchase_order
 */
exports.getAllPO = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { branch_code, mode, supplier } = req.query;
    const filter = {};

    if (branch_code && branch_code !== 'all') {
      const foundBranch = await Branch.findOne({ branch_code }).lean();
      if (!foundBranch) {
        return res.json({ success: true, data: [], message: 'ไม่พบสาขาในระบบ' });
      }
      filter.branch = foundBranch._id;
    }

    // Add supplier filter
    if (supplier && mongoose.Types.ObjectId.isValid(supplier)) {
      filter.supplier = new mongoose.Types.ObjectId(supplier);
    }

    if (mode === 'pending') {
      filter.status = { $in: ['Draft', 'draft', 'Pending', 'pending'] };
    } else if (mode === 'history') {
      filter.status = { $in: ['Approved', 'approved', 'Rejected', 'rejected'] };
    }

    const poList = await PurchaseOrder.find(filter).limit(100).lean()
      .populate('branch', 'name code')
      .populate('supplier', 'name code taxId phone')
      .populate('customer', 'first_name last_name phone_number')
      .populate('categoryGroup', 'name unitName')
      .populate('createdBy', 'name email fullName')  // เพิ่มการ populate ข้อมูลผู้สร้าง
      .populate('approvedBy', 'name email fullName') // เพิ่มการ populate ข้อมูลผู้อนุมัติ
      .populate('rejectedBy', 'name email fullName') // เพิ่มการ populate ข้อมูลผู้ปฏิเสธ
      .populate({
        path: 'items.productId',
        select: 'supplier name brand model price cost branch branch_code',
        populate: {
          path: 'supplier',
          select: 'name code taxId phone'
        }
      })
      .sort({ createdAt: -1 });

    // เพิ่มการตรวจสอบข้อมูลผู้สร้างสำหรับ PO เก่าที่อาจไม่มีข้อมูล
    const formattedPOs = [];

    for (const po of poList) {
      // ใช้ po โดยตรงเพราะเป็น plain object จาก .lean() แล้ว
      const poObj = po;

      // ถ้าไม่มี createdByName แต่มี createdBy ที่ populate มา
      if (!poObj.createdByName && poObj.createdBy) {
        poObj.createdByName = poObj.createdBy.name ||
                              poObj.createdBy.fullName ||
                              poObj.createdBy.email ||
                              'ไม่ระบุ';
      }

      // ตรวจสอบและอัปเดต stockType สำหรับ items ที่ยังไม่มี
      let poUpdated = false;
      for (let i = 0; i < poObj.items.length; i++) {
        const item = poObj.items[i];

        // ถ้ายังไม่มี stockType หรือเป็น undefined
        if (!item.stockType) {
          // ค้นหา ProductImage จากชื่อสินค้า
          const foundImg = await ProductImage.findOne({ name: item.name }).lean();

          if (foundImg) {
            item.stockType = foundImg.stockType || 'imei';
            item.productImageId = foundImg._id;

            // ถ้าเป็นประเภท quantity ให้เคลียร์ IMEI
            if (foundImg.stockType === 'quantity') {
              item.imei = '';
            }

            poUpdated = true;
          } else {
            // ถ้าไม่พบ ProductImage ให้ใช้ default
            item.stockType = 'imei';
            poUpdated = true;
          }
        }
      }

      // บันทึกการเปลี่ยนแปลงกลับไปยัง database
      if (poUpdated) {
        try {
          await PurchaseOrder.findByIdAndUpdate(po._id, { items: poObj.items });
        } catch (updateErr) {
        }
      }

      formattedPOs.push(poObj);
    }

    return res.json({
      success: true,
      data: formattedPOs,
      message: 'Retrieved all Purchase Orders.'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to get Purchase Orders.'
    });
  }
};

/**
 * GET /api/purchase-order/pending-items
 * Get pending purchase orders for inventory management
 */
exports.getPendingItems = async (req, res) => {
  try {
    const pendingOrders = await PurchaseOrder.find({
      status: { $in: ['pending', 'approved', 'in_progress', 'Draft', 'draft', 'Pending'] }
    })
    .select('poNumber supplier supplierName items status createdAt docDate')
    .populate('supplier', 'name')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

    // Format the response
    const formattedOrders = pendingOrders.map(order => ({
      _id: order._id,
      poNumber: order.poNumber,
      supplierName: order.supplierName || order.supplier?.name || 'ไม่ระบุผู้จำหน่าย',
      status: order.status,
      createdAt: order.createdAt,
      docDate: order.docDate,
      itemCount: order.items?.length || 0
    }));

    return res.json({
      success: true,
      orders: formattedOrders
    });
  } catch (error) {
    console.error('Error getting pending purchase orders:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการโหลดข้อมูลใบสั่งซื้อ',
      error: error.message
    });
  }
};

/**
 * GET /api/purchase_order/:id
 */
exports.getPOById = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const po = await PurchaseOrder.findById(id).lean()
      .populate('branch', 'name code')
      .populate('supplier', 'name code taxId phone')
      .populate('customer', 'first_name last_name phone_number')
      .populate('categoryGroup', 'name unitName')
            .populate('createdBy', 'name email fullName')  // ← เพิ่มบรรทัดนี้
      .populate('approvedBy', 'name email fullName') // ← เพิ่มบรรทัดนี้
      .populate('rejectedBy', 'name email fullName') // ← เพิ่มบรรทัดนี้
      .populate({
        path: 'items.productId',
        select: 'supplier name brand model price cost branch branch_code',
        populate: {
          path: 'supplier',
          select: 'name code taxId phone'
        }
      });

    if (!po) {
      return res.status(404).json({
        success: false,
        error: 'Purchase Order not found.'
      });
    }

    return res.json({
      success: true,
      data: po,
      message: 'Retrieved Purchase Order.'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to get Purchase Order.'
    });
  }
};

/**
 * PATCH /api/purchase_order/:id
 * - อัปเดตข้อมูล PO ทั้งก้อน
 */
exports.updatePO = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const {
      branch_code,
      supplierId,
      customerId,
      categoryGroup,
      docDate,      // <-- เพิ่มการรับค่า docDate จาก request body
      notes,
      items
    } = req.body;

    const po = await PurchaseOrder.findById(id);
    if (!po) {
      return res.status(404).json({
        success: false,
        error: 'Purchase Order not found.'
      });
    }

    if (branch_code !== undefined) {
      if (branch_code === '') {
        po.branch = null;
        po.branch_code = '';
      } else if (branch_code !== 'all') {
        const foundBranch = await Branch.findOne({ branch_code }).lean();
        if (!foundBranch && mongoose.Types.ObjectId.isValid(branch_code)) {
          const foundBranchById = await Branch.findById(branch_code).lean();
          if (foundBranchById) {
            po.branch = foundBranchById._id;
            po.branch_code = foundBranchById.branch_code;
          } else {
            return res.status(400).json({
              success: false,
              error: `ไม่พบสาขาด้วย branch_code หรือ _id: "${branch_code}"`
            });
          }
        } else if (!foundBranch) {
          return res.status(400).json({
            success: false,
            error: `ไม่พบสาขาด้วย branch_code หรือ _id: "${branch_code}"`
          });
        } else {
          po.branch = foundBranch._id;
          po.branch_code = foundBranch.branch_code;
        }
      }
    }

    if (supplierId !== undefined)      po.supplier = supplierId;
    if (customerId !== undefined)      po.customer = customerId;
    if (categoryGroup !== undefined)   po.categoryGroup = categoryGroup;
    if (notes !== undefined)           po.notes = notes;
    if (docDate !== undefined)         po.docDate = new Date(docDate);  // <-- เพิ่มการอัปเดต docDate

    if (items && Array.isArray(items)) {
      const usedSkus  = new Set();
      const usedImeis = new Set();

      for (const it of items) {
        const sku  = it.sku ? it.sku.trim() : '';
        const imei = it.imei ? it.imei.trim() : '';

        if (sku) {
          if (usedSkus.has(sku)) {
            return res.status(400).json({
              success: false,
              error: `SKU "${sku}" ซ้ำกับรายการอื่นใน PO นี้แล้ว!`
            });
          }
          usedSkus.add(sku);
        }
        if (imei) {
          if (usedImeis.has(imei)) {
            return res.status(400).json({
              success: false,
              error: `IMEI "${imei}" ซ้ำกับรายการอื่นใน PO นี้แล้ว!`
            });
          }
          usedImeis.add(imei);
        }
      }

      let total = 0;
      const newItems = [];

      // ในส่วนนี้จะยังไม่มีการคำนวณภาษีเพิ่มเติม
      for (const it of items) {
        const name     = it.name     || '';
        const brand    = it.brand    || '';
        const model    = it.model    || '';
        // capacity, color ถูกลบออกแล้ว
        const barcode  = it.barcode  || '';
        const sku      = it.sku      || '';
        const imei     = it.imei     || '';
        const category = it.category || '';

        const qty      = parseFloat(it.qty)      || 1;
        const cost     = parseFloat(it.cost)     || 0;
        const discount = parseFloat(it.discount) || 0;
        const taxRate  = it.taxRate !== undefined ? parseFloat(it.taxRate) : 7;
        const wh       = it.wh || 'ยังไม่ระบุ';
        const status   = it.status || 'active';

        total += (cost - discount) * qty;

        newItems.push({
          barcode,
          sku,
          imei,
          name,
          brand,
          model,
          // capacity, color ไม่ถูกส่ง
          qty,
          cost,
          discount,
          taxRate,
          wh,
          status,
          category
        });
      }

      po.items = newItems;
      po.totalAmount = total;
    }

    await po.save();

    io.emit('poCreated', {
      id: po._id,
      data: po
    });

    return res.json({
      success: true,
      data: po,
      message: 'Purchase Order updated successfully.'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to update Purchase Order.'
    });
  }
};

/**
 * DELETE /api/purchase_order/:id
 */
exports.deletePO = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const po = await PurchaseOrder.findById(id);
    if (!po) {
      return res.status(404).json({
        success: false,
        error: 'Purchase Order not found.'
      });
    }

    await po.deleteOne();

    io.emit('poDeleted', {
      id: po._id,
      data: po
    });

    return res.json({
      success: true,
      data: po,
      message: 'Purchase Order deleted successfully.'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to delete Purchase Order.'
    });
  }
};

/**
 * PATCH /api/purchase_order/:poId/items/:itemIndex
 * - แก้ไข fields ของ item เดียว
 */
exports.updatePOItem = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { poId, itemIndex } = req.params;
    const {
      productId,
      barcode, sku, imei,
      name, cost, price,
      brand, model,
      // capacity, color ไม่ต้องการ
      category, status,
      invoiceNumber
    } = req.body;

    // ดึงข้อมูลผู้ใช้ปัจจุบันจาก token
    const currentUser = await getUserFromToken(req);
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        error: 'กรุณาเข้าสู่ระบบก่อนทำการแก้ไข'
      });
    }

    // Debug log เพื่อดูข้อมูลผู้ใช้
    const po = await PurchaseOrder.findById(poId);
    if (!po) {
      return res.status(404).json({
        success: false,
        error: 'Purchase Order not found.'
      });
    }

    const idx = parseInt(itemIndex, 10);
    if (idx < 0 || idx >= po.items.length) {
      return res.status(400).json({
        success: false,
        error: 'Invalid itemIndex'
      });
    }

    const item = po.items[idx];

    for (let i = 0; i < po.items.length; i++) {
      if (i === idx) continue;
      const other = po.items[i];
      if (sku && other.sku === sku) {
        return res.status(400).json({
          success: false,
          error: `Duplicate SKU "${sku}" in PO items.`
        });
      }
      if (imei && other.imei === imei) {
        return res.status(400).json({
          success: false,
          error: `Duplicate IMEI "${imei}" in PO items.`
        });
      }
    }

    item.barcode  = barcode  || '';
    item.sku      = sku      || '';
    item.imei     = imei     || '';
    item.name     = name     || '';
    item.cost     = parseFloat(cost) || 0;
    item.brand    = brand    || '';
    item.model    = model    || '';
    // ไม่อัปเดต capacity, color
    item.category = category || '';
    item.status   = status   || 'active';

    // บันทึกข้อมูลผู้แก้ไขล่าสุด
    item.lastEditedBy = currentUser._id;
    item.lastEditedByName = currentUser.employee?.name || currentUser.username || currentUser.email || 'ไม่ระบุ';
    item.lastEditedAt = new Date();

    if (productId) {
      const product = await Product.findById(productId);
      if (product) {
        if (sku) {
          const productWithSameSku = await Product.findOne({ sku }).lean();
          if (productWithSameSku && productWithSameSku._id.toString() !== productId) {
            return res.status(400).json({
              success: false,
              error: `SKU "${sku}" มีในระบบแล้ว ไม่สามารถซ้ำได้`
            });
          }
        }
        if (imei) {
          const productWithSameImei = await Product.findOne({ imei }).lean();
          if (productWithSameImei && productWithSameImei._id.toString() !== productId) {
            return res.status(400).json({
              success: false,
              error: `IMEI "${imei}" มีในระบบแล้ว ไม่สามารถซ้ำได้`
            });
          }
        }

        product.barcode  = barcode  || product.barcode;
        product.sku      = sku      || product.sku;
        product.imei     = imei     || product.imei;
        product.name     = name     || product.name;
        product.price    = price !== undefined ? parseFloat(price) : product.price;
        product.cost     = cost  !== undefined ? parseFloat(cost)  : product.cost;
        product.brand    = brand    || product.brand;
        product.model    = model    || product.model;
        // ไม่อัปเดต capacity, color
        product.category = category || product.category;

        if (invoiceNumber !== undefined) {
          product.invoiceNumber = invoiceNumber;
        }

        if (po.branch) {
          product.branch = po.branch;
        }
        if (po.branch_code) {
          product.branch_code = po.branch_code;
        }

        if (req.file) {
          product.image = req.file.path;
        }

        await product.save();

        io.emit('productCreated', {
          id: product._id,
          data: product
        });

        item.productId = productId;
      }
    }

    let newTotal = 0;
    for (const it of po.items) {
      newTotal += (it.qty || 1) * (it.cost || 0);
    }
    po.totalAmount = newTotal;

    await po.save();

    io.emit('poCreated', {
      id: po._id,
      data: po
    });

    return res.json({
      success: true,
      data: po,
      message: 'Item updated successfully (no duplicates).'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to update item in PO.'
    });
  }
};

/**
 * ช่วยสร้างเลข Document อัตโนมัติ per-month
 */
async function getNextDocumentSequence(prefix) {
  const filter = { key: 'documentNumber', reference_value: prefix };
  const counter = await Counter.findOneAndUpdate(
    filter,
    { $inc: { seq: 1 } },           // increment seq
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return String(counter.seq).padStart(4, '0');
}

/**
 * PATCH /api/purchase_order/approve/:poId
 * อนุมัติ PO พร้อมสร้าง Document number อัตโนมัติ
 */
exports.approvePO = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { poId } = req.params;
    const { signatureImage } = req.body;      // ← รับภาพลายเซ็น

    const currentUser = await getUserFromToken(req);
    if (!currentUser) {
      return res.status(401).json({ success:false, error:'กรุณาเข้าสู่ระบบก่อนทำการอนุมัติ' });
    }

    const po = await PurchaseOrder.findById(poId);
    if (!po) {
      return res.status(404).json({ success:false, error:'ไม่พบใบสั่งซื้อ' });
    }
    if (po.status !== 'Pending') {
      return res.status(400).json({ success:false, error:'PO นี้อนุมัติไปแล้ว' });
    }

    // บังคับต้องส่ง signatureImage มาด้วย
    if (!signatureImage) {
      return res.status(400).json({ success:false, error:'ต้องวาดลายเซ็นก่อนอนุมัติ' });
    }
    po.approvedSignature = signatureImage;    // ← เซฟภาพลายเซ็น

    // สร้าง documentNumber ถ้ายังไม่มี
    if (!po.documentNumber) {
      const approvedCount = await PurchaseOrder.countDocuments({ status: 'Approved' });
      po.documentNumber = `DOC${String(approvedCount+1).padStart(6,'0')}`;
    }

    // อัพเดตสถานะและข้อมูลผู้อนุมัติ
    po.status = 'Approved';
    po.approvedBy = currentUser._id;
    po.approvedByName = currentUser.employee?.name || currentUser.username || currentUser.email || 'ไม่ระบุ';
    po.approvedAt = new Date();
    po.history.push({
      oldStatus: 'Pending',
      newStatus: 'Approved',
      changedBy: currentUser._id,
      changedByName: po.approvedByName,
      changedAt: new Date(),
      note: 'อนุมัติใบสั่งซื้อ'
    });

    await po.save();
    io.emit('poApproved', { id: po._id, data: po });
    return res.json({ success:true, data:po, message:'อนุมัติเรียบร้อย' });
  } catch (error) {
    return res.status(500).json({ success:false, error:error.message });
  }
};

/**
 * GET /api/purchase_order/history
 * ดึง PO เฉพาะที่มีสถานะ Approved หรือ Rejected
 */
exports.getHistoryPO = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { date, branch_code } = req.query;
    const filter = { status: { $in: ['Approved','approved','Rejected','rejected'] } };

    // กรองตามวันที่
    if (date) {
      const startDate = new Date(date); startDate.setHours(0,0,0,0);
      const endDate   = new Date(date); endDate.setHours(23,59,59,999);
      filter.docDate = { $gte: startDate, $lte: endDate };
    }

    // กรองตาม branch
    if (branch_code && branch_code !== 'all') {
      const foundBranch = await Branch.findOne({ branch_code }).lean();
      if (!foundBranch) return res.json({ success:true, data:[], message:'ไม่พบสาขาในระบบ' });
      filter.branch = foundBranch._id;
    }

    const orders = await PurchaseOrder.find(filter).limit(100).lean()
      .populate('branch','name code')
      .populate('supplier','name code taxId phone')
      .populate('customer','first_name last_name phone_number')
      .populate('categoryGroup','name unitName')
      .populate('createdBy','name email fullName')
      .populate('approvedBy','name email fullName')
      .populate('rejectedBy','name email fullName')
      .sort({ createdAt:-1 });

    return res.json({ success:true, data:orders, message:'Retrieved PO history.' });
  } catch (err) {
    return res.status(500).json({ success:false, error: err.message||'Failed to get PO history.' });
  }
};

/**
 * PATCH /api/purchase_order/reject/:poId
 * ปฏิเสธ PO
 */
exports.rejectPO = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { poId } = req.params;
    const { note } = req.body;
    const po = await PurchaseOrder.findById(poId);
    if (!po) return res.status(404).json({ success:false, error:'Purchase Order not found.' });
    if (!['Pending','pending'].includes(po.status)) {
      return res.status(400).json({ success:false, error:'ใบสั่งซื้อนี้ได้รับการอนุมัติหรือปฏิเสธไปแล้ว' });
    }

    const oldStatus = po.status;
    const newStatus = 'Rejected';
    const rejector = { id: req.user?._id||null, name:req.user?.name||req.user?.fullName||'ไม่ระบุ' };

    po.status = newStatus;
    po.rejectedBy = rejector.id;
    po.rejectedByName = rejector.name;
    po.rejectedAt = new Date();
    po.history.push({
      oldStatus, newStatus,
      changedBy: rejector.id,
      changedByName: rejector.name,
      changedAt: new Date(),
      note: note||'ปฏิเสธใบสั่งซื้อ'
    });

    await po.save();
    io.emit('poRejected',{ id:po._id, data:po });

    return res.json({ success:true, data:po, message:'Purchase Order rejected successfully.' });
  } catch (err) {
    return res.status(500).json({ success:false, error:err.message||'Failed to reject Purchase Order.' });
  }
};

/**
 * GET /api/purchase_order/approval/:id
 * เปลี่ยนเส้นทางไปยัง PDF หรือหน้าอนุมัติ
 */
exports.getCostReport = getCostReport;

exports.showApprovalPage = async (req, res) => {
  const po = await PurchaseOrder.findById(req.params.id);
  if (!po) return res.status(404).send('ไม่พบ PO');

  // ถ้าอนุมัติหรือปฏิเสธแล้ว ให้ดู PDF ได้เลย พร้อม force flag
  if (po.status !== 'Pending') {
    return res.redirect(`/api/purchase-order/pdf/${po._id}?force=true`);
  }

  // ถ้า Pending: ใช้ generatePDF แสดงปุ่มอนุมัติ
  return res.redirect(`/api/purchase-order/pdf/${req.params.id}`);
};

exports.generatePDF = async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id).lean()
      .populate('createdBy', 'name')
      .populate('approvedBy', 'name');
    if (!po) return res.status(404).send('ไม่พบ PO');

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>PO ${po.poNumber}</title>
  <style>
    .btn-approve { padding:8px 16px; background:#28a745; color:#fff; border:none; cursor:pointer; }
    .signature-canvas { display:none; border:1px solid #ccc; margin-top:10px; }
  </style>
</head>
<body>
  <!-- ...PO summary here... -->
  <div class="approval-section">
    <div class="signature-box">
      <div>ลงชื่อ: <em>${po.createdByName}</em> (ผู้สร้าง)</div>
    </div>
    <div class="signature-box">
      <button id="btnApprove" class="btn-approve">อนุมัติ</button>
      <canvas id="sigCanvas" class="signature-canvas" width="300" height="80"></canvas>
    </div>
  </div>
  <script>
    (function(){
      const btn = document.getElementById('btnApprove');
      const canvas = document.getElementById('sigCanvas');
      const ctx = canvas.getContext('2d');
      const approver = '${po.approvedByName||'ผู้อนุมัติ'}';

      btn.addEventListener('click', async () => {
        btn.disabled = true;
        await fetch('/api/purchase-order/approve/${po._id}', { method:'PATCH' });
        canvas.style.display = 'block';
        let i = 0;
        ctx.font = '48px cursive';
        (function step(){
          if (i <= approver.length) {
            ctx.clearRect(0,0,300,80);
            ctx.fillText(approver.slice(0,i), 10, 60);
            i++;
            setTimeout(step, 100);
          }
        })();
      });
    })();
  </script>
</body>
</html>`;
    res.setHeader('Content-Type','text/html');
    res.send(html);
  } catch (err) {
    res.status(500).json({ success:false, error: err.message });
  }
};

/**
 * ← ประกาศ helper ให้ชัดเจน ก่อน class
 */
exports.updateDocumentNumber = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { poId } = req.params;
    const { documentNumber } = req.body;

    // ตรวจสอบ PO
    const po = await PurchaseOrder.findById(poId);
    if (!po) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบใบสั่งซื้อ'
      });
    }

    // อัปเดตเลขที่เอกสาร
    po.documentNumber = documentNumber || '';
    await po.save();

    // ส่งข้อมูลผ่าน WebSocket (ถ้ามี)
    if (io) {
      io.emit('poDocumentNumberUpdated', {
        id: po._id,
        documentNumber: po.documentNumber,
        data: po
      });
    }

    return res.json({
      success: true,
      data: {
        _id: po._id,
        documentNumber: po.documentNumber
      },
      message: 'อัปเดตเลขที่เอกสารเรียบร้อย'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || 'เกิดข้อผิดพลาดในการอัปเดตเลขที่เอกสาร'
    });
  }
};

/**
 * 🔥 สร้าง PO จากข้อมูล Quick Sale
 * POST /api/purchase-order/create-from-quick-sale
 */
exports.createPOFromQuickSale = async (req, res) => {
  try {
    const {
      poNumber,
      poDate,
      branchCode,
      supplierId,
      categoryGroup,
      notes,
      products, // Array of products
      isQuickSale,
      createdBy
    } = req.body;

    // Validation
    if (!poNumber || !poDate || !branchCode || !supplierId || !products || !Array.isArray(products) || products.length === 0) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(400).json({
        success: false,
        error: 'ข้อมูลไม่ครบถ้วน กรุณากรอก poNumber, poDate, branchCode, supplierId และ products'
      });
    }

    // Validate and parse date
    console.log('📅 Received poDate:', poDate, 'Type:', typeof poDate);
    let parsedDate;
    try {
      // Handle different date formats
      if (typeof poDate === 'string') {
        // Check if it's in d/m/Y format (from flatpickr Thai format)
        if (poDate.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
          const [day, month, year] = poDate.split('/');
          parsedDate = new Date(year, month - 1, day); // Month is 0-indexed
        }
        // If it's in YYYY-MM-DD format
        else if (poDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
          parsedDate = new Date(poDate + 'T00:00:00.000Z');
        } else {
          parsedDate = new Date(poDate);
        }
      } else {
        parsedDate = new Date(poDate);
      }

      if (isNaN(parsedDate.getTime())) {
        throw new Error('Invalid date format');
      }

      console.log('✅ Parsed date successfully:', parsedDate);
    } catch (dateError) {
      console.error('❌ Date parsing error:', dateError);
      res.setHeader('Content-Type', 'application/json');
      return res.status(400).json({
        success: false,
        error: `วันที่ไม่ถูกต้อง: ${poDate}. รองรับรูปแบบ d/m/yyyy หรือ yyyy-mm-dd`
      });
    }

    // ตรวจสอบว่า PO Number ซ้ำหรือไม่
    const existingPO = await PurchaseOrder.findOne({ poNumber });
    if (existingPO) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(400).json({
        success: false,
        error: `เลขที่ PO "${poNumber}" มีอยู่แล้ว กรุณาใช้เลขอื่น`
      });
    }

    // ดึงข้อมูลสินค้าจาก BranchStock
    const BranchStock = require('../models/POS/BranchStock');
    const productDetails = [];

    for (const productItem of products) {
      const product = await BranchStock.findById(productItem.productId)
        .populate('categoryGroup', 'name')
        .populate('supplier', 'name');

      if (!product) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(404).json({
          success: false,
          error: `ไม่พบสินค้า ID: ${productItem.productId}`
        });
      }

      // เพิ่มข้อมูลสินค้าลงใน array
      productDetails.push({
        product: product,
        qty: productItem.qty || 1,
        cost: productItem.cost || product.cost || 0,
        discount: productItem.discount || 0,
        taxRate: productItem.taxRate || 7,
        taxType: productItem.taxType || 'แยกภาษี'
      });
    }

    // ดึงข้อมูลซัพพลายเออร์
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(404).json({
        success: false,
        error: 'ไม่พบข้อมูลซัพพลายเออร์'
      });
    }

    // สร้าง items array สำหรับ PO
    const poItems = productDetails.map(item => {
      const { product, qty, cost, discount, taxRate, taxType } = item;

      // คำนวณราคา
      const subtotal = qty * cost;
      const discountAmount = qty * discount;
      const beforeTax = subtotal - discountAmount;

      let taxAmount = 0;
      let totalWithTax = beforeTax;

      if (taxType === 'แยกภาษี') {
        taxAmount = beforeTax * (taxRate / 100);
        totalWithTax = beforeTax + taxAmount;
      } else if (taxType === 'รวมภาษี') {
        totalWithTax = beforeTax;
        taxAmount = totalWithTax - (totalWithTax / (1 + taxRate / 100));
      }

      return {
        productId: product._id,
        name: product.name,
        brand: product.brand,
        model: product.model || '',
        imei: product.imei || '',
        barcode: product.barcode || '',
        category: product.categoryGroup?.name || 'มือถือ',
        qty: qty,
        cost: cost,
        discount: discount,
        taxRate: taxRate,
        taxType: taxType,
        netAmount: beforeTax,
        taxAmount: taxAmount,
        totalItemAmount: totalWithTax,
        stockType: product.stockType || 'imei',
        status: 'active'
      };
    });

    // คำนวณยอดรวมทั้งหมด
    const totalAmount = poItems.reduce((sum, item) => sum + item.totalItemAmount, 0);

    // สร้าง PO ใหม่
    const newPO = new PurchaseOrder({
      poNumber: poNumber,
      docDate: parsedDate,
      supplier: supplier._id, // ใช้ ObjectId แทน object
      branch_code: branchCode, // แก้จาก branch_id เป็น branch_code
      categoryGroup: categoryGroup,
      items: poItems,
      totalAmount: totalAmount,
      status: 'Pending', // รออนุมัติจากฝ่ายบัญชี
      notes: notes || 'ขายด่วน',
      createdBy: createdBy?.id,
      createdByName: createdBy?.name,
      createdByEmail: createdBy?.email,
      source: 'quick_sale', // ระบุว่ามาจาก quick sale
      quickSaleProductIds: products.map(p => p.productId), // เก็บ reference ทั้งหมด
      isQuickSale: true
    });

    const savedPO = await newPO.save();

    // Populate supplier information for response
    await savedPO.populate('supplier', 'name code taxId address');

    // 🔥 อัพเดทสถานะสินค้าใน BranchStock ว่าได้สร้าง PO แล้ว
    const productIds = products.map(p => p.productId);

    const branchStockUpdateResult = await BranchStock.updateMany(
      { _id: { $in: productIds } },
      {
        $set: {
          poCreatedInSystem: true,
          poSystemId: savedPO.poNumber,
          updatedAt: new Date()
        }
      }
    );

    console.log('🔄 BranchStock update result:', {
      matchedCount: branchStockUpdateResult.matchedCount,
      modifiedCount: branchStockUpdateResult.modifiedCount,
      productIds: productIds
    });

    // 🔥 อัพเดทสถานะสินค้าใน QuickSale ด้วย (สำหรับหน้า backdated PO)
    const branchStockItems = await BranchStock.find({ _id: { $in: productIds } }).lean();
    const imeiList = branchStockItems.map(item => item.imei).filter(Boolean);

    if (imeiList.length > 0) {
      const quickSaleUpdateResult = await QuickSale.updateMany(
        {
          imei: { $in: imeiList },
          branchCode: branchCode
        },
        {
          $set: {
            poCreated: true,
            poNumber: savedPO.poNumber,
            poDate: parsedDate,
            status: 'po_created',
            supplierId: supplier._id,
            supplierName: supplier.name
          }
        }
      );

      console.log('🔄 QuickSale update result:', {
        matchedCount: quickSaleUpdateResult.matchedCount,
        modifiedCount: quickSaleUpdateResult.modifiedCount,
        imeiList: imeiList,
        branchCode: branchCode
      });

      console.log(`✅ Updated ${imeiList.length} QuickSale records with PO info`);
    } else {
      console.log('⚠️ No IMEI found in BranchStock items for QuickSale update');
    }

    console.log(`✅ Created PO ${poNumber} from ${products.length} quick sale products and updated BranchStock status`);

    res.setHeader('Content-Type', 'application/json');
    res.status(201).json({
      success: true,
      message: 'สร้างใบสั่งซื้อจากขายด่วนเรียบร้อยแล้ว',
      data: {
        _id: savedPO._id,
        poNumber: savedPO.poNumber,
        docDate: savedPO.docDate,
        supplier: savedPO.supplier,
        status: savedPO.status,
        totalAmount: savedPO.totalAmount,
        items: savedPO.items,
        source: savedPO.source,
        quickSaleProductIds: savedPO.quickSaleProductIds,
        isQuickSale: savedPO.isQuickSale
      }
    });

  } catch (error) {
    console.error('❌ Error creating PO from quick sale:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    // Check for validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message,
        value: err.value
      }));

      res.setHeader('Content-Type', 'application/json');
      return res.status(400).json({
        success: false,
        error: 'ข้อมูลไม่ถูกต้อง',
        validationErrors: validationErrors,
        details: error.message
      });
    }

    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการสร้างใบสั่งซื้อ',
      details: error.message
    });
  }
};

/**
 * 🔥 อนุมัติ PO และอัพเดต BranchStock
 * POST /api/purchase-order/:id/approve
 */
exports.approvePO = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedBy, approvedByName, approvedAt } = req.body;

    // ค้นหา PO
    const po = await PurchaseOrder.findById(id);
    if (!po) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบใบสั่งซื้อที่ระบุ'
      });
    }

    // ตรวจสอบสถานะ
    if (po.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        error: 'ใบสั่งซื้อนี้ได้รับการดำเนินการแล้ว'
      });
    }

    // อัพเดทสถานะ PO
    const updatedPO = await PurchaseOrder.findByIdAndUpdate(
      id,
      {
        status: 'Approved',
        approvedBy: approvedBy,
        approvedByName: approvedByName,
        approvedAt: new Date(approvedAt),
        updatedAt: new Date()
      },
      { new: true }
    );

    // 🔥 ถ้าเป็น Quick Sale PO ให้อัพเดต BranchStock
    if (po.isQuickSale || po.source === 'quick_sale') {
      const BranchStock = require('../models/POS/BranchStock');
      const BranchStockHistory = require('../models/POS/BranchStockHistory');

      // อัพเดตสินค้าใน BranchStock
      if (po.quickSaleProductIds && po.quickSaleProductIds.length > 0) {
        for (const productId of po.quickSaleProductIds) {
          // อัพเดตสถานะสินค้าจาก 'sent_to_po' เป็น 'verified'
          const updatedProduct = await BranchStock.findByIdAndUpdate(
            productId,
            {
              status: 'active',
              verified: true,
              pending: false,
              stock_value: 1, // เข้าสต๊อกจริง
              approvedBy: approvedBy,
              approvedByName: approvedByName,
              approvedAt: new Date(approvedAt),
              updated_at: new Date()
            },
            { new: true }
          );

          if (updatedProduct) {
            // บันทึกประวัติการเข้าสต๊อก
            const historyData = {
              branch_code: updatedProduct.branch_code,
              product_id: updatedProduct._id,
              imei: updatedProduct.imei,
              action: 'stock_approved',
              action_type: 'quick_sale_approved',
              quantity_before: 0,
              quantity_after: 1,
              quantity_change: 1,
              reason: `อนุมัติสินค้าขายด่วนจาก PO ${po.poNumber}`,
              note: `อนุมัติโดย ${approvedByName} ผ่าน PO System`,
              performed_by: approvedBy,
              performed_by_name: approvedByName,
              timestamp: new Date(),
              reference_id: po._id,
              reference_type: 'purchase_order'
            };

            const history = new BranchStockHistory(historyData);
            await history.save();

            console.log(`✅ Updated BranchStock ${productId} to verified status`);
          }
        }
      }
    }

    console.log(`✅ PO ${po.poNumber} approved by ${approvedByName}`);

    res.json({
      success: true,
      message: 'อนุมัติใบสั่งซื้อเรียบร้อยแล้ว',
      data: {
        _id: updatedPO._id,
        poNumber: updatedPO.poNumber,
        status: updatedPO.status,
        approvedBy: updatedPO.approvedBy,
        approvedByName: updatedPO.approvedByName,
        approvedAt: updatedPO.approvedAt,
        isQuickSale: updatedPO.isQuickSale,
        quickSaleProductIds: updatedPO.quickSaleProductIds
      }
    });

  } catch (error) {
    console.error('❌ Error approving PO:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการอนุมัติใบสั่งซื้อ',
      details: error.message
    });
  }
};

/**
 * 🔥 ปฏิเสธ PO
 * POST /api/purchase-order/:id/reject
 */
exports.rejectPO = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectedBy, rejectedByName, rejectedAt, rejectionReason } = req.body;

    // ค้นหา PO
    const po = await PurchaseOrder.findById(id);
    if (!po) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบใบสั่งซื้อที่ระบุ'
      });
    }

    // ตรวจสอบสถานะ
    if (po.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        error: 'ใบสั่งซื้อนี้ได้รับการดำเนินการแล้ว'
      });
    }

    // อัพเดทสถานะ PO
    const updatedPO = await PurchaseOrder.findByIdAndUpdate(
      id,
      {
        status: 'Rejected',
        rejectedBy: rejectedBy,
        rejectedByName: rejectedByName,
        rejectedAt: new Date(rejectedAt),
        rejectionReason: rejectionReason,
        updatedAt: new Date()
      },
      { new: true }
    );

    // 🔥 ถ้าเป็น Quick Sale PO ให้รีเซ็ตสถานะ BranchStock
    if (po.isQuickSale || po.source === 'quick_sale') {
      const BranchStock = require('../models/POS/BranchStock');

      if (po.quickSaleProductIds && po.quickSaleProductIds.length > 0) {
        for (const productId of po.quickSaleProductIds) {
          // รีเซ็ตสถานะสินค้ากลับเป็น pending
          await BranchStock.findByIdAndUpdate(
            productId,
            {
              status: 'pending',
              verified: false,
              pending: true,
              stock_value: 0,
              rejectedBy: rejectedBy,
              rejectedByName: rejectedByName,
              rejectedAt: new Date(rejectedAt),
              rejectionReason: rejectionReason,
              updated_at: new Date()
            }
          );

          console.log(`✅ Reset BranchStock ${productId} to pending status`);
        }
      }
    }

    console.log(`✅ PO ${po.poNumber} rejected by ${rejectedByName}`);

    res.json({
      success: true,
      message: 'ปฏิเสธใบสั่งซื้อเรียบร้อยแล้ว',
      data: {
        _id: updatedPO._id,
        poNumber: updatedPO.poNumber,
        status: updatedPO.status,
        rejectedBy: updatedPO.rejectedBy,
        rejectedByName: updatedPO.rejectedByName,
        rejectedAt: updatedPO.rejectedAt,
        rejectionReason: updatedPO.rejectionReason
      }
    });

  } catch (error) {
    console.error('❌ Error rejecting PO:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการปฏิเสธใบสั่งซื้อ',
      details: error.message
    });
  }
};

/**
 * Helper function: getUserFromToken
 */
async function getUserFromToken(req) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return null;
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId || decoded.id).lean().populate('employee', 'name email position');
    return user;
  } catch (err) {
    return null;
  }
}
