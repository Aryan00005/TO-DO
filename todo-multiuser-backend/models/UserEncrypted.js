// Enhanced User Model with Optional Field Encryption
// SAFE: Backward compatible, encryption is optional

const mongoose = require('mongoose');
const encryptionService = require('../utils/encryptionService');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    // Optional encryption for names (disabled by default)
    set: function(value) {
      if (process.env.ENCRYPT_USER_NAMES === 'true') {
        return encryptionService.encryptField(value);
      }
      return value;
    },
    get: function(value) {
      if (process.env.ENCRYPT_USER_NAMES === 'true') {
        return encryptionService.decryptField(value);
      }
      return value;
    }
  },
  
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    // Email remains unencrypted for queries (login, lookup)
    // Alternative: Use hashed email for lookup + encrypted email for display
    index: true
  },
  
  // Optional: Encrypted email for display (if needed)
  emailEncrypted: {
    type: String,
    set: function(value) {
      if (process.env.ENCRYPT_USER_EMAILS === 'true' && value) {
        return encryptionService.encryptField(value);
      }
      return value;
    },
    get: function(value) {
      if (process.env.ENCRYPT_USER_EMAILS === 'true' && value) {
        return encryptionService.decryptField(value);
      }
      return value;
    }
  },
  
  passwordHash: {
    type: String,
    required: true
    // Passwords remain hashed (bcrypt), not encrypted
    // Hashing is more appropriate for passwords than encryption
  },
  
  role: {
    type: String,
    enum: ['user', 'admin', 'superadmin'],
    default: 'user'
    // Roles remain unencrypted for authorization queries
  },
  
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
    // Organization IDs remain unencrypted for queries
  },
  
  // Optional: Additional sensitive fields (if added in future)
  phoneNumber: {
    type: String,
    set: function(value) {
      if (process.env.ENCRYPT_PHONE_NUMBERS === 'true' && value) {
        return encryptionService.encryptField(value);
      }
      return value;
    },
    get: function(value) {
      if (process.env.ENCRYPT_PHONE_NUMBERS === 'true' && value) {
        return encryptionService.decryptField(value);
      }
      return value;
    }
  },
  
  // Metadata for encryption tracking
  encryptionMetadata: {
    fieldsEncrypted: [String], // Track which fields are encrypted
    encryptionVersion: { type: Number, default: 1 },
    lastEncryptionUpdate: Date
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { 
    getters: true,
    transform: function(doc, ret) {
      // Remove sensitive fields from JSON output
      delete ret.passwordHash;
      delete ret.encryptionMetadata;
      return ret;
    }
  },
  toObject: { getters: true }
});

// Indexes for performance (unencrypted fields only)
userSchema.index({ email: 1 });
userSchema.index({ organizationId: 1 });
userSchema.index({ role: 1 });

// Pre-save middleware to update encryption metadata
userSchema.pre('save', function(next) {
  if (this.isModified()) {
    this.updatedAt = new Date();
    
    // Track encrypted fields
    const encryptedFields = [];
    if (process.env.ENCRYPT_USER_NAMES === 'true') encryptedFields.push('name');
    if (process.env.ENCRYPT_USER_EMAILS === 'true') encryptedFields.push('emailEncrypted');
    if (process.env.ENCRYPT_PHONE_NUMBERS === 'true') encryptedFields.push('phoneNumber');
    
    if (encryptedFields.length > 0) {
      this.encryptionMetadata = {
        fieldsEncrypted: encryptedFields,
        encryptionVersion: 1,
        lastEncryptionUpdate: new Date()
      };
    }
  }
  next();
});

// Static method for safe user lookup (handles encrypted fields)
userSchema.statics.findByEmailSafe = function(email) {
  // Always search by unencrypted email for performance
  return this.findOne({ email: email.toLowerCase() });
};

// Instance method to get display email (encrypted or regular)
userSchema.methods.getDisplayEmail = function() {
  if (process.env.ENCRYPT_USER_EMAILS === 'true' && this.emailEncrypted) {
    return this.emailEncrypted; // This will be decrypted by getter
  }
  return this.email;
};

// Instance method to safely export user data
userSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  
  // Remove sensitive fields
  delete obj.passwordHash;
  delete obj.encryptionMetadata;
  
  // Mask email if needed
  if (process.env.MASK_EMAILS_IN_EXPORTS === 'true') {
    obj.email = encryptionService.maskEmail(obj.email);
  }
  
  return obj;
};

const User = mongoose.model('User', userSchema);

module.exports = User;