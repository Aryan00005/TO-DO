const crypto = require('crypto');
const jwt = require('jsonwebtoken');

class LicenseManager {
  constructor() {
    this.licenseSecret = process.env.LICENSE_SECRET || 'default-license-secret';
    this.features = {
      BASIC: ['task_management', 'user_auth'],
      PREMIUM: ['task_management', 'user_auth', 'advanced_analytics', 'api_access'],
      ENTERPRISE: ['task_management', 'user_auth', 'advanced_analytics', 'api_access', 'sso', 'audit_logs']
    };
  }

  // Generate license for a company
  generateLicense(companyData) {
    const licenseData = {
      companyId: companyData.id,
      companyName: companyData.name,
      plan: companyData.plan || 'BASIC',
      maxUsers: companyData.maxUsers || 10,
      features: this.features[companyData.plan] || this.features.BASIC,
      issuedAt: Date.now(),
      expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 year
      version: '1.0'
    };

    // Create signature
    const signature = this.createSignature(licenseData);
    
    return {
      ...licenseData,
      signature
    };
  }

  // Create cryptographic signature for license
  createSignature(licenseData) {
    const dataString = JSON.stringify(licenseData);
    return crypto
      .createHmac('sha256', this.licenseSecret)
      .update(dataString)
      .digest('hex');
  }

  // Validate license
  validateLicense(license) {
    try {
      // Check signature
      const { signature, ...licenseData } = license;
      const expectedSignature = this.createSignature(licenseData);
      
      if (signature !== expectedSignature) {
        return { valid: false, reason: 'Invalid signature' };
      }

      // Check expiration
      if (Date.now() > licenseData.expiresAt) {
        return { valid: false, reason: 'License expired' };
      }

      return { valid: true, license: licenseData };
    } catch (error) {
      return { valid: false, reason: 'Invalid license format' };
    }
  }

  // Check if feature is available for company
  hasFeature(companyLicense, featureName) {
    if (!companyLicense || !companyLicense.features) {
      return false;
    }
    return companyLicense.features.includes(featureName);
  }

  // Get usage limits for company
  getUsageLimits(companyLicense) {
    const plan = companyLicense?.plan || 'BASIC';
    
    const limits = {
      BASIC: {
        maxUsers: 10,
        maxTasks: 1000,
        apiCallsPerHour: 100,
        storageGB: 1
      },
      PREMIUM: {
        maxUsers: 50,
        maxTasks: 10000,
        apiCallsPerHour: 1000,
        storageGB: 10
      },
      ENTERPRISE: {
        maxUsers: -1, // Unlimited
        maxTasks: -1,
        apiCallsPerHour: 10000,
        storageGB: 100
      }
    };

    return limits[plan] || limits.BASIC;
  }
}

// Middleware to check license and features
const licenseMiddleware = (requiredFeature = null) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user || !user.company) {
        return res.status(403).json({ error: 'Company information required' });
      }

      // Get company license (this would be stored in database)
      const companyLicense = await getCompanyLicense(user.company);
      
      if (!companyLicense) {
        return res.status(403).json({ error: 'No valid license found' });
      }

      const licenseManager = new LicenseManager();
      const validation = licenseManager.validateLicense(companyLicense);
      
      if (!validation.valid) {
        return res.status(403).json({ error: `License invalid: ${validation.reason}` });
      }

      // Check specific feature if required
      if (requiredFeature && !licenseManager.hasFeature(validation.license, requiredFeature)) {
        return res.status(403).json({ 
          error: `Feature '${requiredFeature}' not available in your plan`,
          currentPlan: validation.license.plan,
          upgradeRequired: true
        });
      }

      // Attach license info to request
      req.license = validation.license;
      req.usageLimits = licenseManager.getUsageLimits(validation.license);
      
      next();
    } catch (error) {
      console.error('License middleware error:', error);
      res.status(500).json({ error: 'License validation failed' });
    }
  };
};

// Usage tracking for billing
class UsageTracker {
  static async trackApiCall(companyId, endpoint) {
    // Track API usage for billing
    const usage = {
      companyId,
      endpoint,
      timestamp: new Date(),
      type: 'api_call'
    };
    
    // Store in database or analytics service
    console.log('API Usage:', usage);
  }

  static async trackFeatureUsage(companyId, feature, metadata = {}) {
    const usage = {
      companyId,
      feature,
      metadata,
      timestamp: new Date(),
      type: 'feature_usage'
    };
    
    console.log('Feature Usage:', usage);
  }

  static async getUsageStats(companyId, period = '30d') {
    // Return usage statistics for billing
    return {
      apiCalls: 1250,
      activeUsers: 15,
      storageUsed: 2.5, // GB
      period
    };
  }
}

// Placeholder for database operations
async function getCompanyLicense(companyId) {
  // This would fetch from your database
  // For now, return a basic license
  const licenseManager = new LicenseManager();
  return licenseManager.generateLicense({
    id: companyId,
    name: companyId,
    plan: 'BASIC',
    maxUsers: 10
  });
}

module.exports = {
  LicenseManager,
  licenseMiddleware,
  UsageTracker
};