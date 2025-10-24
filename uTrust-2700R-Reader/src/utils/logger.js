/**
 * Logging Service for uTrust 2700 R Smart Card Reader
 *
 * @author 2 Pheenong Mobile Co., Ltd.
 * @version 1.0.0
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for log messages
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      metaStr = JSON.stringify(meta, null, 2);
    }
    return `${timestamp} [${level}] ${message} ${metaStr}`;
  })
);

// Transport configurations
const transports = [];

// Console transport (for development)
transports.push(
  new winston.transports.Console({
    level: 'debug',
    format: consoleFormat,
    handleExceptions: true,
    handleRejections: true
  })
);

// File transport for general logs
transports.push(
  new DailyRotateFile({
    filename: path.join(logsDir, 'service-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '10m',
    maxFiles: '14d',
    level: 'info',
    format: logFormat,
    handleExceptions: true,
    handleRejections: true
  })
);

// File transport for error logs
transports.push(
  new DailyRotateFile({
    filename: path.join(logsDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '10m',
    maxFiles: '30d',
    level: 'error',
    format: logFormat,
    handleExceptions: true,
    handleRejections: true
  })
);

// Card reader specific logs
transports.push(
  new DailyRotateFile({
    filename: path.join(logsDir, 'card-reader-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '5m',
    maxFiles: '7d',
    level: 'debug',
    format: logFormat
  })
);

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'uTrust-2700R-Service',
    hostname: require('os').hostname(),
    pid: process.pid
  },
  transports,
  exitOnError: false
});

// Add error handling for the logger itself
logger.on('error', (error) => {
  console.error('Logger error:', error);
});

// Custom methods for specific logging needs
logger.cardReader = (message, meta = {}) => {
  logger.info(message, { ...meta, component: 'card-reader' });
};

logger.network = (message, meta = {}) => {
  logger.info(message, { ...meta, component: 'network' });
};

logger.security = (message, meta = {}) => {
  logger.warn(message, { ...meta, component: 'security' });
};

logger.api = (message, meta = {}) => {
  logger.info(message, { ...meta, component: 'api' });
};

logger.monitoring = (message, meta = {}) => {
  logger.info(message, { ...meta, component: 'monitoring' });
};

// Performance logging
logger.perf = (operation, duration, meta = {}) => {
  logger.info(`Performance: ${operation}`, {
    ...meta,
    duration: `${duration}ms`,
    component: 'performance'
  });
};

// Startup information
logger.startup = (message, meta = {}) => {
  logger.info(message, { ...meta, component: 'startup' });
};

// Add method to change log level dynamically
logger.setLevel = (level) => {
  logger.level = level;
  logger.transports.forEach(transport => {
    if (transport.level) {
      transport.level = level;
    }
  });
  logger.info(`Log level changed to: ${level}`);
};

// Method to flush logs
logger.flush = () => {
  return new Promise((resolve) => {
    let pending = 0;
    let finished = 0;

    const checkDone = () => {
      if (finished === pending) {
        resolve();
      }
    };

    logger.transports.forEach(transport => {
      if (typeof transport.close === 'function') {
        pending++;
        transport.close(() => {
          finished++;
          checkDone();
        });
      } else if (typeof transport.end === 'function') {
        pending++;
        transport.end(() => {
          finished++;
          checkDone();
        });
      }
    });

    if (pending === 0) {
      resolve();
    }
  });
};

// Method to get log statistics
logger.getStats = () => {
  const stats = {
    logDirectory: logsDir,
    transports: logger.transports.length,
    level: logger.level,
    files: []
  };

  try {
    const files = fs.readdirSync(logsDir);
    stats.files = files.map(file => {
      const filePath = path.join(logsDir, file);
      const stat = fs.statSync(filePath);
      return {
        name: file,
        size: stat.size,
        modified: stat.mtime,
        created: stat.birthtime
      };
    });
  } catch (error) {
    logger.error('Failed to get log stats', { error: error.message });
  }

  return stats;
};

// Cleanup old logs on startup
const cleanupOldLogs = () => {
  try {
    const files = fs.readdirSync(logsDir);
    const now = Date.now();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days

    files.forEach(file => {
      const filePath = path.join(logsDir, file);
      const stat = fs.statSync(filePath);

      if (now - stat.mtime.getTime() > maxAge) {
        fs.unlinkSync(filePath);
        logger.info(`Cleaned up old log file: ${file}`);
      }
    });
  } catch (error) {
    logger.error('Failed to cleanup old logs', { error: error.message });
  }
};

// Run cleanup on startup
setTimeout(cleanupOldLogs, 5000);

// Export the logger
module.exports = logger;