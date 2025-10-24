const mongoose = require('mongoose');
const { Schema } = mongoose;

const supplierMappingSchema = new Schema(
  {
    order_id: {
      type: Schema.Types.ObjectId,
      ref: 'BranchSupplier', // หากมีโมเดล BranchSupplier.js
      required: true,
    },
    supplier_id: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier', // อ้างอิงโมเดล Supplier.js
      required: true,
    },
    product_id: {
      type: Schema.Types.ObjectId,
      ref: 'Product', // อ้างอิงโมเดล Product.js
      required: true,
    },
    quantity_ordered: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      default: 0,
    },
    // หากต้องการฟิลด์เพิ่มเติม เช่น default_supplier: { type: Boolean, default: false }
  },
  {
    collection: 'tb_supplier_mappings', // ชื่อตารางใน Laravel
    timestamps: true,                   // สร้าง createdAt, updatedAt ให้
  }
);

module.exports = mongoose.model('SupplierMapping', supplierMappingSchema);
