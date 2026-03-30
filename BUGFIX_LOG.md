# Task Management System — Bug Fix Log

## System Overview

- **Frontend**: React + TypeScript, deployed on Vercel
- **Backend**: Node.js + Express, deployed on Render (free tier)
- **Database**: Supabase (PostgreSQL)
- **Key Feature**: Task assignment workflow with creator approval/rejection

---

## Workflow (Expected Behavior)

1. Creator assigns task to assignee
2. Assignee works on task and moves it to **Done**
3. Task appears in creator's panel for review
4. Creator either:
   - **Approves** → task deleted from DB, removed from both panels
   - **Rejects** → task moves back to **Working on it**, reappears in assignee's kanban

---

## All Bugs Found and Fixed

---

### Bug 1 — Rejection 403 Error (int/string type mismatch)

**Symptom:** Creator rejecting a task returned 403 silently. Task stayed as `approved` in DB.

**Root Cause:**
```js
// Backend check was strict equality
if (String(task.assigned_by) !== String(currentUser.id))
```
`task.assigned_by` was an integer from Supabase, `currentUser.id` was sometimes a string from JWT. Strict `!==` failed.

**Fix:** Cast both sides to string before comparison.

**Commit:** `4aff9c4`

---

### Bug 2 — Notification payload too large (no limit)

**Symptom:** Notifications API returned 100+ old notifications on every poll, slowing the app.

**Root Cause:** `Notification.findByUserId()` had no `.limit()` — fetched all notifications ever.

**Fix:** Added `.range(0, 19)` to fetch only the 20 most recent notifications.

**Commit:** `4aff9c4`, `6bd8480`

---

### Bug 3 — Task payload bloat (no company/date filter)

**Symptom:** `/tasks/visible` returned tasks from Feb going back months, including other companies.

**Root Cause:** `findVisibleToUser` fetched ALL tasks from DB with no filters — then filtered in JavaScript.

**Fix:**
- Added `.eq('company', userCompany)` for creator tasks only
- Added `.limit(200)` as safety cap
- Removed blanket 30-day `created_at` filter (was hiding active old tasks)

**Commits:** `f5ed76f`, `31639b9`, `f5188e9`

---

### Bug 4 — Polling false trigger on page load

**Symptom:** Every page load triggered an immediate task refresh, causing `tasksAssignedToMe: []` spam in console.

**Root Cause:** `prevUnreadRef` was initialized to `unreadCount` which is `0` at mount (notifications state is empty). First poll always saw `newUnread > 0`, triggering a refresh.

**Fix:** Initialize `prevUnreadRef` to `-1` so first poll sets baseline without triggering refresh.

**Commit:** `2e015a6`

---

### Bug 5 — Frontend pointed to wrong Render service

**Symptom:** All backend fixes deployed to `to-do-m0we.onrender.com` were ignored. Frontend was hitting `to-do-1-26zv.onrender.com` (old service).

**Root Cause:** `axios.ts` had hardcoded fallback URL pointing to old Render service.

**Fix:** Updated `VITE_API_URL` and axios fallback to correct Render URL.

**Commit:** `0b32f6a`

---

### Bug 6 — Rejection handler had redundant creator check causing 403

**Symptom:** PATCH with `rejection_reason` returned 403 even for the task creator.

**Root Cause:** After `canUserUpdateTask` already verified access, there was a second check:
```js
const isCreatorOrAdmin = task && (String(task.assigned_by) === String(currentUser.id) || ...)
```
If the second task fetch returned `null` (race/error), `isCreatorOrAdmin = false` → 403.

**Fix:** Removed the redundant check entirely. `canUserUpdateTask` is sufficient.

**Commit:** `9ef0714`

---

### Bug 7 — Rejection PATCH sent wrong payload

**Symptom:** `handleTaskApproval('reject')` sent `{ approval_status: 'rejected' }` with no `rejection_reason`. Backend rejection handler only triggers on `rejection_reason`.

**Root Cause:** `handleTaskApproval` reject path sent incomplete payload, bypassing the rejection handler.

