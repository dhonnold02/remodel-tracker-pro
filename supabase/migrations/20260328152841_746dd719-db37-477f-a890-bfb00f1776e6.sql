
CREATE OR REPLACE FUNCTION public.find_user_by_email(_email TEXT)
RETURNS TABLE(id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT au.id FROM auth.users au WHERE au.email = _email LIMIT 1;
$$;
