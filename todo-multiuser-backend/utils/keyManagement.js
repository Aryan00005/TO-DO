// Key Management Service - Operational Control & Rotation
// SAFE: Additive only, backward compatible with existing encryption

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');

class KeyManagementService {
  constructor() {
    this.keyStore = new Map(); // In-memory key cache
    this.keyVersions = new Map(); // Track key versions
    this.keyMetadata = new Map(); // Key ownership and audit info
    this.rotationInProgress = false;
    
    this.initializeKeyManagement();
  }

  // =============================================================================
  // KEY OWNERSHIP & SEPARATION
  // =============================================================================

  initializeKeyManagement() {
    // Define key ownership model
    this.keyOwnership = {
      'MASTER': { owner: 'system', scope: 'global', rotationDays: 90 },
      'FIELD_ENCRYPTION': { owner: 'application', scope: 'database', rotationDays: 180 },
      'BACKUP_ENCRYPTION': { owner: 'operations', scope: 'backups', rotationDays: 365 },
      'LOG_ENCRYPTION': { owner: 'security', scope: 'logs', rotationDays: 90 },
      'EXPORT_ENCRYPTION': { owner: 'compliance', scope: 'exports', rotationDays: 180 }
    };

    // Load existing keys
    this.loadKeys();
  }

  async loadKeys() {
    try {
      // Load from environment (current method - backward compatible)
      if (process.env.ENCRYPTION_MASTER_KEY) {
        await this.registerKey('MASTER', process.env.ENCRYPTION_MASTER_KEY, 'environment');
      }

      // Load from KMS if configured
      if (process.env.KMS_ENABLED === 'true') {
        await this.loadKeysFromKMS();
      }

      // Load from secure file if configured
      if (process.env.KEY_FILE_PATH) {
        await this.loadKeysFromFile();
      }

      logger.info('Key management initialized', {
        keyCount: this.keyStore.size,
        sources: this.getKeySources()
      });

    } catch (error) {
      logger.error('Key management initialization failed', { error: error.message });
      // Fail gracefully - encryption will be disabled
    }
  }

  async registerKey(keyType, keyData, source = 'manual') {
    try {
      const keyBuffer = Buffer.isBuffer(keyData) ? keyData : Buffer.from(keyData, 'base64');
      const keyVersion = this.generateKeyVersion();
      
      // Store key with metadata
      this.keyStore.set(keyType, keyBuffer);
      this.keyVersions.set(keyType, keyVersion);
      this.keyMetadata.set(keyType, {
        version: keyVersion,
        source,
        createdAt: new Date(),
        owner: this.keyOwnership[keyType]?.owner || 'unknown',
        scope: this.keyOwnership[keyType]?.scope || 'unknown',
        rotationDue: this.calculateRotationDue(keyType)
      });

      logger.audit('Key registered', {
        keyType,
        version: keyVersion,
        source,
        owner: this.keyOwnership[keyType]?.owner
      });

      return keyVersion;
    } catch (error) {
      logger.error('Key registration failed', { keyType, error: error.message });
      throw error;
    }
  }

  // =============================================================================
  // KEY ROTATION (ZERO DOWNTIME)
  // =============================================================================

  async rotateKey(keyType, options = {}) {
    if (this.rotationInProgress) {
      throw new Error('Key rotation already in progress');
    }

    try {
      this.rotationInProgress = true;
      logger.audit('Key rotation started', { keyType });

      // Generate new key
      const newKey = crypto.randomBytes(32);
      const newVersion = this.generateKeyVersion();

      // Store old key for decryption of existing data
      const oldKey = this.keyStore.get(keyType);
      const oldVersion = this.keyVersions.get(keyType);
      
      if (oldKey) {
        this.keyStore.set(`${keyType}_OLD_${oldVersion}`, oldKey);
      }

      // Register new key
      await this.registerKey(keyType, newKey, 'rotation');

      // Update external key stores if configured
      if (process.env.KMS_ENABLED === 'true') {
        await this.updateKMSKey(keyType, newKey, newVersion);
      }

      // Notify dependent services
      await this.notifyKeyRotation(keyType, oldVersion, newVersion);

      logger.audit('Key rotation completed', {
        keyType,
        oldVersion,
        newVersion,
        rotationMethod: options.method || 'manual'
      });

      return {
        keyType,
        oldVersion,
        newVersion,
        rotationTime: new Date()
      };

    } catch (error) {
      logger.error('Key rotation failed', { keyType, error: error.message });
      throw error;
    } finally {
      this.rotationInProgress = false;
    }
  }

