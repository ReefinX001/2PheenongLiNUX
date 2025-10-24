// controllers/customerController.js

const Customer = require('../../models/Customer/Customer');
const CashSale = require('../../models/POS/CashSale');
const InstallmentOrder = require('../../models/Installment/InstallmentOrder');
const { uploadToCloudinary, deleteFromCloudinary } = require('../../utils/cloudinary');
const ExcelJS = require('exceljs');

// ค้นหาลูกค้า
exports.searchCustomers = async (req, res) => {
  try {
    const { q, type, status, limit = 10 } = req.query;

    let query = { deleted_at: null };

    if (type) {
      query.customerType = type;
    }

    if (status) {
      query.status = status;
    }

    if (q) {
      const searchRegex = new RegExp(q, 'i');
      query.$or = [
        { 'individual.firstName': searchRegex },
        { 'individual.lastName': searchRegex },
        { 'individual.taxId': searchRegex },
        { 'individual.phone': searchRegex },
        { 'individual.email': searchRegex },
        { 'corporate.companyName': searchRegex },
        { 'corporate.companyTaxId': searchRegex },
        { 'corporate.corporatePhone': searchRegex },
        { 'corporate.contactPerson': searchRegex }
      ];
    }

    const customers = await Customer.find(query).lean()
      .select('customerType individual.prefix individual.firstName individual.lastName individual.taxId individual.phone corporate.companyName corporate.companyTaxId corporate.corporatePhone statistics.isNewCustomer')
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    // Format response
    const formattedCustomers = customers.map(customer => ({
      _id: customer._id,
      customerType: customer.customerType,
      displayName: customer.displayName,
      taxId: customer.customerType === 'individual' ? customer.individual.taxId : customer.corporate.companyTaxId,
      phone: customer.contactPhone,
      isNewCustomer: customer.statistics.isNewCustomer
    }));

    res.json({
      success: true,
      data: formattedCustomers,
      count: formattedCustomers.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการค้นหาลูกค้า',
      error: error.message
    });
  }
};

// Lookup ลูกค้าด้วย taxId หรือ phone
exports.lookupCustomer = async (req, res) => {
  try {
    const { identifier } = req.params;

    // ตรวจสอบว่าเป็น taxId (13 หลัก) หรือ phone
    const isTaxId = /^[0-9]{13}$/.test(identifier);
    const cleanIdentifier = identifier.replace(/-/g, '');

    let customer;
    if (isTaxId) {
      customer = await Customer.findOne({
        $or: [
          { 'individual.taxId': identifier },
          { 'corporate.companyTaxId': identifier }
        ],
        deleted_at: null
      });
    } else {
      // ค้นหาด้วยเบอร์โทร
      customer = await Customer.findOne({
        $or: [
          { 'individual.phone': new RegExp(cleanIdentifier) },
          { 'corporate.corporatePhone': new RegExp(cleanIdentifier) }
        ],
        deleted_at: null
      });
    }

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลลูกค้า',
        isNewCustomer: true
      });
    }

    // Get purchase summary
    const purchaseSummary = {
      totalPurchases: customer.statistics.totalPurchases,
      totalAmount: customer.statistics.totalAmount,
      lastPurchaseDate: customer.statistics.lastPurchaseDate,
      isNewCustomer: customer.statistics.isNewCustomer
    };

    res.json({
      success: true,
      data: {
        _id: customer._id,
        customerType: customer.customerType,
        displayName: customer.displayName,
        contactPhone: customer.contactPhone,
        contactEmail: customer.contactEmail,
        status: customer.status,
        ...purchaseSummary,
        creditInfo: {
          creditLimit: customer.installmentInfo.creditLimit,
          availableCredit: customer.installmentInfo.availableCredit,
          activeContracts: customer.installmentInfo.currentActiveContracts
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการค้นหาลูกค้า',
      error: error.message
    });
  }
};

