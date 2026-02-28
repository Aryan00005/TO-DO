# Ownership Transfer Guide

## Project: Multi-User TODO Application

---

## 1. SUPABASE CONFIGURATION

### Supabase URL
```
https://votmmkmsnlxyiruxlzrp.supabase.co
```

### Supabase Service Key (Service Role)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvdG1ta21zbmx4eWlydXhsenJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjQ2NDQ1OCwiZXhwIjoyMDgyMDQwNDU4fQ.JkpxCgZQ889qp-ZrQFCVL8IyRDcUaqgWfgmP4EMvJ7Y
```

### Database Connection String
```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```
**Note:** Get the actual DATABASE_URL from Supabase Dashboard → Settings → Database

---

## 2. JWT SECRETS

### Development JWT Secret
```
your-secret-key-here
```

### Production JWT Secret
```
your-production-jwt-secret-key-here-make-it-long-and-secure-2024
```

**⚠️ IMPORTANT:** Change these secrets before production deployment!

---

## 3. GOOGLE OAUTH CREDENTIALS

### Google Client ID
```
289796032032-bvtm9g16nfnnt2107j4d3h23a6hochkb.apps.googleusercontent.com
```

### Google Client Secret (Development)
```
[REDACTED - Contact owner for credentials]
```

### Google Client Secret (Production)
```
[REDACTED - Contact owner for credentials]
```

**Setup Instructions:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to APIs & Services → Credentials
3. Update authorized redirect URIs with new domain
4. Add: `https://your-new-domain.com/api/auth/google/callback`

---

## 4. API ENDPOINTS

### Backend API Endpoints

#### Authentication Routes (`/api/auth`)
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/admin/register` - Admin registration
- `POST /api/auth/admin/login` - Admin login
- `GET /api/auth/google` - Google OAuth initiation
- `GET /api/auth/google/callback` - Google OAuth callback
- `POST /api/auth/google-admin-register` - Google admin registration
- `POST /api/auth/google-user-register` - Google user registration
- `POST /api/auth/select-role` - Role selection for Google users
- `POST /api/auth/complete-account` - Complete account setup
- `POST /api/auth/change-password` - Change password
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `GET /api/auth/profile` - Get current user profile
- `GET /api/auth/users` - Get all users (filtered by company)
- `DELETE /api/auth/delete-user/:email` - Delete user by email

#### Admin Routes (`/api/auth/admin`)
- `GET /api/auth/admin/pending-users` - Get pending user approvals
- `GET /api/auth/admin/all-users` - Get all company users
- `POST /api/auth/admin/user-action` - Approve/reject user
- `POST /api/auth/admin/toggle-user-status` - Activate/deactivate user
- `POST /api/auth/admin/create-user` - Create new user
- `DELETE /api/auth/admin/remove-user/:userId` - Remove user

#### Super Admin Routes (`/api/auth/superadmin`)
- `POST /api/auth/superadmin/create-company-admin` - Create company admin
- `POST /api/auth/superadmin/create-super-admin` - Create super admin
- `GET /api/auth/superadmin/companies` - Get all companies
- `GET /api/auth/superadmin/pending-admins` - Get pending admin requests
- `GET /api/auth/superadmin/company/:companyCode` - Get company details
- `POST /api/auth/superadmin/admin-action` - Approve/reject admin
- `DELETE /api/auth/superadmin/delete-company/:companyCode` - Delete company

#### Task Routes (`/api/tasks`)
- `POST /api/tasks` - Create task
- `GET /api/tasks/visible` - Get all visible tasks for user
- `GET /api/tasks/pending-approvals` - Get pending task approvals (Admin)
- `GET /api/tasks/:taskId` - Get single task details
- `GET /api/tasks/assignedTo/:userId` - Get tasks assigned to user
- `GET /api/tasks/assignedBy/:userId` - Get tasks created by user
- `GET /api/tasks/user/:userId` - Get all tasks for user (Admin)
- `PATCH /api/tasks/:taskId` - Update task status/details
- `PUT /api/tasks/:taskId` - Update entire task
- `DELETE /api/tasks/:taskId` - Delete task
- `POST /api/tasks/:taskId/approve` - Approve task (Admin)
- `POST /api/tasks/:taskId/reject` - Reject task (Admin)
- `GET /api/tasks/:taskId/can-update` - Check update permission
- `DELETE /api/tasks/cleanup/old-approved` - Cleanup old tasks (Admin)

#### Notification Routes (`/api/notifications`)
- `GET /api/notifications` - Get user notifications
- `PATCH /api/notifications/:id/read` - Mark notification as read
- `DELETE /api/notifications/:id` - Delete notification

#### Health Check
- `GET /health` - Server health check

---

## 5. ENVIRONMENT VARIABLES

### Backend Environment Variables (`.env`)

#### Development Environment
```env
# Supabase Configuration
SUPABASE_URL=https://votmmkmsnlxyiruxlzrp.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvdG1ta21zbmx4eWlydXhsenJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjQ2NDQ1OCwiZXhwIjoyMDgyMDQwNDU4fQ.JkpxCgZQ889qp-ZrQFCVL8IyRDcUaqgWfgmP4EMvJ7Y

