# Admin User Approval - Quick Guide

## ✅ What's Implemented

### 1. User Registration Flow
- Users register with company code
- Account status automatically set to **'pending'**
- Users can login but see "Awaiting Approval" page

### 2. Admin Approval Panel
- **Location**: Admin Dashboard → Profile Tab
- Shows list of pending users in admin's company
- Approve/Reject buttons for each user

### 3. Backend API
- `GET /auth/admin/pending-users` - Get pending users
- `POST /auth/admin/user-action` - Approve/reject users

## 🚀 How to Test

### Step 1: Register a New User
1. Go to `/register`
2. Fill form with company code (get from admin profile)
3. Submit - user gets "pending" status

### Step 2: User Tries to Login
1. User logs in with credentials
2. Redirected to "Awaiting Approval" page
3. Cannot access dashboard yet

### Step 3: Admin Approves
1. Admin logs in
2. Goes to Profile tab
3. Sees "Pending User Approvals" section
4. Clicks "Approve" button

### Step 4: User Can Access
1. User logs in again
2. Now has full dashboard access

## 📁 Files Modified

### Backend
- `routes/auth.js` - Added approval routes
- `models/task.js` - Added task visibility logic

### Frontend
- `components/PendingUsers.tsx` - NEW approval component
- `pages/dashboard-new.tsx` - Added component to profile
- `pages/PendingApproval.tsx` - NEW waiting page
- `pages/login.tsx` - Redirect pending users
- `App.tsx` - Added pending route

## 🎯 Features

✅ User registration requires admin approval
✅ Pending users see waiting message
✅ Admin sees pending users in profile
✅ One-click approve/reject
✅ Real-time updates after approval
✅ Task visibility based on creator role

## 🔧 Database

Column `created_by_admin` added to `tasks` table:
- Tracks if task was created by admin
- Used for visibility filtering

## 💡 Usage

**For Admins:**
- Check Profile tab regularly for pending users
- Approve legitimate users from your company
- Reject suspicious registrations

**For Users:**
- Get company code from your admin
- Register with correct code
- Wait for admin approval
- Login again after approval

Done! Everything is working.
