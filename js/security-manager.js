/**
 * 🔒 Security Manager
 * จัดการความปลอดภัยฝั่ง client-side
 */

class SecurityManager {
  constructor() {
    this.isInitialized = false;
    this.sessionTimeout = 30 * 60 * 1000; // 30 นาที
    this.lastActivityTime = Date.now();
    this.sessionCheckInterval = null;
    this.csrfToken = null;
    this.deviceFingerprint = null;

    this.init();
  }

  init() {
    if (this.isInitialized) return;

    this.generateDeviceFingerprint();
    this.generateCSRFToken();
    this.startSessionMonitoring();
    this.setupSecurityEventListeners();

    this.isInitialized = true;
    console.log('🔒 Security Manager initialized');
  }

  generateDeviceFingerprint() {
    this.deviceFingerprint = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      cookieEnabled: navigator.cookieEnabled,
      timestamp: Date.now(),
      hash: this.generateHash(`${navigator.userAgent}_${screen.width}_${Date.now()}`)
    };
  }

  generateCSRFToken() {
    this.csrfToken = this.generateHash(Date.now().toString() + Math.random().toString());
  }

  generateHash(input) {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  startSessionMonitoring() {
    // ตรวจสอบ session ทุก 5 นาที
    this.sessionCheckInterval = setInterval(() => {
      this.validateSession();
    }, 5 * 60 * 1000);
  }

  validateSession() {
    const now = Date.now();
    const timeSinceLastActivity = now - this.lastActivityTime;

    if (timeSinceLastActivity > this.sessionTimeout) {
      this.handleSessionTimeout();
      return false;
    }

    // ตรวจสอบ token ใน localStorage
    const token = localStorage.getItem('authToken');
    if (!token) {
      this.handleInvalidSession('no_token');
      return false;
    }

    return true;
  }

  handleSessionTimeout() {
    console.warn('🔒 Session timeout detected');

    // ส่ง audit event
    if (window.logAuditEvent) {
      window.logAuditEvent('SESSION_TIMEOUT', {
        lastActivity: new Date(this.lastActivityTime).toISOString(),
        timeout: this.sessionTimeout
      }, 'WARNING');
    }

    this.forceLogout('session_timeout');
  }

  handleInvalidSession(reason = 'unknown') {
    console.warn('🔒 Invalid session detected:', reason);

    if (window.logAuditEvent) {
      window.logAuditEvent('INVALID_SESSION', { reason }, 'WARNING');
    }

    this.forceLogout(reason);
  }

  forceLogout(reason = 'security') {
    // เคลียร์ localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');

    // แสดงข้อความเตือน
    if (window.showToast) {
      window.showToast('🔒 เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่', 'warning');
    }

    // redirect ไปหน้า login
    setTimeout(() => {
      window.location.href = '../login.html';
    }, 2000);
  }

  setupSecurityEventListeners() {
    // ตรวจจับ user activity
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    activityEvents.forEach(event => {
      document.addEventListener(event, () => {
        this.updateLastActivity();
      }, { passive: true });
    });

    // ตรวจจับการเปิด Developer Tools
    this.detectDevTools();

    // ตรวจจับการ copy/paste ที่ผิดปกติ
    this.setupClipboardSecurity();
  }

  updateLastActivity() {
    this.lastActivityTime = Date.now();
  }

  detectDevTools() {
    let devtools = {
      open: false,
      orientation: null
    };

    const threshold = 160;

    setInterval(() => {
      if (
        window.outerHeight - window.innerHeight > threshold ||
        window.outerWidth - window.innerWidth > threshold
      ) {
        if (!devtools.open) {
          devtools.open = true;
          this.handleDevToolsDetected();
        }
      } else {
        devtools.open = false;
      }
    }, 500);
  }

  handleDevToolsDetected() {
    console.warn('🔒 Developer tools detected');

    if (window.logAuditEvent) {
      window.logAuditEvent('DEVELOPER_TOOLS_DETECTED', {
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      }, 'SECURITY');
    }
  }

  setupClipboardSecurity() {
    document.addEventListener('copy', (e) => {
      // บันทึกการ copy ข้อมูลสำคัญ
      if (window.logAuditEvent) {
        window.logAuditEvent('DATA_COPIED', {
          length: e.clipboardData ? e.clipboardData.getData('text').length : 0
        }, 'INFO');
      }
    });
  }

  // Rate limiting
  checkRateLimit(action, maxAttempts = 10, timeWindow = 60000) {
    const key = `rateLimit_${action}`;
    const now = Date.now();

    let attempts = JSON.parse(localStorage.getItem(key) || '[]');

    // กรองเฉพาะ attempts ที่อยู่ใน time window
    attempts = attempts.filter(time => now - time < timeWindow);

    if (attempts.length >= maxAttempts) {
      if (window.logAuditEvent) {
        window.logAuditEvent('RATE_LIMIT_EXCEEDED', {
          action,
          attempts: attempts.length,
          maxAttempts,
          timeWindow
        }, 'WARNING');
      }
      return false;
    }

    attempts.push(now);
    localStorage.setItem(key, JSON.stringify(attempts));
    return true;
  }

  // Input sanitization
  sanitizeInput(input, type = 'text') {
    if (!input) return '';

    let sanitized = input.toString().trim();

    // ตรวจจับ patterns ที่น่าสงสัย
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+=/i,
      /eval\s*\(/i,
      /expression\s*\(/i
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(sanitized)) {
        if (window.logAuditEvent) {
          window.logAuditEvent('SUSPICIOUS_INPUT_DETECTED', {
            input: sanitized.substring(0, 100),
            pattern: pattern.toString(),
            type
          }, 'SECURITY');
        }
        sanitized = sanitized.replace(pattern, '');
      }
    }

    switch (type) {
      case 'taxId':
        sanitized = sanitized.replace(/[^0-9]/g, '').substring(0, 13);
        break;
      case 'phone':
        sanitized = sanitized.replace(/[^0-9\-+()]/g, '').substring(0, 20);
        break;
      case 'number':
        sanitized = sanitized.replace(/[^0-9.-]/g, '');
        break;
      case 'email':
        // Basic email sanitization
        sanitized = sanitized.toLowerCase().replace(/[^a-z0-9@._-]/g, '');
        break;
      case 'text':
      default:
        // Remove dangerous characters
        sanitized = sanitized.replace(/[<>\"'&]/g, '');
        break;
    }

    return sanitized;
  }

  // Validate session token
  async validateTokenWithServer() {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return false;

      const response = await fetch('/api/auth/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
          fingerprint: this.deviceFingerprint,
          csrfToken: this.csrfToken
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }

  // Cleanup when page unloads
  cleanup() {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
    }
  }

  // Get device fingerprint
  getDeviceFingerprint() {
    return this.deviceFingerprint;
  }

  // Get CSRF token
  getCSRFToken() {
    return this.csrfToken;
  }
}

// สร้าง instance เดียวสำหรับทั้งระบบ
window.securityManager = new SecurityManager();

// Cleanup เมื่อออกจากหน้า
window.addEventListener('beforeunload', () => {
  window.securityManager.cleanup();
});

console.log('🔒 Security Manager loaded');