// Health Check Route - System health monitoring
// SAFE: New route, doesn't affect existing functionality

const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const logger = require('../utils/logger');

// Health check components
const healthChecks = {
  // Database connectivity check
  database: async () => {
    const start = Date.now();
    try {
      await mongoose.connection.db.admin().ping();
      return {
        status: 'healthy',
        latency: Date.now() - start,
        details: {
          readyState: mongoose.connection.readyState,
          host: mongoose.connection.host,
          port: mongoose.connection.port
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        latency: Date.now() - start
      };
    }
  },

  // Memory usage check
  memory: async () => {
    const memUsage = process.memoryUsage();
    const totalMem = require('os').totalmem();
    const freeMem = require('os').freemem();
    
    const memoryPressure = (memUsage.heapUsed / memUsage.heapTotal) > 0.9;
    
    return {
      status: memoryPressure ? 'warning' : 'healthy',
      details: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        systemTotal: Math.round(totalMem / 1024 / 1024),
        systemFree: Math.round(freeMem / 1024 / 1024),
        pressureWarning: memoryPressure
      }
    };
  },

  // Application uptime check
  uptime: async () => {
    const uptime = process.uptime();
    return {
      status: 'healthy',
      details: {
        uptime: Math.round(uptime),
        uptimeHuman: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`
      }
    };
  },

  // Environment check
  environment: async () => {
    return {
      status: 'healthy',
      details: {
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development',
        platform: process.platform,
        pid: process.pid
      }
    };
  }
};

// Basic health endpoint
router.get('/health', async (req, res) => {
  try {
    const results = await Promise.allSettled([
      healthChecks.database(),
      healthChecks.memory(),
      healthChecks.uptime(),
      healthChecks.environment()
    ]);

    const healthData = {
      database: results[0].status === 'fulfilled' ? results[0].value : { status: 'error', error: results[0].reason },
      memory: results[1].status === 'fulfilled' ? results[1].value : { status: 'error', error: results[1].reason },
      uptime: results[2].status === 'fulfilled' ? results[2].value : { status: 'error', error: results[2].reason },
      environment: results[3].status === 'fulfilled' ? results[3].value : { status: 'error', error: results[3].reason }
    };

    // Determine overall health
    const hasUnhealthy = Object.values(healthData).some(check => check.status === 'unhealthy' || check.status === 'error');
    const hasWarnings = Object.values(healthData).some(check => check.status === 'warning');
    
    const overallStatus = hasUnhealthy ? 'unhealthy' : hasWarnings ? 'warning' : 'healthy';
    const httpStatus = overallStatus === 'unhealthy' ? 503 : 200;

    const response = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: healthData,
      correlationId: req.correlationId
    };

    // Log health check if monitoring is enabled
    if (process.env.HEALTH_CHECK_LOGGING === 'true') {
      logger.info('Health check performed', {
        status: overallStatus,
        correlationId: req.correlationId
      });
    }

    res.status(httpStatus).json(response);

  } catch (error) {
    logger.error('Health check failed', {
      error: error.message,
      correlationId: req.correlationId
    });

    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check system failure',
      correlationId: req.correlationId
    });
  }
});

// Readiness probe (for Kubernetes/Docker)
router.get('/ready', async (req, res) => {
  try {
    // Check only critical dependencies
    const dbCheck = await healthChecks.database();
    
    if (dbCheck.status === 'healthy') {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: 'not ready',
        reason: 'Database not available',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Liveness probe (for Kubernetes/Docker)
router.get('/live', (req, res) => {
  // Simple liveness check - if we can respond, we're alive
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router;