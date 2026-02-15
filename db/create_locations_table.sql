-- Create locations table for custom photography locations
CREATE TABLE IF NOT EXISTS locations (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    region TEXT NOT NULL CHECK (region IN ('center', 'north', 'south', 'jerusalem', 'sharon')),
    type TEXT NOT NULL CHECK (type IN ('urban', 'nature', 'beach', 'village')),
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add user_id column for multi-user support
ALTER TABLE locations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- Enable Row Level Security
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to manage ONLY their own locations
DROP POLICY IF EXISTS "Allow all operations on locations" ON locations;
DROP POLICY IF EXISTS "Users can manage their own locations" ON locations;
CREATE POLICY "Users can manage their own locations" ON locations
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_locations_region ON locations(region);
CREATE INDEX IF NOT EXISTS idx_locations_type ON locations(type);
