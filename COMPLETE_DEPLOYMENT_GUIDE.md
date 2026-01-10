# Complete Deployment Guide - Frontend (Netlify) + Backend (Render)

## 🎯 Deployment Overview
- **Frontend**: Netlify (React/Vite app)
- **Backend**: Render (Node.js/Express API)
- **Database**: Supabase (already configured)

## 📋 Pre-Deployment Checklist

### ✅ Files Ready
- [x] Backend configured for Render
- [x] Frontend configured for Netlify
- [x] Environment variables prepared
- [x] CORS settings updated
- [x] Health check endpoint added

---

## 🚀 Step 1: Deploy Backend to Render

### 1.1 Push Backend to GitHub
```bash
cd todo-multiuser-backend
git add .
git commit -m "Prepare backend for Render deployment"
git push origin main
```

### 1.2 Create Render Web Service
1. Go to [render.com](https://render.com) → Sign in
2. Click "New +" → "Web Service"
3. Connect GitHub → Select `todo-multiuser-backend` repo
4. Configure:
   - **Name**: `todo-backend-app` (or your choice)
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

### 1.3 Set Environment Variables in Render
```env
NODE_ENV=production
SUPABASE_URL=https://votmmkmsnlxyiruxlzrp.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvdG1ta21zbmx4eWlydXhsenJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjQ2NDQ1OCwiZXhwIjoyMDgyMDQwNDU4fQ.JkpxCgZQ889qp-ZrQFCVL8IyRDcUaqgWfgmP4EMvJ7Y
JWT_SECRET=your-super-secure-production-jwt-secret-key-make-it-very-long-and-random
GOOGLE_CLIENT_ID=289796032032-bvtm9g16nfnnt2107j4d3h23a6hochkb.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
MAIL_USER=vrund.rakesh1412@gmail.com
MAIL_PASS=your-gmail-app-password
SEND_LOGIN_EMAILS=true
FRONTEND_URL=https://your-frontend-app.netlify.app
BACKEND_URL=https://your-backend-app.onrender.com
```

### 1.4 Deploy & Get Backend URL
- Click "Create Web Service"
- Wait for deployment (2-5 minutes)
- Copy your backend URL: `https://your-app-name.onrender.com`

---

## 🌐 Step 2: Deploy Frontend to Netlify

### 2.1 Push Frontend to GitHub
```bash
cd todo-multiuser-frontend
git add .
git commit -m "Prepare frontend for Netlify deployment"
git push origin main
```

### 2.2 Create Netlify Site
1. Go to [netlify.com](https://netlify.com) → Sign in
2. Click "Add new site" → "Import an existing project"
3. Connect GitHub → Select `todo-multiuser-frontend` repo
4. Configure:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`

### 2.3 Set Environment Variables in Netlify
Go to Site Settings → Environment Variables:
```env
VITE_API_URL=https://your-actual-render-url.onrender.com/api
```

### 2.4 Deploy & Get Frontend URL
- Click "Deploy site"
- Wait for deployment (1-3 minutes)
- Copy your frontend URL: `https://your-app-name.netlify.app`

---

## 🔄 Step 3: Update Cross-References

### 3.1 Update Backend Environment (Render)
Go back to Render → Environment Variables → Update:
```env
FRONTEND_URL=https://your-actual-netlify-url.netlify.app
```

### 3.2 Update Frontend Environment (Netlify)
Go to Netlify → Environment Variables → Update:
```env
VITE_API_URL=https://your-actual-render-url.onrender.com/api
```

### 3.3 Update Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. APIs & Services → Credentials
3. Edit OAuth 2.0 Client ID
4. Add to Authorized redirect URIs:
   ```
   https://your-actual-render-url.onrender.com/api/auth/google/callback
   ```

---

## ✅ Step 4: Test Deployment

### 4.1 Backend Health Check
Visit: `https://your-render-url.onrender.com/health`
Should return: `{"status":"OK","timestamp":"...","environment":"production"}`

### 4.2 Frontend Access
Visit: `https://your-netlify-url.netlify.app`
Should load the login page

### 4.3 Full Authentication Flow
1. Try registering a new user
2. Try Google OAuth login
3. Create and manage tasks
4. Test all features

---

## 🛠️ Troubleshooting

### Common Issues

**Backend Issues:**
- Build fails → Check Node.js version in package.json
- Environment variables → Verify all required vars are set
- Database connection → Check Supabase credentials

**Frontend Issues:**
- Build fails → Check Vite configuration
- API calls fail → Verify VITE_API_URL is correct
- CORS errors → Check FRONTEND_URL in backend

**OAuth Issues:**
- Redirect fails → Verify Google OAuth redirect URIs
- Login fails → Check Google Client ID/Secret

### Logs & Debugging
- **Render**: Dashboard → Logs tab
- **Netlify**: Site Dashboard → Functions/Deploy logs
- **Browser**: Developer Tools → Network/Console tabs

---

## 📝 Final Checklist

- [ ] Backend deployed to Render
- [ ] Frontend deployed to Netlify  
- [ ] Environment variables set correctly
- [ ] Google OAuth redirect URIs updated
- [ ] Health check endpoint working
- [ ] Authentication flow tested
- [ ] Task management tested
- [ ] All features working

## 🎉 Success!
Your TODO app is now live with separate hosting:
- **Frontend**: https://your-app.netlify.app
- **Backend**: https://your-app.onrender.com
- **Database**: Supabase (managed)

## 💡 Next Steps
1. Set up custom domains (optional)
2. Configure monitoring/alerts
3. Set up CI/CD for automatic deployments
4. Consider upgrading to paid plans for production use