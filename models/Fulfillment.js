// models/Fulfillment.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const fulfillmentSchema = new Schema({
  order_id: {
    type: Schema.Types.ObjectId,
    ref: 'Order', // โมเดล Order.js
    required: true
  },
  fulfillment_date: {
    type: Date,
    default: Date.now
  },
  tracking_number: {
    type: String,
    default: ''
  },
  carrier: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    default: 'pending' // หรือค่าตามต้องการ
  }
}, {
  collection: 'tb_orders_fulfillments',
  timestamps: false
});

module.exports = mongoose.model('Fulfillment', fulfillmentSchema);
