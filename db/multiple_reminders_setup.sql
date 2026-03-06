-- Add reminders JSONB column to project_checklists table
ALTER TABLE project_checklists ADD COLUMN IF NOT EXISTS reminders JSONB DEFAULT '[]';

-- Add project_workflow_config JSONB column to projects table to allow project-specific overrides
ALTER TABLE projects ADD COLUMN IF NOT EXISTS workflow_config JSONB;
