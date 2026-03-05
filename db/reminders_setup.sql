-- ============================================
-- Add Reminder Settings to user_profiles
-- ============================================

-- 1. Add reminder columns
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'user_profiles' AND COLUMN_NAME = 'reminders_enabled') THEN
        ALTER TABLE user_profiles ADD COLUMN reminders_enabled BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'user_profiles' AND COLUMN_NAME = 'reminders_email') THEN
        ALTER TABLE user_profiles ADD COLUMN reminders_email TEXT DEFAULT 'shaharsolutions@gmail.com';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'user_profiles' AND COLUMN_NAME = 'reminders_config') THEN
        ALTER TABLE user_profiles ADD COLUMN reminders_config JSONB DEFAULT '{"before_shoot_days": 2, "after_shoot_days": 1}';
    END IF;
END $$;
