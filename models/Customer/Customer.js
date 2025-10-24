// models/Customer/Customer.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const customerSchema = new Schema({
  customerType: {
    type: String,
    required: true,
    enum: ['individual', 'corporate']
  },

  // ข้อมูลบุคคลธรรมดา
  individual: {
    prefix: {
      type: String,
      enum: ['นาย', 'นาง', 'นางสาว', 'อื่นๆ']
      // ไม่ใช้ default เพื่อให้ user เลือกเอง
    },
    firstName: {
      type: String,
      trim: true
    },
    lastName: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: function(v) {
          return !v || /^[0-9]{9,10}$/.test(v.replace(/-/g, ''));
        },
        message: 'Invalid phone number format'
      }
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: function(v) {
          return !v || /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v);
        },
        message: 'Invalid email format'
      }
    },
    birthDate: {
      type: Date,
      validate: {
        validator: function(v) {
          if (!v) return true; // Allow null/undefined
          const today = new Date();
          const minDate = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate());
          const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
          return v >= minDate && v <= maxDate;
        },
        message: 'Birth date must be valid and customer must be at least 18 years old'
      }
    },
    age: {
      type: Number,
      min: 0,
      max: 150,
      validate: {
        validator: function(v) {
          return v == null || (Number.isInteger(v) && v >= 0 && v <= 150);
        },
        message: 'Age must be a valid number between 0 and 150'
      }
    },
    gender: {
      type: String,
      enum: ['ชาย', 'หญิง', 'ไม่ระบุ', 'อื่นๆ', null],
      default: null,
      trim: true
    },
    address: {
      houseNo: String,
      moo: String,
      subDistrict: String,
      district: String,
      province: String,
      zipcode: {
        type: String,
        validate: {
          validator: function(v) {
            return !v || /^[0-9]{5}$/.test(v);
          },
          message: 'Zipcode must be 5 digits'
        }
      },
      // เพิ่มฟิลด์สำหรับ address string รวม
      fullAddress: String
    },
    // ที่อยู่ที่สามารถติดต่อได้
    contactAddress: {
      // ใช้ที่อยู่ปัจจุบันหรือไม่
      useSameAddress: {
        type: Boolean,
        default: false
      },
      houseNo: String,
      moo: String,
      lane: String,
      road: String,
      subDistrict: String,
      district: String,
      province: String,
      zipcode: {
        type: String,
        validate: {
          validator: function(v) {
            return !v || /^[0-9]{5}$/.test(v);
          },
          message: 'Zipcode must be 5 digits'
        }
      },
      // เพิ่มฟิลด์สำหรับ contact address string รวม
      fullAddress: String
    },
    // เพิ่มข้อมูลติดต่อสังคมออนไลน์
    socialContact: {
      facebook: String,
      line: String,
      mapLocation: String
    },
    // ข้อมูลพยาน
    witness: {
      name: String,
      idCard: String,
      phone: String,
      relation: String
    },
    taxId: {
      type: String,
      unique: true,
      sparse: true,
      validate: {
        validator: function(v) {
          return !v || /^[0-9]{13}$/.test(v);
        },
        message: 'Tax ID must be 13 digits'
      }
    },
    // ข้อมูลอาชีพ - ระบบครอบคลุมอาชีพทั่วไปในประเทศไทย
    occupation: {
      category: {
        type: String,
        enum: [
          'รับราชการ',
          'พนักงานบริษัทเอกชน',
          'ข้าราชการครู',
          'แพทย์',
          'พยาบาล',
          'วิศวกร',
          'ทนายความ',
          'นักบัญชี',
          'ธุรกิจส่วนตัว',
          'เกษตรกร',
          'ค้าขาย',
          'ช่างเทคนิค',
          'คนขับรถ',
          'ป้องกันและรักษาความปลอดภัย',
          'พนักงานธนาคาร',
          'นักการเงิน',
          'ครูอาชีวะ',
          'อาจารย์มหาวิทยาลัย',
          'นักวิจัย',
          'นักข่าว',
          'ช่างภาพ',
          'นักออกแบบ',
          'ช่างตัดผม',
          'ช่างซ่อมรถ',
          'ช่างไฟฟ้า',
          'ช่างประปา',
          'ช่างก่อสร้าง',
          'นักดนตรี',
          'นักแสดง',
          'นักเขียน',
          'นักกีฬา',
          'พ่อครัว/แม่ครัว',
          'พนักงานเสิร์ฟ',
          'พนักงานขาย',
          'พนักงานต้อนรับ',
          'เจ้าหน้าที่โรงแรม',
          'ไกด์นำเที่ยว',
          'นักท่องเที่ยว',
          'นวดแผนไทย',
          'หมอตำแย',
          'ยาม',
          'คนขับแท็กซี่',
          'คนขับรถตู้',
          'คนขับมอเตอร์ไซค์รับจ้าง',
          'แรงงานก่อสร้าง',
          'แม่บ้าน',
          'พี่เลี้ยงเด็ก',
          'คนสวน',
          'เลี้ยงสัตว์',
          'ประมง',
          'ปศุสัตว์',
          'เจ้าของกิจการ',
          'ผู้บริหาร',
          'ที่ปรึกษา',
          'นักวิเคราะห์',
          'โปรแกรมเมอร์',
          'ผู้ดูแลระบบ',
          'นักการตลาด',
          'เซลล์',
          'ตัวแทนขาย',
          'นายหน้า',
          'เจ้าหน้าที่บัญชี',
          'เจ้าหน้าที่การเงิน',
          'เจ้าหน้าที่HR',
          'เลขานุการ',
          'แคชเชียร์',
          'พนักงานคลังสินค้า',
          'คนส่งของ',
          'พนักงานทำความสะอาด',
          'นักเรียน',
          'นักศึกษา',
          'เกษียณอายุ',
          'ว่างงาน',
          'ธุรกิจออนไลน์',
          'อื่นๆ',
          '' // Allow empty for backward compatibility
        ],
        default: ''
      },
      subcategory: {
        type: String,
        default: ''
      },
      workplace: {
        type: String,
        trim: true,
        default: ''
      },
      workAddress: {
        type: String,
        trim: true,
        default: ''
      },
      position: {
        type: String,
        trim: true,
        default: ''
      },
      workExperience: {
        type: Number,
        min: 0,
        default: 0
      },
      monthlyIncome: {
        type: Number,
        min: 0,
        default: 0
      },
      // สำหรับเก็บข้อมูลเดิมที่เป็น string (backward compatibility)
      legacyOccupationText: {
        type: String,
        default: ''
      },
      // ข้อมูลเพิ่มเติมสำหรับอาชีพ "อื่นๆ"
      otherOccupationDetail: {
        type: String,
        trim: true,
        default: ''
      }
    },
    // ข้อมูลรายได้เดิม (เก็บไว้เพื่อ backward compatibility)
    income: {
      type: Number,
      min: 0,
      default: 0
    }
  },

  // ข้อมูลนิติบุคคล
  corporate: {
    companyName: {
      type: String,
      trim: true
    },
    companyTaxId: {
      type: String,
      unique: true,
      sparse: true,
      validate: {
        validator: function(v) {
          return !v || /^[0-9]{13}$/.test(v);
        },
        message: 'Company Tax ID must be 13 digits'
      }
    },
    contactPerson: {
      type: String,
      trim: true
    },
    corporatePhone: {
      type: String,
      trim: true
    },
    corporateEmail: {
      type: String,
      trim: true,
      lowercase: true
    },
    companyAddress: {
      type: String,
      trim: true
    }
  },

  // ประวัติการซื้อ
  purchaseHistory: [{
    type: {
      type: String,
      enum: ['cash_sale', 'installment_new', 'installment_pickup', 'installment_ongoing'],
      required: true
    },
    orderId: {
      type: Schema.Types.ObjectId,
      required: true
    },
    orderModel: {
      type: String,
      enum: ['CashSale', 'InstallmentOrder', 'InvoiceReceipt'],
      required: true
    },
    purchaseDate: {
      type: Date,
      default: Date.now
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    branchCode: String,
    contractNo: String,  // สำหรับผ่อน
    planType: String,    // สำหรับผ่อน (plan1, plan2, plan3)

    // เพิ่มข้อมูลรายละเอียดตามประเภท
    saleDetails: {
      pickupMethod: String,     // store, online
      deliveryStatus: String,   // delivered, pending, cancelled
      completionDate: Date,     // วันที่รับของ (สำหรับ pickup)
      usageStatus: String      // active, completed, terminated (สำหรับ ongoing)
    },

    items: [{
      productId: {
        type: Schema.Types.ObjectId,
        ref: 'Product'
      },
      name: String,
      imei: String,            // เพิ่ม IMEI
      qty: {
        type: Number,
        min: 1
      },
      unitPrice: {
        type: Number,
        min: 0
      },
      totalPrice: {
        type: Number,
        min: 0
      },
      // เพิ่มข้อมูลผ่อน
      downPayment: Number,
      installmentAmount: Number,
      installmentTerms: Number
    }]
  }],

  // ข้อมูลการผ่อนชำระ
  installmentInfo: {
    paymentPlans: [{
      type: String,
      enum: ['plan1', 'plan2', 'plan3', 'manual', 'custom', '3m', '6m', '9m', '12m', '18m', '24m'] // ← เพิ่ม plan1,2,3, manual และ custom
    }],
    totalCreditAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    totalPaidAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    currentActiveContracts: {
      type: Number,
      default: 0,
      min: 0
    },
    creditLimit: {
      type: Number,
      default: 0,
      min: 0
    },
    availableCredit: {
      type: Number,
      default: 0,
      min: 0
    }
  },

  // เอกสารแนบ
  documents: {
    idCardImage: String,
    idCardExpiry: Date,
    incomeSlip: String,
    incomeSlipDate: Date,
    selfieImage: String,
    customerSignature: String,
    employeeSignature: String,
    authorizedSignature: String,
    otherDocuments: [{
      name: String,
      url: String,
      uploadedAt: Date
    }]
  },

  // สถิติและข้อมูลเสริม - ปรับปรุงให้แยกตามประเภท
  statistics: {
    // สถิติรวม
    totalPurchases: {
      type: Number,
      default: 0,
      min: 0
    },
    totalAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    isNewCustomer: {
      type: Boolean,
      default: true
    },
    firstPurchaseDate: Date,
    lastPurchaseDate: Date,
    averageOrderValue: {
      type: Number,
      default: 0,
      min: 0
    },

    // สถิติขายสด
    cashSales: {
      totalTransactions: { type: Number, default: 0 },
      totalAmount: { type: Number, default: 0 },
      lastCashSaleDate: Date,
      favoriteProducts: [String]  // รายการสินค้าที่ซื้อบ่อย
    },

    // สถิติผ่อนใหม่
    installmentNew: {
      totalContracts: { type: Number, default: 0 },
      totalAmount: { type: Number, default: 0 },
      lastInstallmentDate: Date,
      activeContracts: { type: Number, default: 0 },
      completedContracts: { type: Number, default: 0 },
      favoriteProducts: [String]
    },

    // สถิติผ่อนหมดรับของ
    installmentPickup: {
      totalPickups: { type: Number, default: 0 },
      totalAmount: { type: Number, default: 0 },
      lastPickupDate: Date,
      pendingPickups: { type: Number, default: 0 },
      completedPickups: { type: Number, default: 0 },
      favoriteProducts: [String]
    },

    // สถิติผ่อนไปใช้ไป
    installmentOngoing: {
      totalOngoing: { type: Number, default: 0 },
      totalAmount: { type: Number, default: 0 },
      lastOngoingDate: Date,
      activeOngoing: { type: Number, default: 0 },
      completedOngoing: { type: Number, default: 0 },
      favoriteProducts: [String]
    }
  },

  // สถานะและข้อมูลเพิ่มเติม
  status: {
    type: String,
    enum: ['active', 'inactive', 'blacklisted'],
    default: 'active'
  },

  // แต้มสะสม / เครดิตคงเหลือ
  loyaltyPoints: {
    type: Number,
    default: 0,
    min: 0
  },

  creditScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 1000
  },

  // หมายเหตุและ tags
  notes: [{
    text: String,
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  tags: [{
    type: String,
    trim: true
  }],

  // ข้อมูลการสร้างและแก้ไข
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },

  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },

  // Soft delete
  deleted_by: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  deleted_at: {
    type: Date,
    default: null
  }
}, {
  collection: 'tb_customers',
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
// Note: individual.taxId and corporate.companyTaxId indexes are automatically created by 'unique: true'
customerSchema.index({ 'individual.phone': 1 });
customerSchema.index({ 'corporate.corporatePhone': 1 });
customerSchema.index({ 'individual.email': 1 });
customerSchema.index({ 'corporate.corporateEmail': 1 });
customerSchema.index({ customerType: 1, status: 1 });
customerSchema.index({ createdAt: -1 });
customerSchema.index({ 'statistics.lastPurchaseDate': -1 });
customerSchema.index({ deleted_at: 1 });

// Virtual fields
customerSchema.virtual('fullName').get(function() {
  if (this.customerType === 'individual') {
    const prefix = this.individual.prefix || '';
    const firstName = this.individual.firstName || '';
    const lastName = this.individual.lastName || '';
    return `${prefix} ${firstName} ${lastName}`.trim();
  }
  return this.corporate.companyName || '';
});

customerSchema.virtual('displayName').get(function() {
  if (this.customerType === 'individual') {
    return this.fullName;
  }
  return this.corporate.companyName || '';
});

customerSchema.virtual('contactPhone').get(function() {
  if (this.customerType === 'individual') {
    return this.individual.phone;
  }
  return this.corporate.corporatePhone;
});

customerSchema.virtual('contactEmail').get(function() {
  if (this.customerType === 'individual') {
    return this.individual.email;
  }
  return this.corporate.corporateEmail;
});

// Virtual relations - แก้ไขตรงนี้
customerSchema.virtual('cashSales', {
  ref: 'CashSale',
  localField: '_id',
  foreignField: 'customer',
  match: { deleted_at: null }
});

customerSchema.virtual('installmentOrders', {
  ref: 'InstallmentOrder',
  localField: '_id',
  foreignField: 'customer', // ← กลับมาใช้ 'customer' เพราะเราเปลี่ยน InstallmentOrder แล้ว
  match: { deleted_at: null }
});

// Methods
customerSchema.methods.softDelete = function(userId) {
  this.deleted_at = new Date();
  this.deleted_by = userId;
  return this.save();
};

customerSchema.methods.restore = function() {
  this.deleted_at = null;
  this.deleted_by = null;
  return this.save();
};

// ✅ Helper method สำหรับ clean legacy data
customerSchema.methods.cleanLegacyData = function() {
  if (this.purchaseHistory && Array.isArray(this.purchaseHistory)) {
    this.purchaseHistory.forEach(p => {
      if (p.type === 'cash') p.type = 'cash_sale';
      if (p.type === 'installment') p.type = 'installment_new';
    });
  }
};

// เพิ่ม method สำหรับบันทึกประวัติการซื้อ (ไม่เรียก save() เพื่อป้องกัน version conflict)
customerSchema.methods.addPurchaseHistory = function(purchaseData) {
  // ✅ Clean existing purchaseHistory data ก่อน (แก้ปัญหา legacy data)
  this.cleanLegacyData();

  // เพิ่มรายการใหม่
  this.purchaseHistory.push(purchaseData);

  // อัพเดทสถิติรวม
  this.statistics.totalPurchases += 1;
  this.statistics.totalAmount += purchaseData.amount;
  this.statistics.lastPurchaseDate = purchaseData.purchaseDate || new Date();

  if (this.statistics.isNewCustomer) {
    this.statistics.isNewCustomer = false;
    this.statistics.firstPurchaseDate = this.statistics.lastPurchaseDate;
  }

  this.statistics.averageOrderValue = this.statistics.totalAmount / this.statistics.totalPurchases;

  // อัพเดทสถิติแยกตามประเภท
  switch (purchaseData.type) {
    case 'cash_sale':
      this.statistics.cashSales.totalTransactions += 1;
      this.statistics.cashSales.totalAmount += purchaseData.amount;
      this.statistics.cashSales.lastCashSaleDate = purchaseData.purchaseDate;
      break;

    case 'installment_new':
      this.statistics.installmentNew.totalContracts += 1;
      this.statistics.installmentNew.totalAmount += purchaseData.amount;
      this.statistics.installmentNew.lastInstallmentDate = purchaseData.purchaseDate;
      this.statistics.installmentNew.activeContracts += 1;
      break;

    case 'installment_pickup':
      this.statistics.installmentPickup.totalPickups += 1;
      this.statistics.installmentPickup.totalAmount += purchaseData.amount;
      this.statistics.installmentPickup.lastPickupDate = purchaseData.purchaseDate;
      if (purchaseData.saleDetails?.deliveryStatus === 'pending') {
        this.statistics.installmentPickup.pendingPickups += 1;
      } else {
        this.statistics.installmentPickup.completedPickups += 1;
      }
      break;

    case 'installment_ongoing':
      this.statistics.installmentOngoing.totalOngoing += 1;
      this.statistics.installmentOngoing.totalAmount += purchaseData.amount;
      this.statistics.installmentOngoing.lastOngoingDate = purchaseData.purchaseDate;
      this.statistics.installmentOngoing.activeOngoing += 1;
      break;
  }

  // อัพเดทรายการสินค้าที่ชื่นชอบ
  this.updateFavoriteProducts(purchaseData.type, purchaseData.items);

  // ✅ คืนค่า this แทน save() เพื่อป้องกัน version conflict
  return this;
};

// Method สำหรับอัพเดทรายการสินค้าที่ชื่นชอบ
customerSchema.methods.updateFavoriteProducts = function(purchaseType, items) {
  const productNames = items.map(item => item.name).filter(Boolean);
  let targetArray;

  switch (purchaseType) {
    case 'cash_sale':
      targetArray = this.statistics.cashSales.favoriteProducts;
      break;
    case 'installment_new':
      targetArray = this.statistics.installmentNew.favoriteProducts;
      break;
    case 'installment_pickup':
      targetArray = this.statistics.installmentPickup.favoriteProducts;
      break;
    case 'installment_ongoing':
      targetArray = this.statistics.installmentOngoing.favoriteProducts;
      break;
    default:
      return;
  }

  productNames.forEach(productName => {
    if (!targetArray.includes(productName)) {
      targetArray.push(productName);
    }
  });

  // เก็บแค่ 10 รายการล่าสุด
  if (targetArray.length > 10) {
    targetArray.splice(0, targetArray.length - 10);
  }
};

// Method สำหรับอัพเดทสถานะการผ่อน
customerSchema.methods.updateInstallmentStatus = function(contractNo, newStatus) {
  const purchase = this.purchaseHistory.find(p => p.contractNo === contractNo);
  if (purchase) {
    if (purchase.saleDetails) {
      purchase.saleDetails.usageStatus = newStatus;
    } else {
      purchase.saleDetails = { usageStatus: newStatus };
    }

    // อัพเดทสถิติ
    if (newStatus === 'completed') {
      if (purchase.type === 'installment_new') {
        this.statistics.installmentNew.activeContracts -= 1;
        this.statistics.installmentNew.completedContracts += 1;
      } else if (purchase.type === 'installment_ongoing') {
        this.statistics.installmentOngoing.activeOngoing -= 1;
        this.statistics.installmentOngoing.completedOngoing += 1;
      }
    }
  }
  return this.save();
};

// Method สำหรับอัพเดทสถานะการรับของ
customerSchema.methods.updatePickupStatus = function(contractNo, deliveryStatus, completionDate = null) {
  const purchase = this.purchaseHistory.find(p => p.contractNo === contractNo);
  if (purchase && purchase.type === 'installment_pickup') {
    if (purchase.saleDetails) {
      purchase.saleDetails.deliveryStatus = deliveryStatus;
      if (completionDate) {
        purchase.saleDetails.completionDate = completionDate;
      }
    } else {
      purchase.saleDetails = {
        deliveryStatus: deliveryStatus,
        completionDate: completionDate
      };
    }

    // อัพเดทสถิติ
    if (deliveryStatus === 'delivered' && purchase.saleDetails.deliveryStatus === 'pending') {
      this.statistics.installmentPickup.pendingPickups -= 1;
      this.statistics.installmentPickup.completedPickups += 1;
    } else if (deliveryStatus === 'pending' && purchase.saleDetails.deliveryStatus !== 'pending') {
      this.statistics.installmentPickup.pendingPickups += 1;
      this.statistics.installmentPickup.completedPickups -= 1;
    }
  }
  return this.save();
};

// Update purchase statistics (ไม่เรียก save() เพื่อป้องกัน version conflict)
customerSchema.methods.updateStatistics = async function() {
  // ✅ Clean existing purchaseHistory data ก่อน (แก้ปัญหา legacy data)
  this.cleanLegacyData();

  const CashSale = mongoose.model('CashSale');
  const InstallmentOrder = mongoose.model('InstallmentOrder');

  const cashSales = await CashSale.find({
    customer: this._id,
    status: { $ne: 'cancelled' } // ← ไม่นับรายการที่ยกเลิก
  });

  const installmentOrders = await InstallmentOrder.find({
    customer_id: this._id, // ← ใช้ customer_id
    status: { $nin: ['cancelled', 'rejected'] } // ← ไม่นับรายการที่ยกเลิก/ปฏิเสธ
  });

  // Calculate cash statistics
  const cashStats = cashSales.reduce((acc, sale) => {
    acc.count++;
    acc.amount += sale.totalAmount || sale.total || 0; // ← รองรับชื่อ field ต่างๆ
    return acc;
  }, { count: 0, amount: 0 });

  // Calculate installment statistics
  const installmentStats = installmentOrders.reduce((acc, order) => {
    acc.count++;
    acc.amount += order.finalTotalAmount || order.totalAmount || order.totalPrice || 0; // ← รองรับชื่อ field ต่างๆ
    return acc;
  }, { count: 0, amount: 0 });

  // Update statistics
  this.statistics.cashSales.totalTransactions = cashStats.count;
  this.statistics.cashSales.totalAmount = cashStats.amount;
  this.statistics.installmentNew.totalContracts = installmentStats.count;
  this.statistics.installmentNew.totalAmount = installmentStats.amount;
  this.statistics.installmentPickup.totalPickups = 0; // Assuming no pickups for new contracts
  this.statistics.installmentPickup.totalAmount = 0;
  this.statistics.installmentOngoing.totalOngoing = 0; // Assuming no ongoing contracts for new contracts
  this.statistics.installmentOngoing.totalAmount = 0;
  this.statistics.totalPurchases = cashStats.count + installmentStats.count;
  this.statistics.totalAmount = cashStats.amount + installmentStats.amount;

  // Calculate average order value
  if (this.statistics.totalPurchases > 0) {
    this.statistics.averageOrderValue = this.statistics.totalAmount / this.statistics.totalPurchases;
  }

  // Update first and last purchase dates
  const allPurchases = [...cashSales, ...installmentOrders].sort((a, b) =>
    new Date(a.createdAt) - new Date(b.createdAt)
  );

  if (allPurchases.length > 0) {
    this.statistics.firstPurchaseDate = allPurchases[0].createdAt;
    this.statistics.lastPurchaseDate = allPurchases[allPurchases.length - 1].createdAt;
    this.statistics.isNewCustomer = false;
  }

  // ✅ คืนค่า this แทน save() เพื่อป้องกัน version conflict
  return this;
};

// Calculate available credit
customerSchema.methods.calculateAvailableCredit = function() {
  const creditLimit = this.installmentInfo.creditLimit || 0;
  const usedCredit = (this.installmentInfo.totalCreditAmount || 0) - (this.installmentInfo.totalPaidAmount || 0);
  this.installmentInfo.availableCredit = Math.max(0, creditLimit - usedCredit);
  return this.installmentInfo.availableCredit;
};

// Pre-save middleware
customerSchema.pre('save', function(next) {
  // Set default prefix for individual customers
  if (this.customerType === 'individual' && !this.individual.prefix) {
    this.individual.prefix = 'นาย';
  }

  // Validate required fields based on customer type
  if (this.customerType === 'individual') {
    if (!this.individual.firstName || !this.individual.lastName) {
      return next(new Error('First name and last name are required for individual customers'));
    }
    // ต้องมี phone หรือ taxId อย่างน้อย 1 อย่าง
    if (!this.individual.phone && !this.individual.taxId) {
      return next(new Error('Phone number or Tax ID is required for individual customers'));
    }
  } else if (this.customerType === 'corporate') {
    if (!this.corporate.companyName) {
      return next(new Error('Company name is required for corporate customers'));
    }
    if (!this.corporate.companyTaxId) {
      return next(new Error('Company Tax ID is required for corporate customers'));
    }
  }

  // Calculate available credit
  this.calculateAvailableCredit();

  next();
});

// Static methods
customerSchema.statics.findActive = function() {
  return this.find({ deleted_at: null, status: 'active' });
};

customerSchema.statics.findByTaxId = function(taxId) {
  return this.findOne({
    $or: [
      { 'individual.taxId': taxId },
      { 'corporate.companyTaxId': taxId }
    ],
    deleted_at: null
  });
};

customerSchema.statics.findByPhone = function(phone) {
  // Remove dashes from phone number for comparison
  const cleanPhone = phone.replace(/-/g, '');
  return this.find({
    $or: [
      { 'individual.phone': new RegExp(cleanPhone) },
      { 'corporate.corporatePhone': new RegExp(cleanPhone) }
    ],
    deleted_at: null
  });
};

customerSchema.statics.searchCustomers = function(query) {
  const searchRegex = new RegExp(query, 'i');
  return this.find({
    $or: [
      { 'individual.firstName': searchRegex },
      { 'individual.lastName': searchRegex },
      { 'individual.taxId': searchRegex },
      { 'individual.phone': searchRegex },
      { 'individual.email': searchRegex },
      { 'corporate.companyName': searchRegex },
      { 'corporate.companyTaxId': searchRegex },
      { 'corporate.corporatePhone': searchRegex },
      { 'corporate.contactPerson': searchRegex }
    ],
    deleted_at: null
  });
};

// ✅ Pre-save middleware เพื่อ clean legacy data
customerSchema.pre('save', function(next) {
  // Clean purchaseHistory types
  this.cleanLegacyData();
  next();
});

// ✅ Pre-validate middleware เพื่อ clean legacy data ก่อน validation
customerSchema.pre('validate', function(next) {
  // Clean purchaseHistory types before validation
  this.cleanLegacyData();
  next();
});

// ✅ Post-find middleware เพื่อ clean legacy data หลังจาก load จาก database
customerSchema.post(['find', 'findOne', 'findOneAndUpdate'], function(docs) {
  function cleanCustomer(customer) {
    if (customer && customer.purchaseHistory && Array.isArray(customer.purchaseHistory)) {
      customer.purchaseHistory.forEach(p => {
        if (p.type === 'cash') p.type = 'cash_sale';
        if (p.type === 'installment') p.type = 'installment_new';
      });
    }
  }

  if (Array.isArray(docs)) {
    docs.forEach(cleanCustomer);
  } else if (docs) {
    cleanCustomer(docs);
  }
});

module.exports = mongoose.models.Customer || mongoose.model('Customer', customerSchema);
