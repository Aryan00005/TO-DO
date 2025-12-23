# 🚀 FREE Deployment Guide: Supabase + Render + Vercel

## Step 1: Setup Supabase Database (FREE)

### 1.1 Create Account
1. Go to https://supabase.com
2. Sign up with GitHub
3. Create new project
4. Set database password

### 1.2 Run Schema
1. Go to SQL Editor in Supabase
2. Copy content from `supabase-schema.sql`
3. Click "Run"

### 1.3 Get Credentials
- Database URL: `postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres`
- Project URL: `https://[project-id].supabase.co`
- Anon Key: Settings → API

## Step 2: Deploy Backend to Render (FREE)

### 2.1 Install Dependencies
```bash
npm install pg @supabase/supabase-js
npm uninstall mongoose sqlite3
```

### 2.2 Deploy
1. Go to https://render.com
2. Connect GitHub repository
3. Create Web Service
4. Set environment variables:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `MAIL_USER`
   - `MAIL_PASS`
   - `FRONTEND_URL`

## Step 3: Deploy Frontend to Vercel (FREE)

1. Go to https://vercel.com
2. Import repository
3. Set environment variable:
   - `VITE_API_URL`: `https://your-backend.onrender.com/api`

## Step 4: Update Google OAuth

Add to authorized redirect URIs:
- `https://your-backend.onrender.com/api/auth/google/callback`

## 🎉 Done!

Your app is now live with:
- ✅ FREE PostgreSQL (Supabase)
- ✅ FREE backend hosting (Render)
- ✅ FREE frontend hosting (Vercel)
- ✅ $0 monthly cost