const express = require('express');
const router = express.Router();
const PurchaseOrder = require('../models/Stock/purchaseOrderModel');
const authJWT = require('../middlewares/authJWT');
const { auditLogger } = require('../middlewares/auditLogger');

/**
 * POST /api/backdated-purchase-orders
 * สร้างใบสั่งซื้อย้อนหลังจากสินค้าขายด่วน
 */
router.post('/', authJWT, auditLogger('CREATE_BACKDATED_PO'), async (req, res) => {
  try {
    const { supplierSelect, purchaseDate, note, items } = req.body;

    if (!supplierSelect || !purchaseDate || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ข้อมูลไม่ครบถ้วน: ต้องมี supplier, purchaseDate และ items'
      });
    }

    // ดึงข้อมูลสินค้าขายด่วนจาก BranchStock collection
    const BranchStock = require('../models/POS/BranchStock');
    const quickSaleItems = await BranchStock.find({ _id: { $in: items } });

    if (quickSaleItems.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบรายการสินค้าขายด่วน'
      });
    }

    // ดึงข้อมูล supplier
    const Supplier = require('../models/Stock/Supplier');
    const supplier = await Supplier.findById(supplierSelect);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบข้อมูลผู้จำหน่าย'
      });
    }

    // สร้างเลขที่ PO
    const generatePONumber = () => {
      const now = new Date();
      const year = now.getFullYear().toString().slice(-2);
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      const time = now.getTime().toString().slice(-4);
      return `BD${year}${month}${day}${time}`;
    };

    // เตรียมข้อมูล PO items จาก quick sale items
    const poItems = quickSaleItems.map(item => ({
      brand: item.brand,
      name: item.name,
      capacity: item.capacity || '',
      color: item.color || '',
      qty: 1,
      cost: 0, // จะต้องกรอกต้นทุนในขั้นตอนถัดไป
      discount: 0,
      taxRate: 7,
      taxType: 'แยกภาษี',
      imei: item.imei,
      backdatedItemId: item._id, // เก็บ reference ไปยัง quick sale item
      wh: 'ยังไม่ระบุ',
      status: 'active'
    }));

    // สร้าง PO
    const purchaseOrderData = {
      documentNumber: generatePONumber(),
      poNumber: generatePONumber(),
      supplierId: supplier._id,
      supplierName: supplier.name,
      supplierContact: supplier.contact || '',
      supplierAddress: supplier.address || '',
      purchaseDate: new Date(purchaseDate),
      deliveryDate: new Date(purchaseDate), // ใช้วันที่เดียวกัน
      notes: note || 'ใบสั่งซื้อย้อนหลังจากการขายด่วน',
      items: poItems,

      // ระบุว่าเป็น backdated PO
      isBackdated: true,
      backdatedSource: 'quick_sale',
      backdatedItems: items,

      // ข้อมูลผู้สร้าง
      createdBy: req.user._id,
      createdByName: req.user.name,
      createdByEmail: req.user.email,

      // สถานะ
      status: 'pending', // รอการอนุมัติ

      // คำนวณยอดรวม (จะเป็น 0 เพราะยังไม่ได้กรอกต้นทุน)
      subtotal: 0,
      discount: 0,
      tax: 0,
      total: 0
    };

    const newPO = new PurchaseOrder(purchaseOrderData);
    const savedPO = await newPO.save();

    // อัปเดตสถานะ quick sale items เป็น 'po_created'
    await BranchStock.updateMany(
      { _id: { $in: items } },
      {
        status: 'po_created',
        poId: savedPO._id,
        updatedAt: new Date()
      }
    );

    res.json({
      success: true,
      message: 'สร้างใบสั่งซื้อย้อนหลังสำเร็จ',
      data: {
        purchaseOrder: savedPO,
        affectedQuickSaleItems: quickSaleItems.length
      }
    });

  } catch (error) {
    console.error('Error creating backdated PO:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการสร้างใบสั่งซื้อย้อนหลัง: ' + error.message
    });
  }
});

/**
 * GET /api/backdated-purchase-orders
 * ดึงรายการใบสั่งซื้อย้อนหลัง
 */
router.get('/', authJWT, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, branchCode } = req.query;

    const query = { isBackdated: true };

    if (status) {
      query.status = status;
    }

    if (branchCode) {
      query.branchCode = branchCode;
    }

    const backdatedPOs = await PurchaseOrder.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email');

    const total = await PurchaseOrder.countDocuments(query);

    res.json({
      success: true,
      data: {
        orders: backdatedPOs,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total: total
        }
      }
    });

  } catch (error) {
    console.error('Error fetching backdated POs:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลใบสั่งซื้อย้อนหลัง: ' + error.message
    });
  }
});

module.exports = router;