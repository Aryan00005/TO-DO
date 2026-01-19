// Secure Backup & Export Service
// SAFE: Optional encryption, backward compatible exports

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const encryptionService = require('./encryptionService');
const logger = require('./logger');

class SecureBackupService {
  constructor() {
    this.backupDir = process.env.BACKUP_DIRECTORY || './backups';
    this.exportDir = process.env.EXPORT_DIRECTORY || './exports';
    this.compressionEnabled = process.env.BACKUP_COMPRESSION === 'true';
  }

  // =============================================================================
  // DATABASE BACKUP ENCRYPTION
  // =============================================================================

  async createSecureBackup(collectionName, data, options = {}) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${collectionName}_${timestamp}.backup`;
      const backupPath = path.join(this.backupDir, filename);
      
      // Ensure backup directory exists
      await this.ensureDirectory(this.backupDir);
      
      // Prepare backup data
      let backupData = {
        collection: collectionName,
        timestamp: new Date().toISOString(),
        recordCount: Array.isArray(data) ? data.length : 1,
        data: data,
        metadata: {
          version: '1.0',
          source: 'task-management-system',
          ...options.metadata
        }
      };
      
      // Encrypt backup if enabled
      if (process.env.BACKUP_ENCRYPTION_ENABLED === 'true') {
        backupData = encryptionService.encryptBackupData(backupData);
        logger.info('Backup encrypted', { collection: collectionName, filename });
      }
      
      // Compress if enabled
      if (this.compressionEnabled) {
        backupData = await this.compressData(backupData);
      }
      
      // Write backup file
      await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));
      
      logger.audit('Backup created', {
        collection: collectionName,
        filename,
        encrypted: process.env.BACKUP_ENCRYPTION_ENABLED === 'true',
        compressed: this.compressionEnabled,
        recordCount: Array.isArray(data) ? data.length : 1
      });
      
      return {
        filename,
        path: backupPath,
        encrypted: process.env.BACKUP_ENCRYPTION_ENABLED === 'true',
        size: (await fs.stat(backupPath)).size
      };
      
    } catch (error) {
      logger.error('Backup creation failed', {
        collection: collectionName,
        error: error.message
      });
      throw error;
    }
  }

  async restoreFromBackup(backupPath, options = {}) {
    try {
      // Read backup file
      const backupContent = await fs.readFile(backupPath, 'utf8');
      let backupData = JSON.parse(backupContent);
      
      // Decompress if needed
      if (backupData.compressed) {
        backupData = await this.decompressData(backupData);
      }
      
      // Decrypt if needed
      if (backupData.encrypted) {
        backupData = encryptionService.decryptBackupData(backupData);
      }
      
      logger.audit('Backup restored', {
        collection: backupData.collection,
        filename: path.basename(backupPath),
        recordCount: backupData.recordCount
      });
      
      return backupData;
      
    } catch (error) {
      logger.error('Backup restoration failed', {
        backupPath,
        error: error.message
      });
      throw error;
    }
  }

  // =============================================================================
  // SECURE DATA EXPORTS
  // =============================================================================

  async createSecureExport(userId, organizationId, exportType, data, options = {}) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${exportType}_${userId}_${timestamp}.export`;
      const exportPath = path.join(this.exportDir, filename);
      
      // Ensure export directory exists
      await this.ensureDirectory(this.exportDir);
      
      // Sanitize data for export
      const sanitizedData = this.sanitizeExportData(data, options);
      
      // Prepare export data
      let exportData = {
        exportType,
        userId,
        organizationId,
        timestamp: new Date().toISOString(),
        recordCount: Array.isArray(sanitizedData) ? sanitizedData.length : 1,
        data: sanitizedData,
        metadata: {
          version: '1.0',
          format: options.format || 'json',
          ...options.metadata
        }
      };
      
      // Encrypt export if requested
      if (options.encrypt || process.env.EXPORT_ENCRYPTION_DEFAULT === 'true') {
        exportData = encryptionService.encryptBackupData(exportData);
        logger.info('Export encrypted', { exportType, userId, filename });
      }
      
      // Convert to requested format
      const formattedData = await this.formatExportData(exportData, options.format);
      
      // Write export file
      await fs.writeFile(exportPath, formattedData);
      
      // Log export activity
      logger.audit('Data export created', {
        exportType,
        userId,
        organizationId,
        filename,
        encrypted: !!(options.encrypt || process.env.EXPORT_ENCRYPTION_DEFAULT === 'true'),
        format: options.format || 'json',
        recordCount: Array.isArray(sanitizedData) ? sanitizedData.length : 1
      });
      
