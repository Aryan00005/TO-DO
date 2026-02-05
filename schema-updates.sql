-- Schema updates for task management system improvements

-- Add missing columns to tasks table if they don't exist
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'approved';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_by_role VARCHAR(20) DEFAULT 'user';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_to_role VARCHAR(20) DEFAULT 'user';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by_admin BOOLEAN DEFAULT FALSE;

-- Add inactive status support to users table
-- Update account_status check constraint to include 'inactive'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_account_status_check;
ALTER TABLE users ADD CONSTRAINT users_account_status_check 
  CHECK (account_status IN ('active', 'inactive', 'pending', 'rejected'));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_approval_status ON tasks(approval_status);
CREATE INDEX IF NOT EXISTS idx_tasks_company ON tasks(company);
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company);

-- Update existing tasks to have proper approval status
UPDATE tasks SET approval_status = 'approved' WHERE approval_status IS NULL;

-- Update existing tasks with role information based on creator
UPDATE tasks SET 
  assigned_by_role = (
    SELECT CASE WHEN role = 'admin' THEN 'admin' ELSE 'user' END 
    FROM users WHERE users.id = tasks.assigned_by
  )
WHERE assigned_by_role IS NULL OR assigned_by_role = 'user';

-- Set created_by_admin flag for existing admin tasks
UPDATE tasks SET created_by_admin = TRUE 
WHERE assigned_by IN (SELECT id FROM users WHERE role = 'admin');