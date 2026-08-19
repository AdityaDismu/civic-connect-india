-- Admin access is granted only by a project owner through Supabase.
-- A shared code can be copied from source or migration history.
DROP FUNCTION IF EXISTS public.claim_admin_role(text);
