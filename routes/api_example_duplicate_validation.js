// ตัวอย่าง API Routes สำหรับระบบป้องกันสินค้าซ้ำ
// ไฟล์นี้เป็นตัวอย่างที่สามารถนำไปใช้พัฒนา API จริงได้

const express = require('express');
const router = express.Router();

// ===============================
// API สำหรับตรวจสอบสินค้าซ้ำใน PO Items
// ===============================

/**
 * POST /api/purchase-order/check-duplicate-items
 * ตรวจสอบสินค้าซ้ำใน PO Items
 */
router.post('/check-duplicate-items', async (req, res) => {
  try {
    const { barcode, imei, stockType } = req.body;

    if (!barcode) {
      return res.status(400).json({
        success: false,
        error: 'บาร์โค้ดเป็นข้อมูลที่จำเป็น'
      });
    }

    // TODO: Implement actual database query
    // ตัวอย่างการตรวจสอบในฐานข้อมูล

    // const PurchaseOrder = require('../models/PurchaseOrder');
    // const duplicateItems = await PurchaseOrder.aggregate([
    //   { $unwind: '$items' },
    //   {
    //     $match: stockType === 'imei' ? {
    //       'items.barcode': barcode,
    //       'items.imei': imei,
    //       'items.stockType': 'imei'
    //     } : {
    //       'items.barcode': barcode,
    //       'items.stockType': 'quantity'
    //     }
    //   },
    //   { $limit: 1 }
    // ]);

    // ตัวอย่างการตอบกลับ
    const mockDuplicateFound = false; // เปลี่ยนเป็น true เพื่อทดสอบ

    if (mockDuplicateFound) {
      return res.json({
        success: true,
        data: {
          isDuplicate: true,
          duplicateInfo: {
            poNumber: 'PO-2024-001',
            name: 'iPhone 15 Pro',
            barcode: barcode,
            imei: imei,
            supplier: 'Apple Thailand',
            itemIndex: 0
          }
        }
      });
    } else {
      return res.json({
        success: true,
        data: {
          isDuplicate: false,
          duplicateInfo: null
        }
      });
    }

  } catch (error) {
    console.error('PO duplicate check error:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการตรวจสอบสินค้าซ้ำ'
    });
  }
});

// ===============================
// API สำหรับตรวจสอบสินค้าซ้ำข้ามสาขา
// ===============================

/**
 * POST /api/branch-stock/check-cross-branch-duplicate
 * ตรวจสอบสินค้าซ้ำข้ามสาขา
 */
router.post('/check-cross-branch-duplicate', async (req, res) => {
  try {
    const { barcode, imei, stockType, excludeBranch, excludeStockId } = req.body;

    if (!barcode) {
      return res.status(400).json({
        success: false,
        error: 'บาร์โค้ดเป็นข้อมูลที่จำเป็น'
      });
    }

    // TODO: Implement actual database query
    // ตัวอย่างการตรวจสอบในฐานข้อมูล

    // const BranchStock = require('../models/BranchStock');
    // const query = {
    //   _id: { $ne: excludeStockId }, // ไม่ใช่ตัวเอง
    //   branch_code: { $ne: excludeBranch }, // ต่างสาขา
    //   verified: true // เฉพาะที่ verified แล้ว
    // };

    // if (stockType === 'imei') {
    //   query.barcode = barcode;
    //   query.imei = imei;
    //   query.stockType = 'imei';
    // } else if (stockType === 'quantity') {
    //   query.barcode = barcode;
    //   query.stockType = 'quantity';
    // }

    // const duplicateStock = await BranchStock.findOne(query);

    // ตัวอย่างการตอบกลับ
    const mockDuplicateFound = false; // เปลี่ยนเป็น true เพื่อทดสอบ

    if (mockDuplicateFound) {
      return res.json({
        success: true,
        data: {
          isDuplicate: true,
          duplicateInfo: {
            _id: '507f1f77bcf86cd799439011',
            name: 'iPhone 15 Pro',
            barcode: barcode,
            imei: imei,
            branch_code: 'BTH',
            verified: true,
            created_at: new Date(),
            scanned_by_name: 'John Doe'
          }
        }
      });
    } else {
      return res.json({
        success: true,
        data: {
          isDuplicate: false,
          duplicateInfo: null
        }
      });
    }

  } catch (error) {
    console.error('Cross branch duplicate check error:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการตรวจสอบสินค้าซ้ำข้ามสาขา'
    });
  }
});

// ===============================
// API สำหรับการอนุมัติสินค้าพร้อมตรวจสอบซ้ำ
// ===============================

/**
 * POST /api/branch-stock/:stockId/approve-with-duplicate-check
 * อนุมัติสินค้าพร้อมตรวจสอบสินค้าซ้ำ
 */
