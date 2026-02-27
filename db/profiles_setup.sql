-- ============================================
-- Persistent Profiles Setup
-- ============================================

-- 1. Create profiles table to store user identity persistently
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id UUID PRIMARY KEY,
    email TEXT NOT NULL,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 3. Policies
DROP POLICY IF EXISTS "Users can manage their own profile" ON user_profiles;
CREATE POLICY "Users can manage their own profile" ON user_profiles
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin can read all profiles" ON user_profiles;
CREATE POLICY "Admin can read all profiles" ON user_profiles
    FOR SELECT USING (
        auth.jwt() ->> 'email' = 'shaharsolutions@gmail.com'
    );
