# 🚀 Complete FREE Deployment Guide

## Step 1: Setup Supabase Database (FREE)

### 1.1 Create Supabase Account
1. Go to https://supabase.com
2. Sign up with GitHub
3. Create new project
4. Choose a region close to you
5. Set a strong database password

### 1.2 Run Database Schema
1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste the content from `supabase-schema.sql`
3. Click "Run" to create all tables

### 1.3 Get Connection Details
1. Go to Settings → Database
2. Copy these values:
   - **Database URL**: `postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres`
   - **Project URL**: `https://[project-id].supabase.co`
   - **Anon Key**: Found in Settings → API

## Step 2: Deploy Backend to Render (FREE)

### 2.1 Prepare Repository
```bash
# Install new dependencies
npm install pg @supabase/supabase-js

# Remove old dependencies
npm uninstall mongoose sqlite3
```

### 2.2 Deploy to Render
1. Go to https://render.com
2. Sign up with GitHub
3. Click "New" → "Web Service"
4. Connect your GitHub repository
5. Configure:
   - **Name**: `todo-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

### 2.3 Set Environment Variables in Render
```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
DATABASE_URL=postgresql://postgres:your-password@db.your-project-id.supabase.co:5432/postgres
JWT_SECRET=your-super-secure-jwt-secret
GOOGLE_CLIENT_ID=289796032032-bvtm9g16nfnnt2107j4d3h23a6hochkb.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
MAIL_USER=vrund.rakesh1412@gmail.com
MAIL_PASS=lixj ymqr smkf seaw
SEND_LOGIN_EMAILS=true
FRONTEND_URL=https://your-app.vercel.app
NODE_ENV=production
```

## Step 3: Deploy Frontend to Vercel (FREE)

### 3.1 Update Frontend Environment
Create `.env` in frontend directory:
```
VITE_API_URL=https://your-backend.onrender.com/api
```

### 3.2 Deploy to Vercel
1. Go to https://vercel.com
2. Sign up with GitHub
3. Import your repository
4. Set environment variable:
   - `VITE_API_URL`: `https://your-backend.onrender.com/api`
5. Deploy

## Step 4: Update Google OAuth

### 4.1 Add Production URLs
1. Go to Google Cloud Console
2. Navigate to your OAuth app
3. Add authorized redirect URIs:
   - `https://your-backend.onrender.com/api/auth/google/callback`

## Step 5: Test Your Live App

1. **Frontend**: `https://your-app.vercel.app`
2. **Backend**: `https://your-backend.onrender.com`
3. **Database**: Supabase Dashboard

## 🎉 Congratulations!

Your app is now live with:
- ✅ FREE PostgreSQL database (Supabase)
- ✅ FREE backend hosting (Render)
- ✅ FREE frontend hosting (Vercel)
- ✅ All features working
- ✅ $0 monthly cost

## Limits (All FREE tiers):
- **Supabase**: 500MB database, 2GB bandwidth
- **Render**: 750 hours/month (enough for 24/7)
- **Vercel**: Unlimited static hosting

## Support:
If you need help, check the deployment logs in each platform's dashboard.