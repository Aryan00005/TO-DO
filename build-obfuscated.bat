@echo off
echo 🔒 Building obfuscated backend for production...

REM Install dependencies
npm install

REM Run obfuscation
npm run obfuscate

echo ✅ Backend obfuscation complete!
echo 📁 Obfuscated files are ready in ./dist directory
echo 🚀 Deploy the ./dist directory to your hosting platform
pause