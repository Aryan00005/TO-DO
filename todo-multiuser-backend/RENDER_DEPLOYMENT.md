# Render Deployment Guide

## Prerequisites
1. GitHub account with your backend code pushed
2. Render account (free tier available)
3. Supabase database already set up

## Step-by-Step Deployment Process

### 1. Prepare Your Repository
- Ensure all files are committed and pushed to GitHub
- Your backend should be in the root directory or specify the correct path

### 2. Create New Web Service on Render
1. Go to https://render.com and sign in
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Select your todo-backend repository

### 3. Configure Build & Deploy Settings
- **Name**: `todo-backend` (or your preferred name)
- **Environment**: `Node`
- **Region**: Choose closest to your users
- **Branch**: `main` (or your default branch)
- **Build Command**: `npm install`
- **Start Command**: `npm start`

### 4. Set Environment Variables
In the Render dashboard, add these environment variables:

**Required Variables:**
```
NODE_ENV=production
SUPABASE_URL=https://votmmkmsnlxyiruxlzrp.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvdG1ta21zbmx4eWlydXhsenJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjQ2NDQ1OCwiZXhwIjoyMDgyMDQwNDU4fQ.JkpxCgZQ889qp-ZrQFCVL8IyRDcUaqgWfgmP4EMvJ7Y
JWT_SECRET=your-super-secure-jwt-secret-key-for-production-make-it-long
GOOGLE_CLIENT_ID=289796032032-bvtm9g16nfnnt2107j4d3h23a6hochkb.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
MAIL_USER=vrund.rakesh1412@gmail.com
MAIL_PASS=your-gmail-app-password
SEND_LOGIN_EMAILS=true
```

**URLs (Set after deployment):**
```
BACKEND_URL=https://your-app-name.onrender.com
FRONTEND_URL=https://your-frontend-app.netlify.app
```

### 5. Deploy
1. Click "Create Web Service"
2. Render will automatically build and deploy your app
3. Wait for deployment to complete (usually 2-5 minutes)

### 6. Update Google OAuth Settings
1. Go to Google Cloud Console
2. Navigate to APIs & Services → Credentials
3. Edit your OAuth 2.0 Client ID
4. Add your Render URL to authorized redirect URIs:
   - `https://your-app-name.onrender.com/api/auth/google/callback`

### 7. Update Frontend Configuration
Update your frontend's API base URL to point to your Render deployment:
```javascript
const API_BASE_URL = 'https://your-app-name.onrender.com/api';
```

### 8. Test Your Deployment
1. Visit `https://your-app-name.onrender.com/health` - should return OK
2. Test authentication endpoints
3. Test task creation and management

## Important Notes

### Free Tier Limitations
- Apps sleep after 15 minutes of inactivity
- First request after sleep takes 30+ seconds (cold start)
- 750 hours/month limit (enough for most projects)

### Monitoring
- Check Render dashboard for logs and metrics
- Set up health checks if needed
- Monitor database connections

### Security
- Never commit sensitive environment variables
- Use strong JWT secrets in production
- Keep your Supabase service key secure

## Troubleshooting

### Common Issues
1. **Build Fails**: Check Node.js version compatibility
2. **Environment Variables**: Ensure all required vars are set
3. **CORS Errors**: Verify FRONTEND_URL is correct
4. **Database Connection**: Check Supabase credentials

### Logs
Access logs in Render dashboard under "Logs" tab for debugging.

## Next Steps
1. Set up custom domain (optional)
2. Configure monitoring and alerts
3. Set up CI/CD for automatic deployments
4. Consider upgrading to paid plan for production use