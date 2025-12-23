-- PostgreSQL Schema for TO-DO App (Supabase)

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    user_id VARCHAR(100) UNIQUE,
    password VARCHAR(255),
    auth_provider VARCHAR(20) DEFAULT 'local',
    account_status VARCHAR(20) DEFAULT 'active',
    reset_token VARCHAR(255),
    reset_token_expiry TIMESTAMP,
    reset_attempts INTEGER DEFAULT 0,
    last_reset_attempt TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tasks table
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'Not Started',
    assigned_by INTEGER REFERENCES users(id),
    priority INTEGER DEFAULT 3,
    due_date DATE,
    company VARCHAR(255),
    stuck_reason TEXT,
    completion_remark TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Task assignments
CREATE TABLE task_assignments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'Not Started',
    completion_remark TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_user_id ON users(user_id);
CREATE INDEX idx_tasks_assigned_by ON tasks(assigned_by);
CREATE INDEX idx_task_assignments_task_id ON task_assignments(task_id);
CREATE INDEX idx_task_assignments_user_id ON task_assignments(user_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can view assigned tasks" ON tasks FOR SELECT USING (
    assigned_by = (SELECT id FROM users WHERE user_id = auth.uid()::text) OR
    id IN (SELECT task_id FROM task_assignments WHERE user_id = (SELECT id FROM users WHERE user_id = auth.uid()::text))
);

CREATE POLICY "Users can create tasks" ON tasks FOR INSERT WITH CHECK (assigned_by = (SELECT id FROM users WHERE user_id = auth.uid()::text));
CREATE POLICY "Task creators can update tasks" ON tasks FOR UPDATE USING (assigned_by = (SELECT id FROM users WHERE user_id = auth.uid()::text));

CREATE POLICY "Users can view own assignments" ON task_assignments FOR SELECT USING (user_id = (SELECT id FROM users WHERE user_id = auth.uid()::text));
CREATE POLICY "Users can update own assignments" ON task_assignments FOR UPDATE USING (user_id = (SELECT id FROM users WHERE user_id = auth.uid()::text));

CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (user_id = (SELECT id FROM users WHERE user_id = auth.uid()::text));
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (user_id = (SELECT id FROM users WHERE user_id = auth.uid()::text));