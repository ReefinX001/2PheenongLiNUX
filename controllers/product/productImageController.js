const ProductImage = require('../models/Stock/ProductImage');

// GET /api/product-image
exports.getAllImages = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const productImages = await ProductImage.find().lean()
      .populate('boxsetProducts', 'name image price')
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await ProductImage.countDocuments();

    res.status(200).json({
      status: 'success',
      data: productImages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

// POST /api/product-image
exports.createImage = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { name, brand, productType, boxsetType, payoffDiscount, stockType } = req.body;

    // อ่าน purchaseType มาจาก body (อาจเป็น string หรือ array)
    let { purchaseType } = req.body;
    if (!purchaseType) {
      return res.status(400).json({
        status: 'fail',
        message: 'กรุณาเลือกประเภทการซื้ออย่างน้อยหนึ่งแบบ',
      });
    }
    // ให้แน่ใจว่าเป็น array เสมอ
    if (!Array.isArray(purchaseType)) {
      purchaseType = [purchaseType];
    }

    // สร้างข้อมูลสำหรับบันทึก
    const createData = {
      name,
      brand,
      purchaseType,
      productType: productType || 'mobile', // default เป็น mobile
      stockType: stockType || 'imei' // default เป็น imei
    };

    // ตรวจสอบ image requirement ตาม productType
    if (productType === 'mobile' || productType === 'accessory' || productType === 'gift' || !productType) {
  // ถ้าเป็น mobile, accessory หรือ gift ต้องมีไฟล์ภาพ
  if (!req.file) {
    return res.status(400).json({
      status: 'fail',
      message: `กรุณาเลือกไฟล์ภาพสำหรับสินค้าประเภท ${productType || 'mobile'}`,
    });
  }
  createData.image = req.file.path;
} else if (productType === 'boxset') {
      // ถ้าเป็น boxset อาจมีหรือไม่มีรูปก็ได้
      if (req.file) {
        createData.image = req.file.path;
      }
      // ต้องมี boxsetType
      if (!boxsetType) {
        return res.status(400).json({
          status: 'fail',
          message: 'กรุณาระบุประเภท boxset (normal/special/payoff)',
        });
      }
      createData.boxsetType = boxsetType;

      // ถ้าเป็น payoff boxset และมี discount
      if (boxsetType === 'payoff' && payoffDiscount) {
        createData.payoffDiscount = payoffDiscount;
      }
    }

    // สร้างใน DB
    const newProductImage = await ProductImage.create(createData);

    io.emit('productimageCreated', {
      id: newProductImage._id,
      data: newProductImage
    });

    return res.status(201).json({
      status: 'success',
      data: newProductImage,
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message,
    });
  }
};