      return {
        filename,
        path: exportPath,
        encrypted: !!(options.encrypt || process.env.EXPORT_ENCRYPTION_DEFAULT === 'true'),
        format: options.format || 'json',
        size: (await fs.stat(exportPath)).size
      };
      
    } catch (error) {
      logger.error('Export creation failed', {
        exportType,
        userId,
        error: error.message
      });
      throw error;
    }
  }

  // =============================================================================
  // DATA SANITIZATION & FORMATTING
  // =============================================================================

  sanitizeExportData(data, options = {}) {
    if (!Array.isArray(data)) {
      data = [data];
    }
    
    return data.map(item => {
      const sanitized = { ...item };
      
      // Remove sensitive fields
      const sensitiveFields = [
        'passwordHash', 'password', 'secret', 'token', 'key',
        'encryptionMetadata', '__v', 'createdAt', 'updatedAt'
      ];
      
      sensitiveFields.forEach(field => {
        delete sanitized[field];
      });
      
      // Mask emails if required
      if (options.maskEmails || process.env.MASK_EMAILS_IN_EXPORTS === 'true') {
        if (sanitized.email) {
          sanitized.email = encryptionService.maskEmail(sanitized.email);
        }
      }
      
      // Remove internal MongoDB fields
      delete sanitized._id;
      delete sanitized.__v;
      
      return sanitized;
    });
  }

  async formatExportData(exportData, format = 'json') {
    switch (format.toLowerCase()) {
      case 'csv':
        return this.convertToCSV(exportData);
      case 'xml':
        return this.convertToXML(exportData);
      case 'json':
      default:
        return JSON.stringify(exportData, null, 2);
    }
  }

  convertToCSV(exportData) {
    if (!exportData.data || !Array.isArray(exportData.data) || exportData.data.length === 0) {
      return 'No data available';
    }
    
    const headers = Object.keys(exportData.data[0]);
    const csvRows = [headers.join(',')];
    
    exportData.data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
      });
      csvRows.push(values.join(','));
    });
    
    return csvRows.join('\n');
  }

  convertToXML(exportData) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += `<export type="${exportData.exportType}" timestamp="${exportData.timestamp}">\n`;
    xml += `  <metadata>\n`;
    xml += `    <recordCount>${exportData.recordCount}</recordCount>\n`;
    xml += `    <version>${exportData.metadata.version}</version>\n`;
    xml += `  </metadata>\n`;
    xml += `  <data>\n`;
    
    if (Array.isArray(exportData.data)) {
      exportData.data.forEach(item => {
        xml += `    <record>\n`;
        Object.entries(item).forEach(([key, value]) => {
          xml += `      <${key}>${this.escapeXML(value)}</${key}>\n`;
        });
        xml += `    </record>\n`;
      });
    }
    
    xml += `  </data>\n`;
    xml += `</export>`;
    
    return xml;
  }

  escapeXML(value) {
    if (typeof value !== 'string') return value;
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // =============================================================================
  // COMPRESSION UTILITIES
  // =============================================================================

  async compressData(data) {
    if (!this.compressionEnabled) return data;
    
    const zlib = require('zlib');
    const compressed = zlib.gzipSync(JSON.stringify(data));
    
    return {
      compressed: true,
      algorithm: 'gzip',
      originalSize: JSON.stringify(data).length,
      compressedSize: compressed.length,
      data: compressed.toString('base64')
    };
  }

  async decompressData(compressedData) {
    if (!compressedData.compressed) return compressedData;
    
    const zlib = require('zlib');
    const buffer = Buffer.from(compressedData.data, 'base64');
    const decompressed = zlib.gunzipSync(buffer);
    
    return JSON.parse(decompressed.toString());
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  async ensureDirectory(dirPath) {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  async cleanupOldBackups(retentionDays = 30) {
    if (process.env.BACKUP_CLEANUP_ENABLED !== 'true') return;
    
    try {
      const files = await fs.readdir(this.backupDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      
      let deletedCount = 0;
      
      for (const file of files) {
        const filePath = path.join(this.backupDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }
      
      if (deletedCount > 0) {
        logger.info('Old backups cleaned up', {
          deletedCount,
          retentionDays
        });
      }
      
    } catch (error) {
      logger.error('Backup cleanup failed', { error: error.message });
    }
  }

  // Health check for backup system
  healthCheck() {
    return {
      backupEncryptionEnabled: process.env.BACKUP_ENCRYPTION_ENABLED === 'true',
      exportEncryptionDefault: process.env.EXPORT_ENCRYPTION_DEFAULT === 'true',
      compressionEnabled: this.compressionEnabled,
      backupDirectory: this.backupDir,
      exportDirectory: this.exportDir
    };
  }
}

// Singleton instance
const secureBackupService = new SecureBackupService();

module.exports = secureBackupService;