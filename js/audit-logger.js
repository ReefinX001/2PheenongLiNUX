/**
 * 🔍 Enhanced Audit Logger
 * จัดการการบันทึก audit log ฝั่ง client-side
 */

class AuditLogger {
  constructor() {
    this.buffer = [];
    this.maxBufferSize = 10;
    this.flushInterval = 30000; // 30 วินาที
    this.retryAttempts = 3;
    this.retryDelay = 5000; // 5 วินาที
    this.duplicateHashes = new Set();
    this.maxHashCache = 10000;

    this.isOnline = navigator.onLine;
    this.setupNetworkListeners();
    this.startAutoFlush();

    console.log('🔍 Audit Logger initialized');
  }

  generateEventId() {
    return 'LOG_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  }

  generateEventHash(event) {
    const hashInput = `${event.action}_${event.details.branchCode}_${event.details.productId || ''}_${event.timestamp}`;

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < hashInput.length; i++) {
      const char = hashInput.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  isDuplicateEvent(event) {
    const hash = this.generateEventHash(event);

    if (this.duplicateHashes.has(hash)) {
      return true;
    }

    // เพิ่ม hash ใหม่และจัดการขนาดของ cache
    this.duplicateHashes.add(hash);

    // ถ้า cache ใหญ่เกินไป ให้ลบ hash เก่าออก
    if (this.duplicateHashes.size > this.maxHashCache) {
      const hashArray = Array.from(this.duplicateHashes);
      for (let i = 0; i < this.maxHashCache / 2; i++) {
        this.duplicateHashes.delete(hashArray[i]);
      }
    }

    return false;
  }

  logEvent(action, details = {}, level = 'INFO') {
    const event = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      action: action,
      level: level,
      userId: localStorage.getItem('userId') || 'unknown',
      userName: localStorage.getItem('userName') || 'guest',
      sessionId: this.getSessionId(),
      branchCode: details.branchCode || window.BRANCH_CODE || 'unknown',
      ipAddress: 'client-side',
      userAgent: navigator.userAgent,
      url: window.location.href,
      details: {
        ...details,
        performanceMetrics: this.getPerformanceMetrics(),
        memoryUsage: this.getMemoryUsage(),
        deviceInfo: window.securityManager?.getDeviceFingerprint() || {}
      }
    };

    // ตรวจสอบ duplicate
    if (this.isDuplicateEvent(event)) {
      console.log('🔍 Duplicate event detected, skipping:', action);
      return;
    }

    // เพิ่มลงใน buffer
    this.buffer.push(event);

    console.log(`🔍 Event logged: ${action} (${level})`);

    // Flush ทันทีสำหรับ event สำคัญ
    if (level === 'ERROR' || level === 'CRITICAL' || level === 'SECURITY') {
      this.flushBuffer();
    } else if (this.buffer.length >= this.maxBufferSize) {
      this.flushBuffer();
    }
  }

  getSessionId() {
    let sessionId = sessionStorage.getItem('auditSessionId');
    if (!sessionId) {
      sessionId = 'SESSION_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
      sessionStorage.setItem('auditSessionId', sessionId);
    }
    return sessionId;
  }

  getPerformanceMetrics() {
    if (!window.performance) return {};

    const navigation = performance.getEntriesByType('navigation')[0];

    return {
      loadTime: navigation ? Math.round(navigation.loadEventEnd - navigation.loadEventStart) : 0,
      domContentLoaded: navigation ? Math.round(navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart) : 0,
      timeOrigin: performance.timeOrigin,
      now: Math.round(performance.now())
    };
  }

  getMemoryUsage() {
    if (!window.performance || !window.performance.memory) return {};

    const memory = window.performance.memory;
    return {
      usedJSHeapSize: Math.round(memory.usedJSHeapSize / 1024 / 1024 * 100) / 100, // MB
      totalJSHeapSize: Math.round(memory.totalJSHeapSize / 1024 / 1024 * 100) / 100, // MB
      jsHeapSizeLimit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024 * 100) / 100 // MB
    };
  }

