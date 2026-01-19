// Error Classification Utility
// SAFE: Pure utility, doesn't modify existing error handling

class ErrorClassifier {
  static classify(error, req = {}) {
    const classification = {
      type: this.getErrorType(error),
      severity: this.getSeverity(error),
      correlationId: req.correlationId || 'unknown',
      userId: req.user?.id || req.user?._id,
      organizationId: req.user?.organization || req.user?.organizationId,
      timestamp: new Date().toISOString(),
      route: req.route?.path || req.path,
      method: req.method
    };

    return classification;
  }

  static getErrorType(error) {
    // User input errors
    if (error.name === 'ValidationError') return 'USER_ERROR';
    if (error.name === 'CastError') return 'USER_ERROR';
    
    // Client errors (4xx)
    if (error.status >= 400 && error.status < 500) return 'CLIENT_ERROR';
    
    // Security events
    if (error.message?.toLowerCase().includes('unauthorized')) return 'SECURITY_EVENT';
    if (error.message?.toLowerCase().includes('forbidden')) return 'SECURITY_EVENT';
    if (error.message?.toLowerCase().includes('token')) return 'SECURITY_EVENT';
    
    // Database errors
    if (error.name === 'MongoError') return 'DATABASE_ERROR';
    if (error.name === 'MongooseError') return 'DATABASE_ERROR';
    
    // System errors (5xx)
    return 'SYSTEM_ERROR';
  }

  static getSeverity(error) {
    const type = this.getErrorType(error);
    
    switch (type) {
      case 'USER_ERROR':
      case 'CLIENT_ERROR':
        return 'LOW';
      case 'SECURITY_EVENT':
        return 'HIGH';
      case 'DATABASE_ERROR':
      case 'SYSTEM_ERROR':
        return 'CRITICAL';
      default:
        return 'MEDIUM';
    }
  }

  static shouldAlert(classification) {
    return classification.severity === 'CRITICAL' || 
           classification.type === 'SECURITY_EVENT';
  }
}

module.exports = ErrorClassifier;