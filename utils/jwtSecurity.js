// JWT Security Enhancement - Optional JWE Support
// SAFE: Backward compatible, JWE is optional

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class JWTSecurityService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET;
    this.jweEnabled = process.env.JWT_ENCRYPTION_ENABLED === 'true';
    this.encryptionKey = process.env.JWT_ENCRYPTION_KEY ? 
      Buffer.from(process.env.JWT_ENCRYPTION_KEY, 'base64') : null;
  }

  // =============================================================================
  // STANDARD JWT (Current Implementation - Unchanged)
  // =============================================================================

  generateToken(payload, options = {}) {
    const defaultOptions = {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      issuer: process.env.JWT_ISSUER || 'task-management-system'
    };

    const tokenOptions = { ...defaultOptions, ...options };
    
    // Generate standard JWT (current behavior)
    const token = jwt.sign(payload, this.jwtSecret, tokenOptions);
    
    // Optionally encrypt the JWT (JWE)
    if (this.jweEnabled && this.encryptionKey) {
      return this.encryptJWT(token);
    }
    
    return token;
  }

  verifyToken(token) {
    try {
      // Check if token is encrypted (JWE format)
      if (this.jweEnabled && this.isEncryptedJWT(token)) {
        token = this.decryptJWT(token);
      }
      
      // Verify standard JWT (current behavior)
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  // =============================================================================
  // JWE (Encrypted JWT) - Optional Enhancement
  // =============================================================================

  encryptJWT(jwtToken) {
    if (!this.encryptionKey) return jwtToken;
    
    try {
      const algorithm = 'aes-256-gcm';
      const iv = crypto.randomBytes(16);
      
      const cipher = crypto.createCipher(algorithm, this.encryptionKey, iv);
      let encrypted = cipher.update(jwtToken, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      
      const tag = cipher.getAuthTag();
      
      // Format: JWE.iv.tag.encrypted (base64 encoded)
      return `JWE.${iv.toString('base64')}.${tag.toString('base64')}.${encrypted}`;
    } catch (error) {
      console.error('JWT encryption failed:', error.message);
      return jwtToken; // Fail safely to standard JWT
    }
  }

  decryptJWT(encryptedToken) {
    if (!this.encryptionKey || !this.isEncryptedJWT(encryptedToken)) {
      return encryptedToken;
    }
    
    try {
      const parts = encryptedToken.split('.');
      if (parts.length !== 4 || parts[0] !== 'JWE') {
        return encryptedToken;
      }
      
      const iv = Buffer.from(parts[1], 'base64');
      const tag = Buffer.from(parts[2], 'base64');
      const encrypted = parts[3];
      
      const algorithm = 'aes-256-gcm';
      const decipher = crypto.createDecipher(algorithm, this.encryptionKey, iv);
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('JWT decryption failed:', error.message);
      throw new Error('Invalid encrypted token');
    }
  }

  isEncryptedJWT(token) {
    return typeof token === 'string' && token.startsWith('JWE.');
  }

  // =============================================================================
  // TOKEN SECURITY ENHANCEMENTS
  // =============================================================================

  // Generate secure token with minimal payload
  generateSecureToken(userId, organizationId, role) {
    const payload = {
      userId,
      organizationId,
      role,
      iat: Math.floor(Date.now() / 1000),
      // Add token fingerprint for additional security
      fp: this.generateTokenFingerprint()
    };
    
    return this.generateToken(payload);
  }

  // Generate token fingerprint (optional security enhancement)
  generateTokenFingerprint() {
    if (process.env.JWT_FINGERPRINTING !== 'true') return undefined;
    
    return crypto.randomBytes(16).toString('hex');
  }

  // Validate token fingerprint (if enabled)
  validateTokenFingerprint(decodedToken, requestFingerprint) {
    if (process.env.JWT_FINGERPRINTING !== 'true') return true;
    
    return decodedToken.fp === requestFingerprint;
  }

  // =============================================================================
  // TOKEN ROTATION & SECURITY
  // =============================================================================

  // Check if token needs rotation
  shouldRotateToken(decodedToken) {
    if (!process.env.JWT_AUTO_ROTATION_ENABLED) return false;
    
    const rotationThreshold = parseInt(process.env.JWT_ROTATION_THRESHOLD_HOURS) || 12;
    const tokenAge = (Date.now() / 1000) - decodedToken.iat;
    const rotationThresholdSeconds = rotationThreshold * 3600;
    
    return tokenAge > rotationThresholdSeconds;
  }

  // Generate refresh token (for token rotation)
  generateRefreshToken(userId) {
    if (process.env.REFRESH_TOKENS_ENABLED !== 'true') return null;
    
    const payload = {
      userId,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000)
    };
    
    return this.generateToken(payload, { 
      expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d' 
    });
  }

  // =============================================================================
  // SECURITY MONITORING
  // =============================================================================

  // Log token security events
  logTokenEvent(event, tokenData, request) {
    if (process.env.JWT_SECURITY_LOGGING !== 'true') return;
    
    const logger = require('./logger');
    
    logger.security(`JWT ${event}`, {
      userId: tokenData.userId,
      tokenType: this.isEncryptedJWT(request.token) ? 'JWE' : 'JWT',
      userAgent: request.get('User-Agent'),
      ipAddress: request.ip,
      correlationId: request.correlationId
    });
  }

  // Detect suspicious token usage
  detectSuspiciousTokenUsage(decodedToken, request) {
    const suspiciousIndicators = [];
    
    // Check for token reuse from different IPs
    if (process.env.JWT_IP_BINDING === 'true') {
      const tokenIP = decodedToken.ip;
      const requestIP = request.ip;
      if (tokenIP && tokenIP !== requestIP) {
        suspiciousIndicators.push('IP_MISMATCH');
      }
    }
    
    // Check for expired token usage attempts
    const now = Math.floor(Date.now() / 1000);
    if (decodedToken.exp && decodedToken.exp < now) {
      suspiciousIndicators.push('EXPIRED_TOKEN_USAGE');
    }
    
    return suspiciousIndicators;
  }

  // =============================================================================
  // BACKWARD COMPATIBILITY HELPERS
  // =============================================================================

  // Middleware that works with both JWT and JWE
  createAuthMiddleware() {
    return (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'No token provided' });
        }
        
        const token = authHeader.substring(7);
        const decoded = this.verifyToken(token);
        
        // Check for suspicious usage
        const suspiciousIndicators = this.detectSuspiciousTokenUsage(decoded, req);
        if (suspiciousIndicators.length > 0) {
          this.logTokenEvent('SUSPICIOUS_USAGE', decoded, { ...req, token });
        }
        
        // Attach user info to request (current behavior)
        req.user = {
          id: decoded.userId,
          userId: decoded.userId, // Backward compatibility
          role: decoded.role,
          organizationId: decoded.organizationId
        };
        
        // Log token usage if enabled
        this.logTokenEvent('TOKEN_USED', decoded, { ...req, token });
        
        next();
      } catch (error) {
        this.logTokenEvent('TOKEN_VERIFICATION_FAILED', {}, { ...req, error: error.message });
        return res.status(401).json({ error: 'Invalid token' });
      }
    };
  }

  // Health check for JWT system
  healthCheck() {
    return {
      jwtSecretPresent: !!this.jwtSecret,
      jweEnabled: this.jweEnabled,
      encryptionKeyPresent: !!this.encryptionKey,
      fingerprintingEnabled: process.env.JWT_FINGERPRINTING === 'true',
      rotationEnabled: process.env.JWT_AUTO_ROTATION_ENABLED === 'true'
    };
  }
}

// Singleton instance
const jwtSecurityService = new JWTSecurityService();

module.exports = jwtSecurityService;