# Backend Admin Approval Workflow - Implementation Complete

## Overview
Backend implementation for admin approval workflow where tasks assigned to admin users require approval before appearing on boards.

## Changes Made

### 1. Task Model (`models/task.js`)
**Modified task creation logic:**
- Detects if any assignee has `role === 'admin'`
- Sets `approvalStatus: 'pending'` if admin is assigned
- Sets `approvalStatus: 'approved'` for regular users
- Sets task `status: 'Pending Approval'` for pending tasks
- Sets task `status: 'Not Started'` for approved tasks

### 2. Task Routes (`routes/task.js`)

#### **Route Organization**
- Moved `/pending-approvals` route BEFORE `/:taskId` routes to prevent route conflicts

#### **POST /tasks/:taskId/approve** (Admin only)
- Verifies user is admin
- Updates task:
  - `approval_status: 'approved'`
  - `status: 'Not Started'`
- Sends notification to task creator: "Your task [name] has been approved by admin"
- Returns updated task

#### **POST /tasks/:taskId/reject** (Admin only)
- Verifies user is admin
- Requires `reason` in request body
- Sends notification to task creator: "Your task [name] has been rejected: [reason]"
- **Deletes task completely** from database
- Returns success message

#### **GET /tasks/pending-approvals** (Admin only)
- Returns tasks assigned to the admin with `approval_status === 'pending'`
- Populates creator and assignee details
- Ordered by creation date (newest first)

## API Endpoints

### Approve Task
```
POST /tasks/:taskId/approve
Authorization: Bearer <token>
Role: admin

Response:
{
  "message": "Task approved successfully",
  "task": { ... }
}
```

### Reject Task
```
POST /tasks/:taskId/reject
Authorization: Bearer <token>
Role: admin

Body:
{
  "reason": "Rejection reason here"
}

Response:
{
  "message": "Task rejected and deleted successfully"
}
```

### Get Pending Approvals
```
GET /tasks/pending-approvals
Authorization: Bearer <token>
Role: admin

Response: [
  {
    "_id": "123",
    "title": "Task name",
    "description": "...",
    "approval_status": "pending",
    "assignedBy": { ... },
    "assignedTo": [ ... ],
    ...
  }
]
```

## Workflow

### Task Creation
1. User creates task and assigns to admin
2. Backend detects admin assignee
3. Sets `approvalStatus: 'pending'` and `status: 'Pending Approval'`
4. Task saved to database
5. Frontend shows "Task sent for admin approval!" message

### Admin Approval
1. Admin views pending tasks via `/tasks/pending-approvals`
2. Admin approves task via `POST /tasks/:taskId/approve`
3. Backend updates status to 'Not Started' and approval to 'approved'
4. Notification sent to creator
5. Task appears on regular boards

### Admin Rejection
1. Admin rejects task via `POST /tasks/:taskId/reject` with reason
2. Backend sends notification to creator with rejection reason
3. Backend deletes task completely
4. Creator receives notification

## Database Fields Used
- `approval_status`: 'pending' | 'approved' | null
- `status`: 'Pending Approval' | 'Not Started' | 'Working on it' | 'Stuck' | 'Done'

## Notifications
- **Approval**: "Your task \"[title]\" has been approved by admin"
- **Rejection**: "Your task \"[title]\" has been rejected: [reason]"

## Security
- Only admins can approve/reject tasks
- Only admins can view pending approvals
- Only tasks assigned to the admin are shown in their pending list
- Proper authentication and authorization checks on all endpoints

## Frontend Integration
The frontend is already configured to:
- Detect admin assignees during task creation
- Show "PENDING" badge for tasks with `approvalStatus === 'pending'`
- Display appropriate success messages
- Handle approval workflow UI

## Testing
Test the workflow:
1. Create task as regular user, assign to admin
2. Verify task has `approval_status: 'pending'`
3. Login as admin, call `/tasks/pending-approvals`
4. Approve task via `/tasks/:taskId/approve`
5. Verify task status changed to 'Not Started'
6. Verify creator received notification
7. Test rejection flow with reason

## Notes
- Only NEW tasks trigger approval workflow
- Edited tasks do NOT require re-approval
- Rejected tasks are DELETED, not just hidden
- Approval only applies when admin is assigned
- Regular user-to-user tasks are auto-approved
