// Performance Monitoring Middleware
// SAFE: Non-blocking, only monitors when enabled

const logger = require('../utils/logger');

class PerformanceMonitor {
  constructor() {
    this.routeStats = new Map(); // route -> { count, totalTime, avgTime, slowest }
    this.activeRequests = new Map(); // correlationId -> { start, route, method }
    
    // Clean up completed requests every 5 minutes
    setInterval(() => this.cleanupActiveRequests(), 300000);
  }

  middleware() {
    return (req, res, next) => {
      if (process.env.PERFORMANCE_MONITORING !== 'true') {
        return next();
      }

      const start = Date.now();
      const route = req.route?.path || req.path;
      const method = req.method;
      const correlationId = req.correlationId;

      // Track active request
      this.activeRequests.set(correlationId, {
        start,
        route,
        method,
        userId: req.user?.id || req.user?._id
      });

      // Monitor response
      res.on('finish', () => {
        const duration = Date.now() - start;
        this.recordMetrics(route, method, duration, res.statusCode, correlationId);
        this.activeRequests.delete(correlationId);
      });

      // Monitor for request timeout/abort
      req.on('close', () => {
        if (this.activeRequests.has(correlationId)) {
          const duration = Date.now() - start;
          logger.warn('Request aborted', {
            route,
            method,
            duration,
            correlationId
          });
          this.activeRequests.delete(correlationId);
        }
      });

      next();
    };
  }

  recordMetrics(route, method, duration, statusCode, correlationId) {
    const routeKey = `${method} ${route}`;
    const slowThreshold = parseInt(process.env.SLOW_REQUEST_THRESHOLD) || 1000;
    const verySlowThreshold = parseInt(process.env.VERY_SLOW_REQUEST_THRESHOLD) || 5000;

    // Update route statistics
    const stats = this.routeStats.get(routeKey) || {
      count: 0,
      totalTime: 0,
      avgTime: 0,
      slowest: 0,
      errors: 0
    };

    stats.count++;
    stats.totalTime += duration;
    stats.avgTime = Math.round(stats.totalTime / stats.count);
    stats.slowest = Math.max(stats.slowest, duration);
    
    if (statusCode >= 400) {
      stats.errors++;
    }

    this.routeStats.set(routeKey, stats);

    // Log slow requests
    if (duration > slowThreshold) {
      const logLevel = duration > verySlowThreshold ? 'warn' : 'info';
      const severity = duration > verySlowThreshold ? 'HIGH' : 'MEDIUM';
      
      logger[logLevel]('Slow request detected', {
        route,
        method,
        duration,
        statusCode,
        correlationId,
        severity,
        threshold: slowThreshold
      });
    }

    // Log error responses
    if (statusCode >= 500) {
      logger.error('Server error response', {
        route,
        method,
        duration,
        statusCode,
        correlationId
      });
    }

    // Alert on consistently slow routes
    if (stats.count > 10 && stats.avgTime > slowThreshold) {
      logger.warn('Consistently slow route detected', {
        route: routeKey,
        avgTime: stats.avgTime,
        count: stats.count,
        slowest: stats.slowest
      });
    }
  }

  // Get performance statistics
  getStats() {
    if (process.env.PERFORMANCE_MONITORING !== 'true') {
      return { enabled: false };
    }

    const stats = {};
    for (const [route, data] of this.routeStats.entries()) {
      stats[route] = {
        ...data,
        errorRate: data.count > 0 ? Math.round((data.errors / data.count) * 100) : 0
      };
    }

    return {
      enabled: true,
      routes: stats,
      activeRequests: this.activeRequests.size,
      timestamp: new Date().toISOString()
    };
  }

  // Get currently active (potentially stuck) requests
  getActiveRequests() {
    if (process.env.PERFORMANCE_MONITORING !== 'true') {
      return [];
    }

    const now = Date.now();
    const stuckThreshold = parseInt(process.env.STUCK_REQUEST_THRESHOLD) || 30000; // 30 seconds
    
    const activeRequests = [];
    for (const [correlationId, request] of this.activeRequests.entries()) {
      const duration = now - request.start;
      activeRequests.push({
        correlationId,
        route: request.route,
        method: request.method,
        duration,
        isStuck: duration > stuckThreshold,
        userId: request.userId
      });
    }

    return activeRequests.sort((a, b) => b.duration - a.duration);
  }

  cleanupActiveRequests() {
    const now = Date.now();
    const maxAge = 300000; // 5 minutes
    
    for (const [correlationId, request] of this.activeRequests.entries()) {
      if (now - request.start > maxAge) {
        logger.warn('Long-running request cleaned up', {
          correlationId,
          route: request.route,
          duration: now - request.start
        });
        this.activeRequests.delete(correlationId);
      }
    }
  }

  // Reset statistics (for testing/maintenance)
  resetStats() {
    this.routeStats.clear();
    logger.info('Performance statistics reset');
  }
}

// Singleton instance
const performanceMonitor = new PerformanceMonitor();

module.exports = performanceMonitor;