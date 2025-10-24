// models/ProductCategory.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const productCategorySchema = new Schema({
  parent_id: {
    type: Schema.Types.ObjectId,
    ref: 'ProductCategory', // ถ้าทำ Category ซ้อนกัน
    default: null
  },
  name: { type: String, default: '' },
  slug: { type: String, default: '' },
  priority: { type: Number, default: 0 },
  description: { type: String, default: '' },
  status: { type: String, default: 'active' },

  // SoftDelete
  deleted_at: { type: Date, default: null },
}, {
  collection: 'tb_pi_categories',
  timestamps: true
});

/**
 * softDelete
 */
productCategorySchema.methods.softDelete = function () {
  this.deleted_at = new Date();
  return this.save();
};

/**
 * Virtual Relationship
 * products => hasMany(Product::class, 'category_id')
 */
productCategorySchema.virtual('products', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'category_id'
});

/**
 * parent => belongsTo(ProductCategory::class, 'parent_id')
 * children => hasMany(ProductCategory::class, 'parent_id')
 */
productCategorySchema.virtual('parentCategory', {
  ref: 'ProductCategory',
  localField: 'parent_id',
  foreignField: '_id',
  justOne: true
});

productCategorySchema.virtual('children', {
  ref: 'ProductCategory',
  localField: '_id',
  foreignField: 'parent_id'
});

productCategorySchema.set('toObject', { virtuals: true });
productCategorySchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('ProductCategory', productCategorySchema);
