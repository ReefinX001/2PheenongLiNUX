// models/Notification.js
const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: [
      'warning',        // General warning
      'notice',         // General notice
      'payroll',        // Payroll alerts
      'other',          // Other English type
      'เตือนการลา',     // Leave reminder
      'เตือนการมาสาย',  // Late reminder
      'เตือนพฤติกรรม',  // Behavior reminder
      'เตือนผลงาน',     // Performance reminder
      'อื่นๆ'           // Other Thai type
    ],
    required: true,
  },
  level: {
    type: Number,
    default: 0,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  fine: {
    type: Number,
    default: 0,
  },
  actionNeeded: {
    type: String,
    default: '',
  },
  department: {
    type: String,
    default: 'HR',
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, {
  collection: 'notifications',
  timestamps: true,
});

module.exports = mongoose.model('Notification', NotificationSchema);
