const crypto = require('crypto');
const bcrypt = require('bcryptjs');

class DataProtection {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32;
    this.ivLength = 16;
    this.tagLength = 16;
    this.saltRounds = 12;
  }

  // Generate encryption key from password/secret
  generateKey(secret, salt) {
    return crypto.pbkdf2Sync(secret, salt, 100000, this.keyLength, 'sha256');
  }

  // Encrypt sensitive data (PII, API keys)
  encrypt(text, secret) {
    try {
      const salt = crypto.randomBytes(16);
      const key = this.generateKey(secret || process.env.ENCRYPTION_KEY, salt);
      const iv = crypto.randomBytes(this.ivLength);
      
      const cipher = crypto.createCipher(this.algorithm, key);
      cipher.setAAD(Buffer.from('saas-todo-app'));
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      return {
        encrypted,
        salt: salt.toString('hex'),
        iv: iv.toString('hex'),
        tag: tag.toString('hex')
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Encryption failed');
    }
  }

  // Decrypt sensitive data
  decrypt(encryptedData, secret) {
    try {
      const { encrypted, salt, iv, tag } = encryptedData;
      const key = this.generateKey(secret || process.env.ENCRYPTION_KEY, Buffer.from(salt, 'hex'));
      
      const decipher = crypto.createDecipher(this.algorithm, key);
      decipher.setAAD(Buffer.from('saas-todo-app'));
      decipher.setAuthTag(Buffer.from(tag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Decryption failed');
    }
  }

  // Hash passwords securely
  async hashPassword(password) {
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }
    return await bcrypt.hash(password, this.saltRounds);
  }

  // Verify password
  async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  // Generate secure tokens
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  // Hash sensitive identifiers (email, phone) for indexing
  hashIdentifier(identifier) {
    return crypto.createHash('sha256').update(identifier.toLowerCase()).digest('hex');
  }

  // Mask sensitive data for logging
  maskSensitiveData(data) {
    const masked = { ...data };
    
    // Mask email
    if (masked.email) {
      const [local, domain] = masked.email.split('@');
      masked.email = `${local.substring(0, 2)}***@${domain}`;
    }
    
    // Mask phone
    if (masked.phone) {
      masked.phone = `***-***-${masked.phone.slice(-4)}`;
    }
    
    // Remove sensitive fields
    delete masked.password;
    delete masked.ssn;
    delete masked.creditCard;
    
    return masked;
  }

  // Validate data integrity
  generateChecksum(data) {
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  // Secure random ID generation
  generateSecureId() {
    return crypto.randomUUID();
  }
}

// Data classification helpers
const DataClassification = {
  // Public data - no encryption needed
  PUBLIC: ['name', 'company', 'role', 'created_at'],
  
  // Internal data - encrypt at rest
  INTERNAL: ['user_id', 'preferences', 'settings'],
  
  // Confidential data - encrypt + access logging
  CONFIDENTIAL: ['email', 'phone', 'address'],
  
  // Restricted data - encrypt + audit trail
  RESTRICTED: ['password', 'ssn', 'payment_info'],

  classify(fieldName) {
    if (this.RESTRICTED.includes(fieldName)) return 'RESTRICTED';
    if (this.CONFIDENTIAL.includes(fieldName)) return 'CONFIDENTIAL';
    if (this.INTERNAL.includes(fieldName)) return 'INTERNAL';
    return 'PUBLIC';
  }
};

// Multi-tenant data isolation
class TenantDataIsolation {
  static validateTenantAccess(userCompany, requestedCompany) {
    if (!userCompany || !requestedCompany) {
      throw new Error('Tenant information missing');
    }
    
    if (userCompany !== requestedCompany) {
      throw new Error('Cross-tenant access denied');
    }
    
    return true;
  }

  static addTenantFilter(query, userCompany) {
    if (!userCompany) {
      throw new Error('User company required for data access');
    }
    
    return {
      ...query,
      company: userCompany
    };
  }
}

module.exports = {
  DataProtection,
  DataClassification,
  TenantDataIsolation
};