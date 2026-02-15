-- SQL script to fix permissive RLS policies and improve database security

-- 1. Drop Permissive Policies (OR-ed policies that bypass security)
-- These were identified by the Supabase Linter

-- Table: public.clients
DROP POLICY IF EXISTS "Allow delete for everyone" ON public.clients;
DROP POLICY IF EXISTS "Allow update for everyone" ON public.clients;

-- Table: public.locations
DROP POLICY IF EXISTS "Allow all operations on locations" ON public.locations;

-- Table: public.notes
DROP POLICY IF EXISTS "Allow all for everyone" ON public.notes;

-- Table: public.projects
DROP POLICY IF EXISTS "Allow delete for everyone" ON public.projects;
DROP POLICY IF EXISTS "Allow update for everyone" ON public.projects;

-- 2. Ensure Secure Policies Exist
-- These policies ensure that users can ONLY access and modify their own data

-- Clients
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clients' AND policyname = 'Users can manage their own clients') THEN
        CREATE POLICY "Users can manage their own clients" ON public.clients
            FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Projects
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND policyname = 'Users can manage their own projects') THEN
        CREATE POLICY "Users can manage their own projects" ON public.projects
            FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Locations
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'locations' AND policyname = 'Users can manage their own locations') THEN
        CREATE POLICY "Users can manage their own locations" ON public.locations
            FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Notes
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notes' AND policyname = 'Users can manage their own notes') THEN
        CREATE POLICY "Users can manage their own notes" ON public.notes
            FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- 3. Verify RLS is enabled on all tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_checklists ENABLE ROW LEVEL SECURITY;

-- Note: The "Leaked Password Protection" warning needs to be addressed in the 
-- Supabase Dashboard under Authentication -> Password Protection.
