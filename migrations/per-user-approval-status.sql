-- ============================================================
-- SAFE MIGRATION: per-user approval_status on task_assignments
-- Run entirely in Supabase SQL editor as one block.
-- Safe to re-run (all statements are idempotent).
-- ============================================================

BEGIN;

-- Step 1: Add column with DEFAULT 'approved'
-- WHY 'approved' not 'pending':
--   Active tasks (Not Started / Working on it / Stuck) must remain visible.
--   Only Done tasks waiting for creator sign-off are 'pending'.
--   A wrong default of 'pending' would hide all active tasks the moment
--   the column exists but before backfill completes.
ALTER TABLE task_assignments
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'approved';

-- Step 2: For assignments where the task is Done AND task-level approval is pending,
--         copy that pending state into the assignment row.
--         All other rows keep the safe default 'approved'.
UPDATE task_assignments ta
SET approval_status = 'pending'
FROM tasks t
WHERE ta.task_id = t.id
  AND ta.status = 'Done'
  AND t.approval_status = 'pending';

-- Step 3: For assignments where the task is Done AND task-level approval is rejected,
--         copy that rejected state so the rejection reason still shows.
UPDATE task_assignments ta
SET approval_status = 'rejected'
FROM tasks t
WHERE ta.task_id = t.id
  AND t.approval_status = 'rejected';

COMMIT;

-- ============================================================
-- ROLLBACK SCRIPT (keep this, run if anything breaks):
-- ALTER TABLE task_assignments DROP COLUMN IF EXISTS approval_status;
-- ============================================================
