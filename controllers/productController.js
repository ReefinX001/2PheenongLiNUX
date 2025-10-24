const mongoose = require('mongoose');
const Product = require('../models/Stock/Product');
const ProductHistory = require('../models/Stock/ProductHistory');
const BranchStock = require('../models/POS/BranchStock');
const Supplier = require('../models/Stock/Supplier');
const Branch = require('../models/Account/Branch');
const ProductImage = require('../models/Stock/ProductImage');
const PurchaseOrder = require('../models/Stock/purchaseOrderModel');
const { getNextSequence } = require('../utils/counterUtil');

/**
 * POST /api/product
 * สร้าง Product ใหม่
 */
exports.createProduct = async (req, res) => {
  const io = req.app.get('io');
  try {
    const {
      barcode,

      imei,
      name,
      price,
      brand,
      status,
      category,
      supplier,
      invoiceNumber,
      branch_code,
      branch,
      categoryGroup,
      poNumber,
      taxType
    } = req.body;

    // บังคับ field ขั้นต่ำ
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'name is required.'
      });
    }
    if (!supplier) {
      return res.status(400).json({
        success: false,
        error: 'supplier is required.'
      });
    }
    if (!branch_code) {
      return res.status(400).json({
        success: false,
        error: 'branch_code is required.'
      });
    }

    // ตรวจสอบ supplier
    const foundSupplier = await Supplier.findById(supplier).lean();
    if (!foundSupplier) {
      return res.status(400).json({
        success: false,
        error: 'Supplier not found in database.'
      });
    }

    // ตรวจซ้ำ IMEI
    if (imei) {
      const dupImei = await Product.findOne({ imei, deleted_at: null }).lean();
      if (dupImei) {
        return res.status(400).json({
          success: false,
          error: `Duplicate IMEI "${imei}" found in Products.`
        });
      }
    }

    // ------------------------------------------------------------
    // 1) ตรวจสอบ branch_code => หา Branch ใน DB จาก branch_code หรือ _id
    // ------------------------------------------------------------
    let foundBranchByCode = await Branch.findOne({ branch_code }).lean();
    if (!foundBranchByCode && mongoose.Types.ObjectId.isValid(branch_code)) {
      foundBranchByCode = await Branch.findById(branch_code).lean();
    }
    if (!foundBranchByCode) {
      return res.status(400).json({
        success: false,
        error: `Branch not found by branch_code or _id: "${branch_code}"`
      });
    }
    const finalBranchCode = foundBranchByCode.branch_code;
    let finalBranchId = foundBranchByCode._id;

    // ------------------------------------------------------------
    // 2) ถ้ามีส่ง branch (ObjectId หรือ code) มา => ตรวจสอบอีกที
    // ------------------------------------------------------------
    if (branch) {
      let foundBranchById = null;
      if (mongoose.Types.ObjectId.isValid(branch)) {
        foundBranchById = await Branch.findById(branch).lean();
        if (!foundBranchById) {
          const foundBranchByCode2 = await Branch.findOne({ branch_code: branch }).lean();
          if (!foundBranchByCode2) {
            return res.status(400).json({
              success: false,
              error: `Branch not found by _id or branch_code: "${branch}"`
            });
          }
          foundBranchById = foundBranchByCode2;
        }
      } else {
        foundBranchById = await Branch.findOne({ branch_code: branch }).lean();
        if (!foundBranchById) {
          return res.status(400).json({
            success: false,
            error: `Branch not found by branch_code: "${branch}"`
          });
        }
      }
      if (foundBranchById._id.toString() !== finalBranchId.toString()) {
        return res.status(400).json({
          success: false,
          error: `Mismatch: branch_code="${finalBranchCode}" conflicts with branch="${branch}"`
        });
      }

      io.emit('branch:validated', {
        branchId: finalBranchId.toString(),
        branchCode: finalBranchCode
      });
    }  // <- ปิด if(branch) ที่นี่

    // ------------------------------------------------------------
    // 3) จัดการรูปภาพ (ถ้ามีไฟล์อัปโหลด หรือดึงจาก ProductImage)
    // ------------------------------------------------------------
    let imagePath = '';
    if (req.file) {
      imagePath = req.file.path;
    } else {
      const foundImg = await ProductImage.findOne({ name }).lean();
      if (foundImg) {
        imagePath = foundImg.image;
      }
    }

    // ------------------------------------------------------------
    // 4-A) สร้าง documentNumber อัตโนมัติ ถ้ามี poNumber
    // ------------------------------------------------------------
    let finalDocumentNumber = '';
    if (poNumber) {
      const po = await PurchaseOrder.findOne({ poNumber }).lean();
      if (po) {
        if (po.documentNumber) {
          // ใช้เลขที่มีใน PO เดิม
          finalDocumentNumber = po.documentNumber;
        } else {
          // สร้างใหม่รูปแบบ "DOC-YYYYMM-xxxxx"
          const now    = new Date();
          const year   = now.getFullYear();
          const month  = String(now.getMonth() + 1).padStart(2, '0');
          const prefix = `DOC-${year}${month}`;               // เช่น "DOC-202505"
          let nextSeq  = await getNextSequence('documentNumber', prefix);
          if (nextSeq == null) nextSeq = 1;                   // กันกรณี undefined/null
          const padded = String(nextSeq).padStart(5, '0');     // "00001"
          finalDocumentNumber = `${prefix}-${padded}`;         // "DOC-202505-00001"
        }
      }
    }

    // ------------------------------------------------------------
    // 4-B) สร้าง Product + set taxType
    // ------------------------------------------------------------


    const newProduct = new Product({
      barcode: barcode || '',

      imei: imei || '',
      name,
      price: price || 0,
      brand: brand || '',
      status: status || 'active',
      category: category || '',
      invoiceNumber: invoiceNumber || '',
      image: imagePath,
      supplier,
      deleted_at: null,
      branch_code: finalBranchCode,
      branch: finalBranchId,
      categoryGroup: categoryGroup && mongoose.Types.ObjectId.isValid(categoryGroup)
        ? new mongoose.Types.ObjectId(categoryGroup)
        : null,
      poNumber: poNumber || '',
      documentNumber: finalDocumentNumber,
      taxType: (taxType && ['ไม่มีภาษี','แยกภาษี','รวมภาษี'].includes(taxType))
        ? taxType
        : 'แยกภาษี'
    });

    const saved = await newProduct.save();
    io.emit('product:created',        { id: saved._id, data: saved });

    return res.json({ success: true, data: saved });
  } catch (err) {
    console.error('createProduct error:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error'
    });
  }
};