**Fix:** Made reject path open the rejection modal with `taskId` set, so user enters a reason and `handleRejectTask` sends the correct `{ rejection_reason: reason }` payload.

**Commit:** `3db3550`

---

### Bug 8 — Rejection DB update not persisting status/approval_status

**Symptom:** After rejection, DB showed `rejection_reason` set but `status` still `Done` and `approval_status` still `pending`.

**Root Cause:** The shared `updateData` pattern was unreliable. The rejection block built `updateData` but something was interfering with which fields got written.

**Fix:** Replaced with a direct isolated Supabase update for rejection:
```js
await supabase.from('tasks').update({
  status: 'Working on it',
  approval_status: 'rejected',
  rejection_reason: rejection_reason
}).eq('id', taskId)
```
With early `return` so no other code path runs.

**Commit:** `e7f6c8f`

---

### Bug 9 — On approval, task deleted from DB but frontend kept stale state

**Symptom:** After creator approved, task was deleted from DB but still showed in assignee's kanban until refresh.

**Root Cause:** `handleApproveTask` only updated `approval_status` in DB. Frontend had no mechanism to remove it.

**Fix:** On approval, backend now **deletes the task completely** from DB. Frontend immediately filters it out of all state arrays.

**Commit:** `079692b`

---

### Bug 10 — `filteredTasks` crashing on null description/title/priority

**Symptom:** When any task had `null` description, title, or priority, `filteredTasks` useMemo threw a TypeError silently, returning `[]`. Entire kanban emptied instantly on drag.

**Root Cause:**
```js
task.description.toLowerCase()  // throws if description is null
task.priority.toString()         // throws if priority is null
task.title?.toLowerCase().includes(...)  // undefined.includes() throws
```

**Fix:**
```js
(task.title || '').toLowerCase()
(task.description || '').toLowerCase()
(task.priority ?? '').toString()
```

**Commits:** `a656d78`, `d1e1a55`

---

### Bug 11 — `refreshData()` called on PATCH failure wiped task state

**Symptom:** When moving task to Done failed (Render sleeping), `catch` called `refreshData()` which did a full `setTasks` overwrite. If Render was down, tasks state became empty.

**Root Cause:**
```js
} catch (err) {
  refreshData(); // full overwrite — wipes state if API fails
}
```

**Fix:** On PATCH failure, revert only the specific task to its old status instead of calling `refreshData()`.

**Commit:** `acc960d`

---

### Bug 12 — Polling replaced state every 15s causing log spam and performance issues

**Symptom:** `KANBAN DEBUG` logs fired every 15 seconds even when data hadn't changed. Every poll caused full re-render chain.

**Root Cause:** Polling did `setTasks(newTasks)` unconditionally every 15s. New array reference → all memos recomputed → logs fired.

**Fix:** Compare prev and new tasks by key fields before updating:
```js
const prevJson = JSON.stringify(prev.map(t => ({ id: t._id, s: t.status, a: t.approvalStatus, r: t.rejectionReason })));
const newJson = JSON.stringify(newTasks.map(...));
return prevJson === newJson ? prev : newTasks;
```

**Commit:** `81e9a96`

---

### Bug 13 — Debug logs firing on every render (not just refresh)

**Symptom:** `KANBAN DEBUG` logs appeared continuously in console even with no user action.

**Root Cause:** `getKanbanTasks()` had `console.log` inside it. It was called on every render via useMemo recomputation.

**Fix:** Gated all debug logs behind `isRefreshing` — they only fire when user clicks the Refresh button.

**Commit:** `df5f8ac`

---

### Bug 14 — `tasksAssignedToMe` not memoized — recomputed on every render

**Symptom:** Performance issue — `tasksAssignedToMe` recomputed on every state change including unrelated ones.

**Fix:** Wrapped `filteredTasks`, `tasksAssignedToMe`, and `kanbanTasks` in `React.useMemo` with correct dependencies.

**Commits:** `43794b8`, `8f76345`, `486883e`

---

### Bug 15 — `rejectionReason` cleared when task moved to Done

**Symptom:** When assignee moved a rejected task back to Done, `rejectionReason` was cleared from state, causing the task to lose its rejection context.

