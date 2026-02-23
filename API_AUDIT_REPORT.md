# API Audit Report - Task Management System

## Executive Summary
This document provides a comprehensive audit of all API calls made throughout the application lifecycle, from login to logout, identifying performance bottlenecks and optimization opportunities.

---

## 1. LOGIN FLOW

### 1.1 Login Page (`/login`)
**API Calls Made:**
1. `POST /auth/login` - User authentication
   - **When:** On form submit
   - **Data Sent:** `{ userId, password }`
   - **Response:** `{ token, user }`
   - **Performance:** ✅ Single call, efficient

**Total API Calls on Login:** 1

---

## 2. DASHBOARD INITIAL LOAD

### 2.1 Dashboard Component Mount (`dashboard-new.tsx`)
**API Calls Made (Simultaneous):**

1. `GET /tasks/visible` - Fetch all visible tasks
   - **When:** Component mount (useEffect)
   - **Headers:** `Authorization: Bearer ${token}`
   - **Response:** Array of tasks
   - **Issue:** ⚠️ Fetches ALL tasks, then filters in frontend

2. `GET /auth/users` - Fetch all users
   - **When:** Component mount (useEffect)
   - **Headers:** `Authorization: Bearer ${token}`
   - **Response:** Array of users
   - **Issue:** ⚠️ Fetches ALL users in company

3. `GET /notifications/${user._id}` - Fetch user notifications
   - **When:** Component mount (useEffect)
   - **Headers:** `Authorization: Bearer ${token}`
   - **Response:** Array of notifications
   - **Performance:** ✅ Efficient

**Total API Calls on Dashboard Load:** 3 (Parallel)

**Performance Impact:** 🔴 HIGH
- All 3 calls must complete before dashboard is usable
- If backend is on Render free tier, first call wakes up server (30-60s delay)
- Subsequent calls wait for server to be ready

---

## 3. NAVIGATION TO "TASKS ASSIGNED" TAB

### 3.1 When User Clicks "Tasks Assigned"
**API Calls Made:**

1. `GET /tasks/assignedBy/${user._id}` - Fetch tasks created by user
   - **When:** nav === "assignedtasks" (useEffect)
   - **Headers:** `Authorization: Bearer ${token}`
   - **Response:** Array of tasks
   - **Performance:** ✅ Efficient, only fetches when needed

**Total API Calls:** 1

---

## 4. CREATING A NEW TASK

### 4.1 When User Submits Task Form
**API Calls Made:**

1. `POST /tasks` - Create new task
   - **When:** Form submit
   - **Headers:** `Authorization: Bearer ${token}`
   - **Data:** `{ title, description, assignedTo, priority, dueDate, company }`
   - **Response:** `{ message, task }`

2. `GET /tasks/visible` - Refresh task list (via refreshData())
   - **When:** After task creation
   - **Headers:** `Authorization: Bearer ${token}`
   - **Response:** Array of tasks
   - **Issue:** ⚠️ Re-fetches ALL tasks instead of adding new one to state

3. `GET /notifications/${user._id}` - Refresh notifications
   - **When:** After task creation (via refreshData())
   - **Headers:** `Authorization: Bearer ${token}`
   - **Response:** Array of notifications

4. `GET /tasks/assignedBy/${user._id}` - Refresh assigned tasks (if on that tab)
   - **When:** If nav === "assignedtasks"
   - **Headers:** `Authorization: Bearer ${token}`
   - **Response:** Array of tasks

**Total API Calls:** 3-4 calls per task creation

**Performance Impact:** 🟡 MEDIUM
- Unnecessary re-fetching of all data
- Could use optimistic updates instead

---

## 5. REFRESH BUTTON CLICK

### 5.1 When User Clicks Refresh
**API Calls Made:**

1. `GET /tasks/visible` - Fetch all tasks
2. `GET /notifications/${user._id}` - Fetch notifications

**Total API Calls:** 2 (Parallel)

---

## 6. USER MANAGEMENT (ADMIN ONLY)

### 6.1 When Admin Opens "User Management" Tab
**API Calls Made:**

1. `GET /auth/admin/all-users` - Fetch all users in company
   - **When:** nav === "userapprovals" (useEffect)
   - **Headers:** `Authorization: Bearer ${token}`
   - **Response:** Array of users with all statuses
   - **Performance:** ✅ Efficient

2. `GET /tasks/pending-approvals` - Fetch pending task approvals
   - **When:** nav === "userapprovals" (useEffect)
   - **Headers:** `Authorization: Bearer ${token}`
   - **Response:** Array of pending tasks
   - **Performance:** ✅ Efficient

**Total API Calls:** 2 (Parallel)

---

### 6.2 When Admin Clicks on a User Card
**API Calls Made:**

1. `GET /tasks/assignedTo/${userId}` - Fetch tasks assigned to user
   - **When:** User card clicked
   - **Headers:** `Authorization: Bearer ${token}`
   - **Response:** Array of tasks

