// File: models/CashSale.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const cashSaleSchema = new Schema(
  {
    // ประเภทลูกค้า: บุคคลธรรมดา หรือ นิติบุคคล
    customerType: {
      type: String,
      required: true,
      enum: ['individual', 'corporate']
    },

    // Reference ไปยัง Customer collection (ถ้ามี)
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: false // ไม่บังคับ เพื่อรองรับข้อมูลเก่าที่ยังไม่มี reference
    },

    // กรณี บุคคลธรรมดา
    individual: {
      prefix: {
        type: String,
        required: function() { return this.customerType === 'individual'; }
      },
      firstName: {
        type: String,
        required: function() { return this.customerType === 'individual'; }
      },
      lastName: {
        type: String,
        required: function() { return this.customerType === 'individual'; }
      },
      phone: {
        type: String,
        required: function() { return this.customerType === 'individual'; }
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
      address: {
        houseNo: {
          type: String,
          required: function() { return this.customerType === 'individual'; }
        },
        moo: {
          type: String,
          required: function() { return this.customerType === 'individual'; }
        },
        subDistrict: {
          type: String,
          required: function() { return this.customerType === 'individual'; }
        },
        district: {
          type: String,
          required: function() { return this.customerType === 'individual'; }
        },
        province: {
          type: String,
          required: function() { return this.customerType === 'individual'; }
        },
        zipcode: {
          type: String,
          required: function() { return this.customerType === 'individual'; }
        }
      },
      taxId: {
        type: String,
        required: function() { return this.customerType === 'individual'; }
      }
    },

    // กรณี นิติบุคคล
    corporate: {
      companyName: {
        type: String,
        required: function() { return this.customerType === 'corporate'; }
      },
      companyTaxId: {
        type: String,
        required: function() { return this.customerType === 'corporate'; }
      },
      contactPerson: {
        type: String,
        required: function() { return this.customerType === 'corporate'; }
      },
      corporatePhone: {
        type: String,
        required: function() { return this.customerType === 'corporate'; }
      },
      companyAddress: {
        type: String,
        required: function() { return this.customerType === 'corporate'; }
      }
    },

    // พนักงานขายผู้รับผิดชอบการขายสดนี้
    salesperson: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // เลขที่ใบเสร็จ (จากระบบ POS)
    invoiceNo: {
      type: String,
      required: true,
      validate: {
        validator: v => !!v.trim(),
        message: 'invoiceNo cannot be empty'
      }
    },

    // วัน-เวลาที่ขาย
    soldAt: {
      type: Date,
      default: Date.now
    },

    // เพิ่มข้อมูลเพิ่มเติมสำหรับการขาย
    items: [{
      product: {
        type: Schema.Types.ObjectId,
        ref: 'Product'
      },
      name: String,
      quantity: Number,
      price: Number,
      total: Number
    }],

    subTotal: {
      type: Number,
      default: 0
    },

    vatAmount: {
      type: Number,
      default: 0
    },

    discount: {
      type: Number,
      default: 0
    },

    promotionDiscount: {
      type: Number,
      default: 0
    },

    totalAmount: {
      type: Number,
      default: 0
    },

    paymentMethod: {
      type: String,
      enum: ['cash', 'credit_card', 'transfer', 'mobile_banking'],
      default: 'cash'
    },

    status: {
      type: String,
      enum: ['completed', 'cancelled', 'refunded'],
      default: 'completed'
    },

    // ✅ เพิ่มฟิลด์สำหรับบริการประกันและหลังการขาย
    purchaseType: {
      type: String,
      enum: ['cash', 'installment'],
      default: 'cash'
    },
    hasWarranty: { type: Boolean, default: true },
    warrantyStartDate: { type: Date, default: null },
    warrantyEndDate: { type: Date, default: null },
    eligibleServices: [{
      type: String,
      enum: ['phone-film', 'ipad-film', 'phone-warranty', 'ipad-warranty']
    }],
    serviceUsageCount: {
      type: Map,
      of: Number,
      default: {}
    },

    // ข้อมูลสาขาที่ขาย
    branchCode: {
      type: String,
      required: true
    },

    // ชื่อพนักงานขาย
    staffName: {
      type: String,
      default: ''
    }
  },
  {
    collection: 'cash_sales',
    timestamps: true
  }
);

