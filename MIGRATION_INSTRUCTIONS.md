# Database Migration - Task Completion Approval System

## What's New
- Added approve/reject functionality for completed tasks
- Task creators can approve or reject task completions
- Rejected tasks move back to "Working on it" with rejection reason
- Approved tasks are automatically deleted after 30 days
- Special colors for approved (green) and rejected (yellow-purple) tasks

## Database Changes Required

### Apply Migration to Supabase

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy and paste the contents of `add_completion_fields.sql`
6. Click **Run** to execute the migration

### Migration SQL
```sql
-- Add completion status fields to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS completion_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;

-- Add index for faster queries on approved tasks
CREATE INDEX IF NOT EXISTS idx_tasks_completion_status ON tasks(completion_status);
CREATE INDEX IF NOT EXISTS idx_tasks_approved_at ON tasks(approved_at);

-- Update existing 'Done' tasks to have 'pending' completion status
UPDATE tasks 
SET completion_status = 'pending' 
WHERE status = 'Done' AND completion_status IS NULL;
```

## Features

### For Task Creators (Admin or User)
- When a task is marked as "Done" by assignee, creator sees **Approve** and **Reject** buttons
- **Approve**: Task gets green color and badge, will be auto-deleted after 30 days
- **Reject**: Modal asks for rejection reason, task moves back to "Working on it" with purple border

### For Task Assignees
- Can see rejection reason by clicking on rejected tasks
- Rejected tasks have yellow-purple mixed background color
- Can continue working on rejected tasks

### Auto-Cleanup
- Approved tasks older than 30 days are automatically deleted when user clicks on them
- Keeps database clean and performant

## Testing

1. Create a task and assign it to someone
2. As assignee, move task to "Done"
3. As creator, you'll see Approve/Reject buttons
4. Test both approve and reject flows
5. Check colors and badges

## Deployment

After applying the migration:
1. Commit changes to GitHub
2. Redeploy backend on Render
3. Redeploy frontend on Vercel
4. Test in production

## Rollback (if needed)

If you need to rollback:
```sql
ALTER TABLE tasks 
DROP COLUMN IF EXISTS completion_status,
DROP COLUMN IF EXISTS rejection_reason,
DROP COLUMN IF EXISTS approved_at;

DROP INDEX IF EXISTS idx_tasks_completion_status;
DROP INDEX IF EXISTS idx_tasks_approved_at;
```
