const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const serviceHistorySchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => uuidv4()
  },

  // ข้อมูลการซื้อที่เชื่อมโยง
  purchaseId: {
    type: String,
    required: true,
    ref: 'Sale' // เชื่อมกับ Sale หรือ Installment
  },
  purchaseType: {
    type: String,
    enum: ['cash', 'installment'],
    required: true
  },

  // ข้อมูลลูกค้า
  customerId: {
    type: String,
    ref: 'Customer'
  },
  customerInfo: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    idCard: String
  },

  // ข้อมูลอุปกรณ์
  device: {
    type: {
      type: String,
      enum: ['phone', 'ipad'],
      required: true
    },
    model: { type: String, required: true },
    imei: String
  },

  // ประเภทบริการ
  serviceType: {
    type: String,
    enum: ['phone-film', 'ipad-film', 'phone-warranty', 'ipad-warranty'],
    required: true
  },

  // วันที่และประกัน
  serviceDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  warrantyStartDate: {
    type: Date,
    required: true
  },
  warrantyEndDate: {
    type: Date,
    required: true
  },

  // สาเหตุและรายละเอียด
  serviceReason: {
    type: String,
    required: true
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

  // จำนวนครั้งที่ใช้บริการ
  usageCount: {
    type: Number,
    default: 1
  },

  // สถานะและหมายเหตุ
  status: {
    type: String,
    enum: ['completed', 'pending', 'cancelled'],
    default: 'completed'
  },
  notes: String,

  // การติดตามการเปลี่ยนแปลง
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  createdBy: String,
  updatedBy: String
}, {
  timestamps: true,
  collection: 'serviceHistories'
});

// Index สำหรับการค้นหาที่เร็วขึ้น
serviceHistorySchema.index({ branchCode: 1, serviceDate: -1 });
serviceHistorySchema.index({ customerId: 1, serviceDate: -1 });
serviceHistorySchema.index({ purchaseId: 1, serviceType: 1 });
serviceHistorySchema.index({ 'customerInfo.phone': 1 });
serviceHistorySchema.index({ 'customerInfo.idCard': 1 });

// Methods
serviceHistorySchema.methods.isWarrantyValid = function() {
  return new Date() <= this.warrantyEndDate;
};

serviceHistorySchema.methods.getRemainingUsage = function() {
  const maxUsage = {
    'phone-film': 10,
    'ipad-film': 3,
    'phone-warranty': 1,
    'ipad-warranty': 1
  };
  return Math.max(0, (maxUsage[this.serviceType] || 1) - this.usageCount);
};

// Static methods
serviceHistorySchema.statics.getUsageCount = async function(purchaseId, serviceType) {
  const count = await this.countDocuments({
    purchaseId: purchaseId,
    serviceType: serviceType,
    status: { $ne: 'cancelled' }
  });
  return count;
};

serviceHistorySchema.statics.getCustomerServiceHistory = async function(customerId, branchCode = null) {
  const query = { customerId };
  if (branchCode) {
    query.branchCode = branchCode;
  }

  return this.find(query)
    .sort({ serviceDate: -1 })
    .lean();
};

// Pre-save middleware
serviceHistorySchema.pre('save', function(next) {
  this.updatedAt = new Date();

  // คำนวณวันหมดอายุประกันถ้ายังไม่มี
  if (!this.warrantyEndDate && this.warrantyStartDate) {
    this.warrantyEndDate = new Date(this.warrantyStartDate);
    this.warrantyEndDate.setFullYear(this.warrantyEndDate.getFullYear() + 1);
  }

  next();
});

module.exports = mongoose.models.ServiceHistory || mongoose.model('ServiceHistory', serviceHistorySchema);