// Indexes สำหรับการค้นหา
cashSaleSchema.index({ 'individual.taxId': 1 });
cashSaleSchema.index({ 'corporate.companyTaxId': 1 });
cashSaleSchema.index({ 'individual.phone': 1 });
cashSaleSchema.index({ 'corporate.corporatePhone': 1 });
cashSaleSchema.index({ customer: 1 });
cashSaleSchema.index({ invoiceNo: 1 });
cashSaleSchema.index({ soldAt: -1 });
// ✅ เพิ่ม indexes สำหรับ warranty
cashSaleSchema.index({ hasWarranty: 1 });
cashSaleSchema.index({ warrantyEndDate: 1 });
cashSaleSchema.index({ branchCode: 1 });

// Virtual field สำหรับแสดงชื่อลูกค้า
cashSaleSchema.virtual('customerDisplayName').get(function() {
  if (this.customerType === 'individual' && this.individual) {
    return `${this.individual.prefix}${this.individual.firstName} ${this.individual.lastName}`;
  } else if (this.customerType === 'corporate' && this.corporate) {
    return this.corporate.companyName;
  }
  return 'Unknown Customer';
});

// Virtual field สำหรับแสดงเลขประจำตัว
cashSaleSchema.virtual('customerTaxId').get(function() {
  if (this.customerType === 'individual' && this.individual) {
    return this.individual.taxId;
  } else if (this.customerType === 'corporate' && this.corporate) {
    return this.corporate.companyTaxId;
  }
  return '';
});

// Virtual field สำหรับแสดงเบอร์โทร
cashSaleSchema.virtual('customerPhone').get(function() {
  if (this.customerType === 'individual' && this.individual) {
    return this.individual.phone;
  } else if (this.customerType === 'corporate' && this.corporate) {
    return this.corporate.corporatePhone;
  }
  return '';
});

// Method สำหรับเชื่อมโยงกับ Customer
cashSaleSchema.methods.linkToCustomer = async function(customerId) {
  this.customer = customerId;
  return await this.save();
};

// Method สำหรับอัพเดทข้อมูลลูกค้าจาก Customer model
cashSaleSchema.methods.updateCustomerInfo = async function() {
  if (this.customer) {
    const Customer = mongoose.model('Customer');
    const customerDoc = await Customer.findById(this.customer);

    if (customerDoc) {
      if (customerDoc.customerType === 'individual') {
        this.individual = customerDoc.individual;
      } else if (customerDoc.customerType === 'corporate') {
        this.corporate = customerDoc.corporate;
      }
      this.customerType = customerDoc.customerType;
      return await this.save();
    }
  }
  return this;
};

// Static method สำหรับค้นหาลูกค้า
cashSaleSchema.statics.findByCustomerIdentifier = function(identifier) {
  return this.find({
    $or: [
      { 'individual.taxId': identifier },
      { 'corporate.companyTaxId': identifier },
      { 'individual.phone': new RegExp(identifier.replace(/-/g, '')) },
      { 'corporate.corporatePhone': new RegExp(identifier.replace(/-/g, '')) }
    ]
  }).sort({ soldAt: -1 });
};

// Static method สำหรับสร้าง CashSale พร้อม link กับ Customer
cashSaleSchema.statics.createWithCustomer = async function(saleData, customerId) {
  const sale = new this(saleData);

  if (customerId) {
    sale.customer = customerId;

    // ดึงข้อมูลลูกค้ามาใส่
    const Customer = mongoose.model('Customer');
    const customerDoc = await Customer.findById(customerId);

    if (customerDoc) {
      sale.customerType = customerDoc.customerType;
      if (customerDoc.customerType === 'individual') {
        sale.individual = customerDoc.individual;
      } else if (customerDoc.customerType === 'corporate') {
        sale.corporate = customerDoc.corporate;
      }
    }
  }

  return await sale.save();
};

// ✅ เพิ่ม pre-save hook เพื่อตั้งค่า warranty dates
cashSaleSchema.pre('save', function(next) {
  // Set warranty dates if hasWarranty
  if (this.hasWarranty && !this.warrantyStartDate) {
    this.warrantyStartDate = this.soldAt || new Date();
    this.warrantyEndDate = new Date(this.warrantyStartDate.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year
  }

  // Set eligible services based on items (simplified logic)
  if (this.hasWarranty && this.eligibleServices.length === 0) {
    // Default eligible services for all warranty items
    this.eligibleServices = ['phone-film', 'ipad-film', 'phone-warranty', 'ipad-warranty'];
  }

  next();
});

module.exports = mongoose.models.CashSale || mongoose.model('CashSale', cashSaleSchema);