// ตรวจสอบสถานะลูกค้า (ใหม่/เก่า)
exports.checkCustomerStatus = async (req, res) => {
  try {
    const { identifier } = req.params;

    // ค้นหาลูกค้า
    const customer = await Customer.findOne({
      $or: [
        { 'individual.taxId': identifier },
        { 'corporate.companyTaxId': identifier },
        { 'individual.phone': new RegExp(identifier.replace(/-/g, '')) },
        { 'corporate.corporatePhone': new RegExp(identifier.replace(/-/g, '')) }
      ],
      deleted_at: null
    }).select('statistics.isNewCustomer statistics.totalPurchases statistics.firstPurchaseDate statistics.lastPurchaseDate customerType');

    if (!customer) {
      return res.json({
        success: true,
        exists: false,
        isNewCustomer: true,
        message: 'ลูกค้าใหม่'
      });
    }

    res.json({
      success: true,
      exists: true,
      isNewCustomer: customer.statistics.isNewCustomer,
      customerInfo: {
        _id: customer._id,
        customerType: customer.customerType,
        totalPurchases: customer.statistics.totalPurchases,
        firstPurchaseDate: customer.statistics.firstPurchaseDate,
        lastPurchaseDate: customer.statistics.lastPurchaseDate,
        daysSinceLastPurchase: customer.statistics.lastPurchaseDate
          ? Math.floor((new Date() - new Date(customer.statistics.lastPurchaseDate)) / (1000 * 60 * 60 * 24))
          : null
      },
      message: customer.statistics.isNewCustomer ? 'ลูกค้าใหม่ (ยังไม่มีประวัติการซื้อ)' : 'ลูกค้าเก่า'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบสถานะลูกค้า',
      error: error.message
    });
  }
};

// Verify ลูกค้า (ตรวจสอบข้อมูลก่อนสร้างรายการขาย)
exports.verifyCustomer = async (req, res) => {
  try {
    const { taxId, phone, customerType } = req.body;

    if (!taxId && !phone) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุเลขประจำตัวผู้เสียภาษี หรือเบอร์โทรศัพท์'
      });
    }

    let query = { deleted_at: null };

    if (taxId) {
      if (customerType === 'individual') {
        query['individual.taxId'] = taxId;
      } else {
        query['corporate.companyTaxId'] = taxId;
      }
    }

    if (phone) {
      const cleanPhone = phone.replace(/-/g, '');
      if (customerType === 'individual') {
        query['individual.phone'] = new RegExp(cleanPhone);
      } else {
        query['corporate.corporatePhone'] = new RegExp(cleanPhone);
      }
    }

    const customer = await Customer.findOne(query).lean();

    if (!customer) {
      return res.json({
        success: true,
        exists: false,
        canProceed: true,
        message: 'ไม่พบข้อมูลลูกค้า สามารถสร้างลูกค้าใหม่ได้'
      });
    }

    // ตรวจสอบสถานะ
    if (customer.status === 'blacklisted') {
      return res.json({
        success: true,
        exists: true,
        canProceed: false,
        message: 'ลูกค้าถูกขึ้นบัญชีดำ ไม่สามารถทำรายการได้',
        customer: {
          _id: customer._id,
          displayName: customer.displayName,
          status: customer.status
        }
      });
    }

    // ✅ ระบบไม่มีการตรวจสอบวงเงิน - ตั้งให้ไม่จำกัด
    const availableCredit = 999999999;

    res.json({
      success: true,
      exists: true,
      canProceed: true,
      customer: {
        _id: customer._id,
        displayName: customer.displayName,
        customerType: customer.customerType,
        status: customer.status,
        isNewCustomer: customer.statistics.isNewCustomer,
        creditInfo: {
          creditLimit: customer.installmentInfo.creditLimit,
          availableCredit: availableCredit,
          activeContracts: customer.installmentInfo.currentActiveContracts
        },
        statistics: {
          totalPurchases: customer.statistics.totalPurchases,
          totalAmount: customer.statistics.totalAmount,
          lastPurchaseDate: customer.statistics.lastPurchaseDate
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูลลูกค้า',
      error: error.message
    });
  }
};

// Get all customers
exports.getAllCustomers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = '-createdAt',
      customerType,
      status,
      search
    } = req.query;

    const query = { deleted_at: null };

    if (customerType) {
      query.customerType = customerType;
    }

    if (status) {
      query.status = status;
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { 'individual.firstName': searchRegex },
        { 'individual.lastName': searchRegex },
        { 'corporate.companyName': searchRegex }
      ];
    }

    const skip = (page - 1) * limit;

    const [customers, total] = await Promise.all([
      Customer.find(query).lean()
        .skip(skip)
        .limit(parseInt(limit))
        .sort(sort),
      Customer.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: customers,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลลูกค้า',
      error: error.message
    });
  }
};

// Get customer by ID
exports.getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      deleted_at: null
    }).populate('createdBy updatedBy', 'name email');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลลูกค้า'
      });
    }

    res.json({
      success: true,
      data: customer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลลูกค้า',
      error: error.message
    });
  }
};

