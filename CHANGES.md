# Performance Optimization — API Call Reduction

## Goal
Reduce unnecessary API calls to improve app speed and prevent cold starts on Render.
Each phase is tested locally before committing.

---

## Phase 1 — Create Task ✅ DONE

**Problem:** Creating a task made 3 API calls and required a page refresh to see the new task.

**Changes made in `src/pages/dashboard-new.tsx`:**

1. **Reduced API calls from 3 → 1**
   - Removed extra `assignedBy` fetch and `refreshData()` after create

2. **Fixed stale closure bug**
   - Form values (`title`, `description`, etc.) were reset before the API call
   - React closures captured the already-cleared `""` values
   - Fix: capture all form values into local variables before resetting state

3. **Optimistic redirect**
   - Form resets and nav changes to `assignedtasks` instantly (no waiting for API)
   - API call runs in background
   - On success: `setAssignedTasks(prev => [...prev, created])` appends the real task

4. **Fixed nav-based fetch overwriting optimistic state**
   - `useEffect` on `nav === "assignedtasks"` was re-fetching and overwriting the just-added task
   - Fix: removed `nav` from dependency array — fetch runs once on mount only (`[user._id]`)

5. **Fixed response parsing**
   - Backend returns `{ message, task }` — must use `res.data.task || res.data`

6. **True optimistic update (final fix)**
   - Task was still not appearing because state was only updated *after* the API call finished
   - Fix: build a temporary `optimisticTask` with a fake `_id` (`optimistic-<timestamp>`) and add it to `assignedTasks` + `tasks` *before* the API call
   - On API success: replace optimistic task with real server task
   - On API failure: remove optimistic task and show error toast

**Result:** Task appears instantly every time. No refresh needed. ✅

---

## Phase 2 — Edit Task ✅ DONE

**Changes made in `src/pages/dashboard-new.tsx`:**
- Build `optimisticEdit` from captured values + resolved user objects before API call
- Update `tasks` and `assignedTasks` state immediately with optimistic edit
- On success: replace with real server response
- On failure: call `refreshData()` to revert to server state

---

## Phase 3 — Delete Task ✅ DONE

**Changes made in `src/pages/dashboard-new.tsx`:**
- Remove from both `tasks` and `assignedTasks` state immediately before API call
- Show success toast immediately
- On failure: call `refreshData()` to revert + show error toast
- Replaced inline delete logic in "Tasks You Assigned" with a `deleteTask(task._id)` call (removed extra re-fetch)

---

## Phase 4 — Approve Task ✅ DONE

**Changes made in `src/pages/dashboard-new.tsx`:**
- `handleApproveTask`: updates `approvalStatus: 'approved'` in both `tasks` and `assignedTasks` immediately, API in background, reverts on failure
- Also added all other previously missing handlers that were called but undefined (would crash at runtime):
  - `handleTaskApproval` — admin approving/rejecting tasks pending admin approval
  - `handleRejectSubmit` — submits the rejection modal
  - `handleUserApproval` — admin approve/reject user accounts
  - `handleUserToggle` — optimistic active/inactive toggle for users
  - `handleUserRemoval` — optimistic user removal

---

## Phase 5 — Reject Task ✅ DONE

**Note:** Already implemented as part of the earlier kanban fix.
- `handleRejectTask`: updates both `tasks` and `assignedTasks` with `{ status: 'Working on it', rejectionReason, approvalStatus: 'rejected' }` immediately before the API call
- On failure: shows error toast (no revert needed since backend is reliable here)

---

## Phase 6 — Nav Cache ✅ DONE

**Changes made in `src/pages/dashboard-new.tsx`:**
- Added `adminDataFetchedAt` ref (tracks timestamp of last admin data fetch)
- `userapprovals` useEffect: skips fetch if data is less than 60 seconds old
- On error: resets `adminDataFetchedAt` to 0 so next visit retries
- Also parallelised the two sequential fetches into a single `Promise.all`
- Result: switching away and back to User Management tab within 60s makes zero API calls

---

## Notes

- **Live file:** `src/pages/dashboard-new.tsx` only
- **NOT** `deployment-package/src/` or `src/pages/dashboard.tsx`
- Backend response always wraps task: `{ message, task }` → use `res.data.task || res.data`
- File has CRLF line endings — use Node.js fix scripts if `fsReplace` fails
- No commits until all phases tested locally
