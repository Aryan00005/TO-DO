# Admin Approval System Setup Guide

## Features Implemented

✅ **Admin Registration → Pending Status**
- Admin registration now sets `account_status: 'pending'`
- Registration success message updated to indicate approval needed

✅ **Super Admin Approval Panel**
- New pending requests section in Super Admin Dashboard
- Approve/Reject buttons for each pending admin
- Real-time stats showing pending request count

✅ **Email Notifications**
- Super admin receives email notifications for new admin requests
- Includes admin details and direct link to approval panel

✅ **Login Blocks for Pending/Rejected Accounts**
- Admin login checks account status
- Blocks login for pending/rejected accounts with appropriate messages

✅ **Hidden Super Admin URL**
- Super admin access moved to `/system-admin-access` (instead of obvious `/superadmin/login`)
- Generic "System Access" link on login page

## Environment Variables Required

Add these to your `.env` file:

```env
# Super Admin Email (for notifications)
SUPER_ADMIN_EMAIL=your-super-admin@email.com

# Email Service (if not already configured)
SEND_LOGIN_EMAILS=true
MAIL_USER=your-gmail@gmail.com
MAIL_PASS=your-app-password
```

## Backend Routes Added

- `GET /auth/superadmin/pending-admins` - Get pending admin requests
- `POST /auth/superadmin/admin-action` - Approve/reject admin requests

## Frontend Changes

- Updated Super Admin Dashboard with pending requests panel
- Added approve/reject functionality
- Updated routing for hidden super admin access

## Usage Flow

1. **Admin Registration**: Admin registers → Status set to 'pending'
2. **Email Notification**: Super admin receives email notification
3. **Super Admin Review**: Super admin logs in to review pending requests
4. **Approval/Rejection**: Super admin approves or rejects the request
5. **Admin Login**: Approved admins can now log in, rejected/pending cannot

## Testing

1. Register a new admin account
2. Check that login is blocked with "pending approval" message
3. Log in as super admin at `/system-admin-access`
4. See pending request in dashboard
5. Approve the admin
6. Test that admin can now log in successfully

## Security Notes

- Super admin URL is hidden from public pages
- Only uses generic "System Access" link
- Email notifications help with timely approvals
- Account status checks prevent unauthorized access