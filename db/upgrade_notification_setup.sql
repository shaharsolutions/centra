-- Add column to track if an upgrade notification should be shown to the user
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'user_profiles' AND COLUMN_NAME = 'show_upgrade_notification') THEN
        ALTER TABLE user_profiles ADD COLUMN show_upgrade_notification BOOLEAN DEFAULT FALSE;
    END IF;
END $$;
