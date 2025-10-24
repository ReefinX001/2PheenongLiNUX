// models/ProductAttribute.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const productAttributeSchema = new Schema({
  product_id: {
    type: Schema.Types.ObjectId,
    ref: 'Product', // โมเดล Product
    required: true
  },
  attribute_name: { type: String, default: '' },
  attribute_value: { type: String, default: '' },
  locale: { type: String, default: '' },
}, {
  collection: 'tb_pi_attributes',
  timestamps: false
});

module.exports = mongoose.models.ProductAttribute || mongoose.model('ProductAttribute', productAttributeSchema);