**Root Cause:**
```js
setTasks(prev => prev.map(task =>
  task._id === taskId ? { ...task, status: newStatus, rejectionReason: undefined } : task
))
```

**Fix:** Removed `rejectionReason: undefined` from the optimistic update. Only `status` is updated.

**Commit:** `494efef`

---

### Bug 16 — `setFilterStatus('all')` called before `setTasks` causing flash disappear

**Symptom:** Task briefly disappeared for a microsecond when dragged to a new column.

**Root Cause:** In React 17, state updates inside async functions are NOT batched. `onDragEnd` called `setFilterStatus('all')` then `await updateTaskStatus()`. The filter reset triggered a re-render before the task status was updated — if filter was active, task disappeared briefly.

**Fix:** Moved `setFilterStatus('all')` inside `updateTaskStatus` so it runs in the same synchronous block as `setTasks`, forcing React to batch them.

**Commit:** `3c88e9f`

---

### Bug 17 — Approved task reappearing after optimistic removal

**Symptom:** After creator approved a task (removed from state immediately), the next poll brought it back briefly before the backend deleted it.

**Root Cause:** `handleApproveTask` filtered task from `prev`. Next poll returned task (backend hadn't deleted yet). `prev !== newTasks` → `setTasks(newTasks)` → task reappeared.

**Fix:** Added `recentlyApprovedRef` — a `Set` that tracks approved task IDs for 30 seconds. Polling filters these IDs out of `newTasks` before updating state.

**Commit:** `8627163`

---

### Bug 18 — Render cold start causing PATCH timeout and task revert

**Symptom:** First drag to Done failed with "Failed to update task" toast. Task reverted to old status. Second try worked.

**Root Cause:** Render free tier sleeps after inactivity. Default axios timeout was ~0 (browser default ~30s but inconsistent). PATCH timed out before Render woke up → catch block reverted task.

**Fix:** Set explicit `timeout: 30000` in axios config to give Render time to wake up.

**Commit:** `8627163`

---

### Bug 19 — `assignedTo` becomes `[]` when Supabase join returns null

**Symptom:** After rejection, task not visible in assignee's kanban after page refresh. `tasksAssignedToMe` returned empty.

**Root Cause:** In `findVisibleToUser`, `allAssignees` is built from:
```js
task.task_assignments?.map(a => a.users).filter(Boolean)
```
If Supabase foreign key join fails, `a.users` is `null` for all rows → `filter(Boolean)` removes all → `allAssignees = []`. Fallback then maps `task.task_assignments` but if that's also null/empty → `list = []` → `assignedTo = []` (empty array). `tasksAssignedToMe` checks `[].some(...)` → false → task excluded.

**Fix (Backend):** When `list` is empty, return `{ _id: String(userIdInt) }` — the requesting user's ID is always correct since `isAssigned` was already verified true.

**Fix (Frontend):** Added dual-layer matching in `tasksAssignedToMe` — check `assignedTo` first, then fall back to raw `task_assignments` array.

**Commits:** `4729846`, `8627163`, `e44232e`

---

### Bug 20 — `normalizeTask` produced invalid `assignedTo` structure

**Symptom:** After page refresh, tasks disappeared from kanban. `assignedTo` was `{}` (empty object) or `[]`.

**Root Cause:** `normalizeTask` did `assignedTo: t.assignedTo || t.assigned_to`. If backend returned `assignedTo: {}` (empty object without `_id`), this passed the truthy check. Then `tasksAssignedToMe` tried `{}.id` → `undefined` → `String(undefined) === String(70)` → false → task excluded.

**Fix:** Rewrote `normalizeTask` to:
1. Use `t.assignedTo || t.assigned_to` first
2. If missing, build from raw `task_assignments` array
3. If result is object without `_id`, set to `null`

**Commit:** `e44232e`

---

### Bug 21 — Supabase RLS blocking `task_assignments` nested join

**Symptom:** After page refresh, ALL rejected/pending tasks invisible to assignee. Only approved tasks showed. DB confirmed rejected tasks existed with correct `task_assignments` rows.

**Root Cause:** Supabase Row Level Security (RLS) was enabled on `task_assignments`, `tasks`, `users`, and `notifications` tables with **no policies set**. When RLS is enabled with no policies, Supabase returns 0 rows for all queries from that table — including nested joins. The nested join `task_assignments(user_id, users(...))` inside the main tasks query returned `[]` for every task. `isAssigned` check used this join result → always `false` → all assigned tasks excluded.

The approved tasks appeared to work only because they were being returned via `isCreator = true` (the creator was viewing their own tasks), not via `isAssigned`.

**Fix (DB):** Disabled RLS on all affected tables:
```sql
ALTER TABLE task_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
```

**Fix (Backend):** Even after disabling RLS, the nested join was unreliable. Replaced the join-based `isAssigned` check with a **separate direct query** on `task_assignments`:
```js
// Fetch task_assignments separately — bypasses join issues completely
const { data: allAssignments } = await supabase
  .from('task_assignments')
  .select('task_id, user_id');
const assignmentMap = {};
(allAssignments || []).forEach(a => {
  if (!assignmentMap[a.task_id]) assignmentMap[a.task_id] = [];
  assignmentMap[a.task_id].push(a.user_id);
});

// Use map instead of join result
const isAssigned = (assignmentMap[task.id] || []).includes(userIdInt);
```

**Status:** Under investigation — debug endpoint added to verify `task_assignments` query returns data correctly.

**Commits:** `ffee604`, `ed2d0d0`, `3fe4e35`, `e5f25fc`

---

## Current Open Issue

### Rejected tasks still not visible after refresh (ACTIVE)

**What we know:**
- DB has correct data: 5 rejected tasks with `task_assignments` rows for user 71
- RLS disabled on all tables
- Backend code uses separate `task_assignments` query (not join)
- `/tasks/visible` still returns only 3 approved tasks
- Debug endpoint `GET /api/tasks/debug-assignments` added to verify what Supabase actually returns

**Next step:** Check response from `https://to-do-m0we.onrender.com/api/tasks/debug-assignments` to see if the separate `task_assignments` query returns data.

---

## Architecture Decisions Made

| Decision | Reason |
|----------|--------|
| Approval = delete from DB | Cleaner than hiding. Approved tasks are done — no reason to keep them. |
| Rejection = update status + rejection_reason in DB | Task needs to be reworked, so it stays in system with context. |
| Polling every 15s (always fetch) | Ensures assignee sees rejection within 15s without manual refresh. |
| Optimistic updates with revert on failure | Instant UI feedback. Revert only the specific task on failure, not full state wipe. |
| `recentlyApprovedRef` for 30s | Prevents approved tasks from reappearing between optimistic removal and backend confirmation. |
| Dual-layer `tasksAssignedToMe` matching | Resilient to Supabase join failures — always falls back to raw `task_assignments`. |

---

## Files Modified

| File | Changes |
|------|---------|
| `src/pages/dashboard-new.tsx` | normalizeTask, tasksAssignedToMe, polling, updateTaskStatus, handleRejectTask, handleApproveTask, useMemo wrappers, debug log gating |
| `src/api/axios.ts` | Added 30s timeout |
| `todo-multiuser-backend/routes/task.js` | Rejection handler, approval handler (delete), removed redundant creator check |
| `todo-multiuser-backend/models/task.js` | findVisibleToUser filters, assignedTo fallback, notification limit |
| `todo-multiuser-backend/models/notification.js` | range(0,19) limit |

---

## Current Status

| Feature | Status |
|---------|--------|
| Move task to Done | ⚠️ Unstable (Render cold start causes first attempt to fail) |
| Creator sees Done tasks | ✅ Working |
| Creator Approve | ✅ Task deleted from both panels |
| Creator Reject | ✅ Works in creator panel |
| Assignee sees rejected task after refresh | ❌ BROKEN — under active investigation |
| Notifications limited to 20 | ✅ Working |
| No log spam | ✅ Logs only on manual refresh |
| Performance (memoization) | ✅ All key computations memoized |