# JWT Secret
JWT_SECRET=your-secret-key-here

# Server Port
PORT=5000

# Google OAuth
GOOGLE_CLIENT_ID=289796032032-bvtm9g16nfnnt2107j4d3h23a6hochkb.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=[REDACTED]

# Email Configuration
MAIL_USER=vrund.rakesh1412@gmail.com
MAIL_PASS=your-app-password
SEND_LOGIN_EMAILS=true

# Backend URL
BACKEND_URL=http://localhost:5000

# Frontend URL
FRONTEND_URL=http://localhost:5175
```

#### Production Environment (`.env.production`)
```env
# Node Environment
NODE_ENV=production

# Supabase Configuration
SUPABASE_URL=https://votmmkmsnlxyiruxlzrp.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvdG1ta21zbmx4eWlydXhsenJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjQ2NDQ1OCwiZXhwIjoyMDgyMDQwNDU4fQ.JkpxCgZQ889qp-ZrQFCVL8IyRDcUaqgWfgmP4EMvJ7Y

# JWT Secret
JWT_SECRET=your-production-jwt-secret-key-here-make-it-long-and-secure-2024

# Server Port (Render sets this automatically)
PORT=10000

# Backend URL (Update with your Render URL)
BACKEND_URL=https://todo-backend-app-skml.onrender.com

# Google OAuth
GOOGLE_CLIENT_ID=289796032032-bvtm9g16nfnnt2107j4d3h23a6hochkb.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=[REDACTED]

# Email Configuration
MAIL_USER=vrund.rakesh1412@gmail.com
MAIL_PASS=your-app-password
SEND_LOGIN_EMAILS=true

# Frontend URL (Update with your Netlify/Vercel URL)
FRONTEND_URL=https://dulcet-custard-82202d.netlify.app
```

### Frontend Environment Variables

#### Development (`.env`)
```env
VITE_API_URL=http://localhost:5000
```

#### Production (`.env.production`)
```env
VITE_API_URL=https://to-do-1-26zv.onrender.com
```

---

## 6. HOSTING PLATFORMS CONFIGURATION

### Backend Hosting (Render.com)

**Current Deployment:**
- URL: `https://to-do-1-26zv.onrender.com`
- Alternative: `https://todo-backend-app-skml.onrender.com`

**Environment Variables to Set in Render:**
1. `NODE_ENV` = `production`
2. `SUPABASE_URL` = `https://votmmkmsnlxyiruxlzrp.supabase.co`
3. `SUPABASE_SERVICE_KEY` = `[service key from above]`
4. `JWT_SECRET` = `[production JWT secret]`
5. `PORT` = `10000` (or leave blank for auto-assignment)
6. `BACKEND_URL` = `https://your-render-app.onrender.com`
7. `FRONTEND_URL` = `https://your-frontend-domain.com`
8. `GOOGLE_CLIENT_ID` = `[from above]`
9. `GOOGLE_CLIENT_SECRET` = `[production secret from above]`
10. `MAIL_USER` = `[your email]`
11. `MAIL_PASS` = `[app password]`
12. `SEND_LOGIN_EMAILS` = `true`

**Build Command:**
```bash
npm install
```

**Start Command:**
```bash
node server.js
```

### Frontend Hosting (Netlify)

**Current Deployment:**
- URL: `https://dulcet-custard-82202d.netlify.app`

**Environment Variables to Set in Netlify:**
1. `VITE_API_URL` = `https://your-render-backend.onrender.com`

**Build Command:**
```bash
npm install && npm run build
```

**Publish Directory:**
```
dist
```

**Redirects File (`public/_redirects`):**
```
/*    /index.html   200
```

### Alternative Frontend Hosting (Vercel)

**Environment Variables to Set in Vercel:**
1. `VITE_API_URL` = `https://your-render-backend.onrender.com`

**Build Command:**
```bash
npm run build
```

**Output Directory:**
```
dist
```

---

## 7. DATABASE SCHEMA

### Tables in Supabase

1. **users** - User accounts
   - id (primary key)
   - name
   - email
   - user_id (unique)
   - password (hashed)
   - role (user/admin)
   - company
   - account_status (pending/active/rejected/inactive)
   - auth_provider (local/google/hybrid)
   - is_super_admin
   - google_id
   - created_at
   - updated_at

