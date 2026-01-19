// Audit Service - Logs sensitive actions
// SAFE: Only logs when enabled, non-blocking operations

const AuditLog = require('../models/AuditLog');
const logger = require('./logger');

class AuditService {
  static async log(action, req, options = {}) {
    // Skip if audit logging is disabled
    if (process.env.AUDIT_LOGGING !== 'true') {
      return;
    }

    // Non-blocking audit logging
    setImmediate(async () => {
      try {
        const auditEntry = {
          correlationId: req.correlationId,
          userId: req.user?.id || req.user?._id,
          organizationId: req.user?.organization || req.user?.organizationId,
          action,
          resource: options.resource,
          resourceId: options.resourceId,
          metadata: {
            ...options.metadata,
            route: req.route?.path || req.path,
            method: req.method
          },
          ipAddress: req.ip || req.connection?.remoteAddress,
          userAgent: req.get('User-Agent'),
          success: options.success !== false,
          errorMessage: options.errorMessage
        };

        await AuditLog.create(auditEntry);
        
        logger.audit(`Action logged: ${action}`, {
          correlationId: req.correlationId,
          userId: auditEntry.userId,
          resource: options.resource
        });

      } catch (error) {
        // Audit logging failure should not break the application
        logger.error('Audit logging failed', {
          error: error.message,
          action,
          correlationId: req.correlationId
        });
      }
    });
  }

  // Convenience methods for common audit events
  static async logLogin(req, success = true, errorMessage = null) {
    return this.log(success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED', req, {
      success,
      errorMessage,
      metadata: {
        email: req.body?.email
      }
    });
  }

  static async logTaskAction(action, req, taskId, metadata = {}) {
    return this.log(action, req, {
      resource: 'Task',
      resourceId: taskId,
      metadata
    });
  }

  static async logUserAction(action, req, userId, metadata = {}) {
    return this.log(action, req, {
      resource: 'User',
      resourceId: userId,
      metadata
    });
  }

  static async logSensitiveAccess(req, resource, resourceId, metadata = {}) {
    return this.log('SENSITIVE_DATA_ACCESS', req, {
      resource,
      resourceId,
      metadata
    });
  }

  // Query audit logs (for admin/compliance)
  static async getAuditTrail(filters = {}, limit = 100) {
    if (process.env.AUDIT_LOGGING !== 'true') {
      return [];
    }

    const query = {};
    
    if (filters.userId) query.userId = filters.userId;
    if (filters.organizationId) query.organizationId = filters.organizationId;
    if (filters.action) query.action = filters.action;
    if (filters.resource) query.resource = filters.resource;
    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate) query.timestamp.$gte = new Date(filters.startDate);
      if (filters.endDate) query.timestamp.$lte = new Date(filters.endDate);
    }

    return await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .populate('userId', 'name email')
      .lean();
  }
}

module.exports = AuditService;