/**
 * GET /api/product
 * ดึงสินค้าที่ยังไม่ถูกลบ (deleted_at = null) + Auto sync จาก PO
 */
exports.getAllProducts = async (req, res) => {
  const io = req.app.get('io');
  try {
    const products = await Product.find({ deleted_at: null })
      .limit(100)
      .sort({ createdAt: -1 })
      .populate('supplier', 'name code')
      .populate('branch', 'branch_code name')
      .populate('categoryGroup', 'name unitName');

    let autoSyncCount = 0;

    // Auto sync จาก PO สำหรับสินค้าที่มี poNumber
    for (let prod of products) {
      if (prod.poNumber) {
        const po = await PurchaseOrder.findOne({ poNumber: prod.poNumber })
          .populate('categoryGroup', 'name unitName')
          .lean();
        if (po) {
          let updated = false;

          // Auto sync categoryGroup
          if (po.categoryGroup && (!prod.categoryGroup || prod.categoryGroup.toString() !== po.categoryGroup._id.toString())) {
            prod.categoryGroup = po.categoryGroup;
            updated = true;
          }

          // Auto sync documentNumber
          if (po.documentNumber && prod.documentNumber !== po.documentNumber) {
            prod.documentNumber = po.documentNumber;
            updated = true;
          }

          // Auto sync taxType และ taxRate
          if (po.items?.length) {
            const matched = po.items.find(i => i.imei === prod.imei) || po.items[0];
            if (matched.taxType && prod.taxType !== matched.taxType) {
              prod.taxType = matched.taxType;
              updated = true;
            }
            if (typeof matched.taxRate === 'number' && prod.taxRate !== matched.taxRate) {
              prod.taxRate = matched.taxRate;
              updated = true;
            }
          }

          if (updated) {
            const savedProd = await prod.save();
            autoSyncCount++;
            io.emit('product:autoSyncedFromPO', {
              id: savedProd._id.toString(),
              data: savedProd,
              poNumber: prod.poNumber
            });
          }
        }
      }
    }

    // ดึงใหม่ก่อน return เพื่อให้ response สะท้อนค่าล่าสุด
    const updatedProducts = await Product.find({ deleted_at: null })
      .limit(100)
      .sort({ createdAt: -1 })
      .populate('supplier', 'name code')
      .populate('branch', 'branch_code name')
      .populate('categoryGroup', 'name unitName')
      .lean(); // ใช้ lean() ตอนสุดท้ายเพื่อ return เป็น plain object

    // Log auto sync results
    if (autoSyncCount > 0) {
      console.log(`Auto sync completed: ${autoSyncCount} products updated from PO`);
    }

    return res.json({
      success: true,
      data: updatedProducts,
      autoSyncCount: autoSyncCount
    });
  } catch (err) {
    console.error('getAllProducts error:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error'
    });
  }
};

