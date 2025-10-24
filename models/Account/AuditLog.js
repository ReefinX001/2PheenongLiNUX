// models/AuditLog.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

// สร้าง Schema
const auditLogSchema = new Schema({
  // User Information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  userName: {
    type: String,
    required: true
  },
  userRole: {
    type: String,
    required: true
  },
  userBranch: String,

  // Action Details - Remove enum to allow any action
  action: {
    type: String,
    required: true,
    index: true
  },
  resource: {
    type: String,
    required: true,
    index: true
  },
  resourceId: String,
  resourceName: String,

  // Changes Tracking
  changes: {
    before: {
      type: mongoose.Schema.Types.Mixed
    },
    after: {
      type: mongoose.Schema.Types.Mixed
    },
    fields: [String] // List of changed fields
  },

  // Request Information
  method: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  },
  endpoint: String,
  ipAddress: String,
  userAgent: String,

  // Location & Device
  location: {
    branch: String,
    department: String,
    country: String,
    city: String
  },
  device: {
    type: mongoose.Schema.Types.Mixed // Allow both string and object
  },

  // Status & Performance
  status: {
    type: String,
    enum: ['success', 'failed', 'unauthorized', 'error'],
    default: 'success',
    index: true
  },
  errorMessage: String,
  responseTime: Number, // in milliseconds

  // Additional Context
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },

  // Severity Level
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'INFO'],
    default: 'INFO'
  },

  // Details object for additional data
  details: {
    type: mongoose.Schema.Types.Mixed
  },

  // Timestamps
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Indexes for performance
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ resource: 1, action: 1, timestamp: -1 });
auditLogSchema.index({ status: 1, timestamp: -1 });

// Static method to create audit log
auditLogSchema.statics.logActivity = async function(req, action, resource, resourceId, options = {}) {
  try {
    const user = req.user;
    const startTime = req._startTime || Date.now();

    const logData = {
      userId: user.id,
      userName: user.employee?.name || user.username,
      userRole: user.role,
      userBranch: user.branch,
      action,
      resource,
      resourceId,
      resourceName: options.resourceName,
      method: req.method,
      endpoint: req.originalUrl,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      location: {
        branch: user.branch || user.employee?.department,
        department: user.employee?.department
      },
      status: options.status || 'success',
      errorMessage: options.error,
      responseTime: Date.now() - startTime,
      changes: options.changes,
      metadata: options.metadata,
      details: options.details,
      severity: options.severity || 'INFO'
    };

    // Parse user agent for device info
    if (req.headers['user-agent']) {
      const ua = req.headers['user-agent'];
      logData.device = {
        type: /mobile/i.test(ua) ? 'mobile' : 'desktop',
        browser: getBrowser(ua),
        os: getOS(ua)
      };
    }

    await this.create(logData);
  } catch (error) {
    console.error('Audit log error:', error);
    // Don't throw error to prevent disrupting main flow
  }
};

// Helper functions
function getBrowser(userAgent) {
  if (/chrome/i.test(userAgent)) return 'Chrome';
  if (/firefox/i.test(userAgent)) return 'Firefox';
  if (/safari/i.test(userAgent)) return 'Safari';
  if (/edge/i.test(userAgent)) return 'Edge';
  return 'Other';
}

function getOS(userAgent) {
  if (/windows/i.test(userAgent)) return 'Windows';
  if (/mac/i.test(userAgent)) return 'MacOS';
  if (/linux/i.test(userAgent)) return 'Linux';
  if (/android/i.test(userAgent)) return 'Android';
  if (/ios/i.test(userAgent)) return 'iOS';
  return 'Other';
}

// Virtual for formatted timestamp
auditLogSchema.virtual('formattedTimestamp').get(function() {
  return this.timestamp.toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

// ส่งออกเป็นโมเดลชื่อ AuditLog
module.exports = mongoose.model('AuditLog', auditLogSchema);
