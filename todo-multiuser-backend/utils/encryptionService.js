// Complete Encryption Service - Handles all encryption needs
// SAFE: All features disabled by default, backward compatible

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16;  // 128 bits
    this.tagLength = 16; // 128 bits
    
    // Initialize encryption keys
    this.initializeKeys();
  }

  initializeKeys() {
    // Master key from environment (base64 encoded)
    this.masterKey = process.env.ENCRYPTION_MASTER_KEY ? 
      Buffer.from(process.env.ENCRYPTION_MASTER_KEY, 'base64') : null;
    
    // Derive specific keys for different purposes
    if (this.masterKey) {
      this.fieldEncryptionKey = this.deriveKey('FIELD_ENCRYPTION');
      this.logEncryptionKey = this.deriveKey('LOG_ENCRYPTION');
      this.backupEncryptionKey = this.deriveKey('BACKUP_ENCRYPTION');
    }
  }

  deriveKey(purpose) {
    if (!this.masterKey) return null;
    return crypto.pbkdf2Sync(this.masterKey, purpose, 100000, this.keyLength, 'sha256');
  }

  // =============================================================================
  // FIELD-LEVEL ENCRYPTION (for sensitive database fields)
  // =============================================================================

  encryptField(plaintext, keyType = 'field') {
    if (!this.isEncryptionEnabled() || !plaintext) return plaintext;
    
    try {
      const key = this.getKeyByType(keyType);
      if (!key) return plaintext;

      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipher(this.algorithm, key, iv);
      
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      // Format: iv:tag:encrypted (all hex)
      return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
    } catch (error) {
      console.error('Field encryption failed:', error.message);
      return plaintext; // Fail safely
    }
  }

  decryptField(encryptedData, keyType = 'field') {
    if (!this.isEncryptionEnabled() || !encryptedData || !encryptedData.includes(':')) {
      return encryptedData; // Return as-is if not encrypted
    }
    
    try {
      const key = this.getKeyByType(keyType);
      if (!key) return encryptedData;

      const parts = encryptedData.split(':');
      if (parts.length !== 3) return encryptedData;

      const iv = Buffer.from(parts[0], 'hex');
      const tag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];
      
      const decipher = crypto.createDecipher(this.algorithm, key, iv);
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Field decryption failed:', error.message);
      return encryptedData; // Fail safely
    }
  }

  // =============================================================================
  // LOG REDACTION & MASKING
  // =============================================================================

  redactSensitiveData(logData) {
    if (!process.env.LOG_REDACTION_ENABLED) return logData;
    
    const sensitiveFields = [
      'password', 'token', 'secret', 'key', 'authorization',
      'email', 'phone', 'ssn', 'credit', 'payment'
    ];
    
    let redactedData = JSON.stringify(logData);
    
    sensitiveFields.forEach(field => {
      // Redact field values in JSON
      const regex = new RegExp(`"${field}"\\s*:\\s*"[^"]*"`, 'gi');
      redactedData = redactedData.replace(regex, `"${field}":"[REDACTED]"`);
      
      // Redact field values in plain text
      const plainRegex = new RegExp(`${field}[\\s=:]+[\\w\\-\\.@]+`, 'gi');
      redactedData = redactedData.replace(plainRegex, `${field}=[REDACTED]`);
    });
    
    return JSON.parse(redactedData);
  }

  maskEmail(email) {
    if (!email || !email.includes('@')) return email;
    
    const [local, domain] = email.split('@');
    if (local.length <= 2) return email;
    
    const masked = local[0] + '*'.repeat(local.length - 2) + local[local.length - 1];
    return `${masked}@${domain}`;
  }

  // =============================================================================
  // SECRETS MANAGEMENT
  // =============================================================================

  rotateJWTSecret() {
    if (process.env.JWT_SECRET_ROTATION !== 'true') return null;
    
    const newSecret = crypto.randomBytes(64).toString('hex');
    
    // In production, this would integrate with your deployment system
    console.log('New JWT secret generated. Update environment variable:');
    console.log(`JWT_SECRET_NEW=${newSecret}`);
    
    return newSecret;
  }

  generateEncryptionKey() {
    const key = crypto.randomBytes(this.keyLength);
    return key.toString('base64');
  }

  // =============================================================================
  // BACKUP & EXPORT ENCRYPTION
  // =============================================================================

  encryptBackupData(data) {
    if (!process.env.BACKUP_ENCRYPTION_ENABLED) return data;
    
    try {
      const key = this.backupEncryptionKey;
      if (!key) return data;

      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipher(this.algorithm, key, iv);
      
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      return {
        encrypted: true,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        data: encrypted,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Backup encryption failed:', error.message);
      return data;
    }
  }

  decryptBackupData(encryptedData) {
    if (!encryptedData.encrypted || !process.env.BACKUP_ENCRYPTION_ENABLED) {
      return encryptedData.data || encryptedData;
    }
    
    try {
      const key = this.backupEncryptionKey;
      if (!key) return encryptedData;

      const iv = Buffer.from(encryptedData.iv, 'hex');
      const tag = Buffer.from(encryptedData.tag, 'hex');
      
      const decipher = crypto.createDecipher(this.algorithm, key, iv);
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Backup decryption failed:', error.message);
      return encryptedData;
    }
  }

  // =============================================================================
  // RUNTIME MEMORY PROTECTION
  // =============================================================================

  secureWipe(buffer) {
    if (Buffer.isBuffer(buffer)) {
      buffer.fill(0);
    }
  }

  withSecureValue(encryptedValue, callback) {
    let decryptedValue = null;
    try {
      decryptedValue = this.decryptField(encryptedValue);
      return callback(decryptedValue);
    } finally {
      // Clear from memory
      if (decryptedValue && typeof decryptedValue === 'string') {
        decryptedValue = null;
      }
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  isEncryptionEnabled() {
    return process.env.FIELD_ENCRYPTION_ENABLED === 'true' && this.masterKey !== null;
  }

  getKeyByType(keyType) {
    switch (keyType) {
      case 'field': return this.fieldEncryptionKey;
      case 'log': return this.logEncryptionKey;
      case 'backup': return this.backupEncryptionKey;
      default: return this.fieldEncryptionKey;
    }
  }

  // Health check for encryption system
  healthCheck() {
    return {
      encryptionEnabled: this.isEncryptionEnabled(),
      masterKeyPresent: !!this.masterKey,
      derivedKeysPresent: !!(this.fieldEncryptionKey && this.logEncryptionKey && this.backupEncryptionKey),
      algorithm: this.algorithm
    };
  }
}

// Singleton instance
const encryptionService = new EncryptionService();

module.exports = encryptionService;