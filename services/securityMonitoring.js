// Security Monitoring and Audit Service
const EventEmitter = require('events');
const crypto = require('crypto');

class SecurityMonitor extends EventEmitter {
  constructor() {
    super();
    this.events = [];
    this.alerts = [];
    this.thresholds = {
      failedLogins: 5,
      suspiciousRequests: 10,
      rateLimit: 100,
      fileUploadSize: 5 * 1024 * 1024
    };
    this.initializeMonitoring();
  }

  initializeMonitoring() {
    // Set up event listeners
    this.on('security_event', this.handleSecurityEvent.bind(this));
    this.on('alert', this.handleAlert.bind(this));

    // Clean up old events periodically
    setInterval(() => this.cleanupOldEvents(), 60 * 60 * 1000); // Every hour
  }

  /**
   * Log security event
   */
  logEvent(type, severity, details) {
    const event = {
      id: crypto.randomBytes(16).toString('hex'),
      timestamp: new Date(),
      type,
      severity, // 'low', 'medium', 'high', 'critical'
      details,
      handled: false
    };

    this.events.push(event);
    this.emit('security_event', event);

    // Check if alert is needed
    if (severity === 'high' || severity === 'critical') {
      this.createAlert(event);
    }

    return event.id;
  }

  /**
   * Handle security event
   */
  handleSecurityEvent(event) {
    console.log(`[SECURITY EVENT] ${event.severity.toUpperCase()}: ${event.type}`, event.details);

    // Analyze patterns
    this.analyzePatterns(event);

    // Store in database (if configured)
    this.storeEvent(event);

    // Send to external monitoring (if configured)
    if (process.env.ENABLE_SECURITY_MONITORING === 'true') {
      this.sendToExternalMonitoring(event);
    }
  }

  /**
   * Analyze security patterns
   */
  analyzePatterns(event) {
    const recentEvents = this.getRecentEvents(5 * 60 * 1000); // Last 5 minutes

    // Check for brute force attempts
    if (event.type === 'FAILED_LOGIN') {
      const failedLogins = recentEvents.filter(e =>
        e.type === 'FAILED_LOGIN' &&
        e.details.ip === event.details.ip
      );

      if (failedLogins.length >= this.thresholds.failedLogins) {
        this.createAlert({
          type: 'BRUTE_FORCE_DETECTED',
          severity: 'high',
          details: {
            ip: event.details.ip,
            attempts: failedLogins.length,
            timespan: '5 minutes'
          }
        });
      }
    }

    // Check for scanning attempts
    if (event.type === 'INVALID_ENDPOINT') {
      const scanAttempts = recentEvents.filter(e =>
        e.type === 'INVALID_ENDPOINT' &&
        e.details.ip === event.details.ip
      );

      if (scanAttempts.length >= 10) {
        this.createAlert({
          type: 'SCANNING_DETECTED',
          severity: 'high',
          details: {
            ip: event.details.ip,
            attempts: scanAttempts.length,
            endpoints: scanAttempts.map(e => e.details.path)
          }
        });
      }
    }

    // Check for SQL injection attempts
    if (event.type === 'SQL_INJECTION_ATTEMPT') {
      this.createAlert({
        type: 'SQL_INJECTION_DETECTED',
        severity: 'critical',
        details: event.details
      });
    }
  }

  /**
   * Create security alert
   */
  createAlert(event) {
    const alert = {
      id: crypto.randomBytes(16).toString('hex'),
      timestamp: new Date(),
      event,
      notified: false,
      acknowledged: false
    };

    this.alerts.push(alert);
    this.emit('alert', alert);

    return alert.id;
  }

  /**
   * Handle security alert
   */
  handleAlert(alert) {
    console.error(`[SECURITY ALERT] ${alert.event.type}:`, alert.event.details);

    // Send notifications
    this.sendAlertNotifications(alert);

    // Take automatic actions based on alert type
    this.takeAutomaticAction(alert);
  }

  /**
   * Send alert notifications
   */
  async sendAlertNotifications(alert) {
    // Email notification
    if (process.env.SECURITY_ALERT_EMAIL) {
      // Send email using your email service
      console.log(`Sending security alert email to ${process.env.SECURITY_ALERT_EMAIL}`);
    }

    // Slack/Discord webhook
    if (process.env.SECURITY_WEBHOOK_URL) {
      try {
        const axios = require('axios');
        await axios.post(process.env.SECURITY_WEBHOOK_URL, {
          text: `🚨 Security Alert: ${alert.event.type}`,
          attachments: [{
            color: alert.event.severity === 'critical' ? 'danger' : 'warning',
            fields: [
              {
                title: 'Severity',
                value: alert.event.severity.toUpperCase(),
                short: true
              },
              {
                title: 'Timestamp',
                value: alert.timestamp.toISOString(),
                short: true
              },
              {
                title: 'Details',
                value: JSON.stringify(alert.event.details, null, 2)
              }
            ]
          }]
        });
      } catch (error) {
        console.error('Failed to send webhook notification:', error);
      }
    }

    alert.notified = true;
  }

