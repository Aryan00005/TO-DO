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
