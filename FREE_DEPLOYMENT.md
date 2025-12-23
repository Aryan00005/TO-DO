# FREE Deployment Guide - Supabase + Render + Vercel

## 1. Database: Supabase (FREE)
1. Go to https://supabase.com
2. Sign up with GitHub
3. Create new project
4. Get your connection details:
   - Database URL: postgresql://[user]:[password]@[host]:5432/[database]
   - API URL: https://[project-id].supabase.co
   - API Key: [your-anon-key]

## 2. Backend: Render.com (FREE)
1. Go to https://render.com
2. Sign up with GitHub
3. Connect your repository
4. Create Web Service
5. Set environment variables in Render dashboard

## 3. Frontend: Vercel (FREE)
1. Go to https://vercel.com
2. Sign up with GitHub
3. Import your frontend repository
4. Set VITE_API_URL environment variable
5. Deploy automatically

## Environment Variables for Render:
SUPABASE_URL=https://[project-id].supabase.co
SUPABASE_KEY=[your-anon-key]
JWT_SECRET=your-super-secure-jwt-secret
GOOGLE_CLIENT_ID=289796032032-bvtm9g16nfnnt2107j4d3h23a6hochkb.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
MAIL_USER=vrund.rakesh1412@gmail.com
MAIL_PASS=lixj ymqr smkf seaw
FRONTEND_URL=https://your-app.vercel.app
NODE_ENV=production