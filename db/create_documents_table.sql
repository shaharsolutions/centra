-- Create client_documents table for storing document metadata
CREATE TABLE IF NOT EXISTS client_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT DEFAULT 0,
    file_type TEXT DEFAULT 'application/octet-stream',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only manage their own documents
DROP POLICY IF EXISTS "Users can manage their own documents" ON client_documents;
CREATE POLICY "Users can manage their own documents" ON client_documents
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_client_documents_client_id ON client_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_project_id ON client_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_user_id ON client_documents(user_id);

-- ============================================================
-- Supabase Storage Setup (run from the Supabase Dashboard > Storage)
-- ============================================================
-- 1. Create a new bucket named "client-documents" (Private)
-- 2. Add these Storage Policies:
--
-- INSERT Policy (allow uploads):
--   Name: "Users can upload their own documents"
--   Target roles: authenticated
--   Policy: (bucket_id = 'client-documents') AND ((storage.foldername(name))[1] = auth.uid()::text)
--
-- SELECT Policy (allow downloads):
--   Name: "Users can download their own documents"
--   Target roles: authenticated
--   Policy: (bucket_id = 'client-documents') AND ((storage.foldername(name))[1] = auth.uid()::text)
--
-- DELETE Policy (allow deletions):
--   Name: "Users can delete their own documents"
--   Target roles: authenticated
--   Policy: (bucket_id = 'client-documents') AND ((storage.foldername(name))[1] = auth.uid()::text)
