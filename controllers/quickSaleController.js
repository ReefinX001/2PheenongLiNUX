// controllers/quickSaleController.js
const QuickSale = require('../models/QuickSale');

// GET /api/quick-sale
exports.getAllQuickSales = async (req, res) => {
  try {
    const { branchCode, status, startDate, endDate } = req.query;

    let filter = {};

    // @4H!1'#-*22
    if (branchCode) {
      filter.branchCode = branchCode;
    }

    // @4H!1'#-*20
    if (status) {
      if (status === 'pending_po') {
        filter.$or = [
          { poCreated: { $ne: true } },
          { poCreated: { $exists: false } }
        ];
      } else if (status === 'po_created') {
        filter.poCreated = true;
      }
    } else {
      // 🔥 Default: แสดงเฉพาะสินค้าที่ยังไม่ได้สร้าง PO
      filter.$or = [
        { poCreated: { $ne: true } },
        { poCreated: { $exists: false } }
      ];
    }

    // @4H!1'#-'15H
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
      }
    }

    const quickSales = await QuickSale.find(filter)
      .populate('addedBy', 'name')
      .sort({ createdAt: -1 })
      .lean();

    // @4H!I-!9%@4H!@4!*3+#12#A*%
    const formattedData = quickSales.map(item => ({
      ...item,
      addedByName: item.addedBy?.name || 'System',
      status: item.poCreated ? 'po_created' : 'pending_po',
      canCreatePO: !item.poCreated
    }));

    res.json({
      success: true,
      data: formattedData,
      total: formattedData.length,
      message: 'Quick sale items retrieved successfully'
    });

  } catch (error) {
    console.error('Error getting quick sales:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve quick sale items',
      details: error.message
    });
  }
};

// POST /api/quick-sale
exports.createQuickSale = async (req, res) => {
  try {
    const {
      name,
      brand,
      imei,
      cost,
      price,
      branchCode = 'PATTANI',
      category = '!7-7-',
      description = '',
      urgent = true
    } = req.body;

    // #'*-I-!9%5H3@G
    if (!name || !imei || !cost) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, imei, cost'
      });
    }

    // #'*- IMEI I3
    const existingItem = await QuickSale.findOne({ imei });
    if (existingItem) {
      return res.status(400).json({
        success: false,
        error: 'IMEI already exists in quick sale system'
      });
    }

    const quickSaleItem = new QuickSale({
      name,
      brand,
      imei,
      cost: parseFloat(cost),
      price: parseFloat(price || cost),
      branchCode,
      category,
      description,
      urgent,
      addedBy: req.user?.id,
      status: 'pending_po',
      poCreated: false,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const savedItem = await quickSaleItem.save();

    // @4!I-!9% addedBy
    await savedItem.populate('addedBy', 'name');

    res.status(201).json({
      success: true,
      data: savedItem,
      message: 'Quick sale item created successfully'
    });

  } catch (error) {
    console.error('Error creating quick sale:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create quick sale item',
      details: error.message
    });
  }
};

// PUT /api/quick-sale/:id
exports.updateQuickSale = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    updateData.updatedAt = new Date();

    const updatedItem = await QuickSale.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('addedBy', 'name');

    if (!updatedItem) {
      return res.status(404).json({
        success: false,
        error: 'Quick sale item not found'
      });
    }

    res.json({
      success: true,
      data: updatedItem,
      message: 'Quick sale item updated successfully'
    });

  } catch (error) {
    console.error('Error updating quick sale:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update quick sale item',
      details: error.message
    });
  }
};

