/**
 * uTrust 2700 R Smart Card Reader Service
 * Main Server Entry Point
 *
 * @author 2 Pheenong Mobile Co., Ltd.
 * @version 1.0.0
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const fs = require('fs');

// Internal modules
const logger = require('./utils/logger');
const config = require('./config/config-manager');
const cardReaderService = require('./services/card-reader-service');
const networkService = require('./services/network-service');
const monitoringService = require('./services/monitoring-service');
const routes = require('./routes');

// Global state
let app;
let server;
let isShuttingDown = false;

/**
 * Initialize Express application
 */
function initializeApp() {
  app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  }));

  // Compression middleware
  app.use(compression());

  // CORS configuration
  const corsOptions = {
    origin: config.get('service.cors.origin'),
    credentials: config.get('service.cors.credentials'),
    methods: config.get('service.cors.methods'),
    allowedHeaders: config.get('service.cors.allowedHeaders')
  };
  app.use(cors(corsOptions));

  // Body parser middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging
  app.use((req, res, next) => {
    const start = Date.now();
    const originalSend = res.send;

    res.send = function(data) {
      const duration = Date.now() - start;
      logger.info('HTTP Request', {
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration: `${duration}ms`,
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress
      });
      originalSend.call(this, data);
    };

    next();
  });

  // Rate limiting middleware
  if (config.get('network.security.rateLimiting.enabled')) {
    const rateLimit = require('express-rate-limit');
    const limiter = rateLimit({
      windowMs: config.get('network.security.rateLimiting.windowMs'),
      max: config.get('network.security.rateLimiting.maxRequests'),
      message: {
        success: false,
        error: config.get('network.security.rateLimiting.message')
      }
    });
    app.use(limiter);
  }

  // IP filtering middleware
  app.use((req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    const allowedIPs = config.get('network.security.allowedIPs');

    // Clean IPv6 mapped IPv4 addresses
    const cleanIP = clientIP.replace(/^::ffff:/, '');

    const isAllowed = allowedIPs.some(allowedIP => {
      if (allowedIP === 'localhost' && (cleanIP === '127.0.0.1' || cleanIP === '::1')) {
        return true;
      }
      return cleanIP === allowedIP || cleanIP.startsWith(allowedIP);
    });

    if (!isAllowed) {
      logger.warn('Blocked request from unauthorized IP', { clientIP: cleanIP });
      return res.status(403).json({
        success: false,
        error: 'Access denied from this IP address'
      });
    }

    next();
  });

  // Routes
  app.use('/api', routes);

  // Health check endpoint
  app.get('/health', (req, res) => {
    const healthStatus = monitoringService.getHealthStatus();
    res.json({
      success: true,
      data: healthStatus,
      timestamp: new Date().toISOString()
    });
  });

  // Compatibility endpoints for existing frontend code
  app.get('/read-card', async (req, res) => {
    try {
      const cardData = await cardReaderService.readCard();
      res.json({
        success: true,
        data: cardData
      });
    } catch (error) {
      logger.error('Card reading failed', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  app.post('/read-card', async (req, res) => {
    try {
      const cardData = await cardReaderService.readCard();
      res.json({
        success: true,
        data: cardData
      });
    } catch (error) {
      logger.error('Card reading failed', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Default route
  app.get('/', (req, res) => {
    res.json({
      success: true,
      message: 'uTrust 2700 R Smart Card Reader Service',
      version: require('../package.json').version,
      status: 'running',
      endpoints: [
        'GET /health - Service health check',
        'GET|POST /read-card - Read Thai ID card',
        'GET /api/status - Reader status',
        'GET /api/config - Service configuration'
      ]
    });
  });

  // Error handling middleware
  app.use((error, req, res, next) => {
    logger.error('Unhandled error', {
      error: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: 'Endpoint not found',
      requested: req.url
    });
  });
}

/**
 * Start the server
 */
async function startServer() {
  try {
    const port = config.get('service.port');
    const host = config.get('service.host');

    // Initialize services
    await networkService.initialize();
    await cardReaderService.initialize();
    await monitoringService.start();

    // Start HTTP server
    server = app.listen(port, host, () => {
      const serviceMode = isWindowsService();

      logger.info('Smart Card Reader Service started', {
        port,
        host,
        version: require('../package.json').version,
        branch: config.getCurrentBranch(),
        nodeVersion: process.version,
        platform: process.platform,
        serviceMode
      });

      // Only show console output if not running as service
      if (!serviceMode) {
        console.log('🔌 uTrust 2700 R Smart Card Reader Service');
        console.log(`📡 Server running at http://${host}:${port}`);
        console.log(`🏢 Branch: ${config.getCurrentBranch()?.name || 'Unknown'}`);
        console.log(`📋 API Documentation: http://${host}:${port}/`);
        console.log('✅ Service ready to accept connections');
      }
    });

    // Server error handling
    server.on('error', (error) => {
      const serviceMode = isWindowsService();

      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${port} is already in use`, { serviceMode });

        if (!serviceMode) {
          console.error(`❌ Port ${port} is already in use. Please check if another instance is running.`);
        }

        process.exit(1);
      } else {
        logger.error('Server error', {
          error: error.message,
          code: error.code,
          serviceMode
        });
        throw error;
      }
    });

  } catch (error) {
    const serviceMode = isWindowsService();

    logger.error('Failed to start server', {
      error: error.message,
      stack: error.stack,
      serviceMode
    });

    if (!serviceMode) {
      console.error('❌ Failed to start server:', error.message);
    }

    process.exit(1);
  }
}

/**
 * Graceful shutdown handler
 */
async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  const serviceMode = isWindowsService();

  logger.info(`Received ${signal}, starting graceful shutdown...`, { serviceMode });

  if (!serviceMode) {
    console.log(`\n🔄 Received ${signal}, shutting down gracefully...`);
  }

  try {
    // Stop accepting new connections
    if (server) {
      server.close(() => {
        logger.info('HTTP server closed', { serviceMode });
      });
    }

    // Stop services
    await monitoringService.stop();
    await cardReaderService.cleanup();
    await networkService.cleanup();

    logger.info('Graceful shutdown completed', { serviceMode });

    if (!serviceMode) {
      console.log('✅ Shutdown completed');
    }

    process.exit(0);

  } catch (error) {
    logger.error('Error during shutdown', {
      error: error.message,
      serviceMode
    });

    if (!serviceMode) {
      console.error('❌ Error during shutdown:', error.message);
    }

    process.exit(1);
  }
}

/**
 * Check if running as Windows Service
 */
function isWindowsService() {
  return process.env.SERVICE_MODE === 'true' ||
         process.argv.includes('--service') ||
         process.argv.includes('-s');
}

/**
 * Main function
 */
async function main() {
  try {
    const serviceMode = isWindowsService();

    // Show banner (only if not running as service)
    if (!serviceMode) {
      console.log('\n' + '='.repeat(60));
      console.log('🔌 uTrust 2700 R Smart Card Reader Service v1.0.0');
      console.log('🏢 2 Pheenong Mobile Co., Ltd.');
      console.log('='.repeat(60));
    }

    // Load configuration
    logger.info('Loading configuration...', { serviceMode });
    await config.initialize();

    // Initialize Express app
    logger.info('Initializing web server...', { serviceMode });
    initializeApp();

    // Start server
    await startServer();

    if (serviceMode) {
      logger.info('Service started in Windows Service mode', {
        pid: process.pid,
        port: config.get('service.port'),
        branch: config.getCurrentBranch()?.name || 'Unknown'
      });
    }

    // Setup signal handlers
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGHUP', () => shutdown('SIGHUP'));

    // Windows service specific signals
    if (serviceMode) {
      process.on('SIGBREAK', () => shutdown('SIGBREAK'));

      // Windows service shutdown
      process.on('message', (msg) => {
        if (msg === 'shutdown') {
          shutdown('SERVICE_SHUTDOWN');
        }
      });
    }

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', {
        error: error.message,
        stack: error.stack,
        serviceMode
      });

      if (!serviceMode) {
        console.error('❌ Uncaught exception:', error);
      }

      shutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled promise rejection', {
        reason,
        promise,
        serviceMode
      });

      if (!serviceMode) {
        console.error('❌ Unhandled promise rejection:', reason);
      }

      shutdown('UNHANDLED_REJECTION');
    });

  } catch (error) {
    const serviceMode = isWindowsService();
    logger.error('Fatal error during startup', {
      error: error.message,
      stack: error.stack,
      serviceMode
    });

    if (!serviceMode) {
      console.error('❌ Fatal error during startup:', error.message);
    }

    process.exit(1);
  }
}

// Start the application
if (require.main === module) {
  main();
}

module.exports = { app, startServer, shutdown };