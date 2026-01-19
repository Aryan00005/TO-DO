// Audit Log Model - Tracks sensitive actions
// SAFE: New model, doesn't affect existing models

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  // Request tracking
  correlationId: {
    type: String,
    index: true
  },
  
  // User context
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    index: true
  },
  
  // Action details
  action: {
    type: String,
    required: true,
    enum: [
      'LOGIN_SUCCESS',
      'LOGIN_FAILED',
      'LOGOUT',
      'PASSWORD_CHANGE',
      'TASK_CREATE',
      'TASK_UPDATE',
      'TASK_DELETE',
      'TASK_ASSIGN',
      'USER_INVITE',
      'USER_ROLE_CHANGE',
      'ORGANIZATION_CREATE',
      'ORGANIZATION_UPDATE',
      'SENSITIVE_DATA_ACCESS',
      'BULK_OPERATION',
      'API_KEY_GENERATE',
      'EXPORT_DATA'
    ]
  },
  
  // Resource information
  resource: String, // 'Task', 'User', 'Organization'
  resourceId: String,
  
  // Additional context
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Request context
  ipAddress: String,
  userAgent: String,
  
  // Timing
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Result
  success: {
    type: Boolean,
    default: true
  },
  errorMessage: String
}, {
  // Optimize for time-series queries
  timeseries: {
    timeField: 'timestamp',
    metaField: 'userId',
    granularity: 'hours'
  }
});

// Indexes for efficient querying
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ organizationId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ correlationId: 1 });

// TTL index - automatically delete old audit logs after 2 years
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 63072000 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;