  /**
   * Take automatic action based on alert
   */
  takeAutomaticAction(alert) {
    switch (alert.event.type) {
      case 'BRUTE_FORCE_DETECTED':
        // Block IP temporarily
        this.blockIP(alert.event.details.ip, 60 * 60 * 1000); // 1 hour
        break;

      case 'SQL_INJECTION_DETECTED':
        // Block IP permanently
        this.blockIP(alert.event.details.ip, null);
        break;

      case 'SCANNING_DETECTED':
        // Rate limit IP more strictly
        this.strictRateLimit(alert.event.details.ip);
        break;
    }
  }

  /**
   * Block IP address
   */
  blockIP(ip, duration) {
    const blockedIPs = global.blockedIPs || new Set();
    blockedIPs.add(ip);
    global.blockedIPs = blockedIPs;

    console.log(`[SECURITY] Blocked IP: ${ip}`);

    if (duration) {
      setTimeout(() => {
        blockedIPs.delete(ip);
        console.log(`[SECURITY] Unblocked IP: ${ip}`);
      }, duration);
    }
  }

  /**
   * Apply strict rate limiting to IP
   */
  strictRateLimit(ip) {
    const strictRateLimitIPs = global.strictRateLimitIPs || new Set();
    strictRateLimitIPs.add(ip);
    global.strictRateLimitIPs = strictRateLimitIPs;

    console.log(`[SECURITY] Applied strict rate limit to IP: ${ip}`);
  }

  /**
   * Get recent events
   */
  getRecentEvents(timespan = 60 * 60 * 1000) {
    const cutoff = new Date(Date.now() - timespan);
    return this.events.filter(e => e.timestamp > cutoff);
  }

  /**
   * Store event in database
   */
  async storeEvent(event) {
    // Implement database storage
    // This would typically store in MongoDB or a specialized logging service
  }

  /**
   * Send to external monitoring service
   */
  async sendToExternalMonitoring(event) {
    // Integrate with services like:
    // - Datadog
    // - New Relic
    // - Sentry
    // - ELK Stack
  }

  /**
   * Clean up old events
   */
  cleanupOldEvents() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours
    this.events = this.events.filter(e => e.timestamp > cutoff);
    this.alerts = this.alerts.filter(a => a.timestamp > cutoff);
  }

  /**
   * Generate security report
   */
  generateReport(timespan = 24 * 60 * 60 * 1000) {
    const events = this.getRecentEvents(timespan);
    const alerts = this.alerts.filter(a =>
      a.timestamp > new Date(Date.now() - timespan)
    );

    const report = {
      timespan: {
        from: new Date(Date.now() - timespan),
        to: new Date()
      },
      summary: {
        totalEvents: events.length,
        totalAlerts: alerts.length,
        criticalAlerts: alerts.filter(a => a.event.severity === 'critical').length,
        highAlerts: alerts.filter(a => a.event.severity === 'high').length
      },
      eventsByType: {},
      topIPs: {},
      recommendations: []
    };

    // Count events by type
    events.forEach(event => {
      report.eventsByType[event.type] = (report.eventsByType[event.type] || 0) + 1;

      if (event.details.ip) {
        report.topIPs[event.details.ip] = (report.topIPs[event.details.ip] || 0) + 1;
      }
    });

    // Sort top IPs
    report.topIPs = Object.entries(report.topIPs)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .reduce((acc, [ip, count]) => ({ ...acc, [ip]: count }), {});

    // Add recommendations
    if (report.summary.criticalAlerts > 0) {
      report.recommendations.push('Critical security events detected. Review logs immediately.');
    }
    if (report.eventsByType['FAILED_LOGIN'] > 50) {
      report.recommendations.push('High number of failed login attempts. Consider implementing CAPTCHA.');
    }
    if (Object.keys(report.topIPs).length > 0) {
      report.recommendations.push('Review top IP addresses for potential blocking.');
    }

    return report;
  }
}

// Middleware for security monitoring
const securityMonitoringMiddleware = (monitor) => {
  return (req, res, next) => {
    // Log request
    const requestInfo = {
      ip: req.ip,
      method: req.method,
      path: req.path,
      userAgent: req.get('user-agent'),
      userId: req.user?.userId
    };

    // Check blocked IPs
    if (global.blockedIPs?.has(req.ip)) {
      monitor.logEvent('BLOCKED_IP_ACCESS', 'medium', requestInfo);
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Monitor response
    const originalSend = res.send;
    res.send = function(data) {
      // Log security-relevant responses
      if (res.statusCode === 401) {
        monitor.logEvent('UNAUTHORIZED_ACCESS', 'medium', requestInfo);
      } else if (res.statusCode === 403) {
        monitor.logEvent('FORBIDDEN_ACCESS', 'medium', requestInfo);
      } else if (res.statusCode >= 500) {
        monitor.logEvent('SERVER_ERROR', 'high', {
          ...requestInfo,
          statusCode: res.statusCode
        });
      }

      originalSend.call(this, data);
    };

    next();
  };
};

// Create singleton instance
const securityMonitor = new SecurityMonitor();

module.exports = {
  securityMonitor,
  securityMonitoringMiddleware
};