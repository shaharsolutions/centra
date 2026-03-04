-- ============================================
-- Update Profiles to support Packages/Plans
-- ============================================

-- 1. Add plan column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'user_profiles' AND COLUMN_NAME = 'plan') THEN
        ALTER TABLE user_profiles ADD COLUMN plan TEXT DEFAULT 'starter';
    END IF;
END $$;

-- 2. Ensure Admin can update plans
DROP POLICY IF EXISTS "Admin can manage all profiles" ON user_profiles;
CREATE POLICY "Admin can manage all profiles" ON user_profiles
    FOR ALL USING (
        auth.jwt() ->> 'email' = 'shaharsolutions@gmail.com'
    );

-- 3. Ensure users can still read/update their own profile (keeping existing policy but merging)
DROP POLICY IF EXISTS "Users can manage their own profile" ON user_profiles;
CREATE POLICY "Users can manage their own profile" ON user_profiles
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
