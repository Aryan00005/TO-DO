-- Add approval system fields to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'approved';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_by_role VARCHAR(20);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_to_role VARCHAR(20);

-- Update existing tasks to have approved status
UPDATE tasks SET approval_status = 'approved' WHERE approval_status IS NULL;

-- Add index for approval status
CREATE INDEX IF NOT EXISTS idx_tasks_approval_status ON tasks(approval_status);