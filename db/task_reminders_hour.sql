-- Add reminder_hour column to project_checklists table
ALTER TABLE project_checklists ADD COLUMN IF NOT EXISTS reminder_hour TEXT DEFAULT '08:00';
