# Local Development Guide

## 🚀 Servers Running

### Backend Server
- **URL**: http://localhost:5000
- **API Base**: http://localhost:5000/api
- **Location**: `todo-multiuser-backend/`
- **Command**: `npm start`

### Frontend Server
- **URL**: http://localhost:5173
- **Location**: `todo-multiuser-backend/todo-multiuser-frontend/`
- **Command**: `npm run dev`

---

## 🔐 Test Credentials

### Super Admin
- **Login URL**: http://localhost:5173/super-admin-login
- **User ID**: `superadmin`
- **Password**: `SuperAdmin@123`
- **Dashboard**: http://localhost:5173/super-admin

### Regular User Login
- **Login URL**: http://localhost:5173/login
- **Register URL**: http://localhost:5173/register

---

## 🧪 Testing Flow

### 1. Test Super Admin Login
1. Open http://localhost:5173/super-admin-login
2. Login with super admin credentials
3. You should see the Super Admin Dashboard

### 2. Create Company Admin
1. In Super Admin Dashboard, click "Create Company Admin"
2. Fill in:
   - Company Name: `Test Company`
   - Company Code: Click "Generate" or enter `TESTCO01`
   - Admin Name: `John Admin`
   - Admin Email: `admin@testcompany.com`
   - Admin User ID: `johnadmin`
   - Admin Password: `Admin@123`
3. Click "Create Admin"
4. Note the company code for user registration

### 3. Test Company Admin Login
1. Logout from super admin
2. Go to http://localhost:5173/login
3. Login with company admin credentials:
   - User ID: `johnadmin`
   - Password: `Admin@123`

### 4. Test User Registration
1. Go to http://localhost:5173/register
2. Register a new user:
   - Name: `Jane User`
   - User ID: `janeuser`
   - Email: `jane@testcompany.com`
   - Company Code: `TESTCO01` (from step 2)
   - Password: `User@123`
3. Login with new user credentials

### 5. Test Multi-Tenancy
1. Create another company with different company code
2. Register users with different company codes
3. Verify users can only see their company's users and tasks

---

## 📁 Key Files Modified

### Backend
- `server.js` - Port changed to 5000
- `routes/auth.js` - Super admin routes added
- `models/user.js` - Company filtering added
- `scripts/setup-super-admin.js` - Super admin setup

### Frontend
- `.env` - API URL changed to localhost:5000
- `src/pages/super-admin-login.tsx` - New super admin login
- `src/pages/super-admin-dashboard.tsx` - New super admin dashboard
- `src/pages/register.tsx` - Company code field added
- `src/pages/login.tsx` - Super admin link added
- `src/App.tsx` - Super admin routes added

---

## 🛠️ Troubleshooting

### Backend won't start
- Check if port 5000 is already in use
- Verify `.env` file exists with Supabase credentials
- Run `npm install` in `todo-multiuser-backend/`

### Frontend won't start
- Check if port 5173 is already in use
- Verify `.env` file has `VITE_API_URL=http://localhost:5000/api`
- Run `npm install` in `todo-multiuser-backend/todo-multiuser-frontend/`

### CORS errors
- Verify backend CORS includes `http://localhost:5173`
- Check browser console for exact error
- Restart backend server after CORS changes

### Super admin login fails
- Verify super admin exists in database
- Check backend logs for error messages
- Verify `/api/auth/admin/login` route is loaded

### Company code validation fails
- Verify company admin was created successfully
- Check company code matches exactly (case-sensitive)
- Verify backend `/api/auth/register` route validates company code

---

## 🔄 Restart Servers

If you need to restart:

### Stop Servers
- Close the terminal windows or press `Ctrl+C` in each terminal

### Start Backend
```bash
cd todo-multiuser-backend
npm start
```

### Start Frontend
```bash
cd todo-multiuser-backend/todo-multiuser-frontend
npm run dev
```

---

## 📊 Database

- **Type**: Supabase (PostgreSQL)
- **Location**: Remote (cloud)
- **Tables**: users, tasks, notifications
- **Super Admin**: Already created in database

---

## 🎯 Next Steps After Testing

1. Test all features locally
2. Fix any bugs found
3. When ready to deploy:
   - Update `.env` to production URL
   - Commit all changes
   - Push to GitHub
   - Render and Netlify will auto-deploy

---

## 📝 Notes

- Local development uses remote Supabase database
- Changes to database are permanent (be careful!)
- Super admin account is shared across local and production
- Company codes must be unique across all companies
