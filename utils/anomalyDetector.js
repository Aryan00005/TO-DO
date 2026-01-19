// Anomaly Detector - Detects suspicious behavior patterns
// SAFE: Only monitors when enabled, doesn't block legitimate users

const logger = require('./logger');

class AnomalyDetector {
  constructor() {
    this.requestCounts = new Map(); // userId -> { count, windowStart }
    this.locationCache = new Map(); // userId -> Set of IPs
    this.bulkOperationCounts = new Map(); // userId -> { count, windowStart }
    
    // Clean up caches every hour
    setInterval(() => this.cleanupCaches(), 3600000);
  }

  async checkSuspiciousActivity(userId, action, req) {
    if (process.env.ANOMALY_DETECTION !== 'true') {
      return { suspicious: false };
    }

    try {
      const checks = await Promise.all([
        this.checkRapidRequests(userId),
        this.checkUnusualLocation(userId, req.ip),
        this.checkBulkOperations(userId, action),
        this.checkOffHoursActivity(userId),
        this.checkSuspiciousUserAgent(req.get('User-Agent'))
      ]);

      const suspiciousChecks = checks.filter(c => c.suspicious);
      const isSuspicious = suspiciousChecks.length > 0;

      if (isSuspicious) {
        logger.security('Suspicious activity detected', {
          userId,
          action,
          correlationId: req.correlationId,
          reasons: suspiciousChecks.map(c => c.reason),
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
      }

      return {
        suspicious: isSuspicious,
        reasons: suspiciousChecks.map(c => c.reason),
        riskScore: this.calculateRiskScore(suspiciousChecks)
      };

    } catch (error) {
      logger.error('Anomaly detection failed', {
        error: error.message,
        userId,
        action
      });
      return { suspicious: false, error: true };
    }
  }

  checkRapidRequests(userId) {
    const now = Date.now();
    const windowSize = 60000; // 1 minute
    const threshold = parseInt(process.env.RAPID_REQUEST_THRESHOLD) || 100;

    const userRequests = this.requestCounts.get(userId) || { count: 0, windowStart: now };

    // Reset window if expired
    if (now - userRequests.windowStart > windowSize) {
      userRequests.count = 1;
      userRequests.windowStart = now;
    } else {
      userRequests.count++;
    }

    this.requestCounts.set(userId, userRequests);

    return {
      suspicious: userRequests.count > threshold,
      reason: `Rapid requests: ${userRequests.count} in 1 minute`,
      severity: userRequests.count > threshold * 2 ? 'HIGH' : 'MEDIUM'
    };
  }

  checkUnusualLocation(userId, ipAddress) {
    if (!ipAddress) return { suspicious: false };

    const userIPs = this.locationCache.get(userId) || new Set();
    const isNewIP = !userIPs.has(ipAddress);
    
    // Add IP to cache
    userIPs.add(ipAddress);
    this.locationCache.set(userId, userIPs);

    // Suspicious if user has many different IPs in short time
    const suspiciousIPCount = parseInt(process.env.SUSPICIOUS_IP_THRESHOLD) || 10;
    
    return {
      suspicious: isNewIP && userIPs.size > suspiciousIPCount,
      reason: `Multiple IP addresses: ${userIPs.size} different IPs`,
      severity: 'MEDIUM'
    };
  }

  checkBulkOperations(userId, action) {
    const bulkActions = ['TASK_CREATE', 'TASK_UPDATE', 'TASK_DELETE', 'USER_INVITE'];
    if (!bulkActions.includes(action)) {
      return { suspicious: false };
    }

    const now = Date.now();
    const windowSize = 300000; // 5 minutes
    const threshold = parseInt(process.env.BULK_OPERATION_THRESHOLD) || 50;

    const userBulkOps = this.bulkOperationCounts.get(userId) || { count: 0, windowStart: now };

    // Reset window if expired
    if (now - userBulkOps.windowStart > windowSize) {
      userBulkOps.count = 1;
      userBulkOps.windowStart = now;
    } else {
      userBulkOps.count++;
    }

    this.bulkOperationCounts.set(userId, userBulkOps);

    return {
      suspicious: userBulkOps.count > threshold,
      reason: `Bulk operations: ${userBulkOps.count} ${action} in 5 minutes`,
      severity: 'HIGH'
    };
  }

  checkOffHoursActivity(userId) {
    const now = new Date();
    const hour = now.getHours();
    
    // Define business hours (9 AM to 6 PM)
    const businessHourStart = parseInt(process.env.BUSINESS_HOUR_START) || 9;
    const businessHourEnd = parseInt(process.env.BUSINESS_HOUR_END) || 18;
    
    const isOffHours = hour < businessHourStart || hour > businessHourEnd;
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;

    return {
      suspicious: (isOffHours || isWeekend) && process.env.FLAG_OFF_HOURS === 'true',
      reason: `Off-hours activity: ${isWeekend ? 'Weekend' : 'After hours'} at ${hour}:00`,
      severity: 'LOW'
    };
  }

  checkSuspiciousUserAgent(userAgent) {
    if (!userAgent) {
      return {
        suspicious: true,
        reason: 'Missing User-Agent header',
        severity: 'MEDIUM'
      };
    }

    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i,
      /postman/i
    ];

    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent));

    return {
      suspicious: isSuspicious && process.env.FLAG_SUSPICIOUS_UA === 'true',
      reason: `Suspicious User-Agent: ${userAgent}`,
      severity: 'LOW'
    };
  }

  calculateRiskScore(suspiciousChecks) {
    const severityScores = { LOW: 1, MEDIUM: 3, HIGH: 5 };
    return suspiciousChecks.reduce((score, check) => {
      return score + (severityScores[check.severity] || 1);
    }, 0);
  }

  cleanupCaches() {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour

    // Clean request counts
    for (const [userId, data] of this.requestCounts.entries()) {
      if (now - data.windowStart > maxAge) {
        this.requestCounts.delete(userId);
      }
    }

    // Clean bulk operation counts
    for (const [userId, data] of this.bulkOperationCounts.entries()) {
      if (now - data.windowStart > maxAge) {
        this.bulkOperationCounts.delete(userId);
      }
    }

    // Limit location cache size
    if (this.locationCache.size > 10000) {
      const entries = Array.from(this.locationCache.entries());
      entries.slice(0, 5000).forEach(([userId]) => {
        this.locationCache.delete(userId);
      });
    }
  }
}

// Singleton instance
const anomalyDetector = new AnomalyDetector();

module.exports = anomalyDetector;