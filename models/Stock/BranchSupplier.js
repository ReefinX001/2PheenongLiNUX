// models/BranchSupplier.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const branchSupplierSchema = new Schema({
  branch_code: {
    type: Schema.Types.ObjectId,
    ref: 'Branch', // คล้าย belongsTo(Branch::class, 'branch_id')
    required: true,
  },
  supplier_id: {
    type: Schema.Types.ObjectId,
    ref: 'Supplier', // คล้าย belongsTo(Supplier::class, 'supplier_id')
    required: true,
  },
  contract_id: {
    // ถ้าใน Laravel เป็น string/number/foreign => ปรับตามต้องการ
    type: String,
    default: '',
  },
  order_number: {
    // รหัส PO
    type: String,
    default: '',
  },
  status: {
    // pending, approved, rejected
    type: String,
    default: 'pending',
  },
  payment_terms: {
    type: String,
    default: '',
  },
  delivery_lead_time: {
    type: String,
    default: '',
  },
  rating: {
    // ถ้าต้องการเก็บเป็น number => ปรับ type: Number
    type: Number,
    default: 0,
  },
  created_by: {
    type: Schema.Types.ObjectId,
    ref: 'User', // คล้าย belongsTo(User::class, 'created_by')
    default: null,
  },
  approved_by: {
    type: Schema.Types.ObjectId,
    ref: 'User', // คล้าย belongsTo(User::class, 'approved_by')
    default: null,
  },
}, {
  collection: 'tb_branch_suppliers', // ชื่อ collection ตาม Laravel table
  timestamps: true, // ถ้าต้องการ createdAt, updatedAt auto
});

/**
 * Virtual Relationship: items()
 * คล้าย hasMany(SupplierMapping::class, 'order_id')
 * - ในโมเดล SupplierMapping ต้องมี field order_id => this _id
 */
branchSupplierSchema.virtual('items', {
  ref: 'SupplierMapping',    // ชื่อโมเดลลูก
  localField: '_id',         // ใน BranchSupplier
  foreignField: 'order_id',  // ใน SupplierMapping
});

// หากต้องการส่ง virtual ออกเวลา .toJSON หรือ .toObject
branchSupplierSchema.set('toObject', { virtuals: true });
branchSupplierSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('BranchSupplier', branchSupplierSchema);
