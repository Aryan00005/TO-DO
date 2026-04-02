-- Run this in Supabase SQL editor

ALTER TABLE task_assignments
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Not Started',
  ADD COLUMN IF NOT EXISTS stuck_reason TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Seed existing assignments with current task-level status
UPDATE task_assignments ta
SET status = t.status
FROM tasks t
WHERE ta.task_id = t.id;