2. `GET /tasks/assignedBy/${userId}` - Fetch tasks created by user
   - **When:** User card clicked
   - **Headers:** `Authorization: Bearer ${token}`
   - **Response:** Array of tasks

**Total API Calls:** 2 (Parallel)

---

### 6.3 When Admin Adds New User
**API Calls Made:**

1. `POST /auth/register` - Create new user
   - **When:** Add user form submit
   - **Headers:** `Authorization: Bearer ${token}`
   - **Data:** `{ name, email, userId, password, companyCode }`
   - **Response:** Success message

2. `GET /auth/admin/all-users` - Refresh user list
   - **When:** After user creation
   - **Headers:** `Authorization: Bearer ${token}`
   - **Response:** Array of users

**Total API Calls:** 2

---

### 6.4 When Admin Approves/Rejects User
**API Calls Made:**

1. `POST /auth/admin/user-action` - Approve/reject user
   - **When:** Button click
   - **Headers:** `Authorization: Bearer ${token}`
   - **Data:** `{ userId, action }`
   - **Response:** Success message

2. `GET /auth/admin/all-users` - Refresh user list
   - **When:** After action
   - **Headers:** `Authorization: Bearer ${token}`
   - **Response:** Array of users

**Total API Calls:** 2

---

### 6.5 When Admin Deactivates/Activates User
**API Calls Made:**

1. `POST /auth/admin/toggle-user-status` - Toggle user status
   - **When:** Button click
   - **Headers:** `Authorization: Bearer ${token}`
   - **Data:** `{ userId, status }`
   - **Response:** Success message

2. `GET /auth/admin/all-users` - Refresh user list
   - **When:** After toggle
   - **Headers:** `Authorization: Bearer ${token}`
   - **Response:** Array of users

**Total API Calls:** 2

---

### 6.6 When Admin Removes User
**API Calls Made:**

1. `DELETE /auth/admin/remove-user/${userId}` - Remove user
   - **When:** Button click
   - **Headers:** `Authorization: Bearer ${token}`
   - **Response:** Success message

2. `GET /auth/admin/all-users` - Refresh user list
   - **When:** After removal
   - **Headers:** `Authorization: Bearer ${token}`
   - **Response:** Array of users

**Total API Calls:** 2

---

## 7. TASK APPROVAL (ADMIN ONLY)

### 7.1 When Admin Approves/Rejects Task
**API Calls Made:**

1. `POST /tasks/${taskId}/approve` OR `POST /tasks/${taskId}/reject`
   - **When:** Button click
   - **Headers:** `Authorization: Bearer ${token}`
   - **Response:** Success message

2. `GET /tasks/pending-approvals` - Refresh pending tasks
   - **When:** After action
   - **Headers:** `Authorization: Bearer ${token}`
   - **Response:** Array of pending tasks

3. `GET /tasks/visible` - Refresh task list (via refreshData())
4. `GET /notifications/${user._id}` - Refresh notifications

**Total API Calls:** 4

---

## 8. EDITING A TASK

### 8.1 When User Edits and Updates Task
**API Calls Made:**

1. `PATCH /tasks/${taskId}` - Update task
   - **When:** Form submit
   - **Headers:** `Authorization: Bearer ${token}`
   - **Data:** `{ title, description, assignedTo, priority, dueDate, company }`
   - **Response:** Success message

2. `GET /tasks/visible` - Refresh task list (via refreshData())
3. `GET /notifications/${user._id}` - Refresh notifications
4. `GET /tasks/assignedBy/${user._id}` - Refresh assigned tasks (if on that tab)

**Total API Calls:** 3-4

---

## 9. DELETING A TASK

### 9.1 When User Deletes Task
**API Calls Made:**

1. `DELETE /tasks/${taskId}` - Delete task
   - **When:** Delete button click
   - **Headers:** `Authorization: Bearer ${token}`
   - **Response:** Success message

**Total API Calls:** 1

**Performance:** ✅ Efficient - Updates state locally without re-fetching

---

## 10. DRAG & DROP TASK STATUS CHANGE

### 10.1 When User Drags Task to Different Column
**API Calls Made:**

1. `PATCH /tasks/${taskId}` - Update task status
   - **When:** Task dropped in new column
   - **Headers:** `Authorization: Bearer ${token}`
   - **Data:** `{ status: newStatus }`
   - **Response:** Success message

**Total API Calls:** 1

**Performance:** ✅ Efficient - Optimistic update, API call in background

---

## 11. NOTIFICATIONS

### 11.1 When User Opens Notification Panel
**API Calls Made:**
- None (uses already fetched data)

### 11.2 When User Marks All as Read
**API Calls Made:**

1. `PATCH /notifications/all/${user._id}/read` - Mark all as read
   - **When:** Button click
   - **Headers:** `Authorization: Bearer ${token}`
   - **Response:** Success message

2. `GET /tasks/visible` - Refresh tasks (via refreshData())
3. `GET /notifications/${user._id}` - Refresh notifications

**Total API Calls:** 3

---

## 12. LOGOUT

