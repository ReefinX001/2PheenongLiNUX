const mongoose = require('mongoose');

const commissionSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  employeeName: {
    type: String,
    required: true
  },
  period: {
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true }
  },
  sales: [{
    saleId: { type: mongoose.Schema.Types.ObjectId },
    saleType: {
      type: String,
      enum: ['cash', 'installment', 'deposit'],
      required: true
    },
    saleDate: { type: Date, required: true },
    customerName: { type: String },
    productDetails: { type: String },
    saleAmount: { type: Number, required: true },
    commissionRate: { type: Number, required: true }, // เปอร์เซ็นต์
    commissionAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'paid', 'cancelled'],
      default: 'pending'
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedDate: { type: Date },
    notes: { type: String }
  }],
  totalSales: { type: Number, default: 0 },
  totalCommission: { type: Number, default: 0 },
  paidCommission: { type: Number, default: 0 },
  pendingCommission: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['draft', 'calculated', 'approved', 'paid'],
    default: 'draft'
  },
  calculatedDate: { type: Date },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedDate: { type: Date },
  paidDate: { type: Date },
  paymentMethod: { type: String },
  paymentReference: { type: String },
  notes: { type: String }
}, {
  timestamps: true
});

// สร้าง compound index สำหรับการค้นหาที่เร็วขึ้น
commissionSchema.index({ employeeId: 1, 'period.year': -1, 'period.month': -1 });
commissionSchema.index({ 'period.year': -1, 'period.month': -1 });
commissionSchema.index({ status: 1 });

// Virtual field สำหรับชื่อเดือน
commissionSchema.virtual('periodDisplay').get(function() {
  const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  return `${months[this.period.month - 1]} ${this.period.year + 543}`;
});

// Method สำหรับคำนวณยอดรวม
commissionSchema.methods.calculateTotals = function() {
  this.totalSales = this.sales.reduce((sum, sale) => sum + sale.saleAmount, 0);
  this.totalCommission = this.sales.reduce((sum, sale) => sum + sale.commissionAmount, 0);
  this.pendingCommission = this.sales
    .filter(sale => sale.status === 'pending' || sale.status === 'approved')
    .reduce((sum, sale) => sum + sale.commissionAmount, 0);
  this.paidCommission = this.sales
    .filter(sale => sale.status === 'paid')
    .reduce((sum, sale) => sum + sale.commissionAmount, 0);
};

// Pre-save hook สำหรับคำนวณยอดรวมก่อนบันทึก
commissionSchema.pre('save', function(next) {
  this.calculateTotals();
  next();
});

module.exports = mongoose.model('Commission', commissionSchema);