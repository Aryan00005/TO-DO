# Testing Guide for Task Edit/Delete Fixes

## Prerequisites
- Backend server running
- Frontend application running
- At least 2 users registered (to test assignee changes)
- At least 1 task created

---

## Test 1: Edit Task - Assignee Pre-selection ✅

### Steps:
1. Login to the application
2. Go to Kanban board (Tasks Board)
3. Find a task you created
4. Click the **Edit** button (pencil icon) on the task
5. **VERIFY**: The "Assign To" dropdown should show the current assignee selected (not empty)

### Expected Result:
- ✅ Assignee dropdown is pre-filled with current assignee name
- ✅ All other fields (title, description, priority, due date) are also pre-filled

### If Failed:
- Check browser console for errors
- Verify frontend is deployed with latest changes (commit: c217751)

---

## Test 2: Edit Task - Update Existing Task ✅

### Steps:
1. Click Edit on a task
2. Change the title to "Updated Task Title"
3. Change the description to "Updated description"
4. Change the priority (click different stars)
5. Change the due date
6. Change the assignee to a different user
7. Click "Update Task"

### Expected Result:
- ✅ Success toast message: "Task updated successfully!"
- ✅ Task is updated on the board (NOT a new task created)
- ✅ Changes are immediately visible
- ✅ Task count remains the same (no duplicate)

### If Failed:
- Check browser console for errors
- Check Network tab - should see PUT request to `/api/tasks/:taskId`
- Verify backend is deployed with latest changes (commit: 1811b2f)

---

## Test 3: Edit Task - Permission Check ✅

### Steps:
1. Login as User A
2. Create a task assigned to User B
3. Click Edit on that task
4. Make changes and click "Update Task"

### Expected Result:
- ✅ Task updates successfully
- ✅ NO error message about "Access denied"
- ✅ Creator can edit their own task

### If Failed:
- Check backend logs for permission errors
- Verify backend route has correct permission check:
  ```javascript
  req.user.role === 'admin' || task.assignedBy.toString() === req.user._id
  ```

---

## Test 4: Delete Task - Permission Check ✅

### Steps:
1. Login as User A
2. Find a task you created
3. Click the **Delete** button (trash icon)
4. Confirm deletion in the popup

### Expected Result:
- ✅ Task is deleted successfully
- ✅ Success toast: "Task deleted successfully!"
- ✅ Task disappears from board
- ✅ NO permission error

### If Failed:
- Check browser console for errors
- Check Network tab - should see DELETE request to `/api/tasks/:taskId`
- Verify backend is deployed with latest changes (commit: 5bb2e2f)

---

## Test 5: Edit Task - All Fields Update ✅

### Steps:
1. Create a new task with:
   - Title: "Original Title"
   - Description: "Original Description"
   - Priority: 3 stars
   - Due Date: Tomorrow
   - Assignee: User A
2. Click Edit
3. Change ALL fields:
   - Title: "New Title"
   - Description: "New Description"
   - Priority: 5 stars
   - Due Date: Next week
   - Assignee: User B
4. Click "Update Task"

### Expected Result:
- ✅ All fields are updated
- ✅ Task shows new title, description, priority, date, and assignee
- ✅ No fields are lost or reset

---

## Test 6: Edit Modal - Cancel Button ✅

### Steps:
1. Click Edit on a task
2. Make some changes
3. Click "Cancel" button

### Expected Result:
- ✅ Modal closes
- ✅ No changes are saved
- ✅ Task remains unchanged

---

## Test 7: Edit Modal - ESC Key ✅

### Steps:
1. Click Edit on a task
2. Make some changes
3. Press ESC key

### Expected Result:
- ✅ Modal closes
- ✅ No changes are saved
- ✅ Task remains unchanged

---

## Test 8: Multiple Assignees (Edge Case) ✅

### Steps:
1. If your task has multiple assignees (array)
2. Click Edit
3. **VERIFY**: First assignee should be pre-selected

### Expected Result:
- ✅ First assignee from array is shown in dropdown
- ✅ Can change to different assignee
- ✅ Update works correctly

---

## Test 9: Admin Permissions ✅

### Steps:
1. Login as Admin user
2. Find a task created by another user
3. Click Edit
4. Make changes and save

### Expected Result:
- ✅ Admin can edit any task
- ✅ No permission errors

### Steps (Delete):
1. Click Delete on another user's task
2. Confirm deletion

### Expected Result:
- ✅ Admin can delete any task
- ✅ No permission errors

---

## Test 10: Non-Creator Permissions ❌

### Steps:
1. Login as User A
2. Find a task created by User B (not assigned to you)
3. Try to edit or delete it

### Expected Result:
- ❌ Should get permission error
- ❌ Cannot edit/delete others' tasks (unless admin)

---

## Common Issues & Solutions

### Issue: Assignee field is empty when editing
**Solution**: 
- Clear browser cache
- Verify frontend deployed with commit: c217751
- Check browser console for errors

### Issue: "Access denied" error when editing
**Solution**:
- Verify backend deployed with commit: 1811b2f
- Check backend logs for permission errors
- Verify JWT token is valid

### Issue: Creates new task instead of updating
**Solution**:
- Check Network tab - should be PUT request, not POST
- Verify `editingTask._id` is set correctly
- Check backend route is using correct task ID

### Issue: Delete shows error
**Solution**:
- Verify backend deployed with commit: 5bb2e2f
- Check backend logs
- Verify you're the task creator or admin

---

## Quick Verification Commands

### Check Frontend Version:
```bash
cd deployment-package
git log --oneline -1
# Should show: c217751 Fix: Pre-fill assignee field when editing task
```

### Check Backend Version:
```bash
cd todo-multiuser-backend
git log --oneline -1
# Should show: 1811b2f Fix: Allow task creator to edit and delete tasks
```

### Check if Backend is Running:
```bash
curl http://localhost:5000/api/health
# or check your production URL
```

---

## Success Criteria ✅

All tests should pass:
- [x] Assignee field pre-fills when editing
- [x] Edit updates existing task (no duplicate)
- [x] Task creator can edit their own tasks
- [x] Task creator can delete their own tasks
- [x] Admin can edit/delete all tasks
- [x] All fields update correctly
- [x] Cancel/ESC works properly

---

## Need Help?

If any test fails:
1. Check browser console (F12)
2. Check Network tab for API errors
3. Check backend logs
4. Verify both frontend and backend are deployed
5. Clear browser cache and try again

---

## Deployment Checklist

Before testing in production:
- [ ] Backend deployed with latest changes
- [ ] Frontend deployed with latest changes
- [ ] Environment variables configured
- [ ] Database connection working
- [ ] JWT authentication working
