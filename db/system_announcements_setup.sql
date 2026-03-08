-- System Announcements Schema

CREATE TABLE IF NOT EXISTS public.system_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS for system_announcements
ALTER TABLE public.system_announcements ENABLE ROW LEVEL SECURITY;

-- Allow all users to read active announcements
DROP POLICY IF EXISTS "Allow users to read active announcements" ON public.system_announcements;
CREATE POLICY "Allow users to read active announcements" 
ON public.system_announcements FOR SELECT 
USING (is_active = true OR current_setting('request.jwt.claims', true)::json->>'email' = 'shaharsolutions@gmail.com');

-- Allow admins to insert/update/delete
DROP POLICY IF EXISTS "Allow admin full access" ON public.system_announcements;
CREATE POLICY "Allow admin full access" 
ON public.system_announcements FOR ALL 
USING (current_setting('request.jwt.claims', true)::json->>'email' = 'shaharsolutions@gmail.com');

CREATE TABLE IF NOT EXISTS public.system_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    user_email TEXT,
    content TEXT NOT NULL,
    announcement_id UUID REFERENCES public.system_announcements(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS for feedback
ALTER TABLE public.system_feedback ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own feedback
DROP POLICY IF EXISTS "Users can insert feedback" ON public.system_feedback;
CREATE POLICY "Users can insert feedback" 
ON public.system_feedback FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow admins to read feedback
DROP POLICY IF EXISTS "Admin can read feedback" ON public.system_feedback;
CREATE POLICY "Admin can read feedback" 
ON public.system_feedback FOR SELECT 
USING (current_setting('request.jwt.claims', true)::json->>'email' = 'shaharsolutions@gmail.com');

-- Add tracking columns to profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS last_seen_announcement_id UUID,
ADD COLUMN IF NOT EXISTS seen_announcement_at TIMESTAMP WITH TIME ZONE;
