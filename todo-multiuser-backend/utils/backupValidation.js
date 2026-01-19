// Backup Validation Service - Ensure Encrypted Backups Are Recoverable
// SAFE: Additive validation, doesn't modify existing backup process

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const logger = require('./logger');
const encryptionService = require('./encryptionService');
const secureBackup = require('./secureBackup');

class BackupValidationService {
  constructor() {
    this.validationResults = new Map(); // Track validation history
    this.corruptedBackups = new Set(); // Track known corrupted backups
    this.validationInProgress = false;
    
    this.initializeValidation();
  }

  // =============================================================================
  // PERIODIC BACKUP VALIDATION
  // =============================================================================

  initializeValidation() {
    // Schedule periodic validation if enabled
    if (process.env.BACKUP_VALIDATION_ENABLED === 'true') {
      const interval = parseInt(process.env.BACKUP_VALIDATION_INTERVAL) || 86400000; // 24 hours
      setInterval(() => {
        this.validateAllBackups();
      }, interval);

      logger.info('Backup validation service initialized', {
        interval: interval / 1000 / 60 / 60 + ' hours'
      });
    }
  }

  async validateAllBackups() {
    if (this.validationInProgress) {
      logger.warn('Backup validation already in progress, skipping');
      return;
    }

    try {
      this.validationInProgress = true;
      logger.info('Starting comprehensive backup validation');

      const backupDir = process.env.BACKUP_DIRECTORY || './backups';
      const backupFiles = await this.getBackupFiles(backupDir);
      
      const validationResults = {
        total: backupFiles.length,
        valid: 0,
        corrupted: 0,
        unreadable: 0,
        details: []
      };

      for (const backupFile of backupFiles) {
        try {
          const result = await this.validateSingleBackup(backupFile);
          validationResults.details.push(result);
          
          if (result.status === 'valid') {
            validationResults.valid++;
          } else if (result.status === 'corrupted') {
            validationResults.corrupted++;
            this.corruptedBackups.add(backupFile);
          } else {
            validationResults.unreadable++;
          }

          // Small delay to avoid overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          logger.error('Backup validation failed', {
            file: backupFile,
            error: error.message
          });
          validationResults.unreadable++;
        }
      }

      // Store validation results
      this.validationResults.set(new Date().toISOString(), validationResults);

      // Alert if corrupted backups found
      if (validationResults.corrupted > 0) {
        logger.error('Corrupted backups detected', {
          corruptedCount: validationResults.corrupted,
          totalBackups: validationResults.total
        });
        
        await this.handleCorruptedBackups(validationResults.details.filter(r => r.status === 'corrupted'));
      }

