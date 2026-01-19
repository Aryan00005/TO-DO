const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs-extra');
const path = require('path');

const sourceDir = './';
const outputDir = './dist';

// SELECTIVE obfuscation - only business-critical files
const filesToObfuscate = [
  // Only obfuscate licensing and proprietary logic
  'utils/licenseValidator.js',  // Future licensing
  'utils/rateLimiter.js',       // Rate limiting logic
  'config/constants.js'         // Internal constants
];

// Files to copy without obfuscation (maintain debuggability)
const filesToCopy = [
  'server.js',
  'config/database.js',
  'config/passport.js', 
  'middleware/auth.js',
  'models/',
  'routes/',
  'utils/emailService.js',
  'utils/roleUtils.js',
  'utils/welcomeEmailService.js'
];

// PRODUCTION-SAFE obfuscation options
const obfuscationOptions = {
  compact: false,                    // Keep readable for debugging
  controlFlowFlattening: false,      // Avoid performance issues
  deadCodeInjection: false,          // Avoid bloat
  debugProtection: false,            // Allow debugging in production
  disableConsoleOutput: false,       // Keep logging
  identifierNamesGenerator: 'mangled', // Simple name mangling
  log: false,
  numbersToExpressions: false,       // Avoid performance overhead
  renameGlobals: false,              // Prevent breaking dependencies
  selfDefending: false,              // Avoid runtime errors
  simplify: true,                    // Safe optimization
  splitStrings: false,               // Avoid string issues
  stringArray: true,                 // Basic string protection
  stringArrayThreshold: 0.3,         // Light string obfuscation
  transformObjectKeys: false,        // Prevent API breaking
  unicodeEscapeSequence: false       // Keep strings readable
};

async function obfuscateFiles() {
  try {
    await fs.ensureDir(outputDir);
    console.log('🔒 Starting SELECTIVE code obfuscation...');

    // Obfuscate selective files
    for (const file of filesToObfuscate) {
      const sourcePath = path.join(sourceDir, file);
      const outputPath = path.join(outputDir, file);

      if (await fs.pathExists(sourcePath)) {
        await fs.ensureDir(path.dirname(outputPath));
        const sourceCode = await fs.readFile(sourcePath, 'utf8');
        const obfuscatedResult = JavaScriptObfuscator.obfuscate(sourceCode, obfuscationOptions);
        await fs.writeFile(outputPath, obfuscatedResult.getObfuscatedCode());
        console.log(`🔒 Obfuscated: ${file}`);
      } else {
        console.log(`📝 Creating placeholder: ${file}`);
        await fs.ensureDir(path.dirname(outputPath));
        await fs.writeFile(outputPath, '// Placeholder for future licensing logic\nmodule.exports = {};');
      }
    }

    // Copy non-obfuscated files
    for (const item of filesToCopy) {
      const sourcePath = path.join(sourceDir, item);
      const outputPath = path.join(outputDir, item);
      
      if (await fs.pathExists(sourcePath)) {
        const stats = await fs.stat(sourcePath);
        if (stats.isDirectory()) {
          await fs.copy(sourcePath, outputPath);
          console.log(`📁 Copied directory: ${item}`);
        } else {
          await fs.ensureDir(path.dirname(outputPath));
          await fs.copy(sourcePath, outputPath);
          console.log(`📄 Copied file: ${item}`);
        }
      }
    }

    // Copy package.json and other necessary files
    await fs.copy('./package.json', path.join(outputDir, 'package.json'));

    // Copy .env files if they exist
    if (await fs.pathExists('./.env')) {
      await fs.copy('./.env', path.join(outputDir, '.env'));
    }
    if (await fs.pathExists('./.env.production')) {
      await fs.copy('./.env.production', path.join(outputDir, '.env.production'));
    }
    
    console.log('✅ SELECTIVE obfuscation completed successfully!');
    console.log('📦 Production-ready files are in the ./dist directory');
    console.log('🐛 Core files remain debuggable for production support');
    
  } catch (error) {
    console.error('❌ Error during obfuscation:', error);
    process.exit(1);
  }
}

obfuscateFiles();