// เพิ่มฟังก์ชันสำหรับสร้าง Boxset
exports.createBoxset = async (req, res) => {
  const io = req.app.get('io');

  // ⭐ เพิ่ม debug logs
  // console.log('=== Boxset Request Debug ===');
  // console.log('Headers:', req.headers['content-type']);
  // console.log('Body:', req.body);
  // console.log('File:', req.file);
  // console.log('==========================');

  try {
    let { name, boxsetType, products, price, purchaseType, payoffDiscount } = req.body;

    // ตรวจสอบว่า products เป็น string (จาก FormData) หรือ array
    if (typeof products === 'string') {
      try {
        products = JSON.parse(products);
      } catch (e) {
        // console.log('Failed to parse products:', e);
      }
    }

    // ถ้าเป็น products[] จาก FormData
    if (req.body['products[]']) {
      products = Array.isArray(req.body['products[]'])
        ? req.body['products[]']
        : [req.body['products[]']];
    }

    // ⭐ Debug หลัง process
    // console.log('Processed - Name:', name);
    // console.log('Processed - Products:', products);

    // Validate
    if (!name || !products || products.length === 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'กรุณากรอกข้อมูลให้ครบถ้วน (name และ products)',
      });
    }

    // ตรวจสอบว่า products ที่ส่งมาเป็น array ของ ObjectId ที่ valid
    const validProducts = [];
    for (const productId of products) {
      const product = await ProductImage.findById(productId).lean();
      if (!product) {
        return res.status(400).json({
          status: 'fail',
          message: `ไม่พบสินค้า ID: ${productId}`,
        });
      }
      if (product.productType === 'boxset') {
        return res.status(400).json({
          status: 'fail',
          message: 'ไม่สามารถใส่ boxset ใน boxset ได้',
        });
      }
      validProducts.push(productId);
    }

    // ให้แน่ใจว่า purchaseType เป็น array
    let purchaseTypeArray = purchaseType;
    if (!Array.isArray(purchaseTypeArray)) {
      purchaseTypeArray = purchaseTypeArray ? [purchaseTypeArray] : ['cash', 'installment'];
    }

    // สร้างข้อมูล Boxset
    const boxsetData = {
      name,
      productType: 'boxset',
      boxsetType: boxsetType || 'normal',
      price: price || 0,
      purchaseType: purchaseTypeArray,
      boxsetProducts: validProducts
    };

    // เพิ่มรูปถ้ามี
    if (req.file) {
      boxsetData.image = req.file.path;
    }

    // เพิ่ม payoffDiscount ถ้าเป็น payoff boxset
    if (boxsetType === 'payoff' && payoffDiscount) {
      boxsetData.payoffDiscount = payoffDiscount;
    }

    // สร้าง Boxset
    const newBoxset = await ProductImage.create(boxsetData);

    // Populate ข้อมูลสินค้าใน boxset ก่อนส่งกลับ
    const populatedBoxset = await ProductImage.findById(newBoxset._id).lean().populate('boxsetProducts');

    io.emit('productimageCreated', {
      id: populatedBoxset._id,
      data: populatedBoxset
    });

    return res.status(201).json({
      status: 'success',
      data: populatedBoxset,
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message,
    });
  }
};

