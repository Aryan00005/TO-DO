// Structured Logger - Backward compatible with console.log
// SAFE: Falls back to console.log when structured logging is disabled

const winston = require('winston');

// Create winston logger instance
const winstonLogger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Safe logger that preserves existing behavior
const logger = {
  info: (message, meta = {}) => {
    if (process.env.STRUCTURED_LOGGING === 'true') {
      winstonLogger.info(message, meta);
    } else {
      console.log(`[INFO] ${message}`, meta);
    }
  },

  warn: (message, meta = {}) => {
    if (process.env.STRUCTURED_LOGGING === 'true') {
      winstonLogger.warn(message, meta);
    } else {
      console.warn(`[WARN] ${message}`, meta);
    }
  },

  error: (message, meta = {}) => {
    if (process.env.STRUCTURED_LOGGING === 'true') {
      winstonLogger.error(message, meta);
    } else {
      console.error(`[ERROR] ${message}`, meta);
    }
  },

  debug: (message, meta = {}) => {
    if (process.env.STRUCTURED_LOGGING === 'true') {
      winstonLogger.debug(message, meta);
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEBUG] ${message}`, meta);
      }
    }
  },

  // Enhanced logging for security events
  security: (message, meta = {}) => {
    const securityLog = {
      ...meta,
      type: 'SECURITY_EVENT',
      timestamp: new Date().toISOString()
    };

    if (process.env.STRUCTURED_LOGGING === 'true') {
      winstonLogger.warn(`[SECURITY] ${message}`, securityLog);
    } else {
      console.warn(`[SECURITY] ${message}`, securityLog);
    }
  },

  // Enhanced logging for audit events
  audit: (message, meta = {}) => {
    const auditLog = {
      ...meta,
      type: 'AUDIT_EVENT',
      timestamp: new Date().toISOString()
    };

    if (process.env.STRUCTURED_LOGGING === 'true') {
      winstonLogger.info(`[AUDIT] ${message}`, auditLog);
    } else {
      console.log(`[AUDIT] ${message}`, auditLog);
    }
  }
};

module.exports = logger;