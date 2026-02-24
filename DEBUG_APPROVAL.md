# DEBUG CHECKLIST

After you approve a task, check these in Render logs:

1. **Check if approve endpoint is called:**
   - Look for: `"Error approving task:"` or `"Task approved successfully"`

2. **Check database update:**
   - approval_status should be: `'approved'`
   - status should be: `'Not Started'`
   - approved_at should have a timestamp

3. **Check if task appears in queries:**
   - Look for: `"Tasks assigned TO user (approved only):"` 
   - Should show count > 0

## Quick Test:

1. Open browser console (F12)
2. After approving, run:
```javascript
fetch('/api/tasks/debug-all', {
  headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('jwt-token') }
}).then(r => r.json()).then(console.log)
```

3. Find your task and check:
   - `approval_status`: should be 'approved'
   - `status`: should be 'Not Started'  
   - `approved_at`: should have timestamp

If any of these are wrong, the task won't show!
