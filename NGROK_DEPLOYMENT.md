# Instant FREE Deployment with Ngrok

## What is Ngrok?
Ngrok creates a secure tunnel to your localhost, making it accessible from anywhere on the internet.

## Steps:

### 1. Install Ngrok
1. Go to https://ngrok.com
2. Sign up (free account)
3. Download ngrok
4. Extract to a folder
5. Get your auth token from dashboard

### 2. Setup Ngrok
```bash
# Add your auth token
ngrok config add-authtoken YOUR_AUTH_TOKEN

# Start your backend server
npm start

# In another terminal, expose your backend
ngrok http 5500
```

### 3. Deploy Frontend to Vercel
1. Update your axios.ts with ngrok URL
2. Deploy to Vercel (free)

### 4. Update Google OAuth
Add your ngrok URL to Google OAuth redirect URLs:
- https://your-ngrok-url.ngrok.io/api/auth/google/callback

## Pros:
- ✅ Completely FREE
- ✅ Uses your existing MongoDB local setup
- ✅ No code changes needed
- ✅ Instant deployment

## Cons:
- ❌ URL changes when you restart ngrok (free tier)
- ❌ Need to keep your computer running

## For Permanent URL:
Upgrade to ngrok Pro ($8/month) for static domain