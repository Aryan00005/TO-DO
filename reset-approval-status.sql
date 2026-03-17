-- Reset all Done tasks to pending approval status
-- This is needed because old tasks were automatically set to 'approved'
-- Now they need creator approval

UPDATE tasks 
SET approval_status = 'pending' 
WHERE status = 'Done' 
AND approval_status = 'approved';

-- Verify the update
SELECT id, title, status, approval_status 
FROM tasks 
WHERE status = 'Done' 
ORDER BY created_at DESC;
