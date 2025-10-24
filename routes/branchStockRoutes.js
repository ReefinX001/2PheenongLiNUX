const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const branchStockController = require('../controllers/branchStockController');
const { findStockByBranch } = require('../utils/findStockByBranch');
const BranchStock = require('../models/POS/BranchStock');

// Boxset model (เพิ่มใหม่สำหรับ boxset)
const Boxset = require('../models/POS/Boxset');
const BranchStockHistory = require('../models/POS/BranchStockHistory');

// 🔥 Import unified sync function (better connection management)
const { syncAllExisting, getSyncStatus } = require('../services/unifiedSync');

// Helper function to get product type label in Thai
function getProductTypeLabel(productType) {
  switch (productType) {
    case 'mobile':
      return 'มือถือ';
    case 'accessory':
      return 'อุปกรณ์เสริม';
    case 'gift':
      return 'ของแถม';
    case 'boxset':
      return 'Boxset';
    default:
      return 'สินค้าทั่วไป';
  }
}

// GET /api/branch-stock/monthly-inventory - ข้อมูลสินค้าคงเหลือรายเดือน
router.get('/monthly-inventory', async (req, res) => {
  try {
    const { reportType, year, month, branchCode } = req.query;

    console.log('🔍 API called: /api/branch-stock/monthly-inventory', { reportType, year, month, branchCode });

    // ตรวจสอบ parameters ที่จำเป็น
    if (!reportType || !year || !month) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุ reportType, year และ month'
      });
    }

    // คำนวณวันที่ตามประเภทรายงาน
    let targetDate;
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    if (reportType === 'opening') {
      // สินค้าคงเหลือต้นงวด - วันที่ 1 ของเดือน
      targetDate = new Date(yearNum, monthNum - 1, 1);
    } else if (reportType === 'closing') {
      // สินค้าคงเหลือปลายงวด - วันสุดท้ายของเดือน
      targetDate = new Date(yearNum, monthNum, 0); // วันที่ 0 = วันสุดท้ายของเดือนก่อนหน้า
    } else {
      return res.status(400).json({
        success: false,
        error: 'reportType ต้องเป็น "opening" หรือ "closing"'
      });
    }

    // สร้าง filter condition
    let filter = { verified: true };
    if (branchCode && branchCode !== 'all') {
      filter.branch_code = branchCode;
    }

    // ดึงข้อมูลสต๊อกที่มีการอัปเดตก่อนหรือในวันที่เป้าหมาย
    const stocks = await BranchStock.find({
      ...filter,
      last_updated: { $lte: targetDate },
      stock_value: { $gt: 0 } // มีสต๊อกเหลืออยู่
    })
      .populate('supplier', 'name')
      .populate('updated_by', 'username')
      .select([
        'branch_code', 'name', 'brand', 'model', 'imei', 'barcode',
        'price', 'cost', 'stock_value', 'image', 'unit', 'taxType',
        'supplier', 'updated_by', 'last_updated', 'productType',
        'stockType', 'verified', 'pending'
      ].join(' '))
      .lean();

    // Group สินค้าเหมือนกันให้เป็นรายการเดียวกัน
    const groupedStocks = {};

    stocks.forEach(stock => {
      const groupKey = `${stock.branch_code}-${stock.name}-${stock.brand}-${stock.model}`;

      if (!groupedStocks[groupKey]) {
        // กำหนดหน่วยนับตาม productType
        let unit = 'ชิ้น'; // default
        if (stock.productType === 'mobile') {
          unit = 'เครื่อง';
        }

        groupedStocks[groupKey] = {
          _id: stock._id,
          branch_code: stock.branch_code,
          name: stock.name,
          brand: stock.brand,
          model: stock.model,
          image: stock.image,
          supplier_name: stock.supplier?.name || '',
          category_name: getProductTypeLabel(stock.productType),
          unit: unit,
          taxType: stock.taxType,
          last_updated: stock.last_updated,
          updated_by: stock.updated_by?.username || '',

          // รวมข้อมูล
          total_stock: 0,
          total_cost_value: 0,
          average_cost: 0,
          average_price: 0,
          items: [], // รายการ IMEI แต่ละตัว
          has_imei: false
        };
      }

      // เพิ่มข้อมูลในกลุ่ม
      const group = groupedStocks[groupKey];
      group.total_stock += stock.stock_value || 0;
      group.total_cost_value += (stock.stock_value || 0) * (stock.cost || 0);

      // ถ้ามี IMEI
      if (stock.imei && stock.imei.trim()) {
        group.has_imei = true;
        group.items.push({
          _id: stock._id,
          imei: stock.imei,
          barcode: stock.barcode,
          cost: stock.cost || 0,
          price: stock.price || 0,
          stock_value: stock.stock_value || 0,
        });
      }
    });

    // คำนวณค่าเฉลี่ย
    Object.values(groupedStocks).forEach(group => {
      if (group.total_stock > 0) {
        group.average_cost = group.total_cost_value / group.total_stock;
      }
      if (group.items.length > 0) {
        const totalPrice = group.items.reduce((sum, item) => sum + (item.price || 0), 0);
        group.average_price = totalPrice / group.items.length;
      }
    });

    const result = Object.values(groupedStocks);

    console.log(`📊 Found ${result.length} grouped stock items for ${reportType} inventory`);

    res.json({
      success: true,
      data: result,
      reportType: reportType,
      targetDate: targetDate,
      totalItems: result.length,
      totalValue: result.reduce((sum, item) => sum + item.total_cost_value, 0)
    });

  } catch (error) {
    console.error('❌ Error in monthly-inventory API:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการโหลดข้อมูลสต๊อกรายเดือน',
      message: error.message
    });
  }
});

// GET /api/branch-stock/overview - ข้อมูลภาพรวมสต๊อกทุกสาขา (แบบ grouped)
router.get('/overview', async (req, res) => {
  try {
    console.log('🔍 API called: /api/branch-stock/overview');

    const stocks = await BranchStock.find({ verified: true })
      .populate('supplier', 'name')
      .populate('updated_by', 'username')
      .select([
        'branch_code', 'name', 'brand', 'model', 'imei', 'barcode',
        'price', 'cost', 'stock_value', 'image', 'unit', 'taxType',
        'supplier', 'updated_by', 'last_updated', 'productType',
        'stockType', 'verified', 'pending'
      ].join(' '))
      .lean();

    // Group สินค้าตาม name, brand, model, branch_code
    const groupedStocks = {};

    stocks.forEach(stock => {
      const groupKey = `${stock.branch_code}-${stock.name}-${stock.brand}-${stock.model}`;

      if (!groupedStocks[groupKey]) {
        // กำหนดหน่วยนับตาม productType
        let unit = 'ชิ้น'; // default
        if (stock.productType === 'mobile') {
          unit = 'เครื่อง';
        }

        groupedStocks[groupKey] = {
          _id: stock._id, // ใช้ ID ของรายการแรก
          branch_code: stock.branch_code,
          name: stock.name,
          brand: stock.brand,
          model: stock.model,
          image: stock.image,
          supplier_name: stock.supplier?.name || '',
          category_name: getProductTypeLabel(stock.productType),
          unit: unit,
          taxType: stock.taxType,
          last_updated: stock.last_updated,
          updated_by: stock.updated_by?.username || '',

          // รวมข้อมูล
          total_stock: 0,
          total_cost_value: 0,
          average_cost: 0,
          average_price: 0,
          items: [], // รายการ IMEI แต่ละตัว
          has_imei: false
        };
      }

      // เพิ่มข้อมูลในกลุ่ม
      const group = groupedStocks[groupKey];
      group.total_stock += stock.stock_value || 0;
      group.total_cost_value += (stock.stock_value || 0) * (stock.cost || 0);

      // ถ้ามี IMEI
      if (stock.imei && stock.imei.trim()) {
        group.has_imei = true;
        group.items.push({
          _id: stock._id,
          imei: stock.imei,
          barcode: stock.barcode,

          cost: stock.cost || 0,
          price: stock.price || 0,
          stock_value: stock.stock_value || 0,
          last_updated: stock.last_updated
        });
      } else {
        // ถ้าไม่มี IMEI ให้รวมเป็นก้อน
        group.items.push({
          _id: stock._id,
          imei: null,
          barcode: stock.barcode,

          cost: stock.cost || 0,
          price: stock.price || 0,
          stock_value: stock.stock_value || 0,
          last_updated: stock.last_updated
        });
      }
    });

    // คำนวณราคาเฉลี่ย
    const transformedStocks = Object.values(groupedStocks).map(group => {
      const totalItems = group.items.length;
      group.average_cost = totalItems > 0 ?
        group.items.reduce((sum, item) => sum + (item.cost || 0), 0) / totalItems : 0;
      group.average_price = totalItems > 0 ?
        group.items.reduce((sum, item) => sum + (item.price || 0), 0) / totalItems : 0;

      return group;
    });

    console.log(`✅ Found ${stocks.length} stock records, grouped into ${transformedStocks.length} groups`);

    res.json({
      success: true,
      data: transformedStocks,
      total: transformedStocks.length,
      raw_total: stocks.length
    });
  } catch (error) {
    console.error('❌ Error in /api/branch-stock/overview:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการโหลดข้อมูลสต๊อก',
      message: error.message
    });
  }
});

