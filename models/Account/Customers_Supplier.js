const mongoose = require('mongoose');

const SupplierSchema = new mongoose.Schema({
  name:    { type: String, required: true },
  address: String,
  taxId:   String,
  phone:   String,
  email:   String,
  // ... field เพิ่มเติมตามต้องการ
}, { timestamps: true });

// Guard against OverwriteModelError
module.exports = mongoose.models.Supplier
  || mongoose.model('Supplier', SupplierSchema);
