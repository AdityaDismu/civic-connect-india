-- Allow a signed-in user to become a municipal admin using the department access code.
CREATE OR REPLACE FUNCTION public.claim_admin_role(_access_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _access_code IS DISTINCT FROM 'CIVIC-ADMIN-2026' THEN
    RETURN false;
  END IF;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (uid, 'ADMIN')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_admin_role(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_admin_role(text) TO authenticated;