2. **tasks** - Task management
   - id (primary key)
   - title
   - description
   - assigned_by (foreign key → users)
   - priority
   - status
   - approval_status
   - due_date
   - company
   - created_by_admin
   - stuck_reason
   - rejection_reason
   - created_at
   - updated_at

3. **task_assignments** - Task-User relationships
   - id (primary key)
   - task_id (foreign key → tasks)
   - user_id (foreign key → users)
   - created_at

4. **notifications** - User notifications
   - id (primary key)
   - user_id (foreign key → users)
   - message
   - is_read
   - created_at

---

## 8. TRANSFER CHECKLIST

### Pre-Transfer Steps
- [ ] Export all data from Supabase (backup)
- [ ] Document all custom configurations
- [ ] List all third-party integrations
- [ ] Prepare handover documentation

### Supabase Transfer
- [ ] Transfer Supabase project ownership
- [ ] Update billing information
- [ ] Verify database access
- [ ] Test database connections

### Google OAuth Transfer
- [ ] Transfer Google Cloud Project ownership
- [ ] Update OAuth consent screen
- [ ] Update authorized domains
- [ ] Update redirect URIs
- [ ] Generate new client secrets (recommended)

### Hosting Platform Transfer

**Render (Backend):**
- [ ] Transfer Render account ownership OR
- [ ] Add new owner as team member
- [ ] Update environment variables
- [ ] Update payment method
- [ ] Test deployment

**Netlify (Frontend):**
- [ ] Transfer Netlify site ownership OR
- [ ] Add new owner as team member
- [ ] Update environment variables
- [ ] Update custom domain (if any)
- [ ] Test deployment

### Email Service Transfer
- [ ] Update email credentials
- [ ] Configure new SMTP settings
- [ ] Test email functionality

### Domain Transfer (if applicable)
- [ ] Transfer domain ownership
- [ ] Update DNS records
- [ ] Update SSL certificates

### Post-Transfer Verification
- [ ] Test user registration
- [ ] Test user login
- [ ] Test Google OAuth
- [ ] Test task creation
- [ ] Test admin functions
- [ ] Test super admin functions
- [ ] Test email notifications
- [ ] Verify all API endpoints
- [ ] Check error logging
- [ ] Monitor performance

---

## 9. SECURITY RECOMMENDATIONS

### Immediate Actions After Transfer
1. **Change all secrets:**
   - Generate new JWT_SECRET
   - Generate new Google OAuth credentials
   - Update email passwords
   - Rotate Supabase service keys

2. **Update CORS origins:**
   - Update allowed origins in backend
   - Remove old domains
   - Add new domains

3. **Review access:**
   - Audit all user accounts
   - Review admin permissions
   - Check super admin accounts

4. **Enable monitoring:**
   - Set up error tracking (Sentry, etc.)
   - Configure uptime monitoring
   - Enable logging

---

## 10. SUPPORT CONTACTS

### Current Owner
- Email: vrund.rakesh1412@gmail.com
- Available for: 30 days post-transfer support

### Service Providers
- **Supabase:** support@supabase.io
- **Render:** support@render.com
- **Netlify:** support@netlify.com
- **Google Cloud:** cloud-support@google.com

---

## 11. ADDITIONAL RESOURCES

### Documentation Files
- `README.md` - Project overview
- `DEPLOYMENT_GUIDE.md` - Deployment instructions
- `COMPLETE_SYSTEM_DOCUMENTATION.md` - System architecture
- `TESTING_GUIDE.md` - Testing procedures
- `SECURITY_DEPLOYMENT_GUIDE.md` - Security best practices

### Repository
- Backend: `todo-multiuser-backend/`
- Frontend: `src/` and `deployment-package/`

---

## 12. IMPORTANT NOTES

⚠️ **Critical Information:**
1. The Supabase service key has full database access - keep it secure
2. JWT secrets must be changed in production
3. Google OAuth requires domain verification for production use
4. Email service requires app-specific password (not regular password)
5. CORS configuration must match your frontend domain exactly
6. Rate limiting is configured - review limits for your use case

📝 **Recommended Changes:**
1. Set up proper error monitoring (Sentry, LogRocket)
2. Configure automated backups for Supabase
3. Set up CI/CD pipelines (GitHub Actions)
4. Implement proper logging infrastructure
5. Add performance monitoring (New Relic, DataDog)
6. Configure SSL certificates for custom domains
7. Set up staging environment for testing

---

**Document Version:** 1.0  
**Last Updated:** 2024  
**Prepared By:** Vrund Patel  
**Transfer Date:** [To be filled]
