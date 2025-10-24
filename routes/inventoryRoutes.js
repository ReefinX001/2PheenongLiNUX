const express = require('express');
const router = express.Router();
const authJWT = require('../middlewares/authJWT');
const BranchStock = require('../models/POS/BranchStock');
const BranchStockHistory = require('../models/POS/BranchStockHistory');
const PurchaseOrder = require('../models/Stock/purchaseOrderModel');

/**
 * GET /api/inventory/current-stock
 * Get current stock inventory with pagination and filtering
 */
router.get('/current-stock', authJWT, async (req, res) => {
  try {
    const { search, category, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    let query = {};

    if (search) {
      query.$or = [
        { sku: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) {
      query.category = category;
    }

    // Get stock data from BranchStockHistory (IN records show current stock)
    const stockData = await BranchStockHistory.aggregate([
      {
        $match: {
          change_type: 'IN',
          ...query
        }
      },
      {
        $unwind: '$items'
      },
      {
        $group: {
          _id: '$items.product_id',
          sku: { $first: '$items.sku' },
          barcode: { $first: '$items.barcode' },
          name: { $first: '$items.name' },
          brand: { $first: '$items.brand' },
          category: { $first: '$items.category' },
          image: { $first: '$items.image' },
          unit: { $first: '$items.unit' },
          cost: { $first: '$items.cost' },
          price: { $first: '$items.price' },
          totalIn: { $sum: '$items.qty' },
          remainQty: { $sum: '$items.remainQty' },
          performed_at: { $max: '$performed_at' }
        }
      },
      {
        $lookup: {
          from: 'branchstockhistories',
          let: { productId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$change_type', 'OUT'] },
                    { $in: ['$$productId', '$items.product_id'] }
                  ]
                }
              }
            },
            {
              $unwind: '$items'
            },
            {
              $match: {
                $expr: { $eq: ['$items.product_id', '$$productId'] }
              }
            },
            {
              $group: {
                _id: '$items.product_id',
                totalOut: { $sum: '$items.qty' }
              }
            }
          ],
          as: 'outData'
        }
      },
      {
        $addFields: {
          totalOut: { $ifNull: [{ $arrayElemAt: ['$outData.totalOut', 0] }, 0] },
          currentStock: {
            $subtract: [
              '$totalIn',
              { $ifNull: [{ $arrayElemAt: ['$outData.totalOut', 0] }, 0] }
            ]
          }
        }
      },
      {
        $match: {
          currentStock: { $gt: 0 }
        }
      },
      {
        $sort: { performed_at: -1 }
      },
      {
        $skip: parseInt(skip)
      },
      {
        $limit: parseInt(limit)
      }
    ]);

    // Get total count
    const totalCount = await BranchStockHistory.aggregate([
      {
        $match: {
          change_type: 'IN',
          ...query
        }
      },
      {
        $unwind: '$items'
      },
      {
        $group: {
          _id: '$items.product_id'
        }
      },
      {
        $count: 'total'
      }
    ]);

    const total = totalCount[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    // Calculate stats
    const totalItems = stockData.length;
    const totalValue = stockData.reduce((sum, item) => sum + (item.currentStock * item.cost), 0);
    const lowStockItems = stockData.filter(item => item.currentStock <= 5).length;

    res.json({
      success: true,
      items: stockData.map(item => ({
        _id: item._id,
        sku: item.sku,
        barcode: item.barcode,
        name: item.name,
        brand: item.brand,
        category: item.category,
        image: item.image,
        unit: item.unit,
        cost: item.cost,
        price: item.price,
        qty: item.currentStock,
        remainQty: item.currentStock,
        performed_at: item.performed_at
      })),
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total: total,
        total_pages: totalPages,
        from: skip + 1,
        to: Math.min(skip + parseInt(limit), total)
      },
      stats: {
        total_items: totalItems,
        total_value: totalValue,
        low_stock_items: lowStockItems
      }
    });

  } catch (error) {
    console.error('Error getting current stock:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการโหลดข้อมูลสต็อก',
      error: error.message
    });
  }
});

/**
 * GET /api/inventory/history/:id
 * Get stock movement history for a specific product
 */