  async flushBuffer() {
    if (this.buffer.length === 0 || !this.isOnline) {
      return;
    }

    const events = [...this.buffer];
    this.buffer = [];

    try {
      await this.sendEvents(events);
      console.log(`🔍 Successfully sent ${events.length} audit events`);
    } catch (error) {
      console.error('🔍 Failed to send audit events:', error);

      // ใส่กลับไปใน buffer สำหรับลองใหม่ภายหลัง
      this.buffer.unshift(...events);

      // จำกัดขนาด buffer ไม่ให้ใหญ่เกินไป
      if (this.buffer.length > this.maxBufferSize * 3) {
        this.buffer = this.buffer.slice(0, this.maxBufferSize * 2);
      }

      this.scheduleRetry();
    }
  }

  async sendEvents(events, attempt = 1) {
    const token = localStorage.getItem('authToken');

    if (!token) {
      throw new Error('No authentication token available');
    }

    const response = await fetch('/api/audit/log-events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ events }),
      signal: AbortSignal.timeout(10000) // 10 วินาที timeout
    });

    if (!response.ok) {
      if (response.status === 429) {
        // Rate limited - รอนานขึ้น
        throw new Error(`Rate limited (attempt ${attempt})`);
      } else if (response.status === 401) {
        // Token expired
        if (window.securityManager) {
          window.securityManager.handleInvalidSession('token_expired');
        }
        throw new Error('Authentication failed');
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Server error');
    }

    return result;
  }

  scheduleRetry() {
    setTimeout(() => {
      if (this.buffer.length > 0 && this.isOnline) {
        this.flushBuffer();
      }
    }, this.retryDelay);
  }

  startAutoFlush() {
    setInterval(() => {
      this.flushBuffer();
    }, this.flushInterval);
  }

  setupNetworkListeners() {
    window.addEventListener('online', () => {
      console.log('🔍 Network online - resuming audit logging');
      this.isOnline = true;
      this.flushBuffer();
    });

    window.addEventListener('offline', () => {
      console.log('🔍 Network offline - audit events will be buffered');
      this.isOnline = false;
    });
  }

  // สำหรับ export เพื่อใช้ในไฟล์อื่น
  forceFlush() {
    return this.flushBuffer();
  }

  getBufferStatus() {
    return {
      bufferSize: this.buffer.length,
      isOnline: this.isOnline,
      duplicateHashCount: this.duplicateHashes.size
    };
  }

  clearBuffer() {
    this.buffer = [];
    console.log('🔍 Audit buffer cleared');
  }

  // Cleanup เมื่อออกจากหน้า
  cleanup() {
    // ส่งข้อมูลที่เหลือก่อนออก (แบบ synchronous)
    if (this.buffer.length > 0) {
      const events = [...this.buffer];
      const token = localStorage.getItem('authToken');

      if (token && navigator.sendBeacon) {
        const data = new Blob([JSON.stringify({ events })], { type: 'application/json' });
        navigator.sendBeacon('/api/audit/log-events', data);
      }
    }
  }
}

// สร้าง instance เดียวสำหรับทั้งระบบ
window.auditLogger = new AuditLogger();

// ฟังก์ชัน helper สำหรับใช้งานง่าย
window.logAuditEvent = function(action, details = {}, level = 'INFO') {
  if (window.auditLogger) {
    window.auditLogger.logEvent(action, details, level);
  }
};

window.flushAuditBuffer = function() {
  if (window.auditLogger) {
    return window.auditLogger.forceFlush();
  }
};

// Cleanup เมื่อออกจากหน้า
window.addEventListener('beforeunload', () => {
  if (window.auditLogger) {
    window.auditLogger.cleanup();
  }
});

console.log('🔍 Audit Logger loaded');
