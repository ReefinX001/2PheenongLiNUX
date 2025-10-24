// Security Event Logging and Monitoring System
(function() {
    'use strict';

    const SecurityLogger = {
        // Configuration
        config: {
            maxLogs: 1000,
            encryptLogs: true,
            sendToServer: true,
            serverEndpoint: '/api/security/logs',
            batchSize: 50,
            batchInterval: 30000, // 30 seconds
            logLevels: ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL', 'ALERT'],
            enableConsoleLog: false,
            enableLocalStorage: true,
            enableIndexedDB: true,
            retentionDays: 7
        },

        // Log storage
        logs: [],
        pendingLogs: [],
        db: null,

        // Statistics
        stats: {
            totalLogs: 0,
            byLevel: {},
            byType: {},
            errors: 0,
            lastSync: null
        },

        // Initialize logger
        init: async function() {
            console.log('Security Logger initializing...');

            // Initialize statistics
            this.config.logLevels.forEach(level => {
                this.stats.byLevel[level] = 0;
            });

            // Initialize IndexedDB
            if (this.config.enableIndexedDB) {
                await this.initIndexedDB();
            }

            // Load existing logs
            await this.loadLogs();

            // Setup batch sending
            if (this.config.sendToServer) {
                setInterval(() => this.sendBatch(), this.config.batchInterval);
            }

            // Setup global error handlers
            this.setupErrorHandlers();

            // Clean old logs
            this.cleanOldLogs();

            console.log('Security Logger initialized');
        },

        // Initialize IndexedDB
        initIndexedDB: async function() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open('SecurityLogs', 1);

                request.onerror = () => {
                    console.error('Failed to open IndexedDB');
                    resolve();
                };

                request.onsuccess = (event) => {
                    this.db = event.target.result;
                    resolve();
                };

                request.onupgradeneeded = (event) => {
                    const db = event.target.result;

                    if (!db.objectStoreNames.contains('logs')) {
                        const store = db.createObjectStore('logs', {
                            keyPath: 'id',
                            autoIncrement: true
                        });

                        store.createIndex('timestamp', 'timestamp', { unique: false });
                        store.createIndex('level', 'level', { unique: false });
                        store.createIndex('type', 'type', { unique: false });
                        store.createIndex('userId', 'userId', { unique: false });
                    }
                };
            });
        },

        // Log security event
        log: async function(level, type, message, details = {}) {
            // Validate level
            if (!this.config.logLevels.includes(level)) {
                level = 'INFO';
            }

            // Create log entry
            const logEntry = {
                id: this.generateId(),
                timestamp: new Date().toISOString(),
                level: level,
                type: type,
                message: message,
                details: this.sanitizeDetails(details),
                url: window.location.href,
                userAgent: navigator.userAgent,
                userId: this.getUserId(),
                sessionId: this.getSessionId(),
                fingerprint: await this.getBrowserFingerprint()
            };

            // Add to memory
            this.logs.push(logEntry);
            this.pendingLogs.push(logEntry);

            // Update statistics
            this.updateStats(logEntry);

            // Trim if too many logs
            if (this.logs.length > this.config.maxLogs) {
                this.logs.shift();
            }

            // Store log
            await this.storeLog(logEntry);

            // Console output if enabled
            if (this.config.enableConsoleLog) {
                this.consoleOutput(logEntry);
            }

            // Send immediately if critical
            if (level === 'CRITICAL' || level === 'ALERT') {
                await this.sendImmediately(logEntry);
            }

            return logEntry;
        },

        // Shorthand logging methods
        debug: function(type, message, details) {
            return this.log('DEBUG', type, message, details);
        },

        info: function(type, message, details) {
            return this.log('INFO', type, message, details);
        },

        warning: function(type, message, details) {
            return this.log('WARNING', type, message, details);
        },

        error: function(type, message, details) {
            return this.log('ERROR', type, message, details);
        },

        critical: function(type, message, details) {
            return this.log('CRITICAL', type, message, details);
        },

        alert: function(type, message, details) {
            return this.log('ALERT', type, message, details);
        },

        // Security-specific logging
        logAuthEvent: function(event, success, details = {}) {
            const level = success ? 'INFO' : 'WARNING';
            return this.log(level, 'AUTH', event, { success, ...details });
        },

        logAccessEvent: function(resource, allowed, details = {}) {
            const level = allowed ? 'INFO' : 'WARNING';
            return this.log(level, 'ACCESS', `Access to ${resource}`, { allowed, ...details });
        },

        logSecurityEvent: function(event, severity = 'WARNING', details = {}) {
            return this.log(severity, 'SECURITY', event, details);
        },

        logDataEvent: function(action, dataType, details = {}) {
            return this.log('INFO', 'DATA', `${action} ${dataType}`, details);
        },

        logNetworkEvent: function(method, url, status, details = {}) {
            const level = status >= 400 ? 'WARNING' : 'INFO';
            return this.log(level, 'NETWORK', `${method} ${url}`, { status, ...details });
        },

        // Store log entry
        storeLog: async function(logEntry) {
            // Encrypt if configured
            if (this.config.encryptLogs && typeof CryptoAES !== 'undefined') {
                logEntry = await this.encryptLog(logEntry);
            }

            // Store in IndexedDB
            if (this.config.enableIndexedDB && this.db) {
                try {
                    const transaction = this.db.transaction(['logs'], 'readwrite');
                    const store = transaction.objectStore('logs');
                    store.add(logEntry);
                } catch (error) {
                    console.error('Failed to store log in IndexedDB:', error);
                }
            }

            // Store in localStorage
            if (this.config.enableLocalStorage) {
                try {
                    const stored = JSON.parse(localStorage.getItem('securityLogs') || '[]');
                    stored.push(logEntry);

                    // Keep only recent logs
                    if (stored.length > 100) {
                        stored.shift();
                    }

                    localStorage.setItem('securityLogs', JSON.stringify(stored));
                } catch (error) {
                    console.error('Failed to store log in localStorage:', error);
                }
            }
        },

        // Encrypt log entry
        encryptLog: async function(logEntry) {
            if (typeof CryptoAES === 'undefined') {
                return logEntry;
            }

            try {
                const encrypted = await CryptoAES.encrypt(
                    JSON.stringify(logEntry),
                    'log-encryption-key'
                );

                return {
                    encrypted: true,
                    data: encrypted,
                    timestamp: logEntry.timestamp
                };
            } catch (error) {
                console.error('Failed to encrypt log:', error);
                return logEntry;
            }
        },

        // Decrypt log entry
        decryptLog: async function(encryptedLog) {
            if (!encryptedLog.encrypted || typeof CryptoAES === 'undefined') {
                return encryptedLog;
            }

            try {
                const decrypted = await CryptoAES.decrypt(
                    encryptedLog.data,
                    'log-encryption-key'
                );

                return JSON.parse(decrypted);
            } catch (error) {
                console.error('Failed to decrypt log:', error);
                return null;
            }
        },

        // Load existing logs
        loadLogs: async function() {
            // Load from IndexedDB
            if (this.config.enableIndexedDB && this.db) {
                try {
                    const transaction = this.db.transaction(['logs'], 'readonly');
                    const store = transaction.objectStore('logs');
                    const request = store.getAll();

                    request.onsuccess = async (event) => {
                        const logs = event.target.result;
                        for (const log of logs) {
                            const decrypted = await this.decryptLog(log);
                            if (decrypted) {
                                this.logs.push(decrypted);
                                this.updateStats(decrypted);
                            }
                        }
                    };
                } catch (error) {
                    console.error('Failed to load logs from IndexedDB:', error);
                }
            }

            // Load from localStorage
            if (this.config.enableLocalStorage) {
                try {
                    const stored = JSON.parse(localStorage.getItem('securityLogs') || '[]');
                    for (const log of stored) {
                        const decrypted = await this.decryptLog(log);
                        if (decrypted && !this.logs.find(l => l.id === decrypted.id)) {
                            this.logs.push(decrypted);
                            this.updateStats(decrypted);
                        }
                    }
                } catch (error) {
                    console.error('Failed to load logs from localStorage:', error);
                }
            }
        },

        // Send logs to server
        sendBatch: async function() {
            if (this.pendingLogs.length === 0) {
                return;
            }

            const batch = this.pendingLogs.splice(0, this.config.batchSize);

            try {
                const response = await fetch(this.config.serverEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        logs: batch,
                        stats: this.stats
                    })
                });

                if (response.ok) {
                    this.stats.lastSync = new Date().toISOString();
                } else {
                    // Re-add to pending if failed
                    this.pendingLogs.unshift(...batch);
                }
            } catch (error) {
                console.error('Failed to send logs to server:', error);
                // Re-add to pending
                this.pendingLogs.unshift(...batch);
            }
        },

        // Send critical log immediately
        sendImmediately: async function(logEntry) {
            if (!this.config.sendToServer) {
                return;
            }

            try {
                await fetch(this.config.serverEndpoint + '/critical', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(logEntry)
                });
            } catch (error) {
                console.error('Failed to send critical log:', error);
            }
        },

        // Clean old logs
        cleanOldLogs: async function() {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);
            const cutoffTimestamp = cutoffDate.toISOString();

            // Clean from memory
            this.logs = this.logs.filter(log => log.timestamp > cutoffTimestamp);

            // Clean from IndexedDB
            if (this.config.enableIndexedDB && this.db) {
                try {
                    const transaction = this.db.transaction(['logs'], 'readwrite');
                    const store = transaction.objectStore('logs');
                    const index = store.index('timestamp');
                    const range = IDBKeyRange.upperBound(cutoffTimestamp);

                    index.openCursor(range).onsuccess = (event) => {
                        const cursor = event.target.result;
                        if (cursor) {
                            store.delete(cursor.primaryKey);
                            cursor.continue();
                        }
                    };
                } catch (error) {
                    console.error('Failed to clean old logs from IndexedDB:', error);
                }
            }
        },

        // Setup error handlers
        setupErrorHandlers: function() {
            // Global error handler
            window.addEventListener('error', (event) => {
                this.error('JAVASCRIPT_ERROR', event.message, {
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                    error: event.error ? event.error.stack : null
                });
            });

            // Unhandled promise rejection
            window.addEventListener('unhandledrejection', (event) => {
                this.error('UNHANDLED_PROMISE', 'Unhandled promise rejection', {
                    reason: event.reason
                });
            });

            // Security policy violations
            document.addEventListener('securitypolicyviolation', (event) => {
                this.warning('CSP_VIOLATION', 'Content Security Policy violation', {
                    blockedURI: event.blockedURI,
                    violatedDirective: event.violatedDirective,
                    originalPolicy: event.originalPolicy
                });
            });
        },

        // Helper methods
        generateId: function() {
            return Date.now().toString(36) + Math.random().toString(36).substr(2);
        },

        getUserId: function() {
            // Get user ID from session or storage
            return sessionStorage.getItem('userId') || 'anonymous';
        },

        getSessionId: function() {
            let sessionId = sessionStorage.getItem('sessionId');
            if (!sessionId) {
                sessionId = this.generateId();
                sessionStorage.setItem('sessionId', sessionId);
            }
            return sessionId;
        },

        getBrowserFingerprint: async function() {
            // Simple browser fingerprint
            const fingerprint = {
                screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                language: navigator.language,
                platform: navigator.platform,
                cores: navigator.hardwareConcurrency,
                memory: navigator.deviceMemory
            };

            // Hash the fingerprint
            if (typeof CryptoAES !== 'undefined') {
                return await CryptoAES.hash(JSON.stringify(fingerprint));
            }

            return JSON.stringify(fingerprint);
        },

        sanitizeDetails: function(details) {
            // Remove sensitive information from details
            const sanitized = { ...details };
            const sensitiveKeys = ['password', 'token', 'key', 'secret', 'credit', 'ssn'];

            Object.keys(sanitized).forEach(key => {
                if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
                    sanitized[key] = '[REDACTED]';
                } else if (typeof sanitized[key] === 'string' && sanitized[key].length > 1000) {
                    sanitized[key] = sanitized[key].substring(0, 1000) + '... [TRUNCATED]';
                }
            });

            return sanitized;
        },

        updateStats: function(logEntry) {
            this.stats.totalLogs++;
            this.stats.byLevel[logEntry.level] = (this.stats.byLevel[logEntry.level] || 0) + 1;
            this.stats.byType[logEntry.type] = (this.stats.byType[logEntry.type] || 0) + 1;

            if (logEntry.level === 'ERROR' || logEntry.level === 'CRITICAL') {
                this.stats.errors++;
            }
        },

        consoleOutput: function(logEntry) {
            const style = {
                'DEBUG': 'color: gray',
                'INFO': 'color: blue',
                'WARNING': 'color: orange',
                'ERROR': 'color: red',
                'CRITICAL': 'color: red; font-weight: bold',
                'ALERT': 'color: red; font-weight: bold; background: yellow'
            };

            console.log(
                `%c[${logEntry.level}] ${logEntry.type}: ${logEntry.message}`,
                style[logEntry.level] || '',
                logEntry.details
            );
        },

        // Public API
        getLogs: function(filter = {}) {
            let filtered = this.logs;

            if (filter.level) {
                filtered = filtered.filter(log => log.level === filter.level);
            }

            if (filter.type) {
                filtered = filtered.filter(log => log.type === filter.type);
            }

            if (filter.startDate) {
                filtered = filtered.filter(log => log.timestamp >= filter.startDate);
            }

            if (filter.endDate) {
                filtered = filtered.filter(log => log.timestamp <= filter.endDate);
            }

            return filtered;
        },

        getStats: function() {
            return { ...this.stats };
        },

        exportLogs: async function(format = 'json') {
            const logs = await this.getAllLogs();

            if (format === 'json') {
                return JSON.stringify(logs, null, 2);
            } else if (format === 'csv') {
                return this.logsToCSV(logs);
            }

            return logs;
        },

        getAllLogs: async function() {
            const allLogs = [];

            for (const log of this.logs) {
                const decrypted = log.encrypted ? await this.decryptLog(log) : log;
                if (decrypted) {
                    allLogs.push(decrypted);
                }
            }

            return allLogs;
        },

        logsToCSV: function(logs) {
            const headers = ['timestamp', 'level', 'type', 'message', 'url', 'userId'];
            const rows = logs.map(log =>
                headers.map(header => JSON.stringify(log[header] || '')).join(',')
            );

            return [headers.join(','), ...rows].join('\n');
        },

        clearLogs: async function() {
            this.logs = [];
            this.pendingLogs = [];

            // Clear IndexedDB
            if (this.config.enableIndexedDB && this.db) {
                const transaction = this.db.transaction(['logs'], 'readwrite');
                const store = transaction.objectStore('logs');
                store.clear();
            }

            // Clear localStorage
            if (this.config.enableLocalStorage) {
                localStorage.removeItem('securityLogs');
            }

            // Reset stats
            this.stats.totalLogs = 0;
            Object.keys(this.stats.byLevel).forEach(level => {
                this.stats.byLevel[level] = 0;
            });
            this.stats.byType = {};
            this.stats.errors = 0;
        }
    };

    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => SecurityLogger.init());
    } else {
        SecurityLogger.init();
    }

    // Export
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = SecurityLogger;
    } else {
        window.SecurityLogger = SecurityLogger;
    }
})();