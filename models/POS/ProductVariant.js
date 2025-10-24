// models/ProductVariant.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const productVariantSchema = new Schema({
  product_id: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: { type: String, default: '' },
  storage: { type: String, default: '' },
  color: { type: String, default: '' },
  price: { type: Number, default: 0 },
  model: { type: String, default: '' },
  item_code: { type: String, default: '' },
  barcode: { type: String, default: '' },
  warranty_period: { type: String, default: '' },
  reference_code: { type: String, default: '' },
  description: { type: String, default: '' },
  status: { type: String, default: 'active' }
}, {
  collection: 'tb_pi_variants',
  timestamps: false
});

module.exports = mongoose.model('ProductVariant', productVariantSchema);
