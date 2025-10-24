/**
 * Monitoring Service for uTrust 2700 R Card Reader
 * Handles health checks and performance monitoring
 */

const os = require('os');
const logger = require('../utils/logger');
const config = require('../config/config-manager');

class MonitoringService {
  constructor() {
    this.isRunning = false;
    this.healthCheckInterval = null;
    this.metrics = {
      startTime: Date.now(),
      totalRequests: 0,
      totalErrors: 0,
      lastHealthCheck: null,
      systemInfo: null
    };
  }

  /**
   * Start monitoring service
   */
  async start() {
    try {
      logger.info('Starting monitoring service...');

      // Collect initial system information
      this.collectSystemInfo();

      // Start health check interval
      if (config.get('monitoring.healthCheck.enabled')) {
        const interval = config.get('monitoring.healthCheck.interval', 30000);
        this.healthCheckInterval = setInterval(() => {
          this.performHealthCheck();
        }, interval);

        logger.info('Health check monitoring started', { interval: `${interval}ms` });
      }

      this.isRunning = true;
      logger.info('Monitoring service started successfully');

    } catch (error) {
      logger.error('Failed to start monitoring service', { error: error.message });
      throw error;
    }
  }

  /**
   * Collect system information
   */
  collectSystemInfo() {
    this.metrics.systemInfo = {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      uptime: os.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      loadAverage: os.loadavg(),
      networkInterfaces: os.networkInterfaces()
    };
  }

  /**
   * Perform health check
   */
  async performHealthCheck() {
    try {
      const healthData = {
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.metrics.startTime,
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        systemUptime: os.uptime(),
        freeMemory: os.freemem(),
        totalMemory: os.totalmem(),
        loadAverage: os.loadavg()
      };

      this.metrics.lastHealthCheck = healthData;

      // Log health check (only if enabled in config)
      if (config.get('monitoring.healthCheck.logResults', false)) {
        logger.info('Health check completed', {
          uptime: `${Math.round(healthData.uptime / 1000)}s`,
          memory: `${Math.round(healthData.memory.rss / 1024 / 1024)}MB`,
          load: healthData.loadAverage[0]
        });
      }

    } catch (error) {
      logger.error('Health check failed', { error: error.message });
    }
  }

  /**
   * Record request
   */
  recordRequest() {
    this.metrics.totalRequests++;
  }

  /**
   * Record error
   */
  recordError() {
    this.metrics.totalErrors++;
  }

  /**
   * Get health status
   */
  getHealthStatus() {
    return {
      status: this.isRunning ? 'running' : 'stopped',
      uptime: Date.now() - this.metrics.startTime,
      metrics: {
        totalRequests: this.metrics.totalRequests,
        totalErrors: this.metrics.totalErrors,
        errorRate: this.metrics.totalRequests > 0 ?
          (this.metrics.totalErrors / this.metrics.totalRequests * 100).toFixed(2) + '%' : '0%',
        lastHealthCheck: this.metrics.lastHealthCheck
      },
      system: this.metrics.systemInfo,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      currentTime: Date.now(),
      uptime: Date.now() - this.metrics.startTime
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics.totalRequests = 0;
    this.metrics.totalErrors = 0;
    this.metrics.startTime = Date.now();
    logger.info('Monitoring metrics reset');
  }

  /**
   * Stop monitoring service
   */
  async stop() {
    try {
      logger.info('Stopping monitoring service...');

      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }

      this.isRunning = false;
      logger.info('Monitoring service stopped');

    } catch (error) {
      logger.error('Failed to stop monitoring service', { error: error.message });
      throw error;
    }
  }
}

// Create singleton instance
const monitoringService = new MonitoringService();

module.exports = monitoringService;