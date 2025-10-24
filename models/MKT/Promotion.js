// models/MKT/Promotion.js
const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'กรุณาระบุชื่อโปรโมชั่น'],
    trim: true,
    maxlength: [100, 'ชื่อโปรโมชั่นต้องไม่เกิน 100 ตัวอักษร']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'รายละเอียดต้องไม่เกิน 500 ตัวอักษร']
  },
  type: {
    type: String,
    enum: {
      values: ['discount_percentage', 'discount_amount', 'bundle', 'buy_x_get_y', 'special_price'],
      message: 'ประเภทโปรโมชั่นไม่ถูกต้อง'
    },
    required: [true, 'กรุณาระบุประเภทโปรโมชั่น']
  },
  // ส่วนลด
  discountType: {
    type: String,
    enum: ['percentage', 'amount'],
    required: function() {
      return ['discount_percentage', 'discount_amount'].includes(this.type);
    }
  },
  discountValue: {
    type: Number,
    required: function() {
      return ['discount_percentage', 'discount_amount'].includes(this.type);
    },
    min: [0, 'ส่วนลดต้องไม่ติดลบ'],
    validate: {
      validator: function(value) {
        if (this.type === 'discount_percentage' && value > 100) {
          return false;
        }
        return true;
      },
      message: 'ส่วนลดเปอร์เซ็นต์ต้องไม่เกิน 100'
    }
  },
  // ราคาพิเศษ
  specialPrice: {
    type: Number,
    required: function() {
      return this.type === 'special_price';
    },
    min: [0, 'ราคาพิเศษต้องไม่ติดลบ']
  },
  // เงื่อนไข Buy X Get Y
  buyQuantity: {
    type: Number,
    required: function() {
      return this.type === 'buy_x_get_y';
    },
    min: [1, 'จำนวนซื้อต้องอย่างน้อย 1']
  },
  getQuantity: {
    type: Number,
    required: function() {
      return this.type === 'buy_x_get_y';
    },
    min: [1, 'จำนวนแถมต้องอย่างน้อย 1']
  },
  // สินค้าที่ร่วมโปร
  applicableProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductImage'
  }],

  // ชุดสินค้าแบบ Bundle
  bundleProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductImage',
    required: function() {
      return this.type === 'bundle';
    }
  }],
  bundlePrice: {
    type: Number,
    required: function() {
      return this.type === 'bundle';
    },
    min: [0, 'ราคาบันเดิลต้องไม่ติดลบ']
  },

  // หมวดหมู่ที่ร่วมโปร
  applicableCategories: [{
    type: String,
    enum: ['mobile', 'accessory', 'boxset']
  }],
  // สาขาที่ร่วมโปร (ถ้าไม่ระบุ = ทุกสาขา)
  applicableBranches: [{
    type: String // branch_code
  }],
  // ช่วงเวลาโปร
  startDate: {
    type: Date,
    required: [true, 'กรุณาระบุวันเริ่มต้นโปรโมชั่น']
  },
  endDate: {
    type: Date,
    required: [true, 'กรุณาระบุวันสิ้นสุดโปรโมชั่น'],
    validate: {
      validator: function(value) {
        return value > this.startDate;
      },
      message: 'วันสิ้นสุดต้องมากกว่าวันเริ่มต้น'
    }
  },
  // สถานะ
  isActive: {
    type: Boolean,
    default: true
  },
  // จำกัดจำนวนการใช้
  usageLimit: {
    type: Number,
    default: null, // null = ไม่จำกัด
    min: [0, 'จำนวนการใช้ต้องไม่ติดลบ']
  },
  usageCount: {
    type: Number,
    default: 0,
    min: [0, 'จำนวนการใช้ต้องไม่ติดลบ']
  },
  // เงื่อนไขเพิ่มเติม
  conditions: {
    minPurchaseAmount: {
      type: Number,
      default: 0,
      min: [0, 'ยอดซื้อขั้นต่ำต้องไม่ติดลบ']
    },
    maxDiscountAmount: {
      type: Number,
      default: null,
      min: [0, 'ส่วนลดสูงสุดต้องไม่ติดลบ']
    },
    customerTypes: [{
      type: String,
      enum: ['all', 'new', 'existing', 'vip'],
      default: ['all']
    }],
    paymentMethods: [{
      type: String,
      enum: ['all', 'cash', 'installment', 'credit_card'],
      default: ['all']
    }]
  },
  // ลำดับความสำคัญ (ยิ่งน้อยยิ่งสำคัญ)
  priority: {
    type: Number,
    default: 100,
    min: [1, 'ลำดับความสำคัญต้องอย่างน้อย 1']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Advanced Features
  schedule: {
    type: {
      type: String,
      enum: ['auto_start', 'auto_end', 'recurring'],
      default: null
    },
    data: mongoose.Schema.Types.Mixed,
    createdAt: {
      type: Date,
      default: null
    }
  },
  tags: [{
    type: String,
    trim: true
  }],
  notes: {
    type: String,
    maxlength: [1000, 'หมายเหตุต้องไม่เกิน 1000 ตัวอักษร']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index สำหรับการค้นหา
promotionSchema.index({ startDate: 1, endDate: 1 });
promotionSchema.index({ isActive: 1 });
promotionSchema.index({ applicableBranches: 1 });
promotionSchema.index({ applicableProducts: 1 });
promotionSchema.index({ applicableCategories: 1 });
promotionSchema.index({ type: 1 });
promotionSchema.index({ priority: 1 });

// Virtual สำหรับตรวจสอบว่าโปรยังใช้ได้หรือไม่
promotionSchema.virtual('isValid').get(function() {
  const now = new Date();
  return this.isActive &&
         now >= this.startDate &&
         now <= this.endDate &&
         (this.usageLimit === null || this.usageCount < this.usageLimit);
});

// Virtual สำหรับสถานะโปรโมชั่น
promotionSchema.virtual('status').get(function() {
  const now = new Date();
  if (!this.isActive) return 'inactive';
  if (now < this.startDate) return 'upcoming';
  if (now > this.endDate) return 'expired';
  if (this.usageLimit && this.usageCount >= this.usageLimit) return 'used_up';
  return 'active';
});

// Method สำหรับคำนวณส่วนลด
promotionSchema.methods.calculateDiscount = function(originalPrice, quantity = 1) {
  if (!this.isValid) return 0;

  switch (this.type) {
    case 'discount_percentage':
      const percentDiscount = originalPrice * (this.discountValue / 100) * quantity;
      return this.conditions.maxDiscountAmount
        ? Math.min(percentDiscount, this.conditions.maxDiscountAmount)
        : percentDiscount;

    case 'discount_amount':
      return Math.min(this.discountValue * quantity, originalPrice * quantity);

    case 'special_price':
      return Math.max(0, (originalPrice - this.specialPrice) * quantity);

    case 'buy_x_get_y':
      if (quantity >= this.buyQuantity) {
        const sets = Math.floor(quantity / (this.buyQuantity + this.getQuantity));
        const freeItems = sets * this.getQuantity;
        const remainingQuantity = quantity - sets * (this.buyQuantity + this.getQuantity);
        const additionalFree = remainingQuantity >= this.buyQuantity ? this.getQuantity : 0;
        return (freeItems + additionalFree) * originalPrice;
      }
      return 0;

    default:
      return 0;
  }
};

// Static method สำหรับหาโปรที่ใช้ได้
promotionSchema.statics.findActivePromotions = async function(filters = {}) {
  const now = new Date();
  const query = {
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now }
  };

  // Build OR conditions for each filter
  const orConditions = [];

  // Branch filter
  if (filters.branchCode) {
    orConditions.push(
      { applicableBranches: { $size: 0 } }, // ทุกสาขา
      { applicableBranches: filters.branchCode }
    );
  }

  // Product filter
  if (filters.productId) {
    const productOrConditions = [
      { applicableProducts: { $size: 0 } }, // ทุกสินค้า
      { applicableProducts: new mongoose.Types.ObjectId(filters.productId) }
    ];

    // Category filter
    if (filters.category) {
      productOrConditions.push(
        {
          applicableCategories: filters.category,
          applicableProducts: { $size: 0 }
        }
      );
    }

    if (orConditions.length > 0) {
      // Combine branch and product conditions
      query.$and = [
        { $or: orConditions },
        { $or: productOrConditions }
      ];
    } else {
      query.$or = productOrConditions;
    }
  } else if (orConditions.length > 0) {
    query.$or = orConditions;
  }

  // Additional filters
  if (filters.minAmount) {
    query['conditions.minPurchaseAmount'] = { $lte: filters.minAmount };
  }

  return this.find(query)
    .populate('applicableProducts', 'name price productType')
    .sort({ priority: 1, discountValue: -1 });
};

// Middleware to validate usage limit
promotionSchema.pre('save', function(next) {
  if (this.usageLimit !== null && this.usageCount > this.usageLimit) {
    next(new Error('จำนวนการใช้เกินขีดจำกัด'));
  }
  next();
});

module.exports = mongoose.models.Promotion || mongoose.model('Promotion', promotionSchema);
