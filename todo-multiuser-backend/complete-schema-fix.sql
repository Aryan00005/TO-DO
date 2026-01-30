-- Complete database schema fixes for task management system

-- First, let's check and add missing columns to tasks table
DO $$ 
BEGIN
    -- Add approval_status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='approval_status') THEN
        ALTER TABLE tasks ADD COLUMN approval_status VARCHAR(20) DEFAULT 'approved';
    END IF;
    
    -- Add assigned_by_role column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='assigned_by_role') THEN
        ALTER TABLE tasks ADD COLUMN assigned_by_role VARCHAR(20) DEFAULT 'user';
    END IF;
    
    -- Add assigned_to_role column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='assigned_to_role') THEN
        ALTER TABLE tasks ADD COLUMN assigned_to_role VARCHAR(20) DEFAULT 'user';
    END IF;
    
    -- Add created_by_admin column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='created_by_admin') THEN
        ALTER TABLE tasks ADD COLUMN created_by_admin BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Update users table constraint to include 'inactive' status
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_account_status_check;
ALTER TABLE users ADD CONSTRAINT users_account_status_check 
  CHECK (account_status IN ('active', 'inactive', 'pending', 'rejected'));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_approval_status ON tasks(approval_status);
CREATE INDEX IF NOT EXISTS idx_tasks_company ON tasks(company);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_by ON tasks(assigned_by);
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_user_id ON task_assignments(user_id);

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

-- Ensure all users have a company assigned (for existing data)
UPDATE users SET company = 'DefaultCompany' 
WHERE company IS NULL AND role != 'super_admin';

-- Clean up any orphaned task assignments
DELETE FROM task_assignments 
WHERE task_id NOT IN (SELECT id FROM tasks) 
   OR user_id NOT IN (SELECT id FROM users);

-- Clean up any orphaned notifications
DELETE FROM notifications 
WHERE user_id NOT IN (SELECT id FROM users);

-- Update notification structure to ensure consistency
UPDATE notifications SET is_read = FALSE WHERE is_read IS NULL;

COMMIT;