// GET /api/product-image/boxset/:id/details
exports.getBoxsetDetails = async (req, res) => {
  try {
    const boxsetId = req.params.id;

    // ค้นหา boxset และ populate ข้อมูลสินค้าใน boxset
    const boxset = await ProductImage.findById(boxsetId).lean()
      .populate({
        path: 'boxsetProducts',
        select: 'name price image brand productType'
      });

    if (!boxset) {
      return res.status(404).json({
        status: 'fail',
        message: 'ไม่พบ Boxset ที่ระบุ'
      });
    }

    // ตรวจสอบว่าเป็น boxset จริงหรือไม่
    if (boxset.productType !== 'boxset') {
      return res.status(400).json({
        status: 'fail',
        message: 'สินค้านี้ไม่ใช่ Boxset'
      });
    }

    res.status(200).json({
      status: 'success',
      data: boxset
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

exports.getPricingAll = async (req, res, next) => {
  try {
    // เพิ่ม payoffDiscount ในฟิลด์
    const data = await ProductImage.find({}, [
      'name',
      'price',
      'downAmount',
      'downInstallmentCount',
      'downInstallment',
      'creditThreshold',
      'payUseInstallmentCount',
      'payUseInstallment',
      'pricePayOff',
      'docFee',
      'productType',
      'boxsetType',
      'purchaseType',
      'boxsetProducts',
      'payoffDiscount'  // เพิ่มฟิลด์นี้
    ]).populate('boxsetProducts', 'name price');

    res.json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
};

// GET /api/product-image/pricing/installment
// เฉพาะผ่อน
exports.getPricingInstallment = async (req, res) => {
  try {
    // ใช้ $in operator เพราะ purchaseType เป็น array
    const images = await ProductImage.find({
      purchaseType: { $in: ['installment'] }
    }).populate('boxsetProducts', 'name price');

    res.json({ status: 'success', data: images });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// GET /api/product-image/pricing/cash
// เฉพาะสด
exports.getPricingCash = async (req, res) => {
  try {
    // ใช้ $in operator เพราะ purchaseType เป็น array
    const images = await ProductImage.find({
      purchaseType: { $in: ['cash'] }
    }).populate('boxsetProducts', 'name price');

    res.json({ status: 'success', data: images });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// GET /api/product-image/:id
exports.getImageById = async (req, res) => {
  try {
    const productImage = await ProductImage.findById(req.params.id).lean().populate('boxsetProducts');
    if (!productImage) {
      return res.status(404).json({
        status: 'fail',
        message: 'ไม่พบข้อมูล product image ที่มี ID นี้',
      });
    }
    res.status(200).json({
      status: 'success',
      data: productImage,
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message,
    });
  }
};

// GET /api/product-image/name/:name
exports.getImagesByName = async (req, res) => {
  try {
    const { name } = req.params;
    const images = await ProductImage.find({ name }).lean().populate('boxsetProducts');
    res.status(200).json({ status: 'success', data: images });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

// PATCH /api/product-image/:id
exports.updateImage = async (req, res) => {
  const io = req.app.get('io');
  try {
    const updateFields = {};
    const unsetFields = {};
    const { name, brand, productType, boxsetType, boxsetProducts, payoffDiscount, stockType } = req.body;

    if (name !== undefined) updateFields.name = name;
    if (brand !== undefined) updateFields.brand = brand;
    if (stockType !== undefined) updateFields.stockType = stockType;

    // จัดการ productType และ fields ที่เกี่ยวข้อง
    if (productType !== undefined) {
  updateFields.productType = productType;

  if (productType === 'mobile' || productType === 'accessory' || productType === 'gift') {
    // ถ้าเปลี่ยนเป็น mobile/accessory/gift ให้ลบ boxset fields
    unsetFields.boxsetType = 1;
    unsetFields.boxsetProducts = 1;
    unsetFields.payoffDiscount = 1;
  } else if (productType === 'boxset') {
        // ถ้าเป็น boxset ต้องมี boxsetType
        if (boxsetType !== undefined) {
          updateFields.boxsetType = boxsetType;

          // ถ้าเป็น payoff boxset
          if (boxsetType === 'payoff' && payoffDiscount !== undefined) {
            updateFields.payoffDiscount = payoffDiscount;
          } else if (boxsetType !== 'payoff') {
            // ถ้าไม่ใช่ payoff ให้ลบ payoffDiscount
            unsetFields.payoffDiscount = 1;
          }
        }
        // อัพเดต boxsetProducts ถ้ามี
        if (boxsetProducts !== undefined) {
          // Validate products
          for (const productId of boxsetProducts) {
            const product = await ProductImage.findById(productId).lean();
            if (!product) {
              return res.status(400).json({
                status: 'fail',
                message: `ไม่พบสินค้า ID: ${productId}`,
              });
            }
            if (product.productType === 'boxset') {
              return res.status(400).json({
                status: 'fail',
                message: 'ไม่สามารถใส่ boxset ใน boxset ได้',
              });
            }
          }
          updateFields.boxsetProducts = boxsetProducts;
        }
      }
    }

    // ถ้าใน body มี purchaseType ให้ปรับเป็น array
    if (req.body.purchaseType !== undefined) {
      let { purchaseType } = req.body;
      if (!Array.isArray(purchaseType)) {
        purchaseType = [purchaseType];
      }
      updateFields.purchaseType = purchaseType;
    }

    // ถ้ามีไฟล์ อัปเดตรูป
    if (req.file) {
      updateFields.image = req.file.path;
    }

    // รวม update และ unset operations
    const updateOperation = { $set: updateFields };
    if (Object.keys(unsetFields).length > 0) {
      updateOperation.$unset = unsetFields;
    }

    const productImage = await ProductImage.findByIdAndUpdate(
      req.params.id,
      updateOperation,
      { new: true, runValidators: true }
    ).populate('boxsetProducts');

    if (!productImage) {
      return res.status(404).json({
        status: 'fail',
        message: 'ไม่พบข้อมูล product image ที่มี ID นี้',
      });
    }

    io.emit('productimageUpdated', {
      id: productImage._id,
      data: productImage
    });

    res.status(200).json({
      status: 'success',
      data: productImage,
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message,
    });
  }
};

// DELETE /api/product-image/:id
exports.deleteImage = async (req, res) => {
  const io = req.app.get('io');
  try {
    // ตรวจสอบว่าไม่มี boxset ที่ใช้สินค้านี้อยู่
    const boxsetsUsingThis = await ProductImage.find({
      productType: 'boxset',
      boxsetProducts: req.params.id
    });

    if (boxsetsUsingThis.length > 0) {
      const boxsetNames = boxsetsUsingThis.map(b => b.name).join(', ');
      return res.status(400).json({
        status: 'fail',
        message: `ไม่สามารถลบได้ เนื่องจากสินค้านี้ถูกใช้ใน boxset: ${boxsetNames}`,
      });
    }

    const productImage = await ProductImage.findByIdAndDelete(req.params.id);
    if (!productImage) {
      return res.status(404).json({
        status: 'fail',
        message: 'ไม่พบข้อมูล product image ที่มี ID นี้',
      });
    }

    io.emit('productimageDeleted', {
      id: req.params.id,
      data: productImage
    });

    res.status(200).json({
      status: 'success',
      message: 'ลบข้อมูลสินค้าเรียบร้อย',
      data: null,
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message,
    });
  }
};

// GET /api/product-image/pricing[?type=installment|cash]
exports.getPricingData = async (req, res) => {
  try {
    const { type } = req.query;

    // สร้าง filter
    const filter = {};
    if (type) {
      // ใช้ $in operator เพราะ purchaseType เป็น array
      filter.purchaseType = { $in: [type] };
    }

    // เพิ่ม payoffDiscount ในฟิลด์
    const fields = [
      'name',
      'image',
      'price',
      'downAmount',
      'downInstallmentCount',
      'downInstallment',
      'creditThreshold',
      'payUseInstallmentCount',
      'payUseInstallment',
      'pricePayOff',
      'docFee',
      'purchaseType',
      'productType',
      'boxsetType',
      'boxsetProducts',
      'payoffDiscount'  // เพิ่มฟิลด์นี้
    ].join(' ');

    // เรียกหาใน DB พร้อม populate
    const productImages = await ProductImage
      .find(filter, fields).lean()
      .populate('boxsetProducts', 'name price')
      .sort({ createdAt: -1 });

    res.status(200).json({ status: 'success', data: productImages });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

// PATCH /api/product-image/price/name/:productName
exports.updatePriceByName = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { productName } = req.params;
    const {
      price,
      downAmount,
      downInstallmentCount,
      downInstallment,
      creditThreshold,
      payUseInstallmentCount,
      payUseInstallment,
      pricePayOff,
      docFee,
      payoffDiscount  // เพิ่มฟิลด์นี้
    } = req.body;

    const updateData = {};
    if (price !== undefined) updateData.price = price;
    if (downAmount !== undefined) updateData.downAmount = downAmount;
    if (downInstallmentCount !== undefined) updateData.downInstallmentCount = downInstallmentCount;
    if (downInstallment !== undefined) updateData.downInstallment = downInstallment;
    if (creditThreshold !== undefined) updateData.creditThreshold = creditThreshold;
    if (payUseInstallmentCount !== undefined) updateData.payUseInstallmentCount = payUseInstallmentCount;
    if (payUseInstallment !== undefined) updateData.payUseInstallment = payUseInstallment;
    if (pricePayOff !== undefined) updateData.pricePayOff = pricePayOff;
    if (docFee !== undefined) updateData.docFee = docFee;
    if (payoffDiscount !== undefined) updateData.payoffDiscount = payoffDiscount;  // เพิ่มบรรทัดนี้

    const updatedProduct = await ProductImage.findOneAndUpdate(
      { name: productName },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({
        status: 'fail',
        message: 'ไม่พบสินค้าที่มีชื่อ: ' + productName,
      });
    }

    io.emit('productimageUpdated', {
      id: updatedProduct._id,
      data: updatedProduct
    });

    return res.status(200).json({
      status: 'success',
      data: updatedProduct,
    });
  } catch (err) {
    return res.status(400).json({
      status: 'fail',
      message: err.message,
    });
  }
};
