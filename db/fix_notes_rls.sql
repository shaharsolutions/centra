-- Run this in your Supabase SQL Editor to fix adding notes:

-- Ensure notes table exists (just in case)
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT NOT NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid()
);

-- Enable RLS
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their own notes" ON public.notes;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.notes;
DROP POLICY IF EXISTS "Enable read for authenticated users only" ON public.notes;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.notes;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.notes;

-- Create correct policies
CREATE POLICY "Users can manage their own notes" ON public.notes
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