// Create customer
exports.createCustomer = async (req, res) => {
  try {
    const customerData = {
      ...req.body,
      createdBy: req.user._id
    };

    // ตรวจสอบข้อมูลซ้ำ
    const existingCustomer = await Customer.findOne({
      $or: [
        { 'individual.taxId': req.body.individual?.taxId },
        { 'corporate.companyTaxId': req.body.corporate?.companyTaxId }
      ].filter(condition =>
        (condition['individual.taxId'] && condition['individual.taxId'] !== '') ||
        (condition['corporate.companyTaxId'] && condition['corporate.companyTaxId'] !== '')
      ),
      deleted_at: null
    });

    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        message: 'พบข้อมูลลูกค้าที่มีเลขประจำตัวผู้เสียภาษีนี้แล้ว'
      });
    }

    const customer = new Customer(customerData);
    await customer.save();

    res.status(201).json({
      success: true,
      message: 'สร้างข้อมูลลูกค้าสำเร็จ',
      data: customer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างข้อมูลลูกค้า',
      error: error.message
    });
  }
};

// Update customer
exports.updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      deleted_at: null
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลลูกค้า'
      });
    }

    // Update fields
    Object.assign(customer, req.body);
    customer.updatedBy = req.user._id;

    await customer.save();

    res.json({
      success: true,
      message: 'อัพเดทข้อมูลลูกค้าสำเร็จ',
      data: customer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัพเดทข้อมูลลูกค้า',
      error: error.message
    });
  }
};

// Soft delete customer
exports.softDeleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id).lean();

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลลูกค้า'
      });
    }

    await customer.softDelete(req.user._id);

    res.json({
      success: true,
      message: 'ลบข้อมูลลูกค้าสำเร็จ'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบข้อมูลลูกค้า',
      error: error.message
    });
  }
};

// Restore customer
exports.restoreCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id).lean();

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลลูกค้า'
      });
    }

    await customer.restore();

    res.json({
      success: true,
      message: 'กู้คืนข้อมูลลูกค้าสำเร็จ',
      data: customer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการกู้คืนข้อมูลลูกค้า',
      error: error.message
    });
  }
};

// Get customer profile
exports.getCustomerProfile = async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      deleted_at: null
    })
    .populate('cashSales')
    .populate('installmentOrders');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลลูกค้า'
      });
    }

    const profile = {
      basicInfo: {
        _id: customer._id,
        customerType: customer.customerType,
        displayName: customer.displayName,
        contactPhone: customer.contactPhone,
        contactEmail: customer.contactEmail,
        status: customer.status,
        createdAt: customer.createdAt
      },
      statistics: customer.statistics,
      creditInfo: {
        creditScore: customer.creditScore,
        creditLimit: customer.installmentInfo.creditLimit,
        availableCredit: customer.installmentInfo.availableCredit,
        activeContracts: customer.installmentInfo.currentActiveContracts
      },
      loyaltyInfo: {
        points: customer.loyaltyPoints
      },
      recentTransactions: [
        ...customer.cashSales.slice(0, 5),
        ...customer.installmentOrders.slice(0, 5)
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5)
    };

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลโปรไฟล์ลูกค้า',
      error: error.message
    });
  }
};

// Get purchase history
exports.getPurchaseHistory = async (req, res) => {
  try {
    const { startDate, endDate, type, page = 1, limit = 10 } = req.query;

    const customer = await Customer.findOne({
      _id: req.params.id,
      deleted_at: null
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลลูกค้า'
      });
    }

    let history = customer.purchaseHistory;

    // Filter by date
    if (startDate || endDate) {
      history = history.filter(item => {
        const purchaseDate = new Date(item.purchaseDate);
        if (startDate && purchaseDate < new Date(startDate)) return false;
        if (endDate && purchaseDate > new Date(endDate)) return false;
        return true;
      });
    }

    // Filter by type
    if (type) {
      history = history.filter(item => item.type === type);
    }

    // Sort by date (newest first)
    history.sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate));

    // Pagination
    const skip = (page - 1) * limit;
    const paginatedHistory = history.slice(skip, skip + parseInt(limit));

    res.json({
      success: true,
      data: paginatedHistory,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(history.length / limit),
        total: history.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงประวัติการซื้อ',
      error: error.message
    });
  }
};

// Get installment info
exports.getInstallmentInfo = async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      deleted_at: null
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลลูกค้า'
      });
    }

    // Get active installment orders
    const activeOrders = await InstallmentOrder.find({
      customer: customer._id,
      status: { $in: ['approved', 'active'] },
      deleted_at: null
    }).select('contractNo totalPrice planType installmentMonths currentInstallment status');

    res.json({
      success: true,
      data: {
        installmentInfo: customer.installmentInfo,
        activeOrders: activeOrders,
        summary: {
          totalContracts: activeOrders.length,
          totalOutstanding: customer.installmentInfo.totalCreditAmount - customer.installmentInfo.totalPaidAmount,
          availableCredit: customer.installmentInfo.availableCredit,
          creditUtilization: customer.installmentInfo.creditLimit > 0
            ? ((customer.installmentInfo.totalCreditAmount - customer.installmentInfo.totalPaidAmount) / customer.installmentInfo.creditLimit) * 100
            : 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการผ่อนชำระ',
      error: error.message
    });
  }
};

