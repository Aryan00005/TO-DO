# Authentication Issues - Troubleshooting Guide

## Issues Fixed:

### 1. Registration Issue - "Invalid credentials" after registration
**Problem**: Password was being hashed twice (once in route, once in model)
**Fix**: Removed double hashing in auth.js route

### 2. Google OAuth Issue - "Something broke!" error
**Problems**: 
- Missing error handling in callback
- Incorrect property names (user._id vs user.id)
- Missing google_id column in database
- Incorrect callback URL configuration

**Fixes**:
- Added proper error handling with detailed logging
- Fixed property name inconsistencies
- Added google_id column to database schema
- Fixed callback URL to use correct Render URL

### 3. Environment Variables
**Problem**: Production environment variables not properly configured
**Fix**: Updated .env.production with correct values

## Deployment Steps:

### Step 1: Update Render Environment Variables
Go to your Render dashboard and set these environment variables:

```
NODE_ENV=production
SUPABASE_URL=https://votmmkmsnlxyiruxlzrp.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvdG1ta21zbmx4eWlydXhsenJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjQ2NDQ1OCwiZXhwIjoyMDgyMDQwNDU4fQ.JkpxCgZQ889qp-ZrQFCVL8IyRDcUaqgWfgmP4EMvJ7Y
JWT_SECRET=your-production-jwt-secret-key-here-make-it-long-and-secure-2024
BACKEND_URL=https://todo-backend-app-skml.onrender.com
GOOGLE_CLIENT_ID=289796032032-bvtm9g16nfnnt2107j4d3h23a6hochkb.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
FRONTEND_URL=https://dulcet-custard-82202d.netlify.app
MAIL_USER=vrund.rakesh1412@gmail.com
MAIL_PASS=your-app-password
SEND_LOGIN_EMAILS=true
```

### Step 2: Update Database Schema
1. Go to Supabase SQL Editor
2. Run the contents of `fix-database.sql`
3. Verify the migration completed successfully

### Step 3: Deploy Code Changes
1. Commit and push your changes to Git
2. Render will automatically deploy the new code
3. Wait for deployment to complete

### Step 4: Update Google OAuth Settings
1. Go to Google Cloud Console
2. Navigate to APIs & Services > Credentials
3. Edit your OAuth 2.0 Client ID
4. Add these authorized redirect URIs:
   - `https://todo-backend-app-skml.onrender.com/api/auth/google/callback`
5. Save changes

## Testing:

### Test Registration:
1. Go to your frontend registration page
2. Register with a new email/username
3. Should redirect to login page
4. Try logging in with the new credentials
5. Should work without "Invalid credentials" error

### Test Google OAuth:
1. Go to login page
2. Click "Sign in with Google"
3. Complete Google authentication
4. Should redirect to account completion page (for new users)
5. Complete account setup with username/password
6. Should redirect to dashboard

## Debugging:

### Check Render Logs:
1. Go to Render dashboard
2. Click on your service
3. Go to "Logs" tab
4. Look for error messages with emojis (🔍, ❌, ✅, etc.)

### Common Error Messages:
- `❌ Database error creating user:` - Check Supabase connection
- `❌ User not found` - Check if user exists in database
- `🔥 Passport authentication error:` - Check Google OAuth configuration
- `💥 Google callback error:` - Check environment variables

### Database Queries for Debugging:
```sql
-- Check user accounts
SELECT id, name, email, user_id, 
       CASE WHEN password IS NOT NULL THEN 'HAS_PASSWORD' ELSE 'NO_PASSWORD' END as password_status,
       auth_provider, account_status, google_id
FROM users 
ORDER BY created_at DESC;

-- Check for duplicate emails
SELECT email, COUNT(*) 
FROM users 
GROUP BY email 
HAVING COUNT(*) > 1;

-- Check incomplete accounts
SELECT * FROM users 
WHERE account_status = 'incomplete' OR user_id IS NULL OR password IS NULL;
```

## Additional Notes:

1. **Password Security**: Passwords are now hashed with bcrypt (12 rounds)
2. **Google OAuth Flow**: New Google users must complete account setup
3. **Error Handling**: Detailed logging added for debugging
4. **Database Indexes**: Added for better performance
5. **Security**: Row Level Security enabled on all tables

If issues persist after following these steps, check the Render logs for specific error messages and verify all environment variables are set correctly.