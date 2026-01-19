-- Add created_by_admin column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by_admin BOOLEAN DEFAULT FALSE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_created_by_admin ON tasks(created_by_admin);