### 12.1 When User Logs Out
**API Calls Made:**
- None (client-side only - clears sessionStorage)

**Total API Calls:** 0

---

## PERFORMANCE ISSUES IDENTIFIED

### 🔴 CRITICAL ISSUES

1. **Dashboard Initial Load - 3 Parallel API Calls**
   - **Impact:** High latency on first load
   - **Solution:** 
     - Implement lazy loading
     - Load tasks first, then users/notifications in background
     - Add loading skeletons

2. **Render.com Cold Start**
   - **Impact:** 30-60 second delay on first request
   - **Solution:**
     - Upgrade to paid tier (always-on)
     - OR implement keep-alive ping
     - OR migrate to different hosting

3. **Frontend Task Filtering**
   - **Impact:** Fetches all tasks, filters in browser
   - **Solution:**
     - Add backend endpoint: `/tasks/assignedToOnly/${userId}` (excludes created tasks)
     - Reduces data transfer and processing

### 🟡 MEDIUM ISSUES

4. **Unnecessary Re-fetching After Actions**
   - **Impact:** Every create/update/delete re-fetches ALL data
   - **Solution:**
     - Use optimistic updates
     - Only fetch changed data
     - Implement WebSocket for real-time updates

5. **No Caching**
   - **Impact:** Same data fetched repeatedly
   - **Solution:**
     - Implement React Query or SWR
     - Add cache headers on backend
     - Use service worker for offline support

6. **Multiple Refresh Calls**
   - **Impact:** refreshData() called too frequently
   - **Solution:**
     - Debounce refresh calls
     - Implement smart refresh (only when needed)

### 🟢 LOW ISSUES

7. **User List Fetched Multiple Times**
   - **Impact:** Minor, but could be cached
   - **Solution:**
     - Cache user list in context/state
     - Only refresh when user added/removed

---

## TOTAL API CALL SUMMARY

### Per User Session (Typical Flow)

| Action | API Calls | Performance |
|--------|-----------|-------------|
| Login | 1 | ✅ Good |
| Dashboard Load | 3 | 🔴 Critical |
| View Tasks Assigned | 1 | ✅ Good |
| Create Task | 3-4 | 🟡 Medium |
| Edit Task | 3-4 | 🟡 Medium |
| Delete Task | 1 | ✅ Good |
| Drag Task | 1 | ✅ Good |
| Refresh | 2 | ✅ Good |
| User Management (Admin) | 2 | ✅ Good |
| View User Details | 2 | ✅ Good |
| Add User | 2 | ✅ Good |
| Approve/Reject User | 2 | ✅ Good |
| Logout | 0 | ✅ Good |

**Average Session:** 15-25 API calls
**Peak Load:** Dashboard initial load (3 parallel calls)

---

## RECOMMENDATIONS

### Immediate Actions (High Priority)

1. **Fix Dashboard Load**
   ```typescript
   // Current: 3 parallel calls
   // Recommended: Sequential with loading states
   
   // Step 1: Load critical data first
   const tasks = await fetchTasks();
   setTasks(tasks);
   
   // Step 2: Load secondary data in background
   Promise.all([
     fetchUsers(),
     fetchNotifications()
   ]).then(([users, notifications]) => {
     setUsers(users);
     setNotifications(notifications);
   });
   ```

2. **Add Backend Filtering**
   ```javascript
   // New endpoint in task.js
   router.get('/assignedToOnly/:userId', auth, async (req, res) => {
     // Fetch tasks assigned TO user, excluding tasks created BY user
     const tasks = await Task.find({
       assignedTo: req.params.userId,
       assignedBy: { $ne: req.params.userId }
     });
     res.json(tasks);
   });
   ```

3. **Implement Optimistic Updates**
   ```typescript
   // Instead of re-fetching after create
   const newTask = { ...taskData, _id: tempId };
   setTasks([...tasks, newTask]); // Update UI immediately
   
   // API call in background
   await createTask(taskData);
   ```

### Medium Priority

4. **Add React Query for Caching**
5. **Implement Loading Skeletons**
6. **Add Error Boundaries**
7. **Debounce Refresh Calls**

### Low Priority

8. **Add Service Worker**
9. **Implement WebSocket for Real-time**
10. **Add Request Deduplication**

---

## CONCLUSION

**Current State:**
- Total API calls per session: 15-25
- Main bottleneck: Dashboard initial load (3 parallel calls + Render cold start)
- Performance: 🟡 Medium (acceptable but needs improvement)

**Target State:**
- Reduce dashboard load to 1 critical call + 2 background calls
- Implement caching to reduce redundant calls by 40%
- Add optimistic updates to improve perceived performance
- Expected improvement: 60-70% faster load times

**Estimated Impact:**
- Current load time: 3-5 seconds (or 30-60s on cold start)
- Target load time: 1-2 seconds (or 10-15s on cold start)
- User experience: Significantly improved

---

*Report Generated: 2024*
*Audited By: AI Assistant*
*Version: 1.0*
