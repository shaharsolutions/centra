-- Run this in your Supabase SQL Editor to link your old notes to your current user account:

UPDATE public.notes 
SET user_id = (SELECT id FROM auth.users WHERE email = 'shaharsolutions@gmail.com' LIMIT 1) 
WHERE user_id IS NULL OR user_id != (SELECT id FROM auth.users WHERE email = 'shaharsolutions@gmail.com' LIMIT 1);
