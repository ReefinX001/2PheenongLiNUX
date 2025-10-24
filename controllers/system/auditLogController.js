/**
 * 🔍 Enhanced Audit Log Controller
 * รองรับการป้องกันการสร้างซ้ำและระบบความปลอดภัยที่เข้มงวด
 */

const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const AuditLog = require('../../models/Account/AuditLog');
const moment = require('moment');

// 🔒 Rate Limiting สำหรับ Audit API
const auditRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 นาที
  max: 100, // จำกัด 100 requests ต่อ 15 นาที
  message: {
    success: false,
    error: 'Too many audit requests, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 🔍 Enhanced Audit Log Model (in-memory for demonstration)
class AuditLogManager {
  constructor() {
    this.logs = new Map(); // เก็บ logs ใน memory
    this.duplicateCache = new Set(); // เก็บ hash ของ logs เพื่อป้องกันซ้ำ
    this.maxCacheSize = 10000; // จำกัดขนาด cache
  }

  // 🔑 Generate unique hash for duplicate detection
  generateLogHash(logData) {
    const hashInput = `${logData.userId}_${logData.action}_${logData.timestamp}_${JSON.stringify(logData.details)}`;
    return crypto.createHash('sha256').update(hashInput).digest('hex');
  }

  // ✅ Check if log is duplicate
  isDuplicate(logHash) {
    return this.duplicateCache.has(logHash);
  }

  // 💾 Add log with duplicate prevention
  addLog(logData) {
    const logHash = this.generateLogHash(logData);

    if (this.isDuplicate(logHash)) {
      // อัปเดตข้อมูลเดิมแทนการสร้างใหม่
      const existingLog = this.findLogByHash(logHash);
      if (existingLog) {
        existingLog.lastUpdated = new Date().toISOString();
        existingLog.updateCount = (existingLog.updateCount || 0) + 1;
        existingLog.details = { ...existingLog.details, ...logData.details };
        return { isNew: false, log: existingLog };
      }
    }

    // สร้าง log ใหม่
    const newLog = {
      id: logData.id || this.generateLogId(),
      hash: logHash,
      ...logData,
      createdAt: new Date().toISOString(),
      updateCount: 0,
      ipAddress: logData.ipAddress || 'unknown',
      fingerprint: this.generateFingerprint(logData)
    };

    this.logs.set(newLog.id, newLog);
    this.duplicateCache.add(logHash);

    // จำกัดขนาด cache
    if (this.duplicateCache.size > this.maxCacheSize) {
      const oldestHashes = Array.from(this.duplicateCache).slice(0, 1000);
      oldestHashes.forEach(hash => this.duplicateCache.delete(hash));
    }

    return { isNew: true, log: newLog };
  }

  // 🔍 Find log by hash
  findLogByHash(hash) {
    for (const [id, log] of this.logs) {
      if (log.hash === hash) {
        return log;
      }
    }
    return null;
  }

  // 🆔 Generate unique log ID
  generateLogId() {
    return `LOG_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  // 🖐️ Generate device fingerprint
  generateFingerprint(logData) {
    const fingerprintData = {
      userAgent: logData.userAgent,
      ipAddress: logData.ipAddress,
      deviceInfo: logData.deviceInfo
    };
    return crypto.createHash('md5').update(JSON.stringify(fingerprintData)).digest('hex');
  }

  // 📊 Get all logs with filtering
  getLogs(filters = {}) {
    let logs = Array.from(this.logs.values());

    // Apply filters
    if (filters.level) {
      logs = logs.filter(log => log.level === filters.level);
    }
    if (filters.category) {
      logs = logs.filter(log => log.category === filters.category);
    }
    if (filters.userId) {
      logs = logs.filter(log => log.userId === filters.userId);
    }
    if (filters.branchCode) {
      logs = logs.filter(log => log.branchCode === filters.branchCode);
    }
    if (filters.startDate) {
      logs = logs.filter(log => new Date(log.timestamp) >= new Date(filters.startDate));
    }
    if (filters.endDate) {
      logs = logs.filter(log => new Date(log.timestamp) <= new Date(filters.endDate));
    }
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      logs = logs.filter(log =>
        log.action.toLowerCase().includes(searchTerm) ||
        log.userName.toLowerCase().includes(searchTerm) ||
        JSON.stringify(log.details).toLowerCase().includes(searchTerm)
      );
    }

    // Sort by timestamp (newest first)
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Pagination
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 100;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    return {
      logs: logs.slice(startIndex, endIndex),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(logs.length / limit),
        totalLogs: logs.length,
        hasNextPage: endIndex < logs.length,
        hasPrevPage: page > 1
      }
    };
  }

  // 📈 Get statistics
  getStatistics() {
    const logs = Array.from(this.logs.values());
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const stats = {
      total: logs.length,
      today: logs.filter(log => new Date(log.timestamp) >= oneDayAgo).length,
      thisWeek: logs.filter(log => new Date(log.timestamp) >= oneWeekAgo).length,
      byLevel: {},
      byCategory: {},
      byUser: {},
      duplicatesPrevented: Array.from(this.logs.values()).filter(log => log.updateCount > 0).length
    };

    // Count by level
    logs.forEach(log => {
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
    });

    // Count by category
    logs.forEach(log => {
      const category = log.category || 'GENERAL';
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
    });

    // Count by user
    logs.forEach(log => {
      stats.byUser[log.userId] = (stats.byUser[log.userId] || 0) + 1;
    });

    return stats;
  }
}

// สร้าง instance ของ AuditLogManager
const auditManager = new AuditLogManager();

// 🔒 Middleware สำหรับตรวจสอบสิทธิ์บอส
const requireBossAccess = (req, res, next) => {
  // ตรวจสอบว่าผู้ใช้มีสิทธิ์เข้าถึงหรือไม่
  const userRole = req.user?.role;
  const roleName = typeof userRole === 'string' ? userRole.toLowerCase() :
                   (userRole?.name ? userRole.name.toLowerCase() : '');

  // รายการ roles ที่มีสิทธิ์เข้าถึง audit logs
  const allowedRoles = [
    'boss',
    'admin',
    'super admin',
    'ceo',
    'superuser'
  ];

  // ตรวจสอบ role โดยตรง
  const hasDirectAccess = allowedRoles.includes(roleName);

  // ตรวจสอบว่า role มี "admin" ในชื่อ
  const hasAdminAccess = roleName.includes('admin') || roleName.includes('boss');

  // ตรวจสอบ allowedPages ถ้ามี
  const allowedPages = req.user?.allowedPages || req.user?.role?.allowedPages || [];
  const hasWildcardAccess = Array.isArray(allowedPages) && allowedPages.includes('*');

  if (!hasDirectAccess && !hasAdminAccess && !hasWildcardAccess) {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Administrative privileges required.',
      code: 'INSUFFICIENT_PRIVILEGES',
      details: {
        userRole: roleName,
        requiredRoles: allowedRoles
      }
    });
  }

  next();
};

// 📝 Log audit events (from client)
const logEvents = async (req, res) => {
  try {
    const { events, logs } = req.body;
    const eventsToProcess = events || logs || [];

    if (!Array.isArray(eventsToProcess) || eventsToProcess.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No events provided',
        code: 'INVALID_INPUT'
      });
    }

    const results = [];
    let newCount = 0;
    let updateCount = 0;

    for (const eventData of eventsToProcess) {
      // เพิ่มข้อมูล IP address และ request info
      const enrichedEvent = {
        ...eventData,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        requestId: req.get('X-Request-ID'),
        serverTimestamp: new Date().toISOString()
      };

      const result = auditManager.addLog(enrichedEvent);
      results.push(result);

      if (result.isNew) {
        newCount++;
      } else {
        updateCount++;
      }
    }

    res.json({
      success: true,
      message: `Processed ${eventsToProcess.length} events`,
      summary: {
        total: eventsToProcess.length,
        new: newCount,
        updated: updateCount
      },
      details: results.map(r => ({
        id: r.log.id,
        isNew: r.isNew,
        updateCount: r.log.updateCount
      }))
    });

  } catch (error) {
    console.error('Error logging audit events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to log audit events',
      code: 'INTERNAL_ERROR'
    });
  }
};

// 📊 Get audit logs (Boss only)
const getAuditLogs = [
  requireBossAccess,
  async (req, res) => {
    try {
      const filters = {
        level: req.query.level,
        category: req.query.category,
        userId: req.query.userId,
        branchCode: req.query.branchCode,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        search: req.query.search,
        page: req.query.page,
        limit: req.query.limit
      };

      const result = auditManager.getLogs(filters);

      res.json({
        success: true,
        ...result,
        requestedBy: req.user.id,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error retrieving audit logs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve audit logs',
        code: 'INTERNAL_ERROR'
      });
    }
  }
];

// 📈 Get audit statistics (Boss only)
const getAuditStatistics = [
  requireBossAccess,
  async (req, res) => {
    try {
      const stats = auditManager.getStatistics();

      res.json({
        success: true,
        statistics: stats,
        requestedBy: req.user.id,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error retrieving audit statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve audit statistics',
        code: 'INTERNAL_ERROR'
      });
    }
  }
];

// 🔍 Get specific audit log (Boss only)
const getAuditLogById = [
  requireBossAccess,
  async (req, res) => {
    try {
      const { id } = req.params;
      const log = auditManager.logs.get(id);

      if (!log) {
        return res.status(404).json({
          success: false,
          error: 'Audit log not found',
          code: 'LOG_NOT_FOUND'
        });
      }

      res.json({
        success: true,
        log: log,
        requestedBy: req.user.id,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error retrieving audit log:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve audit log',
        code: 'INTERNAL_ERROR'
      });
    }
  }
];

// 🧹 Clear audit logs (Boss only - use with caution)
const clearAuditLogs = [
  requireBossAccess,
  async (req, res) => {
    try {
      const { confirm } = req.body;

      if (confirm !== 'CLEAR_ALL_LOGS') {
        return res.status(400).json({
          success: false,
          error: 'Confirmation required',
          code: 'CONFIRMATION_REQUIRED'
        });
      }

      const totalCleared = auditManager.logs.size;
      auditManager.logs.clear();
      auditManager.duplicateCache.clear();

      // Log this critical action
      auditManager.addLog({
        action: 'AUDIT_LOGS_CLEARED',
        level: 'CRITICAL',
        category: 'ADMIN',
        userId: req.user.id,
        userName: req.user.name,
        details: {
          totalCleared: totalCleared,
          clearedBy: req.user.id,
          reason: req.body.reason || 'Not specified'
        },
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        message: `Cleared ${totalCleared} audit logs`,
        clearedBy: req.user.id,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error clearing audit logs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to clear audit logs',
        code: 'INTERNAL_ERROR'
      });
    }
  }
];

// 📤 Export audit logs (Boss only)
const exportAuditLogs = [
  requireBossAccess,
  async (req, res) => {
    try {
      const filters = {
        level: req.query.level,
        category: req.query.category,
        userId: req.query.userId,
        branchCode: req.query.branchCode,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        search: req.query.search,
        limit: 10000 // สูงสุด 10,000 records ต่อการ export
      };

      const result = auditManager.getLogs(filters);
      const logs = result.logs;

      // สร้าง CSV
      const csvHeaders = [
        'ID', 'Timestamp', 'Action', 'Level', 'Category',
        'User ID', 'User Name', 'Branch Code', 'IP Address',
        'Details', 'Update Count'
      ];

      const csvRows = logs.map(log => [
        log.id,
        log.timestamp,
        log.action,
        log.level,
        log.category || 'GENERAL',
        log.userId,
        log.userName,
        log.branchCode || 'N/A',
        log.ipAddress || 'unknown',
        JSON.stringify(log.details).replace(/"/g, '""'),
        log.updateCount || 0
      ]);

      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);

    } catch (error) {
      console.error('Error exporting audit logs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export audit logs',
        code: 'INTERNAL_ERROR'
      });
    }
  }
];

module.exports = {
  logEvents: [auditRateLimit, logEvents],
  getAuditLogs,
  getAuditStatistics,
  getAuditLogById,
  clearAuditLogs,
  exportAuditLogs,
  auditManager // Export for testing purposes
};