router.get('/history/:id', authJWT, async (req, res) => {
  try {
    const { id } = req.params;

    const history = await BranchStockHistory.find({
      'items.product_id': id
    })
    .populate('performed_by', 'name')
    .sort({ performed_at: -1 })
    .limit(50);

    const formattedHistory = history.map(record => {
      const item = record.items.find(item => item.product_id.toString() === id);
      return {
        _id: record._id,
        change_type: record.change_type,
        quantity: item?.qty || 0,
        reason: record.reason,
        performed_at: record.performed_at,
        staff_name: record.performed_by?.name || record.staff_name || 'ไม่ระบุ'
      };
    });

    res.json({
      success: true,
      history: formattedHistory
    });

  } catch (error) {
    console.error('Error getting item history:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการโหลดประวัติสินค้า',
      error: error.message
    });
  }
});

/**
 * POST /api/inventory/adjust-stock
 * Adjust stock quantity (add or remove)
 */
router.post('/adjust-stock', authJWT, async (req, res) => {
  try {
    const { product_id, change_type, quantity, reason } = req.body;

    if (!product_id || !change_type || !quantity || !reason) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุข้อมูลให้ครบถ้วน'
      });
    }

    if (!['IN', 'OUT'].includes(change_type)) {
      return res.status(400).json({
        success: false,
        message: 'ประเภทการปรับปรุงไม่ถูกต้อง'
      });
    }

    // Get product info for the adjustment
    const lastRecord = await BranchStockHistory.findOne({
      'items.product_id': product_id,
      change_type: 'IN'
    }).sort({ performed_at: -1 });

    if (!lastRecord) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลสินค้านี้ในระบบ'
      });
    }

    const productItem = lastRecord.items.find(item =>
      item.product_id.toString() === product_id
    );

    // Create stock adjustment record
    const adjustmentRecord = new BranchStockHistory({
      branch_code: req.user.branch_code || 'DEFAULT',
      change_type: change_type,
      reason: reason,
      performed_at: new Date(),
      performed_by: req.user._id,
      staff_name: req.user.name,
      quantity: quantity,
      items: [{
        product_id: productItem.product_id,
        sku: productItem.sku,
        barcode: productItem.barcode,
        name: productItem.name,
        brand: productItem.brand,
        category: productItem.category,
        image: productItem.image,
        unit: productItem.unit,
        cost: productItem.cost,
        price: productItem.price,
        qty: quantity,
        remainQty: change_type === 'IN' ? quantity : 0
      }]
    });

    await adjustmentRecord.save();

    res.json({
      success: true,
      message: 'ปรับปรุงสต็อกเรียบร้อยแล้ว',
      data: adjustmentRecord
    });

  } catch (error) {
    console.error('Error adjusting stock:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการปรับปรุงสต็อก',
      error: error.message
    });
  }
});

/**
 * GET /api/purchase-orders/pending-items
 * Get pending purchase orders for inventory management
 */
router.get('/purchase-orders/pending-items', authJWT, async (req, res) => {
  try {
    const pendingOrders = await PurchaseOrder.find({
      status: { $in: ['pending', 'approved', 'in_progress'] }
    })
    .select('poNumber supplierName items status created_at')
    .sort({ created_at: -1 })
    .limit(50);

    res.json({
      success: true,
      orders: pendingOrders
    });

  } catch (error) {
    console.error('Error getting pending purchase orders:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการโหลดข้อมูลใบสั่งซื้อ',
      error: error.message
    });
  }
});

/**
 * GET /api/purchase-orders/:id
 * Get specific purchase order details
 */
router.get('/purchase-orders/:id', authJWT, async (req, res) => {
  try {
    const { id } = req.params;

    const purchaseOrder = await PurchaseOrder.findById(id)
      .populate('supplier', 'name')
      .populate('items.productId', 'name sku');

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบใบสั่งซื้อนี้'
      });
    }

    res.json({
      success: true,
      data: purchaseOrder
    });

  } catch (error) {
    console.error('Error getting purchase order:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการโหลดข้อมูลใบสั่งซื้อ',
      error: error.message
    });
  }
});

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