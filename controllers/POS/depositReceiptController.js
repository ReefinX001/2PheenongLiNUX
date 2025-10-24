// controllers/depositReceiptController.js
const DepositReceipt = require('../../models/POS/DepositReceipt');
const Customer = require('../../models/Customer/Customer');
const BranchStock = require('../../models/POS/BranchStock');

// ฟังก์ชันสร้างเลขที่ใบรับเงินมัดจำ
async function getNextReceiptNumber() {
  try {
    const today = new Date();
    // ใช้ปี พ.ศ. (เพิ่ม 543)
    const year = (today.getFullYear() + 543).toString().slice(-2); // เอาแค่ 2 หลัก เช่น 68
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');

    // รูปแบบใหม่: DR-680818-001
    const datePrefix = `DR-${year}${month}${day}-`;

    // หาเลขที่ใบรับล่าสุดของวันนี้
    const lastReceipt = await DepositReceipt.findOne({
      receiptNumber: { $regex: `^DR-${year}${month}${day}-` }
    }).sort({ receiptNumber: -1 });

    let sequence = 1;
    if (lastReceipt) {
      // ดึงเลขลำดับจากส่วนท้าย เช่น DR-680818-001 -> 001
      const parts = lastReceipt.receiptNumber.split('-');
      if (parts.length === 3) {
        const lastSequence = parseInt(parts[2]);
        if (!isNaN(lastSequence)) {
          sequence = lastSequence + 1;
        }
      }
    }

    return `${datePrefix}${sequence.toString().padStart(3, '0')}`;
  } catch (error) {
    console.error('Error generating receipt number:', error);
    const timestamp = Date.now().toString().slice(-6);
    return `DR${timestamp}`;
  }
}

// สร้างใบรับเงินมัดจำใหม่ (POST /api/deposit-receipts)
exports.createDepositReceipt = async (req, res) => {
  const io = req.app.get('io');
  try {
    const {
      // รองรับ field names จาก deposits.html
      receiptNumber,
      receiptDate,
      customerId,
      productId,
      depositAmount,
      paymentMethod,
      notes,
      branchId
    } = req.body;

    console.log('📝 Creating deposit receipt with data:', req.body);

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!receiptDate || !depositAmount || depositAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'กรุณากรอกวันที่และจำนวนเงินมัดจำ'
      });
    }

    // สร้างเลขที่ใบรับหากไม่มี
    const finalReceiptNumber = receiptNumber || await getNextReceiptNumber();

    // ตรวจสอบเลขที่ใบรับซ้ำ
    const existingReceipt = await DepositReceipt.findOne({ receiptNumber: finalReceiptNumber });
    if (existingReceipt) {
      return res.status(400).json({
        success: false,
        error: 'เลขที่ใบรับเงินมัดจำนี้มีอยู่แล้ว'
      });
    }

    // ดึงข้อมูลลูกค้า
    let customerData = {};
    if (customerId) {
      const customer = await Customer.findById(customerId).lean();
      if (customer) {
        if (customer.customerType === 'individual') {
          customerData = {
            customerId: customer._id,
            customerName: `${customer.individual?.firstName || ''} ${customer.individual?.lastName || ''}`.trim(),
            customerAddress: customer.individual?.address || '',
            customerPhone: customer.individual?.phone || '',
            customerTaxId: customer.individual?.taxId || ''
          };
        } else {
          customerData = {
            customerId: customer._id,
            customerName: customer.corporate?.companyName || '',
            customerAddress: customer.corporate?.companyAddress || '',
            customerPhone: customer.corporate?.corporatePhone || '',
            customerTaxId: customer.corporate?.companyTaxId || ''
          };
        }
      }
    }

    // ดึงข้อมูลสินค้า
    let productData = {};
    if (productId) {
      const product = await BranchStock.findById(productId).lean();
      if (product) {
        productData = {
          productId: product._id,
          productName: product.name,
          productPrice: product.price || 0
        };
      }
    }

    // สร้าง deposit receipt
    const depositReceiptData = {
      receiptNumber: finalReceiptNumber,
      receiptDate: new Date(receiptDate),
      depositType: 'preorder',
      ...customerData,
      ...productData,
      purchaseType: 'cash',
      subtotal: productData.productPrice || depositAmount, // ใช้ราคาสินค้าเป็น subtotal
      depositAmount: depositAmount, // จำนวนเงินมัดจำที่จ่ายจริง
      totalAmount: productData.productPrice || depositAmount, // ราคาสินค้าทั้งหมด (ไม่ใช่เงินมัดจำ)
      paymentType: paymentMethod || 'cash',
      paymentDate: new Date(receiptDate),
      paymentAmount: depositAmount, // จำนวนเงินที่ชำระ (เงินมัดจำ)
      status: 'active',
      createdBy: req.user?.id || req.user?._id,
      branch_code: branchId || req.user?.branch || 'PATTANI',
      notes: notes || ''
    };

    const newReceipt = new DepositReceipt(depositReceiptData);
    const createdReceipt = await newReceipt.save();

    // ส่ง Socket.IO event
    if (io) {
      io.emit('newreceiptCreated', {
        id: createdReceipt._id,
        data: createdReceipt
      });
    }

    console.log('✅ Deposit receipt created successfully:', createdReceipt._id);

    return res.status(201).json({
      success: true,
      data: createdReceipt,
      message: 'สร้างใบรับเงินมัดจำเรียบร้อย',
    });
  } catch (err) {
    console.error('❌ Error creating deposit receipt:', err);
    return res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการสร้างใบรับเงินมัดจำ: ' + err.message
    });
  }
};

