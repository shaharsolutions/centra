-- Create action_logs table for audit trail
CREATE TABLE IF NOT EXISTS action_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    action TEXT NOT NULL,
    details TEXT,
    entity_type TEXT,
    entity_id TEXT
);

-- Add user_id column
ALTER TABLE action_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- Enable Row Level Security
ALTER TABLE action_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for action logs
DROP POLICY IF EXISTS "Users can manage their own action logs" ON action_logs;
CREATE POLICY "Users can manage their own action logs" ON action_logs
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Add index for performance on recent logs
CREATE INDEX IF NOT EXISTS idx_action_logs_created_at ON action_logs (created_at DESC);