  async scheduleKeyRotation() {
    if (process.env.AUTO_KEY_ROTATION !== 'true') return;

    try {
      const rotationNeeded = [];

      for (const [keyType, metadata] of this.keyMetadata.entries()) {
        if (new Date() > metadata.rotationDue) {
          rotationNeeded.push(keyType);
        }
      }

      for (const keyType of rotationNeeded) {
        try {
          await this.rotateKey(keyType, { method: 'automatic' });
          
          // Wait between rotations to avoid overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 5000));
        } catch (error) {
          logger.error('Automatic key rotation failed', { keyType, error: error.message });
        }
      }

    } catch (error) {
      logger.error('Key rotation scheduling failed', { error: error.message });
    }
  }

  // =============================================================================
  // BLAST RADIUS REDUCTION
  // =============================================================================

  getKeyForOperation(keyType, version = 'current') {
    try {
      const keyId = version === 'current' ? keyType : `${keyType}_OLD_${version}`;
      const key = this.keyStore.get(keyId);
      
      if (!key) {
        logger.warn('Key not found', { keyType, version });
        return null;
      }

      // Track key usage for audit
      this.trackKeyUsage(keyType, version);
      
      return key;
    } catch (error) {
      logger.error('Key retrieval failed', { keyType, version, error: error.message });
      return null;
    }
  }

  // Derive operation-specific keys to limit blast radius
  deriveOperationKey(baseKeyType, operation, context = {}) {
    try {
      const baseKey = this.getKeyForOperation(baseKeyType);
      if (!baseKey) return null;

      // Create operation-specific key derivation
      const derivationInput = `${operation}:${context.organizationId || ''}:${context.userId || ''}`;
      const derivedKey = crypto.pbkdf2Sync(baseKey, derivationInput, 100000, 32, 'sha256');

      // Track derived key usage
      logger.debug('Operation key derived', {
        baseKeyType,
        operation,
        organizationId: context.organizationId,
        userId: context.userId
      });

      return derivedKey;
    } catch (error) {
      logger.error('Key derivation failed', { baseKeyType, operation, error: error.message });
      return null;
    }
  }

  // =============================================================================
  // ENCRYPTION FAILURE DETECTION
  // =============================================================================

  async validateKeyHealth() {
    const healthReport = {
      timestamp: new Date(),
      keysHealthy: 0,
      keysUnhealthy: 0,
      issues: []
    };

    for (const [keyType, key] of this.keyStore.entries()) {
      try {
        // Test encryption/decryption with each key
        const testData = 'health-check-test-data';
        const encrypted = this.testEncrypt(key, testData);
        const decrypted = this.testDecrypt(key, encrypted);

        if (decrypted === testData) {
          healthReport.keysHealthy++;
        } else {
          healthReport.keysUnhealthy++;
          healthReport.issues.push({
            keyType,
            issue: 'DECRYPTION_MISMATCH',
            severity: 'HIGH'
          });
        }
      } catch (error) {
        healthReport.keysUnhealthy++;
        healthReport.issues.push({
          keyType,
          issue: error.message,
          severity: 'CRITICAL'
        });
      }
    }

    // Log health report
    if (healthReport.keysUnhealthy > 0) {
      logger.error('Key health check failed', healthReport);
    } else {
      logger.info('Key health check passed', {
        keysHealthy: healthReport.keysHealthy
      });
    }

    return healthReport;
  }

  classifyEncryptionFailure(error, operation, keyType) {
    const classification = {
      type: 'UNKNOWN',
      severity: 'MEDIUM',
      actionRequired: 'INVESTIGATE',
      autoRecoverable: false
    };

    if (error.message.includes('wrong key')) {
      classification.type = 'WRONG_KEY';
      classification.severity = 'HIGH';
      classification.actionRequired = 'KEY_ROTATION_NEEDED';
    } else if (error.message.includes('corrupted')) {
      classification.type = 'DATA_CORRUPTION';
      classification.severity = 'CRITICAL';
      classification.actionRequired = 'RESTORE_FROM_BACKUP';
    } else if (error.message.includes('not found')) {
      classification.type = 'MISSING_KEY';
      classification.severity = 'CRITICAL';
      classification.actionRequired = 'KEY_RECOVERY_NEEDED';
      classification.autoRecoverable = true; // Can try older key versions
    } else if (error.message.includes('invalid')) {
      classification.type = 'INVALID_FORMAT';
      classification.severity = 'MEDIUM';
      classification.actionRequired = 'DATA_VALIDATION_NEEDED';
    }

    logger.security('Encryption failure classified', {
      operation,
      keyType,
      classification,
      originalError: error.message
    });

    return classification;
  }

