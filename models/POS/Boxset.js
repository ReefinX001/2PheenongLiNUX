const mongoose = require('mongoose');

const boxsetSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },

  boxsetPrice: {
    type: Number,
    required: true,
    min: 0
  },

  branchCode: {
    type: String,
    required: true
  },

  saleTypes: [{
    type: String,
    enum: ['cash', 'installment'],
    required: true
  }],

  products: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BranchStock',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    brand: String,
    model: String,
    imei: String,
    price: {
      type: Number,
      required: true,
      min: 0
    },
    cost: {
      type: Number,
      required: true,
      min: 0
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    }
  }],

  totalCost: {
    type: Number,
    required: true,
    min: 0
  },

  stock_value: {
    type: Number,
    default: 1,
    min: 0
  },

  verified: {
    type: Boolean,
    default: true
  },

  status: {
    type: String,
    enum: ['active', 'inactive', 'sold'],
    default: 'active'
  },

  // Installment configuration (optional)
  installmentConfig: {
    downAmount: {
      type: Number,
      min: 0
    },
    downInstallment: {
      type: Number,
      min: 0
    },
    downInstallmentCount: {
      type: Number,
      min: 0
    },
    creditThreshold: {
      type: Number,
      min: 0
    },
    payUseInstallment: {
      type: Number,
      min: 0
    },
    payUseInstallmentCount: {
      type: Number,
      min: 0
    },
    pricePayOff: {
      type: Number,
      min: 0
    },
    docFee: {
      type: Number,
      min: 0,
      default: 0
    },
    payoffDiscount: {
      type: Number,
      min: 0,
      default: 0
    }
  },

  // Category and classification
  categoryGroup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CategoryGroup'
  },

  // Sales tracking
  salesHistory: [{
    soldAt: {
      type: Date,
      default: Date.now
    },
    soldBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    saleType: {
      type: String,
      enum: ['cash', 'installment']
    },
    contractNumber: String,
    totalAmount: Number,
    customerInfo: {
      name: String,
      phone: String,
      email: String
    }
  }],

  // Audit fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  deletedAt: {
    type: Date
  },

  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Metadata
  notes: String,

  image: String, // URL to boxset image

  // Purchase types for compatibility with existing system
  purchaseTypes: [{
    type: String,
    enum: ['cash', 'installment', 'payoff-boxset']
  }]

}, {
  timestamps: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
boxsetSchema.index({ branchCode: 1, status: 1 });
boxsetSchema.index({ name: 1, branchCode: 1 });
boxsetSchema.index({ createdAt: -1 });
boxsetSchema.index({ 'products.productId': 1 });

// Virtual fields
boxsetSchema.virtual('profit').get(function() {
  return this.boxsetPrice - this.totalCost;
});

boxsetSchema.virtual('profitMargin').get(function() {
  if (this.boxsetPrice === 0) return 0;
  return ((this.boxsetPrice - this.totalCost) / this.boxsetPrice) * 100;
});

boxsetSchema.virtual('productCount').get(function() {
  return this.products ? this.products.length : 0;
});

boxsetSchema.virtual('totalQuantity').get(function() {
  return this.products ? this.products.reduce((sum, product) => sum + (product.quantity || 1), 0) : 0;
});

// Methods
boxsetSchema.methods.markAsSold = function(saleInfo) {
  this.status = 'sold';
  this.stock_value = 0;
  this.salesHistory.push(saleInfo);
  return this.save();
};

boxsetSchema.methods.canBeSold = function() {
  return this.status === 'active' && this.verified && this.stock_value > 0;
};

boxsetSchema.methods.hasRequiredProducts = async function() {
  const BranchStock = require('./BranchStock');

  for (const product of this.products) {
    const stockItem = await BranchStock.findById(product.productId);
    if (!stockItem || stockItem.stock_value < product.quantity) {
      return false;
    }
  }
  return true;
};

// Static methods
boxsetSchema.statics.findActiveByBranch = function(branchCode) {
  return this.find({
    branchCode: branchCode,
    status: 'active',
    verified: true,
    stock_value: { $gt: 0 }
  });
};

boxsetSchema.statics.findBySaleType = function(branchCode, saleType) {
  return this.find({
    branchCode: branchCode,
    status: 'active',
    verified: true,
    stock_value: { $gt: 0 },
    saleTypes: saleType
  });
};

// Pre-save middleware
boxsetSchema.pre('save', function(next) {
  // Auto-calculate total cost if not provided
  if (this.products && this.products.length > 0 && !this.totalCost) {
    this.totalCost = this.products.reduce((sum, product) => {
      return sum + (product.cost || 0) * (product.quantity || 1);
    }, 0);
  }

  // Sync purchase types with sale types for compatibility
  if (this.saleTypes && this.saleTypes.length > 0) {
    this.purchaseTypes = [...this.saleTypes];
  }

  next();
});

// Pre-remove middleware
boxsetSchema.pre('remove', async function(next) {
  // Log the removal
  console.log(`Removing boxset: ${this.name} (${this._id})`);
  next();
});

module.exports = mongoose.models.Boxset || mongoose.model('Boxset', boxsetSchema);