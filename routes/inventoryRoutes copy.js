const express = require('express');
const router = express.Router();
const authJWT = require('../middlewares/authJWT');
const BranchStock = require('../models/POS/BranchStock');

/**
 * POST /api/inventory/update-stock
 * Update stock after installment contract creation
 */
router.post('/update-stock', authJWT, async (req, res) => {
  try {
    const { contractNumber, branchCode, items, timestamp, source } = req.body;

    console.log('📦 Processing stock update:', {
      contractNumber,
      branchCode,
      itemsCount: items?.length,
      source,
      timestamp
    });

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'ไม่พบรายการสินค้าที่ต้องตัดสต๊อก'
      });
    }

    if (!branchCode) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุรหัสสาขา'
      });
    }

    const results = [];
    const errors = [];

    for (const item of items) {
      try {
        const { id, productId, quantity = 1, name, imei, type } = item;

        // Find stock by ID or IMEI
        let stock = null;

        if (id) {
          stock = await BranchStock.findById(id);
        }

        if (!stock && imei) {
          stock = await BranchStock.findOne({
            imei: imei,
            branch_code: branchCode
          });
        }

        if (!stock && productId) {
          stock = await BranchStock.findOne({
            product_id: productId,
            branch_code: branchCode
          });
        }

        if (!stock) {
          errors.push({
            item: { id, productId, imei, name },
            error: 'ไม่พบสินค้าในสต๊อก'
          });
          continue;
        }

        // Check if already sold or reserved
        if (stock.status === 'sold' || stock.status === 'reserved') {
          errors.push({
            item: { id, productId, imei, name },
            error: `สินค้าถูก${stock.status === 'sold' ? 'ขาย' : 'จอง'}แล้ว`
          });
          continue;
        }

        // Update stock status to sold
        const updatedStock = await BranchStock.findByIdAndUpdate(
          stock._id,
          {
            status: 'sold',
            sold_date: new Date(),
            contract_number: contractNumber,
            last_updated: new Date(),
            updated_by: req.user?._id || null
          },
          { new: true }
        );

        results.push({
          stockId: updatedStock._id,
          item: { id, productId, imei, name },
          previousStatus: stock.status,
          newStatus: 'sold',
          success: true
        });

        console.log(`✅ Stock updated: ${updatedStock._id} (${imei || name})`);

      } catch (itemError) {
        console.error(`❌ Error updating item:`, itemError);
        errors.push({
          item: item,
          error: itemError.message
        });
      }
    }

    const summary = {
      total: items.length,
      success: results.length,
      failed: errors.length,
      contractNumber,
      branchCode,
      timestamp: new Date().toISOString()
    };

    console.log('📋 Stock update summary:', summary);

    if (errors.length > 0) {
      console.warn('⚠️ Some stock updates failed:', errors);
    }

    // Return success even if some items failed (partial success)
    res.json({
      success: true,
      message: `ตัดสต๊อกสำเร็จ ${results.length}/${items.length} รายการ`,
      data: {
        summary,
        results,
        errors
      }
    });

  } catch (error) {
    console.error('❌ Stock update error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการตัดสต๊อก: ' + error.message
    });
  }
});

/**
 * GET /api/inventory/stock/check
 * Check stock availability for items
 */
router.get('/stock/check', authJWT, async (req, res) => {
  try {
    const { branchCode, items } = req.query;

    if (!branchCode) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุรหัสสาขา'
      });
    }

    let itemList = [];
    try {
      itemList = JSON.parse(items || '[]');
    } catch (e) {
      return res.status(400).json({
        success: false,
        message: 'รูปแบบข้อมูลสินค้าไม่ถูกต้อง'
      });
    }

    const results = [];

    for (const item of itemList) {
      const { id, productId, imei } = item;

      let stock = null;

      if (id) {
        stock = await BranchStock.findById(id);
      } else if (imei) {
        stock = await BranchStock.findOne({
          imei: imei,
          branch_code: branchCode
        });
      } else if (productId) {
        stock = await BranchStock.findOne({
          product_id: productId,
          branch_code: branchCode,
          status: 'available'
        });
      }

      results.push({
        item,
        available: stock ? true : false,
        stock: stock ? {
          id: stock._id,
          imei: stock.imei,
          status: stock.status,
          name: stock.name
        } : null
      });
    }

    res.json({
      success: true,
      data: {
        branchCode,
        results,
        summary: {
          total: results.length,
          available: results.filter(r => r.available).length,
          unavailable: results.filter(r => !r.available).length
        }
      }
    });

  } catch (error) {
    console.error('❌ Stock check error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบสต๊อก: ' + error.message
    });
  }
});

module.exports = router;