-- ============================================
-- Track project reminders to avoid duplicates
-- ============================================

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'projects' AND COLUMN_NAME = 'last_reminder_type') THEN
        ALTER TABLE projects ADD COLUMN last_reminder_type TEXT; -- 'before', 'after', or NULL
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'projects' AND COLUMN_NAME = 'last_reminder_at') THEN
        ALTER TABLE projects ADD COLUMN last_reminder_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;