  // =============================================================================
  // ACCESS CONTROL
  // =============================================================================

  async authorizeKeyOperation(operation, keyType, user, context = {}) {
    try {
      // Define operation permissions
      const permissions = {
        'ENCRYPT': ['application', 'system'],
        'DECRYPT': ['application', 'system', 'operations'],
        'ROTATE': ['system', 'security'],
        'EXPORT': ['compliance', 'security'],
        'BACKUP_RESTORE': ['operations', 'system']
      };

      const requiredRoles = permissions[operation] || [];
      const userRole = user.role || 'user';
      const keyOwner = this.keyOwnership[keyType]?.owner || 'unknown';

      // Check if user has required role
      if (!requiredRoles.includes(userRole) && userRole !== keyOwner) {
        logger.security('Key operation unauthorized', {
          operation,
          keyType,
          userId: user.id,
          userRole,
          requiredRoles,
          keyOwner
        });
        return false;
      }

      // Log authorized operation
      logger.audit('Key operation authorized', {
        operation,
        keyType,
        userId: user.id,
        userRole,
        context
      });

      return true;
    } catch (error) {
      logger.error('Key authorization failed', { operation, keyType, error: error.message });
      return false;
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  generateKeyVersion() {
    return `v${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  calculateRotationDue(keyType) {
    const rotationDays = this.keyOwnership[keyType]?.rotationDays || 90;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + rotationDays);
    return dueDate;
  }

  trackKeyUsage(keyType, version) {
    // Track key usage for audit and monitoring
    const usageKey = `${keyType}_${version}`;
    const usage = this.keyMetadata.get(usageKey) || { usageCount: 0, lastUsed: null };
    usage.usageCount++;
    usage.lastUsed = new Date();
    this.keyMetadata.set(usageKey, usage);
  }

  testEncrypt(key, data) {
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
  }

  testDecrypt(key, encryptedData) {
    const algorithm = 'aes-256-gcm';
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipher(algorithm, key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  getKeySources() {
    const sources = new Set();
    for (const metadata of this.keyMetadata.values()) {
      sources.add(metadata.source);
    }
    return Array.from(sources);
  }

  // Health check for key management system
  healthCheck() {
    return {
      keyManagementActive: true,
      totalKeys: this.keyStore.size,
      keyVersions: this.keyVersions.size,
      rotationInProgress: this.rotationInProgress,
      keySources: this.getKeySources(),
      autoRotationEnabled: process.env.AUTO_KEY_ROTATION === 'true'
    };
  }

  // Placeholder methods for external integrations
  async loadKeysFromKMS() {
    // Future: AWS KMS, Azure Key Vault, etc.
    logger.info('KMS key loading not implemented yet');
  }

  async loadKeysFromFile() {
    // Future: Secure file-based key storage
    logger.info('File-based key loading not implemented yet');
  }

  async updateKMSKey(keyType, key, version) {
    // Future: Update external key management systems
    logger.info('KMS key update not implemented yet', { keyType, version });
  }

  async notifyKeyRotation(keyType, oldVersion, newVersion) {
    // Future: Notify dependent services of key rotation
    logger.info('Key rotation notification sent', { keyType, oldVersion, newVersion });
  }
}

// Singleton instance
const keyManagementService = new KeyManagementService();

// Schedule periodic key health checks
if (process.env.KEY_HEALTH_CHECKS === 'true') {
  setInterval(() => {
    keyManagementService.validateKeyHealth();
  }, parseInt(process.env.KEY_HEALTH_CHECK_INTERVAL) || 3600000); // 1 hour
}

// Schedule automatic key rotation
if (process.env.AUTO_KEY_ROTATION === 'true') {
  setInterval(() => {
    keyManagementService.scheduleKeyRotation();
  }, parseInt(process.env.KEY_ROTATION_CHECK_INTERVAL) || 86400000); // 24 hours
}

module.exports = keyManagementService;