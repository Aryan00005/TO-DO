-- Run this SQL in your Supabase SQL Editor

-- Add role column
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';

-- Add company column  
ALTER TABLE users ADD COLUMN IF NOT EXISTS company VARCHAR(255);

-- Update existing users to have 'user' role
UPDATE users SET role = 'user' WHERE role IS NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company);