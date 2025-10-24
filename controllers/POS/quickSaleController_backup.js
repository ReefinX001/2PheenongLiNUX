const Product = require('../../models/Stock/Product');
const BranchStock = require('../../models/POS/BranchStock');
const PurchaseOrder = require('../../models/Stock/purchaseOrderModel');
const AuditLog = require('../../models/Account/AuditLog');
const mongoose = require('mongoose');

/**
 * Quick Sale Controller - สำหรับการขายด่วนในกรณีฉุกเฉิน
 * เพิ่มสินค้าเข้าสต็อกและขายได้ทันทีโดยไม่ต้องรอกระบวนการ PO ปกติ
 */

/**
 * เพิ่มสินค้าโหมดขายด่วน
 * POST /api/quick-sale
 */
exports.createQuickSale = async (req, res) => {
  try {
    const { imei, name, brand, cost, supplierId, supplier, branchCode, urgentSale, timestamp } = req.body;
      const userId = req.user.id;
  const userName = req.user.employee?.name || req.user.username;
  const userRole = req.user.role;

    // Validation - สำหรับโหมดขายด่วน จำเป็นเฉพาะข้อมูลพื้นฐาน
    if (!imei || !name || !brand || !branchCode) {
      return res.status(400).json({
        success: false,
        error: 'ข้อมูลไม่ครบถ้วน กรุณากรอกข้อมูลให้ครบ',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // ตรวจสอบ IMEI ซ้ำ
    const existingProduct = await Product.findOne({ imei: imei });
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        error: `IMEI ${imei} มีในระบบแล้ว`,
        code: 'DUPLICATE_IMEI'
      });
    }

    // ผ่อนผันการตรวจสอบ IMEI format สำหรับโหมดขายด่วน (รองรับ Serial Number อื่นๆ)
    if (imei.length < 5) {
      return res.status(400).json({
        success: false,
        error: 'IMEI/Serial Number ต้องมีอย่างน้อย 5 ตัวอักษร',
        code: 'INVALID_IMEI_FORMAT'
      });
    }

    // กำหนดค่าเริ่มต้นสำหรับโหมดขายด่วน
    const defaultCost = cost || 0; // จะให้กรอกทีหลังใน PO

    // สร้าง default supplier ObjectId หรือหาจากระบบ
    let defaultSupplierId = null;
    try {
      const Supplier = require('../../models/Stock/Supplier');
      let defaultSupplier = await Supplier.findOne({ name: 'รอระบุซัพพลายเออร์' });

      if (!defaultSupplier) {
        // สร้าง default supplier ถ้ายังไม่มี
        defaultSupplier = new Supplier({
          name: 'รอระบุซัพพลายเออร์',
          phone: '',
          address: '',
          email: '',
          note: 'สร้างจากระบบขายด่วน รอการอัพเดทข้อมูล',
          type: 'quick_sale_default'
        });
        await defaultSupplier.save();
      }
      defaultSupplierId = defaultSupplier._id;
    } catch (err) {
      console.error('Error creating default supplier:', err);
      // ถ้าสร้าง supplier ไม่ได้ ให้ใช้ temporary ObjectId
      defaultSupplierId = new mongoose.Types.ObjectId();
    }

    // สร้างสินค้าใหม่
    const product = new Product({
      name: name,
      brand: brand,
      imei: imei,
      cost: defaultCost,
      supplier: supplierId ? new mongoose.Types.ObjectId(supplierId) : defaultSupplierId,
      branch_code: branchCode,

      // ข้อมูลเพิ่มเติมสำหรับโหมดขายด่วน
      status: 'active', // ใช้ 'active' แทน 'available'
      category: 'มือถือ', // หมวดหมู่เริ่มต้น
    });

    const savedProduct = await product.save();

    // สร้าง Stock Entry ทันที (ไม่ต้องรอ PO)
    const branchStock = new BranchStock({
      product_id: savedProduct._id,
      name: savedProduct.name,
      brand: savedProduct.brand,
      imei: savedProduct.imei,
      branch_code: branchCode,
      status: 'active', // ใช้ 'active' ตาม enum ของ BranchStock

      // ข้อมูลราคา
      cost: defaultCost,
      price: defaultCost > 0 ? defaultCost * 1.2 : 0, // กำไร 20%

      // ข้อมูลซัพพลายเออร์
      supplier: defaultSupplierId,

      // ข้อมูลเพิ่มเติม
      productModel: 'Product',
      category: 'มือถือ',
      description: `สินค้าขายด่วน - ${name}`,
    });

    const savedStock = await branchStock.save();

    // สร้าง Purchase Order ย้อนหลัง (สำหรับการติดตาม)
    const purchaseOrder = new PurchaseOrder({
      poNumber: `QS-${branchCode}-${Date.now()}`, // Quick Sale PO Number
      supplierId: supplierId,
      supplierInfo: supplier,
      branchCode: branchCode,

      items: [{
        productId: savedProduct._id,
        productName: savedProduct.name,
        productBrand: savedProduct.brand,
        imei: savedProduct.imei,
        quantity: 1,
        unitPrice: cost,
        totalPrice: cost
      }],

      totalAmount: cost,
      status: 'ขายด่วนจากสาขา', // สถานะพิเศษ

      // ข้อมูลโหมดขายด่วน
      quickSale: true,
      urgentSale: urgentSale,
      actualReceiveDate: new Date(), // รับของทันที

      orderDate: new Date(),
      createdBy: userId,
      createdAt: new Date(),

      notes: `โหมดขายด่วน - เพิ่มสินค้าเข้าสต็อกทันทีเพื่อการขาย\nIMEI: ${imei}\nผู้ดำเนินการ: ${userName} (${userRole})\nเวลา: ${timestamp}`
    });

    const savedPO = await purchaseOrder.save();

    // สร้าง Audit Log
    try {
      const auditLog = new AuditLog({
        action: 'QUICK_SALE_PRODUCT_CREATED',
        resource: 'QuickSale',
        resourceId: savedProduct._id,
        resourceName: savedProduct.name,
        userId: userId,
        userName: userName,
        userRole: userRole,

        details: {
          imei: imei,
          productName: name,
          brand: brand,
          cost: cost,
          supplierId: supplierId,
          supplierName: supplier?.name,
          branchCode: branchCode,
          poNumber: savedPO.poNumber,
          stockId: savedStock._id,
          urgentSale: urgentSale,
          timestamp: timestamp
        },

        severity: 'HIGH', // ระดับสูงเพราะเป็นการขายด่วน
        category: 'QUICK_SALE',
        branchCode: branchCode,
        timestamp: new Date()
      });

      await auditLog.save();
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError);
      // ไม่ให้ audit error หยุดกระบวนการหลัก
    }

    // ส่งผลลัพธ์กลับ
    res.status(201).json({
      success: true,
      message: 'เพิ่มสินค้าเข้าสต็อกเรียบร้อย พร้อมขายทันที',
      data: {
        product: {
          _id: savedProduct._id,
          name: savedProduct.name,
          brand: savedProduct.brand,
          imei: savedProduct.imei,
          cost: savedProduct.cost,
          price: savedProduct.price,
          quickSale: true
        },
        stock: {
          _id: savedStock._id,
          branchCode: savedStock.branchCode,
          status: savedStock.status,
          receiveDate: savedStock.receiveDate
        },
        purchaseOrder: {
          _id: savedPO._id,
          poNumber: savedPO.poNumber,
          status: savedPO.status,
          totalAmount: savedPO.totalAmount
        },
        supplier: supplier,
        metadata: {
          quickSale: true,
          urgentSale: urgentSale,
          createdBy: userName,
          createdAt: new Date(),
          branchCode: branchCode
        }
      }
    });

  } catch (error) {
    console.error('Quick Sale Error:', error);

    // สร้าง Audit Log สำหรับ Error
    try {
      const auditLog = new AuditLog({
        action: 'QUICK_SALE_ERROR',
        resource: 'QuickSale',
        userId: req.user?.id,
        userName: req.user?.employee?.name || req.user?.username,
        userRole: req.user?.role,

        details: {
          error: error.message,
          stack: error.stack,
          requestBody: req.body,
          timestamp: new Date()
        },

        severity: 'ERROR',
        category: 'QUICK_SALE',
        branchCode: req.body?.branchCode,
        timestamp: new Date()
      });

      await auditLog.save();
    } catch (auditError) {
      console.error('Failed to create error audit log:', auditError);
    }

    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง',
      code: 'INTERNAL_SERVER_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * ดึงรายการสินค้าที่ขายด่วน
 * GET /api/quick-sale
 */
exports.getQuickSaleProducts = async (req, res) => {
  try {
    const { branchCode, page = 1, limit = 10 } = req.query;

    const query = { quickSale: true };
    if (branchCode) {
      query.branchCode = branchCode;
    }

    const products = await Product.find(query)
      .populate('supplierId', 'name code')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      data: products,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get Quick Sale Products Error:', error);
    res.status(500).json({
      success: false,
      error: 'ไม่สามารถดึงข้อมูลสินค้าขายด่วนได้',
      code: 'FETCH_ERROR'
    });
  }
};

/**
 * ดึงสถิติการขายด่วน
 * GET /api/quick-sale/stats
 */
exports.getQuickSaleStats = async (req, res) => {
  try {
    const { branchCode, startDate, endDate } = req.query;

    const matchQuery = { quickSale: true };

    if (branchCode) {
      matchQuery.branchCode = branchCode;
    }

    if (startDate && endDate) {
      matchQuery.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const stats = await Product.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalQuickSales: { $sum: 1 },
          totalValue: { $sum: '$cost' },
          avgCost: { $avg: '$cost' },
          maxCost: { $max: '$cost' },
          minCost: { $min: '$cost' }
        }
      }
    ]);

    const branchStats = await Product.aggregate([
      { $match: { quickSale: true } },
      {
        $group: {
          _id: '$branchCode',
          count: { $sum: 1 },
          totalValue: { $sum: '$cost' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        overall: stats[0] || {
          totalQuickSales: 0,
          totalValue: 0,
          avgCost: 0,
          maxCost: 0,
          minCost: 0
        },
        byBranch: branchStats
      }
    });

  } catch (error) {
    console.error('Get Quick Sale Stats Error:', error);
    res.status(500).json({
      success: false,
      error: 'ไม่สามารถดึงสถิติการขายด่วนได้',
      code: 'STATS_ERROR'
    });
  }
};