/**
 * GET /api/product/find-by-barcode?code=xxx&branch_code=yyy
 */
exports.findByBarcode = async (req, res) => {
  const io = req.app.get('io');
  try {
    const code = req.query.code || '';
    const branch_code = req.query.branch_code || '';

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุ code (บาร์โค้ด)'
      });
    }

    const filter = {
      barcode: code,
      deleted_at: null
    };

    if (branch_code) {
      filter.branch_code = branch_code;
    }

    let product = await Product.findOne(filter)
      .populate('supplier', 'name code')
      .populate('branch', 'branch_code name')
      .populate('categoryGroup', 'name unitName');

    if (product && product.poNumber) {
      const po = await PurchaseOrder.findOne({ poNumber: product.poNumber })
        .populate('categoryGroup', 'name unitName')
        .lean();
      if (po) {
        let updated = false;
        if (po.categoryGroup && (!product.categoryGroup || product.categoryGroup.toString() !== po.categoryGroup._id.toString())) {
          product.categoryGroup = po.categoryGroup;
          updated = true;
        }
        if (po.documentNumber && product.documentNumber !== po.documentNumber) {
          product.documentNumber = po.documentNumber;
          updated = true;
        }
        if (po.items?.length) {
          const matched = po.items.find(i => i.imei === product.imei) || po.items[0];
          if (matched.taxType && product.taxType !== matched.taxType) {
            product.taxType = matched.taxType;
            updated = true;
          }
          if (typeof matched.taxRate === 'number' && product.taxRate !== matched.taxRate) {
            product.taxRate = matched.taxRate;
            updated = true;
          }
        }
        if (updated) {
          const saved = await product.save();
          io.emit('product:updatedFromPO', {
            id: saved._id.toString(),
            data: saved
          });

          // หา stockType จาก ProductImage
          let productWithStockType = saved.toObject();
          const productImage = await ProductImage.findOne({ name: saved.name }).lean();
          if (productImage) {
            productWithStockType.stockType = productImage.stockType;
          }

          return res.json({ success: true, data: productWithStockType });
        }
      }
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบสินค้าตรงบาร์โค้ดนี้ หรือสาขานี้'
      });
    }

    // หา stockType จาก ProductImage ก่อน return
    let productWithStockType = product.toObject();
    const productImage = await ProductImage.findOne({ name: product.name }).lean();
    if (productImage) {
      productWithStockType.stockType = productImage.stockType;
    }

    return res.json({ success: true, data: productWithStockType });
  } catch (err) {
    console.error('findByBarcode error:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error'
    });
  }
};

/**
 * GET /api/product/:id
 */
exports.getProductById = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    let product = await Product.findOne({
      _id: id,
      deleted_at: null
    })
      .populate('supplier', 'name code')
      .populate('branch', 'branch_code name')
      .populate('categoryGroup', 'name unitName');

    if (product && product.poNumber) {
      const po = await PurchaseOrder.findOne({ poNumber: product.poNumber })
        .populate('categoryGroup', 'name unitName')
        .lean();
      if (po) {
        let updated = false;
        if (po.categoryGroup && (!product.categoryGroup || product.categoryGroup.toString() !== po.categoryGroup._id.toString())) {
          product.categoryGroup = po.categoryGroup;
          updated = true;
        }
        if (po.documentNumber && product.documentNumber !== po.documentNumber) {
          product.documentNumber = po.documentNumber;
          updated = true;
        }
        if (po.items?.length) {
          const matched = po.items.find(i => i.imei === product.imei) || po.items[0];
          if (matched.taxType && product.taxType !== matched.taxType) {
            product.taxType = matched.taxType;
            updated = true;
          }
          if (typeof matched.taxRate === 'number' && product.taxRate !== matched.taxRate) {
            product.taxRate = matched.taxRate;
            updated = true;
          }
        }
        if (updated) {
          const saved = await product.save();
          io.emit('product:updatedFromPO', {
            id: saved._id.toString(),
            data: saved
          });
        }
      }
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found or deleted'
      });
    }

    return res.json({ success: true, data: product });
  } catch (err) {
    console.error('getProductById error:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error'
    });
  }
};