router.post('/:stockId/approve-with-duplicate-check', async (req, res) => {
  try {
    const { stockId } = req.params;
    const { bypassDuplicateCheck = false } = req.body;

    // TODO: Implement actual database operations
    // const BranchStock = require('../models/BranchStock');
    // const stock = await BranchStock.findById(stockId);

    // if (!stock) {
    //   return res.status(404).json({
    //     success: false,
    //     error: 'ไม่พบข้อมูลสินค้า'
    //   });
    // }

    // ตรวจสอบสินค้าซ้ำก่อนอนุมัติ (หากไม่ bypass)
    if (!bypassDuplicateCheck) {
      // TODO: ใช้ฟังก์ชันตรวจสอบซ้ำที่สร้างไว้ข้างต้น
      // const duplicateCheck = await checkDuplicateStock(stock);
      // if (duplicateCheck.isDuplicate) {
      //   return res.status(409).json({
      //     success: false,
      //     error: 'พบสินค้าซ้ำในระบบ',
      //     duplicateInfo: duplicateCheck.duplicateInfo
      //   });
      // }
    }

    // ดำเนินการอนุมัติ
    // await BranchStock.findByIdAndUpdate(stockId, {
    //   verified: true,
    //   pending: false,
    //   verified_at: new Date(),
    //   verified_by: req.user.id
    // });

    res.json({
      success: true,
      message: 'อนุมัติสินค้าเรียบร้อย',
      data: {
        stockId: stockId,
        verified: true,
        verified_at: new Date()
      }
    });

  } catch (error) {
    console.error('Approve with duplicate check error:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการอนุมัติสินค้า'
    });
  }
});

// ===============================
// API สำหรับดึงประวัติสินค้า
// ===============================

/**
 * GET /api/branch-stock-history
 * ดึงประวัติการเคลื่อนไหวของสินค้า
 */
router.get('/history', async (req, res) => {
  try {
    const { product_id, barcode, imei, branch_code, limit = 10 } = req.query;

    // TODO: Implement actual database query
    // const BranchStockHistory = require('../models/BranchStockHistory');
    // const query = {};

    // if (product_id) query['items.product_id'] = product_id;
    // if (barcode) query['items.barcode'] = barcode;
    // if (imei) query['items.imei'] = imei;
    // if (branch_code) query.branch_code = branch_code;

    // const history = await BranchStockHistory.find(query)
    //   .sort({ created_at: -1 })
    //   .limit(parseInt(limit))
    //   .populate('performed_by', 'name')
    //   .populate('supplier', 'name');

    // ตัวอย่างข้อมูลประวัติ
    const mockHistory = [
      {
        _id: '507f1f77bcf86cd799439011',
        change_type: 'IN',
        branch_code: 'PTN',
        supplier: { name: 'Apple Thailand' },
        performed_by: { name: 'John Doe' },
        reason: 'ตรวจสอบสินค้าเข้าคลัง (Verified)',
        created_at: new Date(),
        items: [{
          name: 'iPhone 15 Pro',
          barcode: '1234567890123',
          imei: '123456789012345',
          qty: 1
        }]
      }
    ];

    res.json({
      success: true,
      data: mockHistory
    });

  } catch (error) {
    console.error('Get stock history error:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงประวัติสินค้า'
    });
  }
});

// ===============================
// ฟังก์ชันช่วยเหลือ (Helper Functions)
// ===============================

/**
 * ฟังก์ชันตรวจสอบสินค้าซ้ำแบบครอบคลุม
 */
async function checkDuplicateStock(stockData) {
  try {
    // TODO: Implement comprehensive duplicate check
    // 1. Check in current branch
    // 2. Check in other branches
    // 3. Check in PO items

    return {
      isDuplicate: false,
      duplicateInfo: null,
      source: null
    };
  } catch (error) {
    console.error('Duplicate check error:', error);
    throw error;
  }
}

/**
 * ฟังก์ชันส่งการแจ้งเตือนแบบ real-time
 */
function notifyStockStatusChange(stockId, status, branchCode, io) {
  if (io) {
    io.emit('stockStatusChanged', {
      stockId,
      status,
      branchCode,
      timestamp: new Date().toISOString()
    });
  }
}

// ===============================
// Export Router
// ===============================

module.exports = router;

// ===============================
// วิธีการใช้งาน API เหล่านี้
// ===============================

/*

1. เพิ่ม routes ลงใน app.js:
   app.use('/api/purchase-order', require('./routes/api_example_duplicate_validation'));
   app.use('/api/branch-stock', require('./routes/api_example_duplicate_validation'));

2. ตัวอย่างการเรียกใช้จาก frontend:

   // ตรวจสอบสินค้าซ้ำใน PO
   const response = await fetch('/api/purchase-order/check-duplicate-items', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       barcode: '1234567890123',
       imei: '123456789012345',
       stockType: 'imei'
     })
   });

   // ตรวจสอบสินค้าซ้ำข้ามสาขา
   const response = await fetch('/api/branch-stock/check-cross-branch-duplicate', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       barcode: '1234567890123',
       imei: '123456789012345',
       stockType: 'imei',
       excludeBranch: 'PTN',
       excludeStockId: '507f1f77bcf86cd799439011'
     })
   });

   // อนุมัติสินค้าพร้อมตรวจสอบซ้ำ
   const response = await fetch('/api/branch-stock/507f1f77bcf86cd799439011/approve-with-duplicate-check', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       bypassDuplicateCheck: false
     })
   });

3. Database Models ที่ต้องการ:
   - PurchaseOrder: สำหรับเก็บข้อมูล PO และ items
   - BranchStock: สำหรับเก็บข้อมูลสินค้าในสาขา
   - BranchStockHistory: สำหรับเก็บประวัติการเคลื่อนไหว

4. Middleware ที่ต้องการ:
   - Authentication middleware
   - Authorization middleware
   - Validation middleware

*/