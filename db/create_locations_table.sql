-- Create locations table for custom photography locations
CREATE TABLE IF NOT EXISTS locations (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    region TEXT NOT NULL CHECK (region IN ('center', 'north', 'south', 'jerusalem', 'sharon')),
    type TEXT NOT NULL CHECK (type IN ('urban', 'nature', 'beach', 'village')),
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust based on your auth needs)
CREATE POLICY "Allow all operations on locations" ON locations
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_locations_region ON locations(region);
CREATE INDEX IF NOT EXISTS idx_locations_type ON locations(type);