/**
 * PATCH /api/product/:id
 * อัปเดตข้อมูลสินค้า + ตรวจซ้ำ imei
 */
exports.updateProduct = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const {
      barcode,

      imei,
      name,
      price,
      brand,
      status,
      category,
      supplier,
      invoiceNumber,
      branch_code,
      branch,
      categoryGroup,
      poNumber,
      taxType
    } = req.body;

    const product = await Product.findOne({
      _id: id,
      deleted_at: null
    });
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found or already deleted'
      });
    }


    // ตรวจซ้ำ IMEI
    if (imei && imei !== product.imei) {
      const dupImei = await Product.findOne({
        imei,
        deleted_at: null,
        _id: { $ne: product._id }
      });
      if (dupImei) {
        return res.status(400).json({
          success: false,
          error: `Duplicate IMEI "${imei}" found in Products.`
        });
      }
    }

    // อัปเดตฟิลด์ต่าง ๆ
    if (barcode !== undefined) product.barcode = barcode;

    if (imei !== undefined) product.imei = imei;
    if (name !== undefined) product.name = name;
    if (price !== undefined) product.price = price;
    if (brand !== undefined) product.brand = brand;
    // if (model !== undefined) product.model = model;  // ไม่อัปเดต model อีกต่อไป
    // ไม่อัปเดต capacity, color
    if (status !== undefined) product.status = status;
    if (category !== undefined) product.category = category;
    if (invoiceNumber !== undefined) product.invoiceNumber = invoiceNumber;

    // ตรวจสอบ supplier
    if (supplier !== undefined) {
      const foundSupplier = await Supplier.findById(supplier).lean();
      if (!foundSupplier) {
        return res.status(400).json({
          success: false,
          error: 'Supplier not found in database.'
        });
      }
      product.supplier = supplier;
    }

    // ตรวจสอบ branch_code
    if (branch_code !== undefined) {
      let foundBranchByCode = await Branch.findOne({ branch_code }).lean();
      if (!foundBranchByCode && mongoose.Types.ObjectId.isValid(branch_code)) {
        foundBranchByCode = await Branch.findById(branch_code).lean();
      }
      if (!foundBranchByCode) {
        return res.status(400).json({
          success: false,
          error: `Branch not found by branch_code or _id: "${branch_code}"`
        });
      }
      product.branch_code = foundBranchByCode.branch_code;
      product.branch = foundBranchByCode._id;
    }

    // ตรวจสอบ branch
    if (branch !== undefined) {
      let foundBranchById = null;
      if (mongoose.Types.ObjectId.isValid(branch)) {
        foundBranchById = await Branch.findById(branch).lean();
        if (!foundBranchById) {
          const foundBranchByCode2 = await Branch.findOne({ branch_code: branch }).lean();
          if (!foundBranchByCode2) {
            return res.status(400).json({
              success: false,
              error: `Branch not found by _id or branch_code: "${branch}"`
            });
          }
          foundBranchById = foundBranchByCode2;
        }
      } else {
        foundBranchById = await Branch.findOne({ branch_code: branch }).lean();
        if (!foundBranchById) {
          return res.status(400).json({
            success: false,
            error: `Branch not found by branch_code: "${branch}"`
          });
        }
      }
      if (branch_code !== undefined) {
        if (foundBranchById._id.toString() !== product.branch.toString()) {
          return res.status(400).json({
            success: false,
            error: `Mismatch: branch_code="${product.branch_code}" conflicts with branch="${branch}"`
          });
        }

        io.emit('product:updatedBranch', {
          productId: product._id.toString(),
          branchId:  product.branch.toString()
        });

      } else {
        product.branch_code = foundBranchById.branch_code;
        product.branch = foundBranchById._id;
      }
    }

    // จัดการรูปภาพ
    if (req.file) {
      product.image = req.file.path;
    } else {
      if (name && name !== product.name) {
        const foundImg = await ProductImage.findOne({ name }).lean();
        if (foundImg) {
          product.image = foundImg.image;
        }
      }
    }

    // categoryGroup
    if (categoryGroup !== undefined) {
      product.categoryGroup = (mongoose.Types.ObjectId.isValid(categoryGroup))
        ? new mongoose.Types.ObjectId(categoryGroup)
        : null;
    }

    // อัปเดต poNumber/documentNumber
    if (poNumber !== undefined) {
      product.poNumber = poNumber;
      const po = await PurchaseOrder.findOne({ poNumber: product.poNumber }).lean();
      if (po && po.documentNumber) {
        product.documentNumber = po.documentNumber;
      } else {
        product.documentNumber = '';
      }
    }

    // อัปเดต taxType
    if (taxType !== undefined) {
      product.taxType = (['ไม่มีภาษี', 'แยกภาษี', 'รวมภาษี'].includes(taxType))
        ? taxType
        : product.taxType;
    }

    // save() เพียงครั้งเดียว
    const saved = await product.save();
    io.emit('product:updated',      { id: saved._id, data: saved });

    return res.json({ success: true, data: saved });
  } catch (err) {
    console.error('updateProduct error:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error'
    });
  }
};

