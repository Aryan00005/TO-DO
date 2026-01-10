@echo off
echo 🔒 Building obfuscated frontend for production...

cd todo-multiuser-frontend

REM Install dependencies
npm install

REM Build with obfuscation
npm run build:obfuscated

echo ✅ Frontend obfuscation complete!
echo 📁 Obfuscated files are ready in ./dist directory
echo 🚀 Deploy the ./dist directory to Netlify
pause