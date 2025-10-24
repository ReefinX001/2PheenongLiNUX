const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  subtitle: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  image: {
    type: String, // URL to promotion image
    required: true
  },
  thumbnailImage: {
    type: String // Smaller version for list view
  },
  price: {
    type: String,
    trim: true
  },
  originalPrice: {
    type: String,
    trim: true
  },
  discountPercent: {
    type: Number,
    min: 0,
    max: 100
  },
  promotionType: {
    type: String,
    enum: ['product', 'category', 'general', 'bundle'],
    default: 'general'
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FrontStoreCategory'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  order: {
    type: Number,
    default: 0
  },
  clickCount: {
    type: Number,
    default: 0
  },
  link: {
    type: String,
    trim: true
  },
  cardStyle: {
    backgroundColor: {
      type: String,
      default: '#007AFF'
    },
    textColor: {
      type: String,
      default: '#FFFFFF'
    },
    size: {
      type: String,
      enum: ['small', 'medium', 'large'],
      default: 'medium'
    }
  },
  tags: [{
    type: String,
    trim: true
  }],
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

// Virtual for checking if promotion is currently active
promotionSchema.virtual('isCurrentlyActive').get(function() {
  const now = new Date();
  const isWithinDateRange = (!this.startDate || this.startDate <= now) &&
                           (!this.endDate || this.endDate >= now);
  return this.isActive && isWithinDateRange;
});

// Index for searching and filtering
promotionSchema.index({ title: 'text', description: 'text' });
promotionSchema.index({ isActive: 1, startDate: 1, endDate: 1 });
promotionSchema.index({ promotionType: 1, isActive: 1 });
promotionSchema.index({ order: 1, isFeatured: -1 });
promotionSchema.index({ category: 1, isActive: 1 });

const Promotion = mongoose.model('FrontStorePromotion', promotionSchema);

module.exports = Promotion;
