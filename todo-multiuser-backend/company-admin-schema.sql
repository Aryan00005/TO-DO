-- Add company admin fields to existing schema
ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user';
ALTER TABLE users ADD COLUMN company VARCHAR(255);

-- Update existing users to have 'user' role
UPDATE users SET role = 'user' WHERE role IS NULL;

-- Create index for role and company
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_company ON users(company);

-- Update tasks table to ensure company field exists
-- (This might already exist, but adding for safety)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS company VARCHAR(255);