// Get customer statistics
exports.getCustomerStatistics = async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      deleted_at: null
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลลูกค้า'
      });
    }

    res.json({
      success: true,
      data: customer.statistics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงสถิติลูกค้า',
      error: error.message
    });
  }
};

// Update customer statistics
exports.updateCustomerStatistics = async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      deleted_at: null
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลลูกค้า'
      });
    }

    await customer.updateStatistics();
    await customer.save();

    res.json({
      success: true,
      message: 'อัพเดทสถิติลูกค้าสำเร็จ',
      data: customer.statistics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัพเดทสถิติลูกค้า',
      error: error.message
    });
  }
};

// Additional methods for documents, notes, tags, credit, loyalty, bulk operations, and reports
// would continue here...

// Upload customer documents
exports.uploadCustomerDocuments = async (req, res) => {
  try {
    const { id } = req.params;
    const { documentType, description } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาเลือกไฟล์ที่ต้องการอัพโหลด'
      });
    }

    const customer = await Customer.findOne({
      _id: id,
      deleted_at: null
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลลูกค้า'
      });
    }

    // อัพโหลดไฟล์ทั้งหมดไปยัง Cloudinary
    const uploadPromises = req.files.map(file =>
      uploadToCloudinary(file, `customers/${id}/documents`)
    );

    const uploadedFiles = await Promise.all(uploadPromises);

    // เตรียมข้อมูลเอกสารสำหรับบันทึกในฐานข้อมูล
    const documents = uploadedFiles.map((file, index) => ({
      type: documentType || 'other',
      fileName: req.files[index].originalname,
      fileUrl: file.url,
      publicId: file.publicId,
      fileSize: file.size,
      fileFormat: file.format,
      description: description,
      uploadedAt: new Date(),
      uploadedBy: req.user._id
    }));

    // เพิ่มเอกสารในข้อมูลลูกค้า
    if (!customer.documents) {
      customer.documents = [];
    }
    customer.documents.push(...documents);

    await customer.save();

    res.json({
      success: true,
      message: 'อัพโหลดเอกสารสำเร็จ',
      data: documents
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัพโหลดเอกสาร',
      error: error.message
    });
  }
};

// Delete customer document
exports.deleteCustomerDocument = async (req, res) => {
  try {
    const { id, documentId } = req.params;

    const customer = await Customer.findOne({
      _id: id,
      deleted_at: null
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลลูกค้า'
      });
    }

    // หาเอกสารที่ต้องการลบ
    const documentIndex = customer.documents.findIndex(
      doc => doc._id.toString() === documentId
    );

    if (documentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบเอกสารที่ต้องการลบ'
      });
    }

    const document = customer.documents[documentIndex];

    // ลบไฟล์จาก Cloudinary
    if (document.publicId) {
      await deleteFromCloudinary(document.publicId);
    }

    // ลบเอกสารออกจาก array
    customer.documents.splice(documentIndex, 1);
    await customer.save();

    res.json({
      success: true,
      message: 'ลบเอกสารสำเร็จ'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบเอกสาร',
      error: error.message
    });
  }
};

// Get customer documents
exports.getCustomerDocuments = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query;

    const customer = await Customer.findOne({
      _id: id,
      deleted_at: null
    }).select('documents');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลลูกค้า'
      });
    }

    let documents = customer.documents || [];

    // กรองตามประเภทถ้ามีการระบุ
    if (type) {
      documents = documents.filter(doc => doc.type === type);
    }

    res.json({
      success: true,
      data: documents,
      count: documents.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงรายการเอกสาร',
      error: error.message
    });
  }
};

// Upload customer profile image
exports.uploadCustomerProfileImage = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาเลือกไฟล์รูปภาพ'
      });
    }

    const customer = await Customer.findOne({
      _id: id,
      deleted_at: null
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลลูกค้า'
      });
    }

    // ลบรูปเก่าถ้ามี
    if (customer.profileImage?.publicId) {
      await deleteFromCloudinary(customer.profileImage.publicId);
    }

    // อัพโหลดรูปใหม่
    const result = await uploadToCloudinary(req.file, `customers/${id}/profile`);

    // อัพเดทข้อมูลรูปโปรไฟล์
    customer.profileImage = {
      url: result.url,
      publicId: result.publicId,
      uploadedAt: new Date()
    };

    await customer.save();

    res.json({
      success: true,
      message: 'อัพโหลดรูปโปรไฟล์สำเร็จ',
      data: {
        profileImage: customer.profileImage
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัพโหลดรูปโปรไฟล์',
      error: error.message
    });
  }
};

