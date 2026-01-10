#!/bin/bash

echo "🔒 Building obfuscated backend for production..."

# Install dependencies
npm install

# Run obfuscation
npm run obfuscate

echo "✅ Backend obfuscation complete!"
echo "📁 Obfuscated files are ready in ./dist directory"
echo "🚀 Deploy the ./dist directory to your hosting platform"