const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: false,
    trim: true,
    default: 'Product'
  },
  name_en: {
    type: String,
    trim: true
  },
  tagline: {
    type: String,
    trim: true
  },
  price: {
    type: String,
    trim: true
  },
  subtitle: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['iphone', 'ipad', 'android', 'accessories', 'mac', 'watch']
  },
  image: {
    type: String,
    required: true
  },
  thumbnailImage: {
    type: String
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  clickCount: {
    type: Number,
    default: 0
  },
  tags: [{
    type: String,
    trim: true
  }],
  specifications: {
    type: Map,
    of: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for search
ProductSchema.index({ name: 'text', tagline: 'text', subtitle: 'text' });
ProductSchema.index({ category: 1, isActive: 1, order: 1 });
ProductSchema.index({ isFeatured: 1, isActive: 1 });

module.exports = mongoose.model('FrontStoreProduct', ProductSchema);