/**
 * DELETE /api/product/:id
 * Soft Delete => ตั้งค่า deleted_at เป็นวันที่ปัจจุบัน
 */
exports.deleteProduct = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const product = await Product.findOne({ _id: id, deleted_at: null });
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found or already deleted'
      });
    }
    await product.softDelete();
    return res.json({ success: true, data: product });
  } catch (err) {
    console.error('deleteProduct error:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error'
    });
  }
};

/**
 * DELETE /api/product/:id/force
 * ลบสินค้าออกจากฐานข้อมูล (Physical Delete)
 */
exports.forceDeleteProduct = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    // เก็บข้อมูลก่อนลบ
    const deletedId   = product._id.toString();
    const deletedDoc  = product.toObject();
    // ลบจริง
    await product.deleteOne();
    // Emit event เดียว
    io.emit('product:deleted', {
      id: deletedId,
      data: deletedDoc
    });

    return res.json({ success: true, data: deletedDoc });
  } catch (err) {
    console.error('forceDeleteProduct error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

/**
 * POST /api/product/:id/transfer
 * 1) บันทึกประวัติใน ProductHistory
 * 2) ลบออกจาก Product (Physical)
 * 3) สร้าง BranchStock
 */
exports.transferProduct = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    let { branch_code } = req.body;

    if (!branch_code) {
      return res.status(400).json({
        success: false,
        error: 'branch_code is required'
      });
    }

    let foundBranch = await Branch.findOne({ branch_code }).lean();
    if (!foundBranch && mongoose.Types.ObjectId.isValid(branch_code)) {
      foundBranch = await Branch.findById(branch_code).lean();
    }
    if (!foundBranch) {
      return res.status(404).json({
        success: false,
        error: `ไม่พบสาขาด้วย branch_code หรือ _id "${branch_code}"`
      });
    }
    const realBranchCode = foundBranch.branch_code;

    const product = await Product.findOne({ _id: id, deleted_at: null });
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบสินค้าหรือถูกลบไปแล้ว'
      });
    }

    if (!product.supplier) {
      return res.status(400).json({
        success: false,
        error: 'Product has no supplier, but supplier is required for ProductHistory.'
      });
    }

    const poNumberFromProduct = product.poNumber || '';
    const invoiceNumberFromProduct = product.invoiceNumber || '';
    const documentNumberFromProduct = product.documentNumber || '';

    // บันทึกประวัติ
    const productHistory = new ProductHistory({
      product: product._id,
      operation: 'deleted', // หรือ 'transferred'
      snapshot: product.toObject(),
      changedBy: req.user ? req.user._id : null,
      supplier: product.supplier,
      categoryGroup: product.categoryGroup || null
    });
    // บันทึกประวัติ แล้วเก็บผลลัพธ์ที่ save มาในตัวแปร
    const savedHistory = await productHistory.save();
    io.emit('producthistoryCreated', {
      id: savedHistory._id,
      data: savedHistory
    });


    // สร้าง BranchStock และเพิ่ม branch
    const newBranchStock = new BranchStock({
      branch: foundBranch._id,
      branch_code: realBranchCode,
      product_id: product._id,
      barcode: product.barcode || '',

      imei: product.imei || '',
      name: product.name || '',
      price: product.price || 0,
      cost: product.cost || 0,
      brand: product.brand || '',
      status: product.status || 'active',
      category: product.category || '',
      image: product.image || '',
      downAmount: product.downAmount || 0,
      downInstallmentCount: product.downInstallmentCount || 0,
      downInstallment: product.downInstallment || 0,
      creditThreshold: product.creditThreshold || 0,
      payUseInstallmentCount: product.payUseInstallmentCount || 0,
      payUseInstallment: product.payUseInstallment || 0,
      stock_value: 1,
      verified: false,
      updated_by: req.user ? req.user._id : null,
      last_updated: new Date(),
      poNumber: poNumberFromProduct,
      invoiceNumber: invoiceNumberFromProduct,
      documentNumber: documentNumberFromProduct,
      supplier: product.supplier,
      categoryGroup: product.categoryGroup || null
    });
    const savedBranchStock = await newBranchStock.save();
    io.emit('branchStock:created', {
      id: savedBranchStock._id.toString(),
      data: savedBranchStock
    });



    return res.json({
      success: true,
      message: 'ย้ายสินค้าไปสาขาและบันทึกประวัติเรียบร้อย',
      data: {
        productHistoryId: productHistory._id,
        branchStockId: savedBranchStock._id
      }
    });
  } catch (err) {
    console.error('transferProduct error:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error'
    });
  }
};

