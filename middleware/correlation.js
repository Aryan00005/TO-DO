// Request Correlation Middleware - Tracks requests across the system
// SAFE: Additive only, doesn't modify existing functionality

const correlationMiddleware = (req, res, next) => {
  // Generate or use existing correlation ID
  req.correlationId = req.headers['x-correlation-id'] || 
    `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Add to response headers for client tracking
  res.setHeader('X-Correlation-ID', req.correlationId);
  
  // Add to request context for downstream use
  req.context = req.context || {};
  req.context.correlationId = req.correlationId;
  
  next();
};

module.exports = correlationMiddleware;