// ดึงใบรับเงินมัดจำทั้งหมด (GET /api/deposit-receipts)
exports.getAllDepositReceipts = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      status,
      branchCode,
      branchId,
      search,
      page = 1,
      limit = 50
    } = req.query;

    console.log('🔍 Getting deposit receipts with filters:', req.query);

    // สร้าง filter
    const filter = {};

    // กรองตามวันที่ - รองรับทั้ง receiptDate และ depositDate
    if (startDate || endDate) {
      const dateFilter = {};
      if (startDate) {
        dateFilter.$gte = new Date(startDate);
      }
      if (endDate) {
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999);
        dateFilter.$lte = endDateObj;
      }
      // ค้นหาจากทั้ง receiptDate และ depositDate
      filter.$or = [
        { receiptDate: dateFilter },
        { depositDate: dateFilter }
      ];
    }

    // กรองตามสถานะ
    if (status && status !== 'all') {
      filter.status = status;
    }

    // กรองตามสาขา - รองรับทั้ง branchCode และ branchId
    const finalBranchCode = branchCode || branchId;
    if (finalBranchCode && finalBranchCode !== 'all') {
      filter.branch_code = finalBranchCode;
    }

    // กรองตามการค้นหา
    if (search) {
      const searchFilter = [
        { receiptNumber: { $regex: search, $options: 'i' } },
        { documentNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { productName: { $regex: search, $options: 'i' } },
        { productBrand: { $regex: search, $options: 'i' } },
        { productModel: { $regex: search, $options: 'i' } }
      ];

      if (filter.$or) {
        // ถ้ามี date filter แล้ว ให้รวมกับ search filter
        filter.$and = [
          { $or: filter.$or },
          { $or: searchFilter }
        ];
        delete filter.$or;
      } else {
        filter.$or = searchFilter;
      }
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const receipts = await DepositReceipt.find(filter)
      .populate('customerId', 'individual corporate customerType')
      .populate('productId', 'name price model brand')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await DepositReceipt.countDocuments(filter);

    // แปลงข้อมูลให้ตรงกับรูปแบบที่ frontend คาดหวัง
    const processedReceipts = receipts.map(receipt => {
      return {
        id: receipt.receiptNumber || receipt._id.toString(),
        documentNumber: receipt.documentNumber || receipt.receiptNumber,
        receiptNumber: receipt.receiptNumber,
        branchCode: receipt.branch_code || '00000',
        branchName: receipt.branchName || 'สำนักงานใหญ่',
        depositType: receipt.depositType || 'preorder',
        saleType: receipt.saleType || receipt.purchaseType || 'cash',
        depositDate: receipt.depositDate || receipt.receiptDate,

        // ข้อมูลลูกค้า
        customer: {
          name: receipt.customerName || 'ไม่ระบุ',
          address: receipt.customerAddress || '',
          phone: receipt.customerPhone || '',
          taxId: receipt.customerTaxId || ''
        },

        // ข้อมูลพนักงานขาย
        salesperson: {
          id: receipt.createdBy || '',
          name: receipt.salespersonName || 'ไม่ระบุ'
        },

        // ข้อมูลสินค้า
        product: {
          id: receipt.productId || '',
          name: receipt.productName || 'ไม่ระบุ',
          brand: receipt.productBrand || '',
          model: receipt.productModel || '',
          imei: receipt.productIMEI || '',
          price: receipt.productPrice || 0,
          downAmount: receipt.downAmount || 0,
          downInstallment: receipt.downInstallment || 0,
          downInstallmentCount: receipt.downInstallmentCount || 0,
          image: receipt.productImage || '',
          inStock: receipt.inStock || false,
          isPreorder: receipt.isPreorder || false
        },

        // ข้อมูลจำนวนเงิน
        amounts: {
          totalAmount: receipt.totalAmount || receipt.productPrice || 0, // ราคาสินค้าทั้งหมด
          depositAmount: receipt.depositAmount || 0, // จำนวนเงินมัดจำที่จ่าย
          remainingAmount: (receipt.totalAmount || receipt.productPrice || 0) - (receipt.depositAmount || 0), // ยอดคงเหลือ
          shippingCost: receipt.shippingCost || 0
        },

        // สถานะ
        status: receipt.status || 'pending',

        // ข้อมูลเวลา
        createdAt: receipt.createdAt,
        updatedAt: receipt.updatedAt
      };
    });

    console.log(`✅ Found ${total} deposit receipts, returning ${processedReceipts.length} items`);

    return res.json({
      success: true,
      data: processedReceipts,
      totalCount: total,
      limit: parseInt(limit),
      offset: skip,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (err) {
    console.error('❌ Error getting deposit receipts:', err);
    return res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลใบรับเงินมัดจำ: ' + err.message
    });
  }
};

// ดึงใบรับเงินมัดจำตาม ID (GET /api/deposit-receipts/:id)
exports.getDepositReceiptById = async (req, res) => {
  try {
    const { id } = req.params;

    const receipt = await DepositReceipt.findById(id)
      .populate('customerId', 'individual corporate customerType')
      .populate('productId', 'name price model brand')
      .populate('createdBy', 'name email')
      .lean();

    if (!receipt) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบใบรับเงินมัดจำ'
      });
    }

    return res.json({
      success: true,
      data: receipt
    });
  } catch (err) {
    console.error('❌ Error getting deposit receipt by ID:', err);
    return res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูล: ' + err.message
    });
  }
};