// POST /api/quick-sale/bulk-create-po
exports.bulkCreatePO = async (req, res) => {
  try {
    const {
      selectedItems,
      supplier,
      purchaseDate,
      note = '',
      poNumber
    } = req.body;

    if (!selectedItems || !Array.isArray(selectedItems) || selectedItems.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No items selected for PO creation'
      });
    }

    if (!supplier || !supplier._id || !purchaseDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: supplier, purchaseDate'
      });
    }

    // 6I-!9%*4I25H@%7-
    const quickSaleItems = await QuickSale.find({
      _id: { $in: selectedItems }
    }).populate('addedBy', 'name');

    if (quickSaleItems.length !== selectedItems.length) {
      return res.status(400).json({
        success: false,
        error: 'Some selected items not found'
      });
    }

    // #'*-'H2*4I22#2"2#!5 PO A%I'+#7-D!H
    const alreadyHasPO = quickSaleItems.filter(item => item.poCreated);
    if (alreadyHasPO.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Some items already have PO: ${alreadyHasPO.map(item => item.name).join(', ')}`
      });
    }

    // *#I2+!2"@% PO
    const generatedPONumber = poNumber || `PO-QS-${Date.now()}`;

    // 3'"-#'!
    let totalAmount = 0;
    let totalPreVat = 0;
    let totalVat = 0;

    const poItems = quickSaleItems.map(item => {
      const unitCost = parseFloat(item.cost) || 0;
      const quantity = 1;
      const discount = 0;
      const taxRate = 7; // VAT 7%

      const lineTotal = (unitCost - discount) * quantity;
      const vatAmount = lineTotal * (taxRate / 100);
      const totalWithVat = lineTotal + vatAmount;

      totalPreVat += lineTotal;
      totalVat += vatAmount;
      totalAmount += totalWithVat;

      return {
        quickSaleId: item._id,
        productName: item.name,
        brand: item.brand,
        imei: item.imei,
        quantity: quantity,
        unitCost: unitCost,
        discount: discount,
        taxRate: taxRate,
        lineTotal: lineTotal,
        vatAmount: vatAmount,
        totalWithVat: totalWithVat,
        category: item.category || '!7-7-'
      };
    });

    // I-!9% PO 5H016
    const poData = {
      poNumber: generatedPONumber,
      supplier: {
        id: supplier._id,
        name: supplier.name,
        type: supplier.supplier_type || 'general'
      },
      purchaseDate: new Date(purchaseDate),
      items: poItems,
      summary: {
        itemCount: poItems.length,
        totalPreVat: totalPreVat,
        totalVat: totalVat,
        totalAmount: totalAmount
      },
      note: note,
      status: 'draft',
      type: 'backdated_quick_sale',
      createdBy: req.user?.id || 'system',
      createdAt: new Date(),
      branchCode: quickSaleItems[0]?.branchCode || 'PATTANI'
    };

    // 16I-!9%%2I-!9% (I2!5 model *3+#1 PO)
    // const purchaseOrder = new PurchaseOrder(poData);
    // await purchaseOrder.save();

    // -1@*20C QuickSale
    await QuickSale.updateMany(
      { _id: { $in: selectedItems } },
      {
        $set: {
          poCreated: true,
          poNumber: generatedPONumber,
          poDate: new Date(purchaseDate),
          poStatus: 'draft',
          updatedAt: new Date()
        }
      }
    );

    res.json({
      success: true,
      data: {
        poNumber: generatedPONumber,
        poData: poData,
        itemsUpdated: selectedItems.length
      },
      message: `*#I2 PO "I-+%1*3@#G! +!2"@%: ${generatedPONumber}`
    });

  } catch (error) {
    console.error('Error creating bulk PO:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create bulk PO',
      details: error.message
    });
  }
};

// GET /api/quick-sale/statistics
exports.getStatistics = async (req, res) => {
  try {
    const { branchCode } = req.query;

    let filter = {};
    if (branchCode) {
      filter.branchCode = branchCode;
    }

    const [
      totalItems,
      pendingPO,
      completedPO,
      totalValue
    ] = await Promise.all([
      QuickSale.countDocuments(filter),
      QuickSale.countDocuments({ ...filter, poCreated: { $ne: true } }),
      QuickSale.countDocuments({ ...filter, poCreated: true }),
      QuickSale.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            total: { $sum: '$cost' }
          }
        }
      ])
    ]);

    res.json({
      success: true,
      data: {
        totalItems,
        pendingPO,
        completedPO,
        totalValue: totalValue[0]?.total || 0
      }
    });

  } catch (error) {
    console.error('Error getting statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics',
      details: error.message
    });
  }
};

// DELETE /api/quick-sale/:id
exports.deleteQuickSale = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await QuickSale.findById(id);
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Quick sale item not found'
      });
    }

    // #'*-'H2!5 PO A%I'+#7-D!H
    if (item.poCreated) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete item that already has PO'
      });
    }

    await QuickSale.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Quick sale item deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting quick sale:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete quick sale item',
      details: error.message
    });
  }
};