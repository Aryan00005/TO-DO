# Bug Fixes - Phase Tracker

## Phase 1 — Self-assigned task not visible in Task Board + After edit navigate to Tasks Assigned

### Problems
1. When a user creates a task and assigns it to themselves, it does NOT appear in the kanban Task Board. It should appear in BOTH the Task Board (kanban) AND the Tasks Assigned tab.
2. After editing a task, the user should be navigated to the "Tasks Assigned" tab automatically.

### Root Cause
**Problem 1:** `tasksAssignedToMe` filters out tasks where `assignedBy === user._id`. This means self-assigned tasks (where creator = assignee) are excluded from the kanban board entirely.

**Problem 2:** After `handleCreate` completes an edit, `setNav` is never called — the user stays on the `assigntasks` form.

### Fix Applied
- `tasksAssignedToMe`: Changed filter to also include tasks where user is an assignee even if they are also the creator.
- `handleCreate`: After a successful edit API call, added `setNav('assignedtasks')` to redirect user.
- `getKanbanTasks`: Fixed `if (!columns[status])` → `if (!(status in columns))`. Empty array `[]` is falsy in JS, so `Not Started` column (empty array) was incorrectly falling through to `Working on it`.
- `handleCreate`: Added `normalizeTask()` on the server response for both create and edit so `approvalStatus`, `stuckReason`, `rejectionReason` are always properly mapped.
- Backend `PATCH` and `PUT` task routes: When a task is edited, reset `status` to `'Not Started'` and `approval_status` to `'approved'` so stale statuses from previous Done/Pending states don't carry over.
- **Root cause of "goes to Working on it"**: In `findVisibleToUser`, `allAssignees` was filtered by `account_status === 'active'`. If the user's account_status in DB is not exactly `'active'`, `displayAssignees` becomes `[]`. Then on the frontend `tasksAssignedToMe` checks `task.assignedTo.some(...)` on an empty array → returns `false` → task excluded from kanban entirely. Fixed by removing the `account_status` filter (keep only null check).

### Status: ✅ Fixed (local) — pending live deploy

---

## Phase 2 — TBD
_User will provide details after Phase 1 is verified._

---

## Phase 3 — TBD
_User will provide details after Phase 2 is verified._