// อัปเดตใบรับเงินมัดจำ (PUT /api/deposit-receipts/:id)
exports.updateDepositReceipt = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const updateData = req.body;

    // ลบ fields ที่ไม่ควรอัปเดต
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    const updatedReceipt = await DepositReceipt.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedReceipt) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบใบรับเงินมัดจำ'
      });
    }

    // ส่ง Socket.IO event
    if (io) {
      io.emit('depositreceiptUpdated', {
        id: updatedReceipt._id,
        data: updatedReceipt
      });
    }

    return res.json({
      success: true,
      data: updatedReceipt,
      message: 'อัปเดตใบรับเงินมัดจำเรียบร้อย'
    });
  } catch (err) {
    console.error('❌ Error updating deposit receipt:', err);
    return res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล: ' + err.message
    });
  }
};

// ลบใบรับเงินมัดจำ (DELETE /api/deposit-receipts/:id)
exports.deleteDepositReceipt = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;

    const receipt = await DepositReceipt.findById(id);
    if (!receipt) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบใบรับเงินมัดจำ'
      });
    }

    // ตรวจสอบว่าสามารถลบได้หรือไม่
    if (receipt.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'ไม่สามารถลบใบรับเงินมัดจำที่เสร็จสิ้นแล้ว'
      });
    }

    const deletedReceipt = await DepositReceipt.findByIdAndDelete(id);

    // ส่ง Socket.IO event
    if (io) {
      io.emit('depositreceiptDeleted', {
        id: deletedReceipt._id,
        data: deletedReceipt
      });
    }

    console.log('✅ Deposit receipt deleted successfully:', id);

    return res.json({
      success: true,
      data: deletedReceipt,
      message: 'ลบใบรับเงินมัดจำเรียบร้อย'
    });
  } catch (err) {
    console.error('❌ Error deleting deposit receipt:', err);
    return res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการลบข้อมูล: ' + err.message
    });
  }
};

// ดาวน์โหลดใบรับเงินมัดจำ PDF (GET /api/deposit-receipts/:id/pdf)
exports.downloadDepositReceiptPdf = async (req, res) => {
  try {
    const { id } = req.params;

    const receipt = await DepositReceipt.findById(id)
      .populate('customerId', 'individual corporate customerType')
      .populate('productId', 'name price model brand')
      .lean();

    if (!receipt) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบใบรับเงินมัดจำ'
      });
    }

    // สำหรับตอนนี้ให้ redirect ไปยัง print view
    // ในอนาคตสามารถสร้าง PDF จริงได้
    const printUrl = `/loan/deposits/${id}/print`;
    return res.redirect(printUrl);

  } catch (err) {
    console.error('❌ Error generating PDF:', err);
    return res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการสร้าง PDF: ' + err.message
    });
  }
};
