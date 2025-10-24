const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['general', 'urgent', 'info', 'warning', 'success'],
    default: 'general'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  author: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    department: {
      type: String,
      default: ''
    }
  },
  department: {
    type: String,
    default: 'all' // 'all' สำหรับทุกแผนก หรือระบุแผนกเฉพาะ
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'published'
  },
  publishDate: {
    type: Date,
    default: Date.now
  },
  expiryDate: {
    type: Date,
    default: null // null = ไม่มีวันหมดอายุ
  },
  isSticky: {
    type: Boolean,
    default: false // ติดหน้าแรกเสมอ
  },
  tags: [{
    type: String,
    trim: true
  }],
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimeType: String
  }],
  views: {
    type: Number,
    default: 0
  },
  readBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Index สำหรับการค้นหา
announcementSchema.index({ title: 'text', content: 'text' });
announcementSchema.index({ publishDate: -1 });
announcementSchema.index({ department: 1, status: 1 });
announcementSchema.index({ isSticky: -1, publishDate: -1 });

// Add pagination plugin
announcementSchema.plugin(mongoosePaginate);

// Virtual สำหรับการนับจำนวนผู้อ่าน
announcementSchema.virtual('readCount').get(function() {
  return this.readBy ? this.readBy.length : 0;
});

// Method เพื่อตรวจสอบว่าหมดอายุหรือไม่
announcementSchema.methods.isExpired = function() {
  if (!this.expiryDate) return false;
  return new Date() > this.expiryDate;
};

// Method เพื่อตรวจสอบว่าผู้ใช้อ่านแล้วหรือไม่
announcementSchema.methods.isReadBy = function(userId) {
  return this.readBy.some(read => read.userId.toString() === userId.toString());
};

// Static method สำหรับดึงประกาศล่าสุด
announcementSchema.statics.getLatest = function(limit = 5, department = 'all') {
  const query = {
    status: 'published'
  };

  // Filter by expiry date
  query.$and = [
    {
      $or: [
        { expiryDate: null },
        { expiryDate: { $gt: new Date() } }
      ]
    }
  ];

  // Filter by department
  if (department !== 'all') {
    query.$and.push({
      $or: [
        { department: 'all' },
        { department: department }
      ]
    });
  }

  return this.find(query)
    .sort({ isSticky: -1, publishDate: -1 })
    .limit(limit)
    .populate('author.id', 'name email')
    .lean();
};

module.exports = mongoose.model('Announcement', announcementSchema);
