# Session Summary - Task Management System Fixes

## Date: March 2026

---

## Issues Fixed

### 1. Rejected Task Not Visible in Assignee's Kanban Board

**Problem:**
- When owner rejected a task, it disappeared from assignee's kanban board completely
- Task was visible in owner's panel but NOT in assignee's panel after rejection

**Root Cause:**
- `findVisibleToUser` in `models/task.js` only showed tasks where `approval_status = 'approved'`
- After rejection, `approval_status = 'rejected'` so task was filtered out for assignee

**Fix (`models/task.js`):**
```js
// BEFORE
if (isAssigned && isApproved) return true;

// AFTER
if (isAssigned && (isApproved || task.approval_status === 'rejected')) return true;
```

Also fixed `findAssignedToUser` to use `.in('approval_status', ['approved', 'rejected'])` instead of `.eq('approval_status', 'approved')`

---

### 2. Kanban Board Showing Creator's Own Tasks

**Problem:**
- Kanban board was showing tasks the user created, not just tasks assigned to them
- `/tasks/visible` returns both creator and assignee tasks

**Fix (`dashboard-new.tsx`):**
```js
// BEFORE
const tasksAssignedToMe = filteredTasks;

// AFTER
const tasksAssignedToMe = filteredTasks.filter(task => {
  const assignedById = typeof task.assignedBy === 'object' ? task.assignedBy?._id : task.assignedBy;
  return String(assignedById) !== String(user._id);
});
```

---

### 3. Approved Task Auto-Hide After 24 Hours (Frontend) and Delete After 15 Days (Backend)

**Problem:**
- Approved tasks were staying visible forever in both assignee kanban and owner's "Tasks You Assigned"
- No cleanup of old approved tasks in database

**Solution:**

#### Step 1 - Added `approved_at` column to Supabase database:
```sql
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
```

#### Step 2 - Set `approved_at` timestamp on approval (`routes/task.js`):
```js
// PATCH route approval
updateData.approval_status = 'approved';
updateData.approved_at = new Date().toISOString();

// POST /:taskId/approve route
.update({ 
  approval_status: 'approved',
  status: 'Not Started',
  approved_at: new Date().toISOString()
})
```

#### Step 3 - Hide approved tasks older than 24 hours (`models/task.js`):
- `findVisibleToUser` — JS-side check using `approved_at`
- `findAssignedByUser` — filters out approved tasks older than 24 hours

```js
if (isApproved && task.approved_at) {
  const hoursSinceApproval = (Date.now() - new Date(task.approved_at).getTime()) / (1000 * 60 * 60);
  if (hoursSinceApproval >= 24) return false;
}
```

#### Step 4 - Cleanup job deletes tasks approved 15+ days ago (`utils/taskCleanup.js`):
```js
const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
// Deletes tasks where approval_status = 'approved' AND approved_at < 15 days ago
```

#### Step 5 - Cleanup runs daily at 2 AM (`server.js`):
```js
const { cleanupApprovedTasks } = require('./utils/taskCleanup');
setInterval(async () => {
  const now = new Date();
  if (now.getHours() === 2 && now.getMinutes() === 0) {
    await cleanupApprovedTasks();
  }
}, 60000);
```

---

### 4. Green Tick on Approved Tasks in Assignee Kanban

**Problem:**
- Green tick was showing on all tasks immediately after creation
- Default `approval_status = 'approved'` on new tasks caused this

**Fix (`dashboard-new.tsx`):**
- Use `approved_at` field instead of `approval_status` to detect explicit approval
- `approved_at` is only set when creator manually clicks Approve — new tasks have `approved_at = null`

```jsx
{task.approvalStatus === 'approved' && (task as any).approved_at && (
  <div style={{ position: 'absolute', top: 8, right: 8, color: '#22c55e', fontSize: 18 }}>✓</div>
)}
```

Also added `approved_at` to `normalizeTask`:
```js
const normalizeTask = (t: any): Task => ({
  ...t,
  approved_at: t.approved_at,
  // ... other fields
});
```

---

### 5. `findAssignedByUser` Crashing Due to Missing `approved_at` Column

**Problem:**
- After adding `approved_at` filter to Supabase query before column existed in DB
- Error: `column tasks.approved_at does not exist`
- This caused ALL tasks to disappear from creator and assignee panels

**Fix:**
- Removed `approved_at` from Supabase `.or()` query filter
- Kept `approved_at` check only on JS side (safe — just returns null if column empty)

---

## Files Modified

| File | Changes |
|------|---------|
| `todo-multiuser-backend/models/task.js` | Fixed visibility filter for rejected tasks, added 24hr approved_at hide logic |
| `todo-multiuser-backend/routes/task.js` | Set `approved_at` timestamp on approval |
| `todo-multiuser-backend/utils/taskCleanup.js` | Rewrote to delete tasks approved 15+ days ago |
| `todo-multiuser-backend/server.js` | Updated cleanup job to use new `cleanupApprovedTasks` |
| `src/pages/dashboard-new.tsx` | Fixed kanban filter, added green tick, added `approved_at` to normalizeTask |

## Database Changes

| Change | SQL |
|--------|-----|
| Added `approved_at` column | `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;` |

---

## Current Behavior (After All Fixes)

| Action | Result |
|--------|--------|
| Creator assigns task | Appears in assignee kanban only (not creator's kanban) |
| Assignee marks Done | Appears in creator's "Tasks You Assigned" with Approve/Reject buttons |
| Creator rejects | Task moves to "Working on it" in assignee kanban with red rejection reason |
| Creator approves | Green ✓ appears on task card in assignee kanban |
| 24 hours after approval | Task disappears from both assignee kanban and creator's "Tasks You Assigned" |
| 15 days after approval | Task permanently deleted from database (runs daily at 2 AM) |
