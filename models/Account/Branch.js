// models/Account/Branch.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

// สร้าง Schema สำหรับ Branch
const branchSchema = new Schema(
  {
    branch_code: {
      type: String,
      required: true,
      unique: true
    },
    name: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      default: ''
    },
    email: {
      type: String,
      default: ''
    },
    address: {
      type: String,
      default: ''
    },
    manager_id: {
      type: Schema.Types.ObjectId,
      ref: 'User', // เชื่อมกับโมเดล User
      default: null
    },
    operating_hours: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      default: 'active'
    },

    // เพิ่มฟิลด์สำหรับ Printer Server URL
    printerServerUrl: {
      type: String,
      default: null
    },

    // สำหรับ SoftDelete (ถ้า deleted_at != null => ถือว่าถูกลบ)
    deleted_at: {
      type: Date,
      default: null
    },
  },
  {
    collection: 'tb_branch_locations', // ชื่อ collection ตามที่ใช้ใน Laravel ได้
    timestamps: true,                 // สร้าง createdAt, updatedAt ให้อัตโนมัติ
  }
);

/**
 * Soft Delete (คล้าย Laravel SoftDeletes)
 * - ถ้าต้องการ filter ไม่ให้โชว์ record ที่ถูกลบ
 *   ให้ใช้ .find({ deleted_at: null }) เอง
 */
branchSchema.methods.softDelete = function () {
  this.deleted_at = new Date();
  return this.save();
};

/**
 * Virtual Relationships (hasMany) :
 * stocks / stockUnits / stockValuations
 *
 * ในโมเดลลูก (BranchStock, StockUnit, StockValuation) ต้องมี field:
 *   branch_id: { type: ObjectId, ref: 'Branch' }
 */
branchSchema.virtual('stocks', {
  ref: 'BranchStock',      // ชื่อโมเดลที่อ้างถึง
  localField: '_id',       // ฟิลด์ใน Branch นี้
  foreignField: 'branch_id'// ฟิลด์ในโมเดลปลายทาง
});

branchSchema.virtual('stockUnits', {
  ref: 'StockUnit',
  localField: '_id',
  foreignField: 'branch_id',
});

branchSchema.virtual('stockValuations', {
  ref: 'StockValuation',
  localField: '_id',
  foreignField: 'branch_id',
});

// เปิดให้ virtual fields ถูกแปลงเป็น JSON/Object ด้วย
branchSchema.set('toObject', { virtuals: true });
branchSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.models.Branch || mongoose.model('Branch', branchSchema);
