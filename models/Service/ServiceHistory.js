// models/Service/ServiceHistory.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ServiceHistorySchema = new Schema({
  // Reference การซื้อ
  purchaseReference: {
    type: Schema.Types.ObjectId,
    required: true,
    refPath: 'purchaseType'
  },
  purchaseType: {
    type: String,
    required: true,
    enum: ['CashSale', 'InstallmentOrder']
  },

  // ข้อมูลลูกค้า
  customer: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  customerInfo: {
    name: String,
    phone: String,
    idCard: String
  },

  // ข้อมูลอุปกรณ์
  device: {
    type: {
      type: String,
      enum: ['phone', 'ipad'],
      required: true
    },
    model: {
      type: String,
      required: true
    },
    imei: String,
    purchaseDate: Date
  },

  // ข้อมูลการบริการ
  serviceType: {
    type: String,
    required: true,
    enum: ['phone-film', 'ipad-film', 'phone-warranty', 'ipad-warranty']
  },
  serviceDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  serviceReason: {
    type: String,
    required: true
  },

  // ข้อมูลการใช้สิทธิ์
  usageCount: {
    type: Number,
    required: true,
    default: 1
  },
  maxUsage: {
    type: Number,
    required: true
  },
  remainingUsage: {
    type: Number,
    required: true
  },

  // ข้อมูลประกัน
  warrantyStartDate: {
    type: Date,
    required: true
  },
  warrantyEndDate: {
    type: Date,
    required: true
  },
  warrantyStatus: {
    type: String,
    enum: ['active', 'expired'],
    default: 'active'
  },

  // ข้อมูลสาขาและพนักงาน
  branchCode: {
    type: String,
    required: true
  },
  staffName: {
    type: String,
    required: true
  },
  staffId: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },

  // หมายเหตุ
  notes: String,

  // การติดตาม
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'completed'
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'service_histories'
});

// Indexes
ServiceHistorySchema.index({ customer: 1 });
ServiceHistorySchema.index({ purchaseReference: 1, purchaseType: 1 });
ServiceHistorySchema.index({ serviceDate: -1 });
ServiceHistorySchema.index({ branchCode: 1 });
ServiceHistorySchema.index({ 'device.imei': 1 });
ServiceHistorySchema.index({ serviceType: 1 });
ServiceHistorySchema.index({ warrantyStatus: 1 });

// Virtual populate สำหรับ purchase details
ServiceHistorySchema.virtual('purchaseDetails', {
  ref: function() {
    return this.purchaseType;
  },
  localField: 'purchaseReference',
  foreignField: '_id',
  justOne: true
});

// Methods
ServiceHistorySchema.methods.isWarrantyValid = function() {
  return new Date() <= this.warrantyEndDate;
};

ServiceHistorySchema.methods.canUseService = function() {
  return this.remainingUsage > 0 && this.isWarrantyValid();
};

ServiceHistorySchema.methods.updateWarrantyStatus = function() {
  if (new Date() > this.warrantyEndDate) {
    this.warrantyStatus = 'expired';
  } else {
    this.warrantyStatus = 'active';
  }
  return this.save();
};

// Statics
ServiceHistorySchema.statics.getServiceUsageCount = async function(purchaseId, purchaseType) {
  const services = await this.find({
    purchaseReference: purchaseId,
    purchaseType: purchaseType
  });

  const usageCount = {};
  services.forEach(service => {
    if (!usageCount[service.serviceType]) {
      usageCount[service.serviceType] = 0;
    }
    usageCount[service.serviceType] = Math.max(
      usageCount[service.serviceType],
      service.usageCount
    );
  });

  return usageCount;
};

ServiceHistorySchema.statics.getCustomerServiceHistory = async function(customerId, options = {}) {
  const query = { customer: customerId };

  if (options.serviceType) {
    query.serviceType = options.serviceType;
  }

  if (options.branchCode) {
    query.branchCode = options.branchCode;
  }

  if (options.startDate && options.endDate) {
    query.serviceDate = {
      $gte: options.startDate,
      $lte: options.endDate
    };
  }

  if (options.deviceImei) {
    query['device.imei'] = options.deviceImei;
  }

  return this.find(query)
    .populate('customer')
    .populate('staffId', 'name email')
    .sort({ serviceDate: -1 });
};

ServiceHistorySchema.statics.getServiceStatistics = async function(branchCode, dateRange = {}) {
  const match = { branchCode };

  if (dateRange.startDate && dateRange.endDate) {
    match.serviceDate = {
      $gte: dateRange.startDate,
      $lte: dateRange.endDate
    };
  }

  const statistics = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$serviceType',
        count: { $sum: 1 },
        uniqueCustomers: { $addToSet: '$customer' }
      }
    },
    {
      $project: {
        serviceType: '$_id',
        count: 1,
        uniqueCustomers: { $size: '$uniqueCustomers' },
        _id: 0
      }
    }
  ]);

  // สรุปข้อมูลรวม
  const summary = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalServices: { $sum: 1 },
        uniqueCustomers: { $addToSet: '$customer' },
        uniqueDevices: { $addToSet: '$device.imei' }
      }
    },
    {
      $project: {
        totalServices: 1,
        totalCustomers: { $size: '$uniqueCustomers' },
        totalDevices: { $size: '$uniqueDevices' },
        _id: 0
      }
    }
  ]);

  return {
    byServiceType: statistics,
    summary: summary[0] || {
      totalServices: 0,
      totalCustomers: 0,
      totalDevices: 0
    },
    period: dateRange
  };
};

ServiceHistorySchema.statics.checkServiceEligibility = async function(purchaseId, purchaseType, serviceType) {
  // หาการใช้บริการล่าสุด
  const lastService = await this.findOne({
    purchaseReference: purchaseId,
    purchaseType: purchaseType,
    serviceType: serviceType
  }).sort({ usageCount: -1 });

  const maxUsage = getMaxUsageForService(serviceType);
  const currentUsage = lastService ? lastService.usageCount : 0;
  const remainingUsage = maxUsage - currentUsage;

  return {
    eligible: remainingUsage > 0,
    currentUsage,
    maxUsage,
    remainingUsage
  };
};

// Helper function
function getMaxUsageForService(serviceType) {
  const maxUsageMap = {
    'phone-film': 10,
    'ipad-film': 3,
    'phone-warranty': 1,
    'ipad-warranty': 1
  };
  return maxUsageMap[serviceType] || 1;
}

// Pre-save middleware
ServiceHistorySchema.pre('save', function(next) {
  // อัปเดตสถานะประกัน
  if (new Date() > this.warrantyEndDate) {
    this.warrantyStatus = 'expired';
  }

  // คำนวณ remaining usage
  if (this.isNew) {
    this.remainingUsage = this.maxUsage - this.usageCount;
  }

  next();
});

// Post-save middleware สำหรับอัปเดต serviceUsageCount ในการซื้อ
ServiceHistorySchema.post('save', async function(doc) {
  try {
    const Model = mongoose.model(doc.purchaseType);
    const purchase = await Model.findById(doc.purchaseReference);

    if (purchase) {
      if (!purchase.serviceUsageCount) {
        purchase.serviceUsageCount = {};
      }

      // อัปเดตจำนวนการใช้บริการ
      purchase.serviceUsageCount[doc.serviceType] = doc.usageCount;

      // บันทึกโดยไม่ trigger validation
      await purchase.save({ validateBeforeSave: false });
    }
  } catch (error) {
    console.error('Error updating purchase serviceUsageCount:', error);
  }
});

// Export model
module.exports = mongoose.model('ServiceHistory', ServiceHistorySchema);
