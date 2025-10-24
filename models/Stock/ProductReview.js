// models/ProductReview.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const productReviewSchema = new Schema({
  product_id: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  customer_id: {
    type: Schema.Types.ObjectId,
    ref: 'Customer', // โมเดล Customer.js ถ้ามี
    default: null
  },
  rating: { type: Number, default: 0 },
  review: { type: String, default: '' },
  status: { type: String, default: 'pending' }
}, {
  collection: 'tb_pi_reviews',
  timestamps: false
});

module.exports = mongoose.model('ProductReview', productReviewSchema);
