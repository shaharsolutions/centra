-- Run this in your Supabase SQL Editor to fix the file downloading:

-- First, ensure the bucket exists and is correct
INSERT INTO storage.buckets (id, name, public) 
VALUES ('client-documents', 'client-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they somehow exist with wrong rules
DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can download their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;

-- Create full policies
CREATE POLICY "Users can upload their own documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'client-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can download their own documents" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'client-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can update their own documents" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'client-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete their own documents" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'client-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

