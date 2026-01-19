-- Add shared status column to tasks table
ALTER TABLE tasks ADD COLUMN status VARCHAR(50) DEFAULT 'Not Started';

-- Update existing tasks to have default status
UPDATE tasks SET status = 'Not Started' WHERE status IS NULL;