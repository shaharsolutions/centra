-- Add missing columns to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'not_paid';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS not_closed_reason TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS subjects_count INTEGER;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS subjects_details TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS shoot_time TIME;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS styling_call TEXT DEFAULT 'none';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS status_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing rows: set status_date to created_at for a more accurate starting point
UPDATE projects SET status_date = created_at WHERE status_date IS NULL;
