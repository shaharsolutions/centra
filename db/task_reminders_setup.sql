-- Add reminder columns to project_checklists table
ALTER TABLE project_checklists ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT false;
ALTER TABLE project_checklists ADD COLUMN IF NOT EXISTS reminder_days INTEGER DEFAULT 1; -- Days before due date
ALTER TABLE project_checklists ADD COLUMN IF NOT EXISTS last_reminder_at TIMESTAMP WITH TIME ZONE;