      logger.audit('Backup validation completed', validationResults);
      return validationResults;

    } catch (error) {
      logger.error('Backup validation process failed', { error: error.message });
      throw error;
    } finally {
      this.validationInProgress = false;
    }
  }

  async validateSingleBackup(backupPath) {
    const startTime = Date.now();
    const result = {
      file: path.basename(backupPath),
      path: backupPath,
      status: 'unknown',
      validationTime: null,
      issues: [],
      metadata: {}
    };

    try {
      // Check file accessibility
      const stats = await fs.stat(backupPath);
      result.metadata.size = stats.size;
      result.metadata.created = stats.birthtime;
      result.metadata.modified = stats.mtime;

      // Read backup file
      const backupContent = await fs.readFile(backupPath, 'utf8');
      let backupData;

      try {
        backupData = JSON.parse(backupContent);
      } catch (parseError) {
        result.status = 'corrupted';
        result.issues.push('JSON_PARSE_ERROR');
        return result;
      }

      // Validate backup structure
      const structureValid = this.validateBackupStructure(backupData);
      if (!structureValid.valid) {
        result.status = 'corrupted';
        result.issues.push(...structureValid.issues);
        return result;
      }

      // Test decryption if backup is encrypted
      if (backupData.encrypted) {
        const decryptionResult = await this.testBackupDecryption(backupData);
        if (!decryptionResult.success) {
          result.status = 'corrupted';
          result.issues.push('DECRYPTION_FAILED');
          result.issues.push(decryptionResult.error);
          return result;
        }
        result.metadata.encrypted = true;
        result.metadata.decryptionTime = decryptionResult.time;
      }

      // Validate data integrity
      const integrityResult = await this.validateDataIntegrity(backupData);
      if (!integrityResult.valid) {
        result.status = 'corrupted';
        result.issues.push(...integrityResult.issues);
        return result;
      }

      // Test sample restore (if enabled)
      if (process.env.BACKUP_SAMPLE_RESTORE === 'true') {
        const restoreResult = await this.testSampleRestore(backupData);
        if (!restoreResult.success) {
          result.status = 'corrupted';
          result.issues.push('SAMPLE_RESTORE_FAILED');
          result.issues.push(restoreResult.error);
          return result;
        }
        result.metadata.sampleRestoreTested = true;
      }

      result.status = 'valid';
      result.validationTime = Date.now() - startTime;
      
      return result;

    } catch (error) {
      result.status = 'unreadable';
      result.issues.push(error.message);
      result.validationTime = Date.now() - startTime;
      return result;
    }
  }

  // =============================================================================
  // BACKUP STRUCTURE & INTEGRITY VALIDATION
  // =============================================================================

  validateBackupStructure(backupData) {
    const result = { valid: true, issues: [] };

    // Required fields
    const requiredFields = ['collection', 'timestamp', 'data'];
    for (const field of requiredFields) {
      if (!backupData.hasOwnProperty(field)) {
        result.valid = false;
        result.issues.push(`MISSING_FIELD_${field.toUpperCase()}`);
      }
    }

    // Validate timestamp
    if (backupData.timestamp) {
      const timestamp = new Date(backupData.timestamp);
      if (isNaN(timestamp.getTime())) {
        result.valid = false;
        result.issues.push('INVALID_TIMESTAMP');
      }
    }

    // Validate record count
    if (backupData.recordCount !== undefined) {
      const actualCount = Array.isArray(backupData.data) ? backupData.data.length : 1;
      if (backupData.recordCount !== actualCount) {
        result.valid = false;
        result.issues.push('RECORD_COUNT_MISMATCH');
      }
    }

    return result;
  }

  async testBackupDecryption(backupData) {
    const startTime = Date.now();
    
    try {
      const decryptedData = encryptionService.decryptBackupData(backupData);
      
      // Verify decrypted data is valid JSON
      if (typeof decryptedData !== 'object') {
        return {
          success: false,
          error: 'DECRYPTED_DATA_NOT_OBJECT',
          time: Date.now() - startTime
        };
      }

      return {
        success: true,
        time: Date.now() - startTime
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        time: Date.now() - startTime
      };
    }
  }

  async validateDataIntegrity(backupData) {
    const result = { valid: true, issues: [] };

    try {
      let dataToValidate = backupData.data;

      // Decrypt if necessary
      if (backupData.encrypted) {
        dataToValidate = encryptionService.decryptBackupData(backupData);
        dataToValidate = dataToValidate.data;
      }

      // Validate data structure
      if (!dataToValidate) {
        result.valid = false;
        result.issues.push('NO_DATA_FOUND');
        return result;
      }

      // For array data, validate sample records
      if (Array.isArray(dataToValidate)) {
        const sampleSize = Math.min(10, dataToValidate.length);
        for (let i = 0; i < sampleSize; i++) {
          const record = dataToValidate[i];
          if (!record || typeof record !== 'object') {
            result.valid = false;
            result.issues.push(`INVALID_RECORD_${i}`);
          }
        }
      }

      // Calculate and verify checksum if present
      if (backupData.checksum) {
        const calculatedChecksum = this.calculateDataChecksum(dataToValidate);
        if (calculatedChecksum !== backupData.checksum) {
          result.valid = false;
          result.issues.push('CHECKSUM_MISMATCH');
        }
      }

    } catch (error) {
      result.valid = false;
      result.issues.push(`INTEGRITY_CHECK_ERROR: ${error.message}`);
    }

    return result;
  }

  async testSampleRestore(backupData) {
    try {
      // Create a temporary test restore
      const tempRestoreData = await secureBackup.decryptBackupData(backupData);
      
      // Validate restored data structure
      if (!tempRestoreData || !tempRestoreData.data) {
        return {
          success: false,
          error: 'RESTORE_DATA_MISSING'
        };
      }

      // Test a few records if it's an array
      if (Array.isArray(tempRestoreData.data) && tempRestoreData.data.length > 0) {
        const sampleRecord = tempRestoreData.data[0];
        if (!sampleRecord || typeof sampleRecord !== 'object') {
          return {
            success: false,
            error: 'RESTORED_RECORD_INVALID'
          };
        }
      }

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // =============================================================================
  // CORRUPTED BACKUP HANDLING
  // =============================================================================

  async handleCorruptedBackups(corruptedBackups) {
    for (const backup of corruptedBackups) {
      try {
        // Move corrupted backup to quarantine
        await this.quarantineCorruptedBackup(backup.path);
        
        // Attempt to find alternative backup
        const alternative = await this.findAlternativeBackup(backup);
        
        if (alternative) {
          logger.info('Alternative backup found for corrupted backup', {
            corrupted: backup.file,
            alternative: alternative.file
          });
        } else {
          logger.error('No alternative backup found', {
            corrupted: backup.file,
            issues: backup.issues
          });
          
          // Alert operations team
          await this.alertCorruptedBackup(backup);
        }

      } catch (error) {
        logger.error('Failed to handle corrupted backup', {
          backup: backup.file,
          error: error.message
        });
      }
    }
  }

  async quarantineCorruptedBackup(backupPath) {
    const quarantineDir = path.join(path.dirname(backupPath), 'quarantine');
    
    try {
      // Ensure quarantine directory exists
      await fs.mkdir(quarantineDir, { recursive: true });
      
      // Move corrupted backup
      const quarantinePath = path.join(quarantineDir, path.basename(backupPath));
      await fs.rename(backupPath, quarantinePath);
      
      logger.audit('Backup quarantined', {
        originalPath: backupPath,
        quarantinePath
      });

    } catch (error) {
      logger.error('Failed to quarantine backup', {
        backupPath,
        error: error.message
      });
    }
  }

  async findAlternativeBackup(corruptedBackup) {
    try {
      const backupDir = path.dirname(corruptedBackup.path);
      const backupFiles = await this.getBackupFiles(backupDir);
      
      // Look for backups of the same collection within 24 hours
      const targetTime = new Date(corruptedBackup.metadata.created);
      const timeWindow = 24 * 60 * 60 * 1000; // 24 hours
      
      for (const backupFile of backupFiles) {
        if (backupFile === corruptedBackup.path) continue;
        
        const stats = await fs.stat(backupFile);
        const timeDiff = Math.abs(stats.birthtime.getTime() - targetTime.getTime());
        
        if (timeDiff <= timeWindow) {
          const validation = await this.validateSingleBackup(backupFile);
          if (validation.status === 'valid') {
            return validation;
          }
        }
      }
      
      return null;
    } catch (error) {
      logger.error('Failed to find alternative backup', { error: error.message });
      return null;
    }
  }

  async alertCorruptedBackup(backup) {
    // Future: Integration with alerting systems (email, Slack, PagerDuty)
    logger.error('ALERT: Corrupted backup with no alternative found', {
      backup: backup.file,
      issues: backup.issues,
      alertLevel: 'CRITICAL'
    });
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  async getBackupFiles(backupDir) {
    try {
      const files = await fs.readdir(backupDir);
      return files
        .filter(file => file.endsWith('.backup'))
        .map(file => path.join(backupDir, file));
    } catch (error) {
      logger.error('Failed to read backup directory', { backupDir, error: error.message });
      return [];
    }
  }

  calculateDataChecksum(data) {
    const dataString = JSON.stringify(data);
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  getValidationHistory(days = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const history = [];
    for (const [timestamp, results] of this.validationResults.entries()) {
      if (new Date(timestamp) >= cutoffDate) {
        history.push({ timestamp, ...results });
      }
    }
    
    return history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  getCorruptedBackups() {
    return Array.from(this.corruptedBackups);
  }

  // Health check for backup validation system
  healthCheck() {
    const recentValidations = this.getValidationHistory(1); // Last 24 hours
    const lastValidation = recentValidations[0];
    
    return {
      validationEnabled: process.env.BACKUP_VALIDATION_ENABLED === 'true',
      validationInProgress: this.validationInProgress,
      lastValidation: lastValidation ? {
        timestamp: lastValidation.timestamp,
        totalBackups: lastValidation.total,
        validBackups: lastValidation.valid,
        corruptedBackups: lastValidation.corrupted
      } : null,
      corruptedBackupsCount: this.corruptedBackups.size,
      validationHistoryCount: this.validationResults.size
    };
  }
}

// Singleton instance
const backupValidationService = new BackupValidationService();

module.exports = backupValidationService;