# Task Visibility & User Approval Implementation

## Summary
Implemented two major features:
1. **Task Visibility Control**: Admin-created tasks visible to all, user-to-user tasks visible only to involved parties + admin
2. **User Registration Approval**: Users require company admin approval before accessing system

## Changes Made

### 1. Database Changes
**File**: `add-created-by-admin-column.sql`
- Added `created_by_admin` BOOLEAN column to tasks table
- Added index for performance

**To Apply**: Run this SQL on your Supabase database:
```sql
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by_admin BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_tasks_created_by_admin ON tasks(created_by_admin);
```

### 2. Backend Changes

#### A. Task Model (`models/task.js`)
- Added `createdByAdmin` parameter to `create()` method
- Added new method `findVisibleToUser(userId, userRole, userCompany)`:
  - **Admin**: Sees ALL tasks in company
  - **User**: Sees admin-created tasks + tasks they're involved in (created or assigned)

#### B. Task Routes (`routes/task.js`)
- Updated `POST /tasks` to track if creator is admin
- Added `GET /tasks/visible` route - returns filtered tasks based on user role

#### C. Auth Routes (`routes/auth.js`)
- Updated `POST /auth/register`: Sets `accountStatus='pending'` for new users
- Added `GET /auth/admin/pending-users`: Company admin gets pending users in their company
- Added `POST /auth/admin/user-action`: Company admin approves/rejects users
- Updated `handleLoginSuccess()`: Returns `accountStatus` in response

### 3. Frontend Changes

#### A. New Component (`src/pages/PendingApproval.tsx`)
- Shows "Awaiting Approval" message for pending users
- Displays user info and logout button

#### B. App Router (`src/App.tsx`)
- Added `/pending-approval` route
- Added `accountStatus` to User interface

#### C. Login Page (`src/pages/login.tsx`)
- Checks `accountStatus` after login
- Redirects pending users to `/pending-approval`
- Active users go to `/dashboard`

### 4. Admin Dashboard (To Be Added)
**TODO**: Add pending users panel to admin dashboard showing:
- List of pending users
- Approve/Reject buttons
- Uses `/auth/admin/pending-users` and `/auth/admin/user-action` endpoints

## Task Visibility Rules

### Admin-Created Tasks
- Visible to: **ALL users in company + admin**
- Use case: Company-wide announcements, general tasks

### User-to-User Tasks
- Visible to: **Task creator + assignee + admin ONLY**
- Use case: Private collaboration between team members

### Implementation
```javascript
// When creating task
const createdByAdmin = creator.role === 'admin';

// When fetching tasks
const tasks = await Task.findVisibleToUser(userId, userRole, userCompany);
```

## User Registration Flow

### Before (Old Flow)
1. User registers → Account active immediately
2. User logs in → Access dashboard

### After (New Flow)
1. User registers → Account status = 'pending'
2. User logs in → Redirected to "Awaiting Approval" page
3. Admin approves → Account status = 'active'
4. User logs in again → Access dashboard

## API Endpoints

### For Company Admins
```
GET  /auth/admin/pending-users
     Returns: List of pending users in admin's company

POST /auth/admin/user-action
     Body: { userId, action: 'approve'|'reject' }
     Returns: Success message
```

### For Task Visibility
```
GET  /tasks/visible
     Returns: Filtered tasks based on user role and involvement
```

## Testing Steps

### 1. Test User Approval Flow
```bash
# Register new user
POST /auth/register
{
  "name": "Test User",
  "userId": "testuser",
  "email": "test@example.com",
  "password": "password123",
  "companyCode": "COMPANY123"
}

# Login as user (should redirect to pending page)
POST /auth/login
{
  "userId": "testuser",
  "password": "password123"
}

# Login as admin, approve user
POST /auth/admin/user-action
{
  "userId": 123,
  "action": "approve"
}

# Login as user again (should access dashboard)
```

### 2. Test Task Visibility
```bash
# Admin creates task (visible to all)
POST /tasks
{
  "title": "Company Task",
  "description": "Everyone can see this",
  "assignedTo": [userId],
  ...
}

# User creates task (visible only to creator, assignee, admin)
POST /tasks
{
  "title": "Private Task",
  "description": "Only we can see this",
  "assignedTo": [anotherUserId],
  ...
}

# Fetch visible tasks
GET /tasks/visible
```

## Next Steps

1. **Run SQL Migration**: Apply `add-created-by-admin-column.sql` to database
2. **Update Admin Dashboard**: Add pending users panel with approve/reject UI
3. **Update Task Fetching**: Replace existing task fetch calls with `/tasks/visible` endpoint
4. **Test Thoroughly**: Test both features with different user roles

## Notes

- Pending users CAN login but see limited "awaiting approval" page
- Rejected users are blocked from login (handled in backend)
- Admin sees ALL tasks regardless of creator
- Task visibility is enforced at backend level for security
