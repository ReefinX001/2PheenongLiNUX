const mongoose = require('mongoose');

const contactsSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Contact', contactsSchema);
