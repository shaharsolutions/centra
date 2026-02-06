-- Create action_logs table for audit trail
CREATE TABLE IF NOT EXISTS action_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    action TEXT NOT NULL,
    details TEXT,
    entity_type TEXT,
    entity_id TEXT
);

-- Add index for performance on recent logs
CREATE INDEX IF NOT EXISTS idx_action_logs_created_at ON action_logs (created_at DESC);
