-- Run this in your Supabase SQL Editor to fix the typo in existing checklists:

UPDATE public.project_checklists
SET content = 'כרטיסי זיכרון ריקים'
WHERE content = 'מכרטיסי זיכרון ריקים';
