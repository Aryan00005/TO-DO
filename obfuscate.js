const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs-extra');
const path = require('path');

const sourceDir = './';
const outputDir = './dist';

// Files and directories to obfuscate
const filesToObfuscate = [
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

// Obfuscation options
const obfuscationOptions = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  debugProtection: true,
  debugProtectionInterval: 4000,
  disableConsoleOutput: true,
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  numbersToExpressions: true,
  renameGlobals: false,
  selfDefending: true,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 5,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayEncoding: ['base64'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 2,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 4,
  stringArrayWrappersType: 'function',
  stringArrayThreshold: 0.75,
  transformObjectKeys: true,
  unicodeEscapeSequence: false
};

async function obfuscateFiles() {
  try {
    // Ensure output directory exists
    await fs.ensureDir(outputDir);
    
    console.log('🔒 Starting code obfuscation...');
    
    for (const file of filesToObfuscate) {
      const sourcePath = path.join(sourceDir, file);
      const outputPath = path.join(outputDir, file);
      
      if (await fs.pathExists(sourcePath)) {
        // Ensure output subdirectory exists
        await fs.ensureDir(path.dirname(outputPath));
        
        // Read source file
        const sourceCode = await fs.readFile(sourcePath, 'utf8');
        
        // Obfuscate code
        const obfuscatedResult = JavaScriptObfuscator.obfuscate(sourceCode, obfuscationOptions);
        
        // Write obfuscated code
        await fs.writeFile(outputPath, obfuscatedResult.getObfuscatedCode());
        
        console.log(`✅ Obfuscated: ${file}`);
      } else {
        console.log(`⚠️  File not found: ${file}`);
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
    
    console.log('🎉 Code obfuscation completed successfully!');
    console.log('📁 Obfuscated files are in the ./dist directory');
    
  } catch (error) {
    console.error('❌ Error during obfuscation:', error);
    process.exit(1);
  }
}

obfuscateFiles();