/**
 * PATCH /api/product/:id/update-from-po
 * อัปเดตข้อมูล categoryGroup, documentNumber และ taxType จาก PO ลงในสินค้า
 */
exports.updateProductFromPO = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;

    const product = await Product.findOne({
      _id: id,
      deleted_at: null
    }).populate('categoryGroup', 'name unitName');

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found or already deleted'
      });
    }

    if (!product.poNumber) {
      return res.status(400).json({
        success: false,
        error: 'Product does not have a PO number'
      });
    }

    // ค้นหา PO และข้อมูลที่เกี่ยวข้อง
    const po = await PurchaseOrder.findOne({ poNumber: product.poNumber })
      .populate('categoryGroup', 'name unitName')
      .lean();

    if (!po) {
      return res.status(404).json({
        success: false,
        error: 'Purchase Order not found'
      });
    }

    let updated = false;
    let updateLog = [];

    // อัปเดต categoryGroup จาก PO
    if (po.categoryGroup && (!product.categoryGroup || product.categoryGroup._id.toString() !== po.categoryGroup._id.toString())) {
      const oldCategoryGroup = product.categoryGroup ? product.categoryGroup.name : 'null';
      product.categoryGroup = po.categoryGroup._id;
      updated = true;
      updateLog.push(`categoryGroup: ${oldCategoryGroup} → ${po.categoryGroup.name}`);
    }

    // อัปเดต documentNumber จาก PO
    if (po.documentNumber && product.documentNumber !== po.documentNumber) {
      const oldDocumentNumber = product.documentNumber || 'null';
      product.documentNumber = po.documentNumber;
      updated = true;
      updateLog.push(`documentNumber: ${oldDocumentNumber} → ${po.documentNumber}`);
    }

    // อัปเดต taxType และ taxRate จาก PO items (หาจาก IMEI หรือใช้ item แรก)
    if (po.items && po.items.length > 0) {
      const matchedItem = po.items.find(item => item.imei === product.imei) || po.items[0];

      if (matchedItem.taxType && product.taxType !== matchedItem.taxType) {
        const oldTaxType = product.taxType || 'null';
        product.taxType = matchedItem.taxType;
        updated = true;
        updateLog.push(`taxType: ${oldTaxType} → ${matchedItem.taxType}`);
      }

      if (typeof matchedItem.taxRate === 'number' && product.taxRate !== matchedItem.taxRate) {
        const oldTaxRate = product.taxRate || 'null';
        product.taxRate = matchedItem.taxRate;
        updated = true;
        updateLog.push(`taxRate: ${oldTaxRate} → ${matchedItem.taxRate}`);
      }
    }

    if (!updated) {
      return res.json({
        success: true,
        message: 'No updates needed - product data is already synchronized with PO',
        data: product
      });
    }

    // บันทึกการเปลี่ยนแปลง
    const savedProduct = await product.save();

    // Emit Socket.IO event
    io.emit('product:updatedFromPO', {
      id: savedProduct._id.toString(),
      data: savedProduct,
      updateLog: updateLog
    });

    return res.json({
      success: true,
      message: `Updated product data from PO: ${updateLog.join(', ')}`,
      data: savedProduct,
      updateLog: updateLog
    });

  } catch (err) {
    console.error('updateProductFromPO error:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error'
    });
  }
};

