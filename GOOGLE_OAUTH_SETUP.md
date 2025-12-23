# Google OAuth & Email Notifications Setup Guide

## 📋 Prerequisites
- Google Cloud Console account
- Gmail account for sending emails
- Backend deployed or running locally
- Frontend deployed or running locally

---

## 🔐 Part 1: Google OAuth Setup

### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name it "Todo App" → Click "Create"

### Step 2: Enable Google+ API
1. In the left sidebar, go to "APIs & Services" → "Library"
2. Search for "Google+ API"
3. Click on it and press "Enable"

### Step 3: Configure OAuth Consent Screen
1. Go to "APIs & Services" → "OAuth consent screen"
2. Select "External" → Click "Create"
3. Fill in:
   - App name: `Todo App`
   - User support email: Your email
   - Developer contact: Your email
4. Click "Save and Continue"
5. Skip "Scopes" → Click "Save and Continue"
6. Add test users (your email) → Click "Save and Continue"
7. Click "Back to Dashboard"

### Step 4: Create OAuth Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: "Web application"
4. Name: "Todo App Web Client"
5. Authorized JavaScript origins:
   ```
   http://localhost:5500
   https://your-backend.onrender.com
   ```
6. Authorized redirect URIs:
   ```
   http://localhost:5500/api/auth/google/callback
   https://your-backend.onrender.com/api/auth/google/callback
   ```
7. Click "Create"
8. **Copy the Client ID and Client Secret** (you'll need these)

---

## 📧 Part 2: Gmail App Password Setup

### Step 1: Enable 2-Factor Authentication
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Under "Signing in to Google", enable "2-Step Verification"
3. Follow the setup process

### Step 2: Generate App Password
1. Go to [App Passwords](https://myaccount.google.com/apppasswords)
2. Select app: "Mail"
3. Select device: "Other (Custom name)"
4. Enter: "Todo App"
5. Click "Generate"
6. **Copy the 16-character password** (no spaces)

---

## ⚙️ Part 3: Backend Configuration

### Update .env file:
```env
# MongoDB
MONGO_URI=mongodb://localhost:27017/todo-multiuser

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this

# Server
PORT=5500

# Google OAuth (from Step 4 above)
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here

# Email Configuration (from Part 2)
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-16-char-app-password

# Email Settings
SEND_LOGIN_EMAILS=true

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### For Production (Render):
Update environment variables in Render dashboard with the same values.

---

## 🎨 Part 4: Frontend Configuration

### Option A: Add to App.tsx/Router
```typescript
import AuthCallback from './pages/AuthCallback';

// In your routes:
<Route path="/auth/callback" element={<AuthCallback setUser={setUser} />} />
```

### Option B: Update axios baseURL
In `src/api/axios.ts`:
```typescript
const instance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5500/api",
});
```

Create `.env` file in frontend:
```env
VITE_API_URL=http://localhost:5500/api
```

For production:
```env
VITE_API_URL=https://your-backend.onrender.com/api
```

---

## 🧪 Testing

### Test Google Login:
1. Start backend: `npm run dev`
2. Start frontend: `npm run dev`
3. Go to login page
4. Click "Continue with Google"
5. Select your Google account
6. Should redirect to dashboard with token

### Test Email Notifications:
1. Login with any method
2. Check your email inbox
3. Should receive login notification email

### Test First Login Email:
1. Create new account via Google
2. Check email for welcome message

---

## 🔍 Troubleshooting

### "redirect_uri_mismatch" error:
- Check that redirect URI in Google Console exactly matches your backend URL
- Include `/api/auth/google/callback` path
- No trailing slashes

### Email not sending:
- Verify 2FA is enabled on Gmail
- Check app password is correct (16 chars, no spaces)
- Check `SEND_LOGIN_EMAILS=true` in .env
- Look for email errors in backend console (non-blocking)

### Token not received:
- Check CORS settings in server.js
- Verify FRONTEND_URL matches your actual frontend URL
- Check browser console for errors

### "User not found" after Google login:
- Check MongoDB connection
- Verify user was created in database
- Check backend console logs

---

## 📝 Email Configuration Options

### Send email on every login:
```env
SEND_LOGIN_EMAILS=true
```

### Send email only on first login:
Modify `handleLoginSuccess` in `routes/auth.js`:
```javascript
if (process.env.SEND_LOGIN_EMAILS === 'true' && isFirstLogin) {
  sendLoginEmail(user, isFirstLogin).catch(err => 
    console.error('Email failed:', err.message)
  );
}
```

### Disable emails:
```env
SEND_LOGIN_EMAILS=false
```

---

## 🚀 Production Deployment

### Render (Backend):
1. Add all environment variables in Render dashboard
2. Update `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
3. Update `FRONTEND_URL` to your Netlify URL
4. Update redirect URIs in Google Console

### Netlify (Frontend):
1. Add `VITE_API_URL` environment variable
2. Point to your Render backend URL
3. Rebuild and deploy

---

## 🔒 Security Checklist

- ✅ JWT_SECRET is strong and unique
- ✅ Google Client Secret is not committed to git
- ✅ App Password is not committed to git
- ✅ CORS is configured for specific origins
- ✅ JWT expires in 1 day
- ✅ Passwords are hashed with bcrypt
- ✅ Email sending doesn't block login

---

## 📚 File Structure

```
backend/
├── config/
│   └── passport.js          # Google OAuth strategy
├── utils/
│   └── emailService.js      # Email sending logic
├── routes/
│   └── auth.js              # Auth routes with Google OAuth
├── models/
│   └── user.js              # Updated user schema
├── .env                     # Environment variables
└── server.js                # Passport initialization

frontend/
├── src/
│   ├── pages/
│   │   ├── login.tsx        # Google login button
│   │   └── AuthCallback.tsx # OAuth redirect handler
│   └── api/
│       └── axios.ts         # API configuration
└── .env                     # Frontend env vars
```

---

## 🎉 Success Indicators

✅ Google login button appears on login page
✅ Clicking it redirects to Google
✅ After selecting account, redirects back to dashboard
✅ JWT token stored in sessionStorage
✅ User data available in app
✅ Email received in inbox
✅ Backend logs show successful OAuth flow
✅ MongoDB shows user with authProvider: 'google'

---

## 📞 Support

If you encounter issues:
1. Check backend console logs
2. Check browser console
3. Verify all environment variables are set
4. Test with a fresh incognito window
5. Check MongoDB for user creation