// GET /api/branch-stock/taxType?branch_code=xxx[&imei=yyy][&purchaseType=zzz][&verified=true][&taxRate=7]
router.get('/taxType', async (req, res) => {
  const { branch_code, imei, purchaseType, verified, taxRate } = req.query;

  if (!branch_code) {
    return res.status(400).json({ success: false, error: 'branch_code is required' });
  }

  // สร้างเงื่อนไขการค้นหา
  const filter = { branch_code };
  if (imei) {
    filter.imei = imei;
  }
  if (purchaseType) {
    // รองรับหลายค่า เช่น ?purchaseType=installment,cash
    const types = purchaseType.split(',').map(t => t.trim());
    filter.purchaseType = { $in: types };
  }
  if (typeof verified !== 'undefined') {
    // แปลง "true"/"false" เป็น boolean
    filter.verified = verified === 'true';
  }
  if (typeof taxRate !== 'undefined') {
    // แปลงตัวเลขและกรองสินค้าให้ตรง rate ที่ส่งมา
    filter.taxRate = Number(taxRate);
  }

  try {
    // Get regular branch stock products
    const stocks = await BranchStock.find(filter)
      .select([
        'imei', 'name', 'image', 'price', 'brand', 'model', 'cost',
        'product_id',                   // ← เพิ่ม product_id สำหรับการอ้างอิง
        'downAmount','downInstallment','downInstallmentCount',
        'creditThreshold','payUseInstallment','payUseInstallmentCount',
        'pricePayOff','docFee',
        'taxType','taxRate',            // ← เพิ่ม taxRate ใน select
        'purchaseType','stock_value','verified','stockType',
        'productType','boxsetType','boxsetProducts','payoffDiscount',  // ← เพิ่ม productType และ boxset fields
        'categoryGroup'                 // ← เพิ่ม categoryGroup ใน select
      ].join(' '))
      .populate('categoryGroup', 'name unitName')  // ← เพิ่มการ populate categoryGroup
      .lean();

    // Also get boxsets for this branch
    const Boxset = require('../models/POS/Boxset');
    let boxsetFilter = {
      branchCode: branch_code,
      status: 'active',
      stock_value: { $gt: 0 }
    };

    // Filter by purchase type if specified
    if (purchaseType) {
      const types = purchaseType.split(',').map(t => t.trim());
      boxsetFilter.purchaseTypes = { $in: types };
    }

    const boxsets = await Boxset.find(boxsetFilter)
      .populate('categoryGroup', 'name unitName')
      .lean();

    // Convert boxsets to stock format for compatibility
    const boxsetStockFormat = boxsets.map(boxset => ({
      _id: boxset._id,
      name: boxset.name,
      brand: 'Boxset',
      model: boxset.boxsetType === 'special' ? 'Special' : 'Standard',
      imei: null, // Boxsets don't have IMEI
      image: null, // Can be added later if needed
      price: boxset.boxsetPrice,
      cost: boxset.totalCost,
      stock_value: boxset.stock_value,
      verified: boxset.verified,
      stockType: 'boxset',
      productType: 'boxset',
      boxsetType: boxset.boxsetType,
      boxsetProducts: boxset.products,
      categoryGroup: boxset.categoryGroup,
      taxType: boxset.taxType,
      taxRate: boxset.taxRate,
      purchaseType: boxset.purchaseTypes, // Array format
      // Installment fields from boxset
      downAmount: boxset.installmentConfig?.downAmount,
      downInstallment: boxset.installmentConfig?.downInstallment,
      downInstallmentCount: boxset.installmentConfig?.downInstallmentCount,
      creditThreshold: boxset.installmentConfig?.creditThreshold,
      payUseInstallment: boxset.installmentConfig?.payUseInstallment,
      payUseInstallmentCount: boxset.installmentConfig?.payUseInstallmentCount,
      pricePayOff: boxset.installmentConfig?.pricePayOff,
      docFee: boxset.installmentConfig?.docFee,
      payoffDiscount: boxset.installmentConfig?.payoffDiscount
    }));

    // Combine regular stocks and boxsets
    const allItems = [...stocks, ...boxsetStockFormat];

    return res.json({ success: true, data: allItems });
  } catch (err) {
    console.error('❌ Error get branch-stock/taxType:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * ✅ สร้างสต๊อกสินค้าใหม่
 */
router.post('/', branchStockController.createStock);

/**
 * ✅ อนุมัติรายการที่ pending=true ให้เข้า stock จริง
 * POST /api/branch-stock/:id/approve
 */
router.post(
  '/:id/approve',
  // ถ้ามี middleware ตรวจ token ให้แทรกตรงนี้ เช่น authenticateJWT
  branchStockController.approveStock
);

/**
 * 🔥 ส่งสินค้าไป PO System (สำหรับ Quick Sale)
 * POST /api/branch-stock/:id/send-to-po
 */
router.post('/:id/send-to-po', async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedBy, approvedByName, note } = req.body;

    // ค้นหาสินค้าที่ต้องการส่งไป PO
    const product = await BranchStock.findById(id)
      .populate('categoryGroup', 'name')
      .populate('supplier', 'name');

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบสินค้าที่ระบุ'
      });
    }

    // ตรวจสอบว่าเป็นสินค้า quick sale และยังไม่ได้อนุมัติ
    if (!product.pending || product.verified) {
      return res.status(400).json({
        success: false,
        error: 'สินค้านี้ไม่สามารถส่งไป PO ได้ (อาจอนุมัติแล้วหรือไม่ใช่ quick sale)'
      });
    }

    // 🔥 Debug: แสดงข้อมูลก่อนอัพเดท
    console.log(`🔍 Before update - Product ${id}:`, {
      status: product.status,
      pending: product.pending,
      verified: product.verified
    });

    // 🔥 อัพเดทสถานะเป็น "ส่งไป PO" โดยใช้ updateOne ที่ทำงานได้
    try {
      const updateResult = await BranchStock.updateOne(
        { _id: id },
        {
          $set: {
            status: 'sent_to_po',
            pending: false,
            verified: true,          // ✅ เพิ่ม: ให้แสดงในขายสด/ขายผ่อน
            stock_value: 1,          // ✅ เพิ่ม: ให้มีสต๊อกสำหรับขาย
            approvedBy: approvedBy,
            approvedByName: approvedByName,
            approvedAt: new Date(),
            note: note || 'ส่งไปยัง PO System สำหรับขายด่วน',
            updated_at: new Date()
          }
        }
      );

      console.log(`🔍 UpdateOne result for product ${id}:`, updateResult);

      if (updateResult.matchedCount === 0) {
        return res.status(404).json({
          success: false,
          error: 'ไม่พบสินค้าที่ต้องการอัพเดท'
        });
      }

      if (updateResult.modifiedCount === 0) {
        console.warn(`⚠️ Product ${id} matched but not modified - may already be updated`);
      }

    } catch (updateError) {
      console.error(`❌ Error during updateOne for product ${id}:`, updateError);
      return res.status(500).json({
        success: false,
        error: 'เกิดข้อผิดพลาดในการอัพเดทฐานข้อมูล: ' + updateError.message
      });
    }

    // ดึงข้อมูลสินค้าที่อัพเดทแล้วเพื่อส่งกลับ
    const updatedProduct = await BranchStock.findById(id)
      .populate('categoryGroup', 'name')
      .populate('supplier', 'name');

    // 🔥 ตรวจสอบว่าการอัพเดทสำเร็จหรือไม่
    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        error: 'ไม่สามารถอัพเดทสินค้าได้ - ไม่พบสินค้าหลังการอัพเดท'
      });
    }

    console.log(`✅ Product ${id} sent to PO system by ${approvedByName}`);
    console.log(`🔍 Updated product status: ${updatedProduct.status}, pending: ${updatedProduct.pending}, verified: ${updatedProduct.verified}, stock_value: ${updatedProduct.stock_value}`);

    // 🔥 ตรวจสอบทันทีว่าการอัพเดทสำเร็จจริงๆ โดยดึงข้อมูลจาก DB อีกครั้ง
    const verifyProduct = await BranchStock.findById(id).lean();
    if (verifyProduct) {
      console.log(`🔍 Verification - Product ${id} in DB:`, {
        status: verifyProduct.status,
        pending: verifyProduct.pending,
        verified: verifyProduct.verified,
        approvedBy: verifyProduct.approvedBy
      });

      if (verifyProduct.pending !== false || verifyProduct.status !== 'sent_to_po' || verifyProduct.verified !== true) {
        console.error(`❌ Database update verification FAILED for product ${id}!`);
        console.error(`Expected: pending=false, status=sent_to_po, verified=true`);
        console.error(`Actual: pending=${verifyProduct.pending}, status=${verifyProduct.status}, verified=${verifyProduct.verified}`);

        return res.status(500).json({
          success: false,
          error: 'การอัพเดทฐานข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'
        });
      } else {
        console.log(`✅ Database update verification SUCCESS for product ${id} - Ready for POS sales!`);
      }
    }

    res.json({
      success: true,
      message: 'อนุมัติขายด่วนสำเร็จ - สินค้าพร้อมขายและส่งไป PO System แล้ว',
      data: {
        _id: updatedProduct._id,
        poNumber: updatedProduct.poNumber,
        documentNumber: updatedProduct.documentNumber,
        name: updatedProduct.name,
        brand: updatedProduct.brand,
        model: updatedProduct.model,
        imei: updatedProduct.imei,
        price: updatedProduct.price,
        cost: updatedProduct.cost,
        categoryGroup: updatedProduct.categoryGroup,
        supplier: updatedProduct.supplier,
        branch_code: updatedProduct.branch_code,
        taxType: updatedProduct.taxType || 'แยกภาษี',
        status: updatedProduct.status,
        approvedBy: updatedProduct.approvedBy,
        approvedByName: updatedProduct.approvedByName,
        approvedAt: updatedProduct.approvedAt,
        // 🔥 เพิ่มข้อมูลสำหรับ PO
        quickSaleData: {
          isQuickSale: true,
          originalProductId: updatedProduct._id,
          notes: 'ขายด่วน',
          qty: 1,
          unitCost: updatedProduct.cost || 0,
          discount: 0,
          taxRate: 7,
          taxType: updatedProduct.taxType || 'แยกภาษี'
        }
      }
    });

  } catch (error) {
    console.error('❌ Error sending product to PO:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการส่งสินค้าไป PO System',
      details: error.message
    });
  }
});

/**
 * 🔍 Debug: ตรวจสอบสถานะสินค้าทั้งหมด
 * GET /api/branch-stock/debug-all
 */
router.get('/debug-all', async (req, res) => {
  try {
    const { branch_code } = req.query;

    const query = {};
    if (branch_code) {
      query.branch_code = branch_code;
    }

    const products = await BranchStock.find(query)
      .select('name status pending verified approvedAt updated_at')
      .sort({ updated_at: -1 })
      .limit(10)
      .lean();

    res.json({
      success: true,
      data: products,
      count: products.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 🔥 ดึงรายการสินค้าที่ส่งไป PO แล้ว (สำหรับ po-creation.html)
 * GET /api/branch-stock/sent-to-po
 */
router.get('/sent-to-po', async (req, res) => {
  try {
    const { branch_code } = req.query;

    const query = {
      status: 'sent_to_po'
      // 🔥 ลบ pending และ verified ออก เพราะเมื่อส่งไป PO แล้ว pending จะเป็น false
    };

    if (branch_code) {
      query.branch_code = branch_code;
    }

    const products = await BranchStock.find(query)
      .populate('categoryGroup', 'name')
      .populate('supplier', 'name')
      .select('branch_code name brand model imei poNumber documentNumber price cost categoryGroup supplier status approvedBy approvedByName approvedAt taxType note')
      .sort({ approvedAt: -1 })
      .lean();

    console.log(`Found ${products.length} products sent to PO for branch: ${branch_code || 'all'}`);

    res.json({
      success: true,
      data: products,
      count: products.length
    });

  } catch (error) {
    console.error('Error fetching sent-to-po products:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลสินค้าที่ส่งไป PO',
      details: error.message
    });
  }
});

/**
 * ✅ ดึงรายการสินค้าที่อนุมัติแล้ว (สำหรับสร้าง PO)
 * GET /api/branch-stock/approved
 */
router.get('/approved', async (req, res) => {
  try {
    const { branch_code } = req.query;

    // สร้าง query filter - เฉพาะสินค้าที่อนุมัติแล้วและพร้อมสร้าง PO
    const query = {
      status: 'sent_to_po',        // 🔥 เฉพาะสินค้าที่ส่งไป PO แล้ว
      pending: false,              // 🔥 ไม่ pending แล้ว
      verified: true,              // ✅ เปลี่ยน: verified แล้ว (แสดงในขายได้แล้ว)
      poCreatedInSystem: { $ne: true } // ✅ เพิ่ม: แต่ยังไม่ได้สร้าง PO ในระบบ
    };

    // กรองตาม branch_code ถ้ามี
    if (branch_code) {
      query.branch_code = branch_code;
    }

    // ดึงข้อมูลสินค้าที่อนุมัติแล้ว
    const approvedProducts = await BranchStock.find(query)
      .populate('supplier', 'name')
      .populate('categoryGroup', 'name')
      .select('branch_code name brand model imei poNumber price cost stock_value status pending verified createdAt note type approvedBy approvedByName approvedAt')
      .sort({ approvedAt: -1 })
      .lean();

    console.log(`🔍 Query used for approved products:`, JSON.stringify(query, null, 2));
    console.log(`📦 Found ${approvedProducts.length} approved products for branch: ${branch_code || 'all'}`);

    // 🔥 Debug: แสดงสถานะของสินค้าที่พบ
    if (approvedProducts.length > 0) {
      console.log('📋 Approved products status:', approvedProducts.map(p => ({
        id: p._id,
        name: p.name,
        status: p.status,
        pending: p.pending,
        verified: p.verified,
        approvedBy: p.approvedBy
      })));
    }

    res.json({
      success: true,
      data: approvedProducts,
      count: approvedProducts.length
    });

  } catch (error) {
    console.error('Error fetching approved products:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลสินค้าที่อนุมัติแล้ว',
      details: error.message
    });
  }
});

/**
 * ✅ ดึงรายการสินค้าที่รออนุมัติ (pending=true)
 * GET /api/branch-stock/pending
 */
router.get('/pending', async (req, res) => {
  try {
    const { branch_code } = req.query;

    // สร้าง query filter - เฉพาะสินค้าที่ยังรออนุมัติจริงๆ
    const query = {
      pending: { $ne: false },  // 🔥 ไม่เอาสินค้าที่ pending: false
      verified: { $ne: true },  // 🔥 ไม่เอาสินค้าที่ verified: true
      status: { $nin: ['sent_to_po', 'approved', 'completed'] }  // 🔥 กรองสินค้าที่ส่งไป PO แล้วออก
    };

    // กรองตาม branch_code ถ้ามี
    if (branch_code) {
      query.branch_code = branch_code;
    }

    // ดึงข้อมูลสินค้าที่รออนุมัติ
    const pendingProducts = await BranchStock.find(query)
      .populate('supplier', 'name')
      .populate('categoryGroup', 'name')
      .select('branch_code name brand model imei poNumber price cost stock_value pending verified createdAt note type')
      .sort({ createdAt: -1 })
      .lean();

    console.log(`🔍 Query used:`, JSON.stringify(query, null, 2));
    console.log(`📦 Found ${pendingProducts.length} pending products for branch: ${branch_code || 'all'}`);

    // 🔥 Debug: แสดงสถานะของสินค้าที่พบ
    if (pendingProducts.length > 0) {
      console.log('📋 Products status:', pendingProducts.map(p => ({
        id: p._id,
        name: p.name,
        status: p.status,
        pending: p.pending,
        verified: p.verified
      })));
    }

    res.json({
      success: true,
      data: pendingProducts,
      count: pendingProducts.length
    });

  } catch (error) {
    console.error('Error fetching pending products:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลสินค้ารออนุมัติ',
      details: error.message
    });
  }
});

/**
 * GET /api/branch-stock/po-history
 * ดึงสินค้าที่สร้าง PO แล้วสำหรับสาขา
 */
router.get('/po-history', branchStockController.getPOHistory);

/**
 * ✅ ลดจำนวนสินค้าในสต๊อก โดยใช้ branch_code
 */
router.post('/decrement', async (req, res) => {
  console.log('🔍 API ถูกเรียกใช้งาน: /api/branch-stock/decrement');
  await branchStockController.decrementStock(req, res);
});

/**
 * ✅ ดึงข้อมูลสต๊อกทั้งหมด หรือเฉพาะของสาขา
 *    (แก้ไขให้ populate ทั้ง supplier => name และ product_id => name, image)
 */
router.get('/', async (req, res) => {
  try {
    const { branch_code, include_unverified } = req.query;
    const filter = {};

    if (branch_code) {
      filter.branch_code = branch_code;
    }
    if (include_unverified !== '1') {
      filter.verified = true;
    }

    const stocks = await BranchStock.find(filter)
      .populate('supplier', 'name')
      .populate({
        path: 'product_id',
        select: 'name image stockType brand model price cost'
      })
      .populate('categoryGroup', 'name unitName')  // ← เพิ่มการ populate categoryGroup
      .select('branch_code name brand model barcode imei price cost stock_value verified pending supplier product_id productModel image categoryGroup taxType invoiceNumber poNumber documentNumber stockType productType boxsetType boxsetProducts payoffDiscount created_at updated_at')
      .lean();

    return res.json({ success: true, data: stocks });
  } catch (err) {
    console.error('❌ Error get branch-stock:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * ✅ (สำคัญ) ดึงต้นทุนสินค้าจาก BranchStock โดยใช้ branch_code + poNumber
 *    GET /api/branch-stock/cost?branch_code=xxx&poNumber=yyy
 */
router.get('/cost', branchStockController.getCostByPoNumber);

/**
 * 🔄 POST /api/branch-stock/sync-all - Sync prices from ProductImage to BranchStock (Unified)
 * บังคับ sync ข้อมูลราคาจาก ProductImage ไปยัง BranchStock ทั้งหมด (ใช้ unified sync service)
 */
router.post('/sync-all', async (req, res) => {
  try {
    console.log('🔄 Starting unified manual sync from ProductImage to BranchStock...');

    // เรียกใช้ unified syncAllExisting function (ไม่ต้องส่ง io เพราะเป็น manual sync)
    const result = await syncAllExisting(null); // Pass null for io since this is manual

    console.log('✅ Unified manual sync completed successfully');

    res.status(200).json({
      success: true,
      message: 'Sync ข้อมูลราคาจาก ProductImage เรียบร้อยแล้ว (Unified System)',
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Unified manual sync error:', error);

    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการ sync ข้อมูล: ' + error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * 📊 GET /api/branch-stock/sync-status - Get sync system status
 */
router.get('/sync-status', async (req, res) => {
  try {
    const status = getSyncStatus();

    res.status(200).json({
      success: true,
      message: 'ดึงข้อมูลสถานะ sync system เรียบร้อยแล้ว',
      data: status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Get sync status error:', error);

    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลสถานะ: ' + error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// NOTE: This /:id route should be moved after /search route to avoid matching issues
// For now, checking if the id is "search" and redirecting

/**
 * ✅ ดึงข้อมูลสต๊อกโดย `_id`
 */
router.get('/:id', async (req, res) => {
  // Quick fix: if id is "search", forward to search handler
  if (req.params.id === 'search') {
    // Extract search parameters from query
    const { branch_code, q, type = 'all', purchaseType } = req.query;

    if (!branch_code) {
      return res.status(400).json({
        success: false,
        error: 'branch_code is required'
      });
    }

    if (!q || q.trim().length < 1) {
      return res.status(400).json({
        success: false,
        error: 'Search query (q) is required'
      });
    }

    console.log(`🔍 Searching stock: branch=${branch_code}, query="${q}", type=${type}`);

    const baseFilter = {
      branch_code,
      verified: true,
      stock_value: { $gt: 0 }
    };

    if (purchaseType) {
      const types = purchaseType.split(',').map(t => t.trim());
      baseFilter.purchaseType = { $in: types };
    }

    let results = [];

    // Search by IMEI (exact match)
    if (type === 'imei' || type === 'all') {
      const imeiResults = await BranchStock.find({
        ...baseFilter,
        imei: q.trim()
      })
      .select('_id product_id name brand model imei price cost stock_value image stockType downAmount downInstallment downInstallmentCount')
      .lean();

      results = results.concat(imeiResults.map(item => ({
        ...item,
        matchType: 'imei',
        matchScore: 100
      })));
    }

    // Search by name
    if ((type === 'name' || type === 'all') && (type !== 'imei' || results.length === 0)) {
      const nameResults = await BranchStock.find({
        ...baseFilter,
        $or: [
          { name: q.trim() },
          { name: { $regex: q.trim(), $options: 'i' } }
        ]
      })
      .limit(20)
      .select('_id product_id name brand model imei price cost stock_value image stockType downAmount downInstallment downInstallmentCount')
      .lean();

      results = results.concat(nameResults.map(item => ({
        ...item,
        matchType: 'name',
        matchScore: 90
      })));
    }

    // Remove duplicates
    const uniqueResults = [];
    const seenIds = new Set();

    results
      .sort((a, b) => b.matchScore - a.matchScore)
      .forEach(item => {
        if (!seenIds.has(item._id.toString())) {
          seenIds.add(item._id.toString());
          uniqueResults.push(item);
        }
      });

    console.log(`✅ Found ${uniqueResults.length} results for query "${q}"`);

    // Return in the format expected by opening_inventory.html
    return res.json({
      success: true,
      products: uniqueResults.map(item => ({
        ...item,
        code: item.imei || item._id,
        barcode: item.imei || item._id
      })),
      data: uniqueResults,
      total: uniqueResults.length,
      query: q,
      searchType: type,
      branchCode: branch_code
    });
  }

  try {
    const stockId = req.params.id;
    const stock = await BranchStock.findById(stockId).exec();

    if (!stock) {
      return res.status(404).json({ success: false, error: 'ไม่พบสต๊อกนี้' });
    }
    return res.json({ success: true, data: stock });
  } catch (err) {
    console.error('❌ Error getStockById:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * ✅ อัปเดตข้อมูลสต๊อก
 */
router.patch('/:id', branchStockController.updateStock);

/**
 * ✅ อัปเดตราคาสินค้าในสต๊อก
 */
router.patch('/price/:id', branchStockController.updatePrice);

/**
 * ✅ ลบข้อมูลสต๊อกตาม `_id`
 */
router.delete('/:id', branchStockController.deleteStock);

/**
 * ✅ ค้นหาสินค้าในสต๊อกของสาขาที่กำหนด
 */
router.post('/find', async (req, res) => {
  try {
    const { branch_code, brand, model } = req.body;

    if (!branch_code || !brand) {
      return res.status(400).json({
        success: false,
        error: '❌ ต้องระบุ branch_code และ brand'
      });
    }

    console.log(`🔍 กำลังค้นหาสต๊อกสินค้า brand:${brand}, model:${model || ''} ในสาขา: ${branch_code}`);

    const stock = await findStockByBranch(branch_code, { brand, model });

    if (!stock) {
      console.log(`❌ ไม่พบสินค้า (brand:${brand}, model:${model}) ในสต๊อกของสาขา (${branch_code})`);
      return res.status(404).json({
        success: false,
        error: '❌ ไม่พบสินค้าในสต๊อกของสาขาที่กำหนด'
      });
    }

    console.log(`✅ พบสินค้า brand:${brand}, model:${model} ในสต๊อกของสาขา (${branch_code})`);
    return res.json({ success: true, data: stock });
  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({
      success: false,
      error: '❌ เกิดข้อผิดพลาดในการค้นหาสินค้าในคลัง'
    });
  }
});

/**
 * POST /api/branch-stock/installment/commit
 * เอาสินค้าออก (physical delete) สำหรับการผ่อน แล้วบันทึกประวัติ OUT
 */
router.post(
  '/installment/commit',
  branchStockController.commitInstallment
);

/**
 * POST /api/branch-stock/check-boxset
 * ตรวจสอบสต๊อกสินค้าทั้งหมดใน Boxset สำหรับการตัดสต๊อก
 */
router.post('/check-boxset', branchStockController.checkBoxsetStock);

/**
 * POST /api/branch-stock/deduct-boxset
 * ตัดสต๊อกสินค้าใน Boxset สำหรับการส่งมอบ
 */
router.post('/deduct-boxset', branchStockController.deductBoxsetStock);

/**
 * GET /api/branch-stock/boxset-status/:contractNo
 * ตรวจสอบสถานะสต๊อก Boxset สำหรับสัญญาที่ระบุ
 */
router.get('/boxset-status/:contractNo', branchStockController.getBoxsetStockStatus);

/**
 * ✅ NEW: ค้นหาสินค้าด้วย IMEI หรือชื่อสินค้า
 * GET /api/branch-stock/search?branch_code=xxx&q=yyy&type=imei|name|all
 */
router.get('/search', async (req, res) => {
  try {
    // เพิ่มตัวกรอง purchaseType (cash | installment | cash,installment)
    const { branch_code, q, type = 'all', purchaseType } = req.query;

    if (!branch_code) {
      return res.status(400).json({
        success: false,
        error: 'branch_code is required'
      });
    }

    if (!q || q.trim().length < 1) {
      return res.status(400).json({
        success: false,
        error: 'Search query (q) is required'
      });
    }

    console.log(`🔍 Searching stock: branch=${branch_code}, query="${q}", type=${type}`);

    const baseFilter = {
      branch_code,
      verified: true,
      stock_value: { $gt: 0 }
    };

    // ถ้ามีการส่ง purchaseType ให้กรองรายการสต๊อกตามประเภทการซื้อ
    if (purchaseType) {
      // รองรับหลายค่า เช่น ?purchaseType=cash,installment
      const types = purchaseType.split(',').map(t => t.trim());
      baseFilter.purchaseType = { $in: types };
    }

    let results = [];

    // Search by IMEI (exact match)
    if (type === 'imei' || type === 'all') {
      const imeiResults = await BranchStock.find({
        ...baseFilter,
        imei: q.trim()
      })
      .select('_id product_id name brand model imei price cost stock_value image stockType downAmount downInstallment downInstallmentCount')
      .lean();

      results = results.concat(imeiResults.map(item => ({
        ...item,
        matchType: 'imei',
        matchScore: 100
      })));
    }

    // Search by name (if no IMEI results or type is name/all)
    if ((type === 'name' || type === 'all') && (type !== 'imei' || results.length === 0)) {
      // Exact name match
      const exactNameResults = await BranchStock.find({
        ...baseFilter,
        name: q.trim()
      })
      .select('_id product_id name brand model imei price cost stock_value image stockType downAmount downInstallment downInstallmentCount')
      .lean();

      results = results.concat(exactNameResults.map(item => ({
        ...item,
        matchType: 'exact_name',
        matchScore: 95
      })));

      // Regex name match (case insensitive)
      if (exactNameResults.length === 0) {
        const regexNameResults = await BranchStock.find({
          ...baseFilter,
          name: { $regex: `^${q.trim()}$`, $options: 'i' }
        })
        .select('_id product_id name brand model imei price cost stock_value image stockType downAmount downInstallment downInstallmentCount')
        .lean();

        results = results.concat(regexNameResults.map(item => ({
          ...item,
          matchType: 'regex_name',
          matchScore: 90
        })));
      }

      // Partial name match
      if (exactNameResults.length === 0) {
        const partialNameResults = await BranchStock.find({
          ...baseFilter,
          name: { $regex: q.trim(), $options: 'i' }
        })
        .limit(10) // Limit partial matches
        .select('_id product_id name brand model imei price cost stock_value image stockType downAmount downInstallment downInstallmentCount')
        .lean();

        results = results.concat(partialNameResults.map(item => ({
          ...item,
          matchType: 'partial_name',
          matchScore: 80
        })));
      }
    }

    // Remove duplicates and sort by match score
    const uniqueResults = [];
    const seenIds = new Set();

    results
      .sort((a, b) => b.matchScore - a.matchScore)
      .forEach(item => {
        if (!seenIds.has(item._id.toString())) {
          seenIds.add(item._id.toString());
          uniqueResults.push(item);
        }
      });

    console.log(`✅ Found ${uniqueResults.length} results for query "${q}"`);

    return res.json({
      success: true,
      data: uniqueResults,
      total: uniqueResults.length,
      query: q,
      searchType: type,
      branchCode: branch_code
    });

  } catch (error) {
    console.error('❌ Error in /api/branch-stock/search:', error);
    return res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการค้นหาสินค้า',
      message: error.message
    });
  }
});

// Get all stock items for a specific branch
// GET /api/branch-stock/all/:branchCode
router.get('/all/:branchCode', async (req, res) => {
  try {
    const branchCode = req.params.branchCode;
    const stocks = await BranchStock.find({ branch_code: branchCode, verified: true })
      .populate('supplier', 'name')
      .populate('product_id', 'name image stockType brand model price cost')
      .populate('categoryGroup', 'name unitName')  // ← เพิ่มการ populate categoryGroup
      .select('branch_code name brand model barcode imei price cost stock_value verified pending supplier product_id productModel image categoryGroup taxType invoiceNumber poNumber documentNumber stockType productType boxsetType boxsetProducts payoffDiscount created_at updated_at')
      .lean();

    if (!stocks || stocks.length === 0) {
      return res.status(404).json({ success: false, error: 'ไม่พบสต๊อกสินค้าในสาขานี้' });
    }
    return res.json({ success: true, data: stocks });
  } catch (err) {
    console.error('❌ Error get all branch-stock:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/branch-stock/validate-deposit
 * ตรวจสอบความถูกต้องของข้อมูลสำหรับการสร้างใบรับเงินมัดจำ
 */
router.post('/validate-deposit', async (req, res) => {
  try {
    const { branchCode, productId, depositType, saleType, quantity = 1 } = req.body;

    console.log('🔍 Validating deposit request:', { branchCode, productId, depositType, saleType, quantity });

    // ตรวจสอบพารามิเตอร์ที่จำเป็น
    if (!branchCode || !productId || !depositType || !saleType) {
      return res.status(400).json({
        success: false,
        error: 'ข้อมูลไม่ครบถ้วน: branchCode, productId, depositType, saleType ต้องระบุทั้งหมด'
      });
    }

    let validationResult = {
      success: true,
      productData: null,
      stockAvailable: false,
      priceInfo: {},
      warnings: [],
      errors: []
    };

    if (depositType === 'online') {
      // ตรวจสอบสต็อกสาขาสำหรับ online deposit
      console.log(`🔍 Searching for stock: productId=${productId}, branchCode=${branchCode}, quantity=${quantity}`);

      const stockItem = await BranchStock.findOne({
        _id: productId,
        branch_code: branchCode,
        verified: true,
        stock_value: { $gte: quantity }
      })
      .populate('supplier', 'name')
      .populate('categoryGroup', 'name unitName')
      .lean();

      console.log(`📦 Stock search result:`, stockItem ? `Found: ${stockItem.name} (stock: ${stockItem.stock_value})` : 'Not found');

      if (!stockItem) {
        console.log(`❌ Stock validation failed: Product ${productId} not found in branch ${branchCode} stock`);
        validationResult.errors.push('สินค้าไม่มีในสต็อกของสาขานี้หรือจำนวนไม่เพียงพอ');
        validationResult.success = false;
        return res.status(400).json(validationResult);
      }

      // ตรวจสอบประเภทการขาย
      if (saleType === 'installment' && (!stockItem.downAmount || stockItem.downAmount <= 0)) {
        validationResult.warnings.push('สินค้านี้ยังไม่มีข้อมูลการผ่อน จะใช้เงินดาวน์ 30% แทน');
      }

      // เพิ่ม id field ให้ตรงกับที่ frontend ต้องการ
      validationResult.productData = {
        ...stockItem,
        id: stockItem._id.toString()  // ← เพิ่ม id field
      };
      validationResult.stockAvailable = true;
      validationResult.priceInfo = {
        price: stockItem.price,
        downAmount: stockItem.downAmount || (stockItem.price * 0.3),
        downInstallment: stockItem.downInstallment || 0,
        downInstallmentCount: stockItem.downInstallmentCount || 0,
        availableQuantity: stockItem.stock_value
      };

    } else if (depositType === 'preorder') {
      // สำหรับ Pre-order ไม่ต้องตรวจสอบสต็อก แต่ตรวจสอบว่าสินค้ามีอยู่จริง
      let productData = null;

      try {
        // พยายามใช้ ProductImage model แทน Product model
        const ProductImage = require('../models/productImage');
        productData = await ProductImage.findById(productId).lean();
        console.log('📝 Found product in ProductImage collection:', productData?.name);
      } catch (error) {
        console.log('❌ Error accessing ProductImage model:', error.message);

        // ถ้าไม่สามารถใช้ ProductImage ให้ส่งข้อมูลพื้นฐานกลับไป
        console.log('💡 Using fallback data for preorder validation');
        productData = {
          _id: productId,
          name: 'สินค้า Pre-order',
          brand: '',
          model: '',
          price: 0,
          downAmount: 0,
          downInstallment: 0,
          downInstallmentCount: 0
        };
      }

      if (!productData) {
        validationResult.errors.push('ไม่พบข้อมูลสินค้าที่ระบุ');
        validationResult.success = false;
        return res.status(404).json(validationResult);
      }

      // เพิ่ม id field ให้ตรงกับที่ frontend ต้องการ
      validationResult.productData = {
        ...productData,
        id: productData._id.toString()  // ← เพิ่ม id field
      };
      validationResult.stockAvailable = false;
      validationResult.priceInfo = {
        price: productData.price,
        downAmount: productData.downAmount || (productData.price * 0.3),
        downInstallment: productData.downInstallment || 0,
        downInstallmentCount: productData.downInstallmentCount || 0,
        availableQuantity: 0 // Pre-order ไม่มีสต็อก
      };

      // ตรวจสอบว่าสินค้านี้มีในสต็อกสาขาหรือไม่
      const existingStock = await BranchStock.findOne({
        name: productData.name,
        brand: productData.brand,
        branch_code: branchCode,
        verified: true,
        stock_value: { $gt: 0 }
      }).lean();

      if (existingStock) {
        validationResult.warnings.push(`สินค้า "${productData.name}" มีในสต็อกสาขา ${branchCode} แล้ว ควรพิจารณาใช้มัดจำออนไลน์แทน`);
      }
    }

    console.log('✅ Validation result:', validationResult);
    res.json(validationResult);

  } catch (error) {
    console.error('❌ Error validating deposit:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูล',
      message: error.message
    });
  }
});

/**
 * POST /api/branch-stock/check-installment-stock
 * ตรวจสอบและตัดสต๊อกสำหรับการขายผ่อน
 * ใช้ BranchStock._id เป็นตัวอ้างอิง
 */
router.post('/check-installment-stock', async (req, res) => {
  try {
    const { items, branch_code, allowNegativeStock = false, continueOnError = false } = req.body;

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

    console.log('📦 Installment stock check for branch:', branch_code);
    console.log('📦 Items to check:', JSON.stringify(items, null, 2));

    const checkResults = [];
    const stockUpdates = [];

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

      // ตรวจสอบ BranchStock โดยใช้ _id หรือ imei
      let stockQuery = {
        branch_code,
        verified: true
      };

      // ถ้ามี imei ให้ค้นหาด้วย imei ก่อน
      if (imei) {
        stockQuery.imei = imei;
      } else {
        // ถ้าไม่มี imei ให้ใช้ _id
        // Check if product_id is a valid ObjectId
        if (mongoose.Types.ObjectId.isValid(product_id)) {
          stockQuery._id = product_id;
        } else {
          // If not a valid ObjectId, it might be a product name or other identifier
          stockQuery.name = product_id;
        }
      }

      console.log('📦 Query for BranchStock:', stockQuery);
      const branchStock = await BranchStock.findOne(stockQuery);
      console.log('📦 Found BranchStock:', branchStock ? `${branchStock._id} with stock_value: ${branchStock.stock_value}` : 'Not found');

      if (!branchStock) {
        checkResults.push({
          product_id,
          imei,
          success: false,
          error: 'ไม่พบสินค้าในสต๊อกสาขา'
        });
        continue;
      }

      // ตรวจสอบจำนวนสต๊อก
      if (branchStock.stock_value < quantity) {
        checkResults.push({
          product_id,
          imei,
          success: false,
          error: `สต๊อกไม่เพียงพอ (มีอยู่ ${branchStock.stock_value} หน่วย)`,
          availableQuantity: branchStock.stock_value,
          requestedQuantity: quantity
        });
        continue;
      }

      // เตรียมข้อมูลสำหรับตัดสต๊อก
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

    // ตัดสต๊อกสำหรับรายการที่ผ่านการตรวจสอบ
    for (const update of stockUpdates) {
      await BranchStock.findByIdAndUpdate(
        update.stockId,
        {
          stock_value: update.newQuantity,
          updatedAt: new Date()
        },
        { new: true }
      );

      console.log(`✅ Updated BranchStock ${update.stockId}: ${update.newQuantity} units remaining`);
    }

    return res.json({
      success: true,
      data: {
        summary: {
          total: checkResults.length,
          success: successCount,
          failed: failCount
        },
        results: checkResults
      },
      message: 'ตัดสต๊อกสำเร็จ'
    });

  } catch (error) {
    console.error('❌ Error in check-installment-stock:', error);
    return res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการตรวจสอบสต๊อก',
      message: error.message
    });
  }
});

// ==================== BOXSET ROUTES ====================

/**
 * POST /api/boxset/create
 * สร้าง Boxset ใหม่
 */
router.post('/boxset/create', async (req, res) => {
  try {
    console.log('🎁 Creating new boxset:', req.body);

    const {
      name,
      price,
      branchCode,
      saleTypes = [],
      taxType = 'แยกภาษี',
      products = [],
      totalCost = 0,
      createdBy
    } = req.body;

    // Validation
    if (!name || !price || !branchCode || products.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ข้อมูลไม่ครบถ้วน: ต้องระบุชื่อ ราคา รหัสสาขา และสินค้าในชุด'
      });
    }

    if (saleTypes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาเลือกประเภทการขายอย่างน้อย 1 ประเภท'
      });
    }

    // ตรวจสอบว่าสินค้าในชุดมีสต็อกเพียงพอหรือไม่
    for (const product of products) {
      const stockItem = await BranchStock.findById(product.productId);
      if (!stockItem) {
        return res.status(404).json({
          success: false,
          error: `ไม่พบสินค้า ${product.name} ในสต็อก`
        });
      }

      if (stockItem.stock_value < product.quantity) {
        return res.status(400).json({
          success: false,
          error: `สินค้า ${product.name} มีสต็อกไม่เพียงพอ (ต้องการ ${product.quantity} มี ${stockItem.stock_value})`
        });
      }
    }

    // สร้าง Boxset document
    const boxsetData = {
      name,
      boxsetPrice: price,
      branchCode,
      saleTypes,
      taxType,
      taxRate: 7, // Default VAT rate
      products: products.map(product => ({
        productId: product.productId,
        name: product.name,
        brand: product.brand,
        model: product.model,
        imei: product.imei,
        price: product.price,
        cost: product.cost,
        quantity: product.quantity
      })),
      totalCost,
      stock_value: 1, // Boxset มี stock 1 ชุด
      verified: true,
      status: 'active',
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // บันทึก Boxset
    const newBoxset = new Boxset(boxsetData);
    const savedBoxset = await newBoxset.save();

    // ตัดสต็อกสินค้าที่ใช้ใน Boxset

    for (const product of products) {
      // ลดสต็อกสินค้า
      await BranchStock.findByIdAndUpdate(
        product.productId,
        { $inc: { stock_value: -product.quantity } },
        { new: true }
      );

      // บันทึกประวัติการตัดสต็อก
      const historyData = {
        branch_code: branchCode,
        change_type: 'OUT',
        reason: 'สร้าง Boxset',
        performed_by: createdBy,
        performed_at: new Date(),

        // Required fields for OUT transactions
        transactionType: 'sale', // ขายสินค้า (for boxset creation)
        order_id: savedBoxset._id, // ใช้ boxset ID เป็น order_id

        items: [{
          product_id: product.productId,
          name: product.name,
          brand: product.brand,
          model: product.model,
          imei: product.imei,
          qty: product.quantity,
          price: product.price,
          cost: product.cost,
          unit: 'ชิ้น',
          remainQty: 0 // หลังจากตัดสต็อกแล้ว
        }],

        quantity: product.quantity,
        stock_value: product.quantity,
        sub_total: product.price * product.quantity,
        vat_amount: 0,
        discount: 0,
        total_amount: product.price * product.quantity,
        net_amount: product.price * product.quantity,

        // Customer info (default for boxset creation)
        customerType: 'individual',
        customerInfo: {
          firstName: 'ระบบ Boxset',
          lastName: '',
          phone: '',
          taxId: '',
          birthDate: null,
          age: null,
          address: {
            houseNo: '',
            moo: '',
            subDistrict: '',
            district: '',
            province: '',
            zipcode: ''
          }
        },

        taxType: taxType || 'แยกภาษี',

        // Staff info
        staff_name: 'ระบบ',

        // Additional fields for better tracking
        notes: `สร้าง Boxset "${name}" - ตัดสต็อกสินค้า ${product.name}`,
        sale_date: new Date(),

        // Optional fields (can be null)
        invoice_no: '',
        installment_id: null,
        contract_no: '',
        categoryGroup: null,
        customer: null
      };

      const history = new BranchStockHistory(historyData);
      await history.save();
    }

    console.log('✅ Boxset created successfully:', savedBoxset._id);

    res.json({
      success: true,
      message: 'สร้าง Boxset เรียบร้อยแล้ว',
      data: {
        boxset: savedBoxset
      }
    });

  } catch (error) {
    console.error('❌ Error creating boxset:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการสร้าง Boxset',
      message: error.message
    });
  }
});

/**
 * GET /api/boxset/:branchCode
 * ดึงข้อมูล Boxset ของสาขาที่ระบุ
 */
router.get('/boxset/:branchCode', async (req, res) => {
  try {
    const { branchCode } = req.params;
    const { includeInactive } = req.query;

    const filter = { branchCode };
    if (!includeInactive) {
      filter.status = 'active';
    }

    const boxsets = await Boxset.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: boxsets,
      total: boxsets.length
    });

  } catch (error) {
    console.error('❌ Error fetching boxsets:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูล Boxset',
      message: error.message
    });
  }
});

/**
 * PUT /api/boxset/:id
 * อัปเดต Boxset
 */
router.put('/boxset/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove immutable fields
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.createdBy;

    updateData.updatedAt = new Date();

    const updatedBoxset = await Boxset.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedBoxset) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบ Boxset ที่ต้องการแก้ไข'
      });
    }

    // อัปเดต BranchStock ที่เกี่ยวข้อง
    await BranchStock.updateMany(
      { boxsetId: id },
      {
        name: updateData.name || updatedBoxset.name,
        price: updateData.boxsetPrice || updatedBoxset.boxsetPrice,
        saleTypes: updateData.saleTypes || updatedBoxset.saleTypes,
        updated_at: new Date()
      }
    );

    res.json({
      success: true,
      message: 'อัปเดต Boxset เรียบร้อยแล้ว',
      data: updatedBoxset
    });

  } catch (error) {
    console.error('❌ Error updating boxset:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการอัปเดต Boxset',
      message: error.message
    });
  }
});

/**
 * DELETE /api/boxset/:id
 * ลบ Boxset (soft delete)
 */
router.delete('/boxset/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const boxset = await Boxset.findById(id);
    if (!boxset) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบ Boxset ที่ต้องการลบ'
      });
    }

    // Soft delete - เปลี่ยนสถานะเป็น inactive
    await Boxset.findByIdAndUpdate(id, {
      status: 'inactive',
      deletedAt: new Date(),
      updatedAt: new Date()
    });

    // อัปเดต BranchStock ที่เกี่ยวข้อง
    await BranchStock.updateMany(
      { boxsetId: id },
      {
        verified: false,
        pending: true,
        stock_value: 0,
        updated_at: new Date()
      }
    );

    // คืนสต็อกสินค้าที่ใช้ใน Boxset (ถ้าต้องการ)
    // ... สามารถเพิ่มโค้ดคืนสต็อกได้ตรงนี้

    res.json({
      success: true,
      message: 'ลบ Boxset เรียบร้อยแล้ว'
    });

  } catch (error) {
    console.error('❌ Error deleting boxset:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการลบ Boxset',
      message: error.message
    });
  }
});

