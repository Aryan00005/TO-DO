// DYNAMIC SAAS SECURITY - No obfuscation of core logic
const filesToSecure = [
  // Only protect business logic, not application code
  'utils/licenseValidator.js',
  'config/pricing.js'
];

// Keep all application code readable for debugging
const filesToKeepReadable = [
  'server.js',           // Main server - needs debugging
  'routes/',             // API routes - frequent updates
  'models/',             // Database models - schema changes
  'middleware/auth.js',  // Authentication - security audits
  'config/database.js',  // DB config - connection debugging
  'utils/emailService.js' // Email service - template updates
];

// MINIMAL obfuscation for production stability
const safeObfuscationOptions = {
  compact: false,                // Keep readable
  controlFlowFlattening: false,  // Maintain performance
  deadCodeInjection: false,      // No bloat
  debugProtection: false,        // Allow debugging
  disableConsoleOutput: false,   // Keep logging
  identifierNamesGenerator: 'mangled',
  renameGlobals: false,          // Don't break APIs
  selfDefending: false,          // Avoid runtime errors
  stringArray: false,            // Keep strings intact
  transformObjectKeys: false     // Maintain API compatibility
};

console.log('🔒 DYNAMIC SAAS: Minimal security, maximum stability');