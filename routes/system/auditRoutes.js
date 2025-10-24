/**
 * 🔍 Enhanced Audit Routes
 * เส้นทาง API สำหรับระบบ audit log ที่ปรับปรุงใหม่
 */

const express = require('express');
const router = express.Router();
const {
    logEvents,
    getAuditLogs,
    getAuditStatistics,
    getAuditLogById,
    clearAuditLogs,
    exportAuditLogs
} = require('../../controllers/system/auditLogController');

const authenticateToken = require('../../middlewares/authJWT');

// 🔒 Middleware สำหรับตรวจสอบสิทธิ์
router.use(authenticateToken);

// 📝 Log audit events (from client applications)
// POST /api/audit/logs
router.post('/logs', logEvents);

// 📝 Alternative endpoint for compatibility
// POST /api/audit/log-events
router.post('/log-events', logEvents);

// 📊 Get audit logs (Boss only)
// GET /api/audit/logs?page=1&limit=50&level=ERROR&category=SECURITY
router.get('/logs', getAuditLogs);

// 📈 Get audit statistics (Boss only)
// GET /api/audit/statistics
router.get('/statistics', getAuditStatistics);

// 📈 Alternative endpoint for stats
// GET /api/audit/stats
router.get('/stats', getAuditStatistics);

// 🔍 Get specific audit log by ID (Boss only)
// GET /api/audit/logs/:id
router.get('/logs/:id', getAuditLogById);

// 🧹 Clear all audit logs (Boss only - DANGEROUS)
// DELETE /api/audit/logs
router.delete('/logs', clearAuditLogs);

// 📤 Export audit logs (Boss only)
// GET /api/audit/export?format=csv&startDate=2024-01-01
router.get('/export', exportAuditLogs);

// 📤 Alternative export endpoint
// GET /api/audit/logs/export
router.get('/logs/export', exportAuditLogs);

// 🏥 Health check endpoint
// GET /api/audit/health
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Audit service is healthy',
        timestamp: new Date().toISOString(),
        version: '2.0.0'
    });
});

// 📊 Get system metrics
// GET /api/audit/metrics
router.get('/metrics', (req, res) => {
    try {
        const { auditManager } = require('../../controllers/system/auditLogController');

        const metrics = {
            totalLogs: auditManager.logs.size,
            cacheSize: auditManager.duplicateCache.size,
            memoryUsage: process.memoryUsage(),
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        };

        res.json({
            success: true,
            metrics: metrics
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get metrics',
            code: 'METRICS_ERROR'
        });
    }
});

module.exports = router;
