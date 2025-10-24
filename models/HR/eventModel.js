const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  date:        { type: Date,   required: true },
  type:        { type: String, enum: ['holiday','labor','other','meeting','training','social'], default: 'other' },
  description: { type: String },
  color:       { type: String, required: true },
}, {
  timestamps: true
});

module.exports = mongoose.model('Event', eventSchema);
