const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs-extra');
const path = require('path');

const sourceDir = './';
const outputDir = './dist';

// DYNAMIC SAAS: Only obfuscate licensing logic, keep dashboard code readable
const filesToObfuscate = [
  // Future licensing files only
  'utils/licenseValidator.js',
  'config/pricing.js'
];

// Copy these files without obfuscation (keep dashboard working)
const filesToCopy = [
  'server.js',
  'config/database.js',
  'config/passport.js',
  'middleware/auth.js',
  'models/task.js',
  'models/user.js',
  'models/notification.js',
  'models/organization.js',
  'routes/auth.js',
  'routes/task.js',
  'routes/notification.js',
  'routes/superadmin.js',
  'utils/emailService.js',
  'utils/roleUtils.js',
  'utils/welcomeEmailService.js'
];

// SAFE obfuscation - won't break your dashboard
const obfuscationOptions = {
  compact: false,
  controlFlowFlattening: false,
  deadCodeInjection: false,
  debugProtection: false,
  disableConsoleOutput: false,
  identifierNamesGenerator: 'mangled',
  log: false,
  numbersToExpressions: false,
  renameGlobals: false,
  selfDefending: false,
  simplify: true,
  splitStrings: false,
  stringArray: false,
  transformObjectKeys: false,
  unicodeEscapeSequence: false
};

async function obfuscateFiles() {
  try {
    await fs.ensureDir(outputDir);
    console.log('🔒 DYNAMIC SAAS: Dashboard-safe build...');

    // Obfuscate only licensing files
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
        await fs.ensureDir(path.dirname(outputPath));
        await fs.writeFile(outputPath, '// Future licensing logic\nmodule.exports = {};');
        console.log(`📝 Created placeholder: ${file}`);
      }
    }

    // Copy dashboard files without obfuscation
    for (const file of filesToCopy) {
      const sourcePath = path.join(sourceDir, file);
      const outputPath = path.join(outputDir, file);

      if (await fs.pathExists(sourcePath)) {
        await fs.ensureDir(path.dirname(outputPath));
        await fs.copy(sourcePath, outputPath);
        console.log(`📄 Copied (readable): ${file}`);
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
    
    console.log('✅ DASHBOARD-SAFE build completed!');
    console.log('📦 Your dynamic dashboard will work perfectly');
    console.log('🐛 All files remain debuggable for production support');
    
  } catch (error) {
    console.error('❌ Error during build:', error);
    process.exit(1);
  }
}

obfuscateFiles();