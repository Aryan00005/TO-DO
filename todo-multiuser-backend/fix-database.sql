-- Fix database schema for authentication issues
-- Run this in your Supabase SQL editor

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add google_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'google_id') THEN
        ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE;
        CREATE INDEX idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
    END IF;
    
    -- Add email_verified column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'email_verified') THEN
        ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Update existing users to have proper account status
UPDATE users 
SET account_status = 'active' 
WHERE account_status IS NULL AND user_id IS NOT NULL AND password IS NOT NULL;

UPDATE users 
SET account_status = 'incomplete' 
WHERE (user_id IS NULL OR password IS NULL) AND auth_provider = 'google';

-- Clean up any duplicate or problematic records
-- Remove users with no email (shouldn't exist but just in case)
DELETE FROM users WHERE email IS NULL OR email = '';

-- Show current user status for debugging
SELECT 
    id,
    name,
    email,
    user_id,
    CASE WHEN password IS NOT NULL THEN 'HAS_PASSWORD' ELSE 'NO_PASSWORD' END as password_status,
    auth_provider,
    account_status,
    google_id,
    created_at
FROM users 
ORDER BY created_at DESC;