#!/bin/bash

echo "🚀 Migrating TO-DO App from MongoDB to PostgreSQL..."

# Install new dependencies
echo "📦 Installing PostgreSQL dependencies..."
npm install pg @supabase/supabase-js

# Remove old dependencies
echo "🗑️ Removing MongoDB dependencies..."
npm uninstall mongoose sqlite3

echo "✅ Dependencies updated!"
echo ""
echo "📋 Next Steps:"
echo "1. Create Supabase account at https://supabase.com"
echo "2. Run the SQL schema from supabase-schema.sql"
echo "3. Update your .env file with Supabase credentials"
echo "4. Test locally: npm start"
echo "5. Deploy to Render.com"
echo ""
echo "📖 Full guide: See SUPABASE_DEPLOYMENT.md"