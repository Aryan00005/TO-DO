const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');

// Validate required environment variables
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// Rate limiting configurations
const createRateLimiter = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: { error: message },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.log(`🚫 Rate limit exceeded: ${req.ip} - ${req.path}`);
    res.status(429).json({ error: message });
  }
});

// Different rate limits for different endpoints
const rateLimiters = {
  // Authentication endpoints - relaxed limits for regular users
  auth: createRateLimiter(15 * 60 * 1000, 20, 'Too many authentication attempts'),
  
  // Super admin - separate stricter limits
  superAdmin: createRateLimiter(15 * 60 * 1000, 5, 'Too many super admin attempts'),
  
  // Password reset - very strict
  passwordReset: createRateLimiter(60 * 60 * 1000, 3, 'Too many password reset attempts'),
  
  // General API - moderate limits
  api: createRateLimiter(15 * 60 * 1000, 100, 'Too many requests'),
  
  // File uploads - strict limits
  upload: createRateLimiter(60 * 60 * 1000, 10, 'Too many upload attempts')
};

// Security headers middleware
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.SUPABASE_URL || "'self'", "https://accounts.google.com", "https://oauth2.googleapis.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'", "https://accounts.google.com"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// Enhanced JWT validation
const validateJWT = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Invalid authorization format' });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token structure
    if (!token || token.split('.').length !== 3) {
      return res.status(401).json({ error: 'Malformed token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Additional token validation
    if (!decoded.id || !decoded.iat || !decoded.exp) {
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    // Check token age (optional: force re-auth after certain time)
    const tokenAge = Date.now() / 1000 - decoded.iat;
    if (tokenAge > 24 * 60 * 60) { // 24 hours
      return res.status(401).json({ error: 'Token expired, please re-authenticate' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    console.error('JWT validation error:', err);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  // Skip sanitization for OAuth routes to preserve tokens
  if (req.path.includes('/auth/google') || req.path.includes('/oauth') || req.path.includes('/callback')) {
    return next();
  }

  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      return obj.trim().replace(/[<>"'&]/g, '');
    }
    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        obj[key] = sanitize(obj[key]);
      }
    }
    return obj;
  };

  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query);
  if (req.params) req.params = sanitize(req.params);
  
  next();
};

// Request logging for security monitoring
const securityLogger = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      duration,
      userId: req.user?.id
    };

    // Log suspicious activities
    if (res.statusCode >= 400 || duration > 5000) {
      console.log('🚨 Security Alert:', JSON.stringify(logData));
    }
  });
  
  next();
};

module.exports = {
  rateLimiters,
  securityHeaders,
  validateJWT,
  sanitizeInput,
  securityLogger
};