// Export customers to Excel (อันนี้ไม่ใช้ Cloudinary แต่ใช้ ExcelJS ที่คุณ import ไว้แล้ว)
exports.exportCustomersToExcel = async (req, res) => {
  try {
    const { customerType, status, startDate, endDate } = req.query;

    let query = { deleted_at: null };

    if (customerType) {
      query.customerType = customerType;
    }

    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const customers = await Customer.find(query).lean().sort({ createdAt: -1 });

    // สร้าง workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('รายชื่อลูกค้า');

    // กำหนดหัวตาราง
    worksheet.columns = [
      { header: 'รหัสลูกค้า', key: '_id', width: 15 },
      { header: 'ประเภท', key: 'customerType', width: 10 },
      { header: 'ชื่อ-นามสกุล/บริษัท', key: 'displayName', width: 30 },
      { header: 'เลขประจำตัวผู้เสียภาษี', key: 'taxId', width: 20 },
      { header: 'เบอร์โทร', key: 'phone', width: 15 },
      { header: 'อีเมล', key: 'email', width: 25 },
      { header: 'สถานะ', key: 'status', width: 10 },
      { header: 'ยอดซื้อรวม', key: 'totalAmount', width: 15 },
      { header: 'จำนวนครั้งที่ซื้อ', key: 'totalPurchases', width: 15 },
      { header: 'วันที่สมัคร', key: 'createdAt', width: 15 }
    ];

    // เพิ่มข้อมูล
    customers.forEach(customer => {
      worksheet.addRow({
        _id: customer._id,
        customerType: customer.customerType === 'individual' ? 'บุคคล' : 'นิติบุคคล',
        displayName: customer.displayName,
        taxId: customer.customerType === 'individual'
          ? customer.individual?.taxId
          : customer.corporate?.companyTaxId,
        phone: customer.contactPhone,
        email: customer.contactEmail,
        status: customer.status === 'active' ? 'ใช้งาน' : customer.status,
        totalAmount: customer.statistics?.totalAmount || 0,
        totalPurchases: customer.statistics?.totalPurchases || 0,
        createdAt: customer.createdAt
      });
    });

    // จัดรูปแบบ
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // ส่งไฟล์
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=customers_${new Date().toISOString().split('T')[0]}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการส่งออกข้อมูล',
      error: error.message
    });
  }
};

