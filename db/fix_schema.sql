-- Add missing columns to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'not_paid';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS not_closed_reason TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS subjects_count INTEGER;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS subjects_details TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS shoot_time TIME;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS styling_call TEXT DEFAULT 'none';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS publication_approval BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS status_date TIMESTAMPTZ DEFAULT now();

-- Add missing columns to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS organization TEXT;

-- Add missing columns to project_checklists table
ALTER TABLE project_checklists ADD COLUMN IF NOT EXISTS notes TEXT;

-- Ensure all tables have user_id and RLS (for safety)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='user_id') THEN
        ALTER TABLE projects ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
    END IF;
END $$;

-- Refresh the schema cache in Supabase after running this!