/**
 * PATCH /api/product/batch-update-from-po
 * อัปเดตข้อมูลจาก PO หลายรายการพร้อมกัน (สำหรับ Auto Sync)
 */
exports.batchUpdateProductsFromPO = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { productIds, poNumber } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'productIds array is required'
      });
    }

    // ค้นหา PO
    const po = await PurchaseOrder.findOne({ poNumber })
      .populate('categoryGroup', 'name unitName')
      .lean();

    if (!po) {
      return res.status(404).json({
        success: false,
        error: 'Purchase Order not found'
      });
    }

    const updateResults = [];
    let totalUpdated = 0;
    let totalSkipped = 0;

    for (const productId of productIds) {
      try {
        const product = await Product.findOne({
          _id: productId,
          deleted_at: null
        }).populate('categoryGroup', 'name unitName');

        if (!product) {
          updateResults.push({
            productId,
            success: false,
            error: 'Product not found'
          });
          continue;
        }

        let updated = false;
        let updateLog = [];

        // อัปเดต categoryGroup จาก PO (เฉพาะที่ยังไม่มี)
        if (po.categoryGroup && !product.categoryGroup) {
          product.categoryGroup = po.categoryGroup._id;
          updated = true;
          updateLog.push(`categoryGroup: null → ${po.categoryGroup.name}`);
        }

        // อัปเดต documentNumber จาก PO
        if (po.documentNumber && product.documentNumber !== po.documentNumber) {
          const oldDocumentNumber = product.documentNumber || 'null';
          product.documentNumber = po.documentNumber;
          updated = true;
          updateLog.push(`documentNumber: ${oldDocumentNumber} → ${po.documentNumber}`);
        }

        // อัปเดต taxType และ taxRate จาก PO items
        if (po.items && po.items.length > 0) {
          const matchedItem = po.items.find(item => item.imei === product.imei) || po.items[0];

          if (matchedItem.taxType && product.taxType !== matchedItem.taxType) {
            const oldTaxType = product.taxType || 'null';
            product.taxType = matchedItem.taxType;
            updated = true;
            updateLog.push(`taxType: ${oldTaxType} → ${matchedItem.taxType}`);
          }

          if (typeof matchedItem.taxRate === 'number' && product.taxRate !== matchedItem.taxRate) {
            const oldTaxRate = product.taxRate || 'null';
            product.taxRate = matchedItem.taxRate;
            updated = true;
            updateLog.push(`taxRate: ${oldTaxRate} → ${matchedItem.taxRate}`);
          }
        }

        if (updated) {
          const savedProduct = await product.save();
          totalUpdated++;

          // Emit Socket.IO event สำหรับ auto sync
          io.emit('product:autoSyncedFromPO', {
            id: savedProduct._id.toString(),
            data: savedProduct,
            poNumber: poNumber,
            updateLog: updateLog
          });

          updateResults.push({
            productId,
            success: true,
            message: `Auto synced: ${updateLog.join(', ')}`,
            updateLog: updateLog
          });
        } else {
          totalSkipped++;
          updateResults.push({
            productId,
            success: true,
            message: 'Already synchronized - no update needed'
          });
        }

      } catch (err) {
        console.error(`Error auto syncing product ${productId}:`, err);
        updateResults.push({
          productId,
          success: false,
          error: err.message
        });
      }
    }

    // Log results สำหรับ auto sync
    if (totalUpdated > 0) {
      console.log(`Auto sync batch completed for PO ${poNumber}: ${totalUpdated} updated, ${totalSkipped} skipped`);
    }

    return res.json({
      success: true,
      message: `Auto sync completed for PO ${poNumber}. ${totalUpdated} products updated, ${totalSkipped} already synchronized.`,
      totalUpdated,
      totalSkipped,
      results: updateResults
    });

  } catch (err) {
    console.error('batchUpdateProductsFromPO (auto sync) error:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error'
    });
  }
};
