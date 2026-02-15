-- Database migration to enable multi-user support with Row Level Security (RLS)

-- 1. Add user_id column to all tables
ALTER TABLE clients ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE projects ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE packages ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE notes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE action_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE project_checklists ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE locations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- 2. Enable Row Level Security (RLS) on all tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies for each table

-- Clients
DROP POLICY IF EXISTS "Users can manage their own clients" ON clients;
CREATE POLICY "Users can manage their own clients" ON clients
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Projects
DROP POLICY IF EXISTS "Users can manage their own projects" ON projects;
CREATE POLICY "Users can manage their own projects" ON projects
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Packages
DROP POLICY IF EXISTS "Users can manage their own packages" ON packages;
CREATE POLICY "Users can manage their own packages" ON packages
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Notes
DROP POLICY IF EXISTS "Users can manage their own notes" ON notes;
CREATE POLICY "Users can manage their own notes" ON notes
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Action Logs
DROP POLICY IF EXISTS "Users can manage their own action logs" ON action_logs;
CREATE POLICY "Users can manage their own action logs" ON action_logs
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Checklists
DROP POLICY IF EXISTS "Users can manage their own checklists" ON project_checklists;
CREATE POLICY "Users can manage their own checklists" ON project_checklists
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Locations
DROP POLICY IF EXISTS "Users can manage their own locations" ON locations;
CREATE POLICY "Users can manage their own locations" ON locations
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. Update existing rows to belong to the current user (if any, run this after users exist)
-- UPDATE clients SET user_id = auth.uid() WHERE user_id IS NULL;
-- UPDATE projects SET user_id = auth.uid() WHERE user_id IS NULL;
-- UPDATE packages SET user_id = auth.uid() WHERE user_id IS NULL;
-- UPDATE notes SET user_id = auth.uid() WHERE user_id IS NULL;
-- UPDATE action_logs SET user_id = auth.uid() WHERE user_id IS NULL;
-- UPDATE project_checklists SET user_id = auth.uid() WHERE user_id IS NULL;
-- UPDATE locations SET user_id = auth.uid() WHERE user_id IS NULL;
