const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const branchStockController = require('../../controllers/branchStockController');
const { findStockByBranch } = require('../../utils/findStockByBranch');
const BranchStock = require('../../models/POS/BranchStock');

// GET /api/branch-stock/overview - ข้อมูลภาพรวมสต๊อกทุกสาขา (แบบ grouped)
router.get('/overview', async (req, res) => {
  try {
    console.log('🔍 API called: /api/branch-stock/overview');

    const stocks = await BranchStock.find({ verified: true })
      .populate('supplier', 'name')
      .populate('categoryGroup', 'name unitName')
      .populate('updated_by', 'username')
      .select([
        'branch_code', 'name', 'brand', 'model', 'imei', 'barcode', 'sku',
        'price', 'cost', 'stock_value', 'image', 'unit', 'taxType',
        'supplier', 'categoryGroup', 'updated_by', 'last_updated',
        'stockType', 'verified', 'pending'
      ].join(' '))
      .lean();

    // Group สินค้าตาม name, brand, model, branch_code
    const groupedStocks = {};

    stocks.forEach(stock => {
      const groupKey = `${stock.branch_code}-${stock.name}-${stock.brand}-${stock.model}`;

      if (!groupedStocks[groupKey]) {
        // กำหนดหน่วยนับตาม category
        let unit = 'ชิ้น'; // default
        const categoryName = stock.categoryGroup?.name?.toLowerCase() || '';
        if (categoryName.includes('มือถือ') || categoryName.includes('โทรศัพท์') || categoryName.includes('smartphone')) {
          unit = 'เครื่อง';
        } else if (stock.categoryGroup?.unitName) {
          unit = stock.categoryGroup.unitName;
        }

        groupedStocks[groupKey] = {
          _id: stock._id, // ใช้ ID ของรายการแรก
          branch_code: stock.branch_code,
          name: stock.name,
          brand: stock.brand,
          model: stock.model,
          image: stock.image,
          supplier_name: stock.supplier?.name || '',
          category_name: stock.categoryGroup?.name || '',
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
          sku: stock.sku,
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
          sku: stock.sku,
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
    const stocks = await BranchStock.find(filter)
      .select([
        'imei', 'name', 'image', 'price',
        'downAmount','downInstallment','downInstallmentCount',
        'creditThreshold','payUseInstallment','payUseInstallmentCount',
        'pricePayOff','docFee',
        'taxType','taxRate',            // ← เพิ่ม taxRate ใน select
        'purchaseType','stock_value','verified','stockType'
      ].join(' '))
      .lean();

    return res.json({ success: true, data: stocks });
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
      .select('branch_code name brand model barcode sku imei price cost stock_value verified pending supplier product_id productModel image categoryGroup taxType invoiceNumber poNumber documentNumber stockType created_at updated_at')
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
 * ✅ ดึงข้อมูลสต๊อกโดย `_id`
 */
router.get('/:id', async (req, res) => {
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

module.exports = router;