/**
 * GET /api/boxset/details/:id
 * ดึงรายละเอียด Boxset พร้อมข้อมูลสินค้าในชุด
 */
router.get('/boxset/details/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const boxset = await Boxset.findById(id)
      .populate('createdBy', 'name email')
      .lean();

    if (!boxset) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบ Boxset ที่ต้องการ'
      });
    }

    // ดึงข้อมูลสินค้าในชุดปัจจุบัน
    const productIds = boxset.products.map(p => p.productId);
    const currentProducts = await BranchStock.find({
      _id: { $in: productIds }
    }).lean();

    // เพิ่มข้อมูลสต็อกปัจจุบันเข้าไปในข้อมูลสินค้า
    boxset.products = boxset.products.map(product => {
      const currentStock = currentProducts.find(p => p._id.toString() === product.productId);
      return {
        ...product,
        currentStock: currentStock ? currentStock.stock_value : 0
      };
    });

    res.json({
      success: true,
      data: boxset
    });

  } catch (error) {
    console.error('❌ Error fetching boxset details:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูล Boxset',
      message: error.message
    });
  }
});

// Duplicate route removed - using the more comprehensive implementation above

// POST /api/branch-stock/quick-sale - สร้างสินค้าขายด่วนฉุกเฉิน
router.post('/quick-sale', async (req, res) => {
  try {
    console.log('🚨 Quick Sale API called:', req.body);

    const {
      imei,
      name,
      brand,
      categoryGroup,
      cost,
      price,
      note,
      branchCode,
      createdBy,
      createdAt,
      // 🔥 รับ PO Numbers จาก frontend
      poNumber,

      barcode,
      documentNumber,
      invoiceNumber = '',
      sequence,
      dateKey,
      // 🔥 แก้ไข default values
      urgentSale = true,
      type = 'quick_sale',        // ✅ เปลี่ยนจาก 'backdated' เป็น 'quick_sale'
      status = 'active',          // ✅ เปลี่ยนจาก 'pending_po' เป็น 'active'
      taxType = 'แยกภาษี',
      stockType = 'imei',
      productType = 'mobile',
      verified = false,
      pending = true
    } = req.body;

    // Validation
    if (!imei || !name || !brand || !categoryGroup || !branchCode) {
      return res.status(400).json({
        success: false,
        error: 'ข้อมูลไม่ครบถ้วน กรุณากรอก IMEI, ชื่อสินค้า, แบรนด์, กลุ่มประเภทสินค้า และรหัสสาขา'
      });
    }

    // ตรวจสอบ IMEI ซ้ำในสาขาเดียวกัน
    const existingProduct = await BranchStock.findOne({
      imei: imei,
      branch_code: branchCode
    });

    if (existingProduct) {
      return res.status(409).json({
        success: false,
        code: 'DUPLICATE_IMEI_IN_BRANCH',
        error: `IMEI ${imei} มีในสาขานี้แล้ว`,
        existingProduct: {
          _id: existingProduct._id,
          name: existingProduct.name,
          brand: existingProduct.brand,
          status: existingProduct.verified ? 'verified' : 'pending'
        }
      });
    }

    // 🔥 ใช้ PO Numbers จาก frontend หรือสร้างใหม่ถ้าไม่มี
    let finalPONumber = poNumber;
    let finalBarcode = barcode;
    let finalDocumentNumber = documentNumber;

    // Fallback: สร้างใหม่ถ้า frontend ไม่ส่งมา
    if (!finalPONumber) {
      const now = new Date();
      const year = (now.getFullYear() + 543).toString().slice(-2);
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      const dateKey = `${year}${month}${day}`;
      const randomSeq = Math.floor(Math.random() * 9999).toString().padStart(4, '0');

      finalPONumber = `PO-${dateKey}-${randomSeq}`;

      finalDocumentNumber = `DOC-${dateKey}-${randomSeq}`;
    }

    // ใช้ IMEI เป็น barcode ถ้าไม่มีการส่งมา
    if (!finalBarcode) {
      finalBarcode = imei;
    }

    console.log('🔥 Final Numbers:', {
      poNumber: finalPONumber,

      barcode: finalBarcode,
      documentNumber: finalDocumentNumber
    });

    // 🔥 สร้างข้อมูลสินค้าใหม่ด้วยค่าที่ถูกต้อง
    const newProduct = new BranchStock({
      branch_code: branchCode,
      productModel: 'Product',
      // 🔥 ใช้หมายเลขที่ถูกต้อง
      poNumber: finalPONumber,
      invoiceNumber: invoiceNumber || '',
      documentNumber: finalDocumentNumber,
      barcode: finalBarcode,

      imei: imei,
      name: name,
      price: price || cost || 0,  // ใช้ price จาก frontend ก่อน แล้วค่อย fallback เป็น cost
      cost: cost || 0,
      brand: brand,
      model: name,
      image: '', // จะอัพเดทภายหลังถ้าต้องการ
      supplier: {
        _id: '6890d69e0f3b90109a0c3df4', // Default supplier ID สำหรับขายด่วน
        name: 'ขายด่วนฉุกเฉิน'
      },
      categoryGroup: categoryGroup,
      // 🔥 สำหรับสินค้าที่รออนุมัติ ให้ stock_value = 0 ก่อน
      // หลังอนุมัติแล้วจึงจะเปลี่ยนเป็น 1
      stock_value: pending ? 0 : 1,
      pending: pending,
      verified: verified,
      taxType: taxType,
      stockType: stockType,
      productType: productType,
      boxsetProducts: [],
      payoffDiscount: 0,

      // ข้อมูลเพิ่มเติม
      note: note,
      urgentSale: urgentSale,
      type: type,
      status: status,
      createdBy: createdBy,
      createdAt: createdAt,
      addedBy: createdBy?.id,
      addedByName: createdBy?.name
    });

    const savedProduct = await newProduct.save();

    // บันทึกประวัติการเพิ่มสินค้า
    try {
      const stockHistory = new BranchStockHistory({
        branch_code: branchCode,
        product_id: savedProduct._id,
        imei: imei,
        action: 'stock_in',
        action_type: 'quick_sale_add',
        quantity_before: 0,
        quantity_after: 1,
        quantity_change: 1,
        reason: `เพิ่มสินค้าขายด่วนฉุกเฉิน: ${name}`,
        note: note || 'สินค้าขายด่วนฉุกเฉิน',
        performed_by: createdBy?.id,
        performed_by_name: createdBy?.name,
        timestamp: new Date()
      });

      await stockHistory.save();
      console.log('✅ Stock history recorded for quick sale product');
    } catch (historyError) {
      console.error('⚠️ Failed to record stock history:', historyError);
      // ไม่ return error เพราะสินค้าถูกสร้างสำเร็จแล้ว
    }

    console.log('✅ Quick sale product created successfully:', {
      id: savedProduct._id,
      poNumber: finalPONumber,

      urgentSale: savedProduct.urgentSale,
      type: savedProduct.type,
      status: savedProduct.status,
      pending: savedProduct.pending
    });

    res.status(201).json({
      success: true,
      message: 'บันทึกสินค้าขายด่วนฉุกเฉินสำเร็จ',
      data: {
        _id: savedProduct._id,
        // 🔥 ใช้ final values ที่ถูกต้อง
        poNumber: finalPONumber,

        barcode: finalBarcode,
        documentNumber: finalDocumentNumber,
        imei: imei,
        name: name,
        brand: brand,
        categoryGroup: categoryGroup,
        price: savedProduct.price,
        cost: savedProduct.cost,
        // 🔥 รวม flags สำคัญ
        urgentSale: savedProduct.urgentSale,
        type: savedProduct.type,
        status: savedProduct.status,
        pending: savedProduct.pending,
        verified: savedProduct.verified,
        branchCode: branchCode,
        createdBy: createdBy,
        createdAt: createdAt
      }
    });

  } catch (error) {
    console.error('❌ Error creating quick sale product:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + error.message
    });
  }
});

module.exports = router;
