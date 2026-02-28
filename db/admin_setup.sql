-- ============================================
-- Admin Setup - Fixed Version (v2)
-- Run this in Supabase SQL Editor
-- ============================================

-- 0. Create user_profiles table (stores emails for admin visibility)
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT NOT NULL,
    last_seen TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can manage their own profile
DROP POLICY IF EXISTS "Users can manage their own profile" ON user_profiles;
CREATE POLICY "Users can manage their own profile" ON user_profiles
    FOR ALL USING (
        auth.uid() = user_id 
        OR 
        auth.jwt() ->> 'email' = 'shaharsolutions@gmail.com'
    ) WITH CHECK (auth.uid() = user_id);

-- 1. Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    user_email TEXT NOT NULL,
    login_time TIMESTAMPTZ DEFAULT NOW(),
    logout_time TIMESTAMPTZ,
    last_active TIMESTAMPTZ DEFAULT NOW(),
    duration_minutes INTEGER DEFAULT 0
);

-- 2. Enable RLS on user_sessions
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- 3. user_sessions policies
DROP POLICY IF EXISTS "Users can insert their own sessions" ON user_sessions;
CREATE POLICY "Users can insert their own sessions" ON user_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own sessions" ON user_sessions;
CREATE POLICY "Users can update their own sessions" ON user_sessions
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin can read all sessions" ON user_sessions;
CREATE POLICY "Admin can read all sessions" ON user_sessions
    FOR SELECT USING (
        auth.uid() = user_id 
        OR 
        auth.jwt() ->> 'email' = 'shaharsolutions@gmail.com'
    );

-- 4. FIX: Restore clients policy (use jwt instead of subquery)
DROP POLICY IF EXISTS "Users can manage their own clients" ON clients;
CREATE POLICY "Users can manage their own clients" ON clients
    FOR ALL USING (
        auth.uid() = user_id 
        OR 
        auth.jwt() ->> 'email' = 'shaharsolutions@gmail.com'
    ) WITH CHECK (auth.uid() = user_id);

-- 5. FIX: Restore projects policy
DROP POLICY IF EXISTS "Users can manage their own projects" ON projects;
CREATE POLICY "Users can manage their own projects" ON projects
    FOR ALL USING (
        auth.uid() = user_id 
        OR 
        auth.jwt() ->> 'email' = 'shaharsolutions@gmail.com'
    ) WITH CHECK (auth.uid() = user_id);

-- 6. FIX: Restore action_logs policy
DROP POLICY IF EXISTS "Users can manage their own action logs" ON action_logs;
CREATE POLICY "Users can manage their own action logs" ON action_logs
    FOR ALL USING (
        auth.uid() = user_id 
        OR 
        auth.jwt() ->> 'email' = 'shaharsolutions@gmail.com'
    ) WITH CHECK (auth.uid() = user_id);

-- 7. Restore other policies that were NOT broken (just in case)
DROP POLICY IF EXISTS "Users can manage their own packages" ON packages;
CREATE POLICY "Users can manage their own packages" ON packages
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own notes" ON notes;
CREATE POLICY "Users can manage their own notes" ON notes
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own checklists" ON project_checklists;
CREATE POLICY "Users can manage their own checklists" ON project_checklists
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own locations" ON locations;
CREATE POLICY "Users can manage their own locations" ON locations
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