// Get customer's cash sales by phone or taxId
exports.getCustomerCashSalesByIdentifier = async (req, res) => {
  try {
    const { identifier } = req.params;
    const { page = 1, limit = 10, startDate, endDate } = req.query;

    // สร้าง query สำหรับค้นหาด้วย phone หรือ taxId
    const query = {
      $or: [
        { 'individual.phone': identifier },
        { 'individual.taxId': identifier },
        { 'corporate.corporatePhone': identifier },
        { 'corporate.companyTaxId': identifier }
      ]
    };

    // กรองตามวันที่
    if (startDate || endDate) {
      query.soldAt = {};
      if (startDate) query.soldAt.$gte = new Date(startDate);
      if (endDate) query.soldAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    // ดึงข้อมูลพร้อม pagination
    const [cashSales, total] = await Promise.all([
      CashSale.find(query).lean()
        .populate('salesperson', 'name email')
        .sort({ soldAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      CashSale.countDocuments(query)
    ]);

    // จัดกลุ่มตามประเภทลูกค้า
    const groupedSales = {
      individual: cashSales.filter(sale => sale.customerType === 'individual'),
      corporate: cashSales.filter(sale => sale.customerType === 'corporate')
    };

    res.json({
      success: true,
      data: cashSales,
      grouped: groupedSales,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการขายเงินสด',
      error: error.message
    });
  }
};

// Create cash sale and link to customer
exports.createCashSaleForCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    const saleData = req.body;

    // ดึงข้อมูลลูกค้า
    const customer = await Customer.findOne({
      _id: customerId,
      deleted_at: null
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลลูกค้า'
      });
    }

    // ตรวจสอบสถานะลูกค้า
    if (customer.status === 'blacklisted') {
      return res.status(400).json({
        success: false,
        message: 'ไม่สามารถทำรายการได้ ลูกค้าถูกขึ้นบัญชีดำ'
      });
    }

    // สร้างข้อมูล cash sale ตามประเภทลูกค้า
    const cashSaleData = {
      customerType: customer.customerType,
      salesperson: req.user._id,
      invoiceNo: saleData.invoiceNo,
      soldAt: saleData.soldAt || new Date()
    };

    // คัดลอกข้อมูลลูกค้าตามประเภท
    if (customer.customerType === 'individual') {
      cashSaleData.individual = {
        prefix: customer.individual.prefix,
        firstName: customer.individual.firstName,
        lastName: customer.individual.lastName,
        phone: customer.individual.phone,
        address: customer.individual.address,
        taxId: customer.individual.taxId
      };
    } else {
      cashSaleData.corporate = {
        companyName: customer.corporate.companyName,
        companyTaxId: customer.corporate.companyTaxId,
        contactPerson: customer.corporate.contactPerson,
        corporatePhone: customer.corporate.corporatePhone,
        companyAddress: customer.corporate.companyAddress
      };
    }

    // สร้าง cash sale
    const cashSale = new CashSale(cashSaleData);
    await cashSale.save();

    // อัพเดทประวัติการซื้อของลูกค้า
    if (!customer.purchaseHistory) {
      customer.purchaseHistory = [];
    }

    customer.purchaseHistory.push({
      type: 'cash',
      referenceId: cashSale._id,
      referenceNo: cashSale.invoiceNo,
      purchaseDate: cashSale.soldAt,
      amount: saleData.totalAmount || 0 // ถ้ามีข้อมูลยอดเงิน
    });

    // อัพเดทสถิติลูกค้า
    customer.statistics.totalPurchases += 1;
    customer.statistics.totalAmount += saleData.totalAmount || 0;
    customer.statistics.lastPurchaseDate = cashSale.soldAt;

    if (customer.statistics.isNewCustomer) {
      customer.statistics.isNewCustomer = false;
      customer.statistics.firstPurchaseDate = cashSale.soldAt;
    }

    await customer.save();

    res.status(201).json({
      success: true,
      message: 'บันทึกการขายเงินสดสำเร็จ',
      data: {
        cashSale,
        customer: {
          _id: customer._id,
          displayName: customer.displayName,
          statistics: customer.statistics
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการบันทึกการขายเงินสด',
      error: error.message
    });
  }
};

// Link existing cash sale to customer
exports.linkCashSaleToCustomer = async (req, res) => {
  try {
    const { customerId, cashSaleId } = req.params;

    // ตรวจสอบลูกค้า
    const customer = await Customer.findOne({
      _id: customerId,
      deleted_at: null
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลลูกค้า'
      });
    }

    // ตรวจสอบ cash sale
    const cashSale = await CashSale.findById(cashSaleId).lean();

    if (!cashSale) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลการขายเงินสด'
      });
    }

    // ตรวจสอบว่าข้อมูลตรงกันหรือไม่
    let isMatched = false;

    if (customer.customerType === 'individual' && cashSale.customerType === 'individual') {
      isMatched = cashSale.individual.taxId === customer.individual.taxId ||
                  cashSale.individual.phone === customer.individual.phone;
    } else if (customer.customerType === 'corporate' && cashSale.customerType === 'corporate') {
      isMatched = cashSale.corporate.companyTaxId === customer.corporate.companyTaxId ||
                  cashSale.corporate.corporatePhone === customer.corporate.corporatePhone;
    }

    if (!isMatched) {
      return res.status(400).json({
        success: false,
        message: 'ข้อมูลลูกค้าไม่ตรงกับข้อมูลในใบเสร็จ'
      });
    }

    // เพิ่มประวัติการซื้อ
    const existingPurchase = customer.purchaseHistory.find(
      p => p.referenceId?.toString() === cashSaleId
    );

    if (existingPurchase) {
      return res.status(400).json({
        success: false,
        message: 'รายการนี้ถูกเชื่อมโยงกับลูกค้าแล้ว'
      });
    }

    customer.purchaseHistory.push({
      type: 'cash',
      referenceId: cashSale._id,
      referenceNo: cashSale.invoiceNo,
      purchaseDate: cashSale.soldAt,
      amount: req.body.amount || 0
    });

    // อัพเดทสถิติ
    await customer.updateStatistics();
    await customer.save();

    res.json({
      success: true,
      message: 'เชื่อมโยงการขายเงินสดกับลูกค้าสำเร็จ',
      data: {
        customer: {
          _id: customer._id,
          displayName: customer.displayName
        },
        cashSale: {
          _id: cashSale._id,
          invoiceNo: cashSale.invoiceNo,
          soldAt: cashSale.soldAt
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการเชื่อมโยงข้อมูล',
      error: error.message
    });
  }
};

// Get cash sales summary by customer type
exports.getCashSalesSummaryByType = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateQuery = {};
    if (startDate || endDate) {
      dateQuery.soldAt = {};
      if (startDate) dateQuery.soldAt.$gte = new Date(startDate);
      if (endDate) dateQuery.soldAt.$lte = new Date(endDate);
    }

    // สรุปตามประเภทลูกค้า
    const summary = await CashSale.aggregate([
      { $match: dateQuery },
      {
        $group: {
          _id: '$customerType',
          totalSales: { $sum: 1 },
          uniqueCustomers: {
            $addToSet: {
              $cond: [
                { $eq: ['$customerType', 'individual'] },
                '$individual.taxId',
                '$corporate.companyTaxId'
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          totalSales: 1,
          uniqueCustomersCount: { $size: '$uniqueCustomers' }
        }
      }
    ]);

    // สรุปรายเดือน
    const monthlySummary = await CashSale.aggregate([
      { $match: dateQuery },
      {
        $group: {
          _id: {
            year: { $year: '$soldAt' },
            month: { $month: '$soldAt' },
            type: '$customerType'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': -1, '_id.month': -1 }
      }
    ]);

    // Top salesperson
    const topSalesperson = await CashSale.aggregate([
      { $match: dateQuery },
      {
        $group: {
          _id: '$salesperson',
          totalSales: { $sum: 1 }
        }
      },
      {
        $sort: { totalSales: -1 }
      },
      {
        $limit: 10
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'salespersonInfo'
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        summary,
        monthlySummary,
        topSalesperson,
        period: {
          startDate: startDate || 'all time',
          endDate: endDate || 'present'
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงสรุปยอดขาย',
      error: error.message
    });
  }
};

// Search duplicate customers in cash sales
exports.findDuplicateCustomersInCashSales = async (req, res) => {
  try {
    // หาลูกค้าที่ซ้ำกันจาก taxId
    const duplicatesByTaxId = await CashSale.aggregate([
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$customerType', 'individual'] },
              '$individual.taxId',
              '$corporate.companyTaxId'
            ]
          },
          customerType: { $first: '$customerType' },
          count: { $sum: 1 },
          records: {
            $push: {
              _id: '$_id',
              invoiceNo: '$invoiceNo',
              soldAt: '$soldAt',
              name: {
                $cond: [
                  { $eq: ['$customerType', 'individual'] },
                  { $concat: ['$individual.firstName', ' ', '$individual.lastName'] },
                  '$corporate.companyName'
                ]
              }
            }
          }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // หาลูกค้าที่ซ้ำกันจาก phone
    const duplicatesByPhone = await CashSale.aggregate([
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$customerType', 'individual'] },
              '$individual.phone',
              '$corporate.corporatePhone'
            ]
          },
          customerType: { $first: '$customerType' },
          count: { $sum: 1 },
          records: {
            $push: {
              _id: '$_id',
              invoiceNo: '$invoiceNo',
              soldAt: '$soldAt'
            }
          }
        }
      },
      {
        $match: {
          count: { $gt: 1 },
          _id: { $ne: null }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        duplicatesByTaxId,
        duplicatesByPhone,
        summary: {
          totalDuplicateTaxIds: duplicatesByTaxId.length,
          totalDuplicatePhones: duplicatesByPhone.length
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการค้นหาลูกค้าที่ซ้ำกัน',
      error: error.message
    });
  }
};

// Update credit limit for customer
exports.updateCreditLimit = async (req, res) => {
  try {
    const { id } = req.params;
    const { creditLimit, reason, notes } = req.body;

    // Validate input
    if (typeof creditLimit !== 'number' || creditLimit < 0) {
      return res.status(400).json({
        success: false,
        message: 'วงเงินต้องเป็นตัวเลขและมากกว่าหรือเท่ากับ 0'
      });
    }

    const customer = await Customer.findOne({
      _id: id,
      deleted_at: null
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลลูกค้า'
      });
    }

    // เก็บข้อมูลเก่าเพื่อบันทึกประวัติ
    const oldCreditLimit = customer.installmentInfo.creditLimit || 0;

    // อัพเดทวงเงิน
    customer.installmentInfo.creditLimit = creditLimit;
    customer.calculateAvailableCredit(); // คำนวณวงเงินที่ใช้ได้ใหม่

    // เพิ่มหมายเหตุการเปลี่ยนแปลง
    if (!customer.notes) {
      customer.notes = [];
    }

    customer.notes.push({
      text: `เปลี่ยนวงเงินจาก ${oldCreditLimit.toLocaleString()} เป็น ${creditLimit.toLocaleString()} บาท${reason ? ` - เหตุผล: ${reason}` : ''}${notes ? ` - หมายเหตุ: ${notes}` : ''}`,
      createdBy: req.user._id,
      createdAt: new Date()
    });

    customer.updatedBy = req.user._id;
    await customer.save();

    res.json({
      success: true,
      message: 'อัพเดทวงเงินสำเร็จ',
      data: {
        customerId: customer._id,
        displayName: customer.displayName,
        oldCreditLimit,
        newCreditLimit: creditLimit,
        availableCredit: customer.installmentInfo.availableCredit,
        currentActiveContracts: customer.installmentInfo.currentActiveContracts,
        totalCreditAmount: customer.installmentInfo.totalCreditAmount,
        totalPaidAmount: customer.installmentInfo.totalPaidAmount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัพเดทวงเงิน',
      error: error.message
    });
  }
};

// Get credit info for customer
exports.getCreditInfo = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findOne({
      _id: id,
      deleted_at: null
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลลูกค้า'
      });
    }

    // คำนวณวงเงินใหม่
    const availableCredit = customer.calculateAvailableCredit();

    // ดึงสัญญาที่ยังใช้งานอยู่
    const activeContracts = await InstallmentOrder.find({
      customer: customer._id,
      status: { $in: ['ongoing', 'active', 'approved'] },
      deleted_at: null
    }).select('contractNo totalAmount paidAmount planType createdAt');

    res.json({
      success: true,
      data: {
        customerId: customer._id,
        displayName: customer.displayName,
        creditInfo: {
          creditLimit: customer.installmentInfo.creditLimit,
          totalCreditAmount: customer.installmentInfo.totalCreditAmount,
          totalPaidAmount: customer.installmentInfo.totalPaidAmount,
          availableCredit: availableCredit,
          usedCredit: (customer.installmentInfo.totalCreditAmount || 0) - (customer.installmentInfo.totalPaidAmount || 0),
          currentActiveContracts: customer.installmentInfo.currentActiveContracts,
          creditUtilization: customer.installmentInfo.creditLimit > 0
            ? (((customer.installmentInfo.totalCreditAmount || 0) - (customer.installmentInfo.totalPaidAmount || 0)) / customer.installmentInfo.creditLimit) * 100
            : 0
        },
        activeContracts: activeContracts,
        statistics: {
          totalPurchases: customer.statistics.totalPurchases,
          totalAmount: customer.statistics.totalAmount,
          isNewCustomer: customer.statistics.isNewCustomer,
          lastPurchaseDate: customer.statistics.lastPurchaseDate
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลเครดิต',
      error: error.message
    });
  }
};

// Update loyalty points for customer
exports.updateLoyaltyPoints = async (req, res) => {
  try {
    const { id } = req.params;
    const { points, reason, type = 'manual' } = req.body;

    if (typeof points !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'แต้มต้องเป็นตัวเลข'
      });
    }

    const customer = await Customer.findOne({
      _id: id,
      deleted_at: null
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลลูกค้า'
      });
    }

    const oldPoints = customer.loyaltyPoints || 0;
    const newPoints = Math.max(0, oldPoints + points);

    customer.loyaltyPoints = newPoints;

    // เพิ่มหมายเหตุ
    if (!customer.notes) {
      customer.notes = [];
    }

    customer.notes.push({
      text: `${points > 0 ? 'เพิ่ม' : 'หัก'}แต้มสะสม ${Math.abs(points)} แต้ม (${oldPoints} → ${newPoints})${reason ? ` - ${reason}` : ''}`,
      createdBy: req.user._id,
      createdAt: new Date()
    });

    customer.updatedBy = req.user._id;
    await customer.save();

    res.json({
      success: true,
      message: 'อัพเดทแต้มสะสมสำเร็จ',
      data: {
        customerId: customer._id,
        displayName: customer.displayName,
        oldPoints,
        newPoints,
        pointsChanged: points
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัพเดทแต้มสะสม',
      error: error.message
    });
  }
};

// Get loyalty points for customer
exports.getLoyaltyPoints = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findOne({
      _id: id,
      deleted_at: null
    }).select('loyaltyPoints individual.firstName individual.lastName corporate.companyName');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลลูกค้า'
      });
    }

    res.json({
      success: true,
      data: {
        customerId: customer._id,
        displayName: customer.displayName,
        loyaltyPoints: customer.loyaltyPoints || 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลแต้มสะสม',
      error: error.message
    });
  }
};

module.exports = exports;
