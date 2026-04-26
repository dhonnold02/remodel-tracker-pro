-- =========================================================
-- 1. company_members
-- =========================================================
CREATE TABLE IF NOT EXISTS public.company_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.company_settings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner','project_manager','field_supervisor','crew','subcontractor')),
  invited_by uuid REFERENCES auth.users(id),
  joined_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_company_members_user_id  ON public.company_members(user_id);
CREATE INDEX IF NOT EXISTS idx_company_members_company  ON public.company_members(company_id);

ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 2. company_invitations
-- =========================================================
CREATE TABLE IF NOT EXISTS public.company_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.company_settings(id) ON DELETE CASCADE,
  invited_email text NOT NULL,
  role text NOT NULL CHECK (role IN ('project_manager','field_supervisor','crew','subcontractor')),
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by uuid REFERENCES auth.users(id),
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_invitations_token   ON public.company_invitations(token);
CREATE INDEX IF NOT EXISTS idx_company_invitations_company ON public.company_invitations(company_id);

ALTER TABLE public.company_invitations ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 3. Helper functions (SECURITY DEFINER to avoid RLS recursion)
-- =========================================================
CREATE OR REPLACE FUNCTION public.is_company_owner(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE user_id = _user_id AND company_id = _company_id AND role = 'owner'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_company_member(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE user_id = _user_id AND company_id = _company_id
  );
$$;

-- =========================================================
-- 4. RLS policies — company_members
-- =========================================================
DROP POLICY IF EXISTS "Members can view their company members" ON public.company_members;
CREATE POLICY "Members can view their company members"
  ON public.company_members FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

DROP POLICY IF EXISTS "Owner or self can insert membership" ON public.company_members;
CREATE POLICY "Owner or self can insert membership"
  ON public.company_members FOR INSERT TO authenticated
  WITH CHECK (
    public.is_company_owner(auth.uid(), company_id)
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Owner can update membership" ON public.company_members;
CREATE POLICY "Owner can update membership"
  ON public.company_members FOR UPDATE TO authenticated
  USING (public.is_company_owner(auth.uid(), company_id));

DROP POLICY IF EXISTS "Owner can remove membership" ON public.company_members;
CREATE POLICY "Owner can remove membership"
  ON public.company_members FOR DELETE TO authenticated
  USING (public.is_company_owner(auth.uid(), company_id));

-- =========================================================
-- 5. RLS policies — company_invitations
--    (Owners manage; any signed-in user can look up by token to accept.)
-- =========================================================
DROP POLICY IF EXISTS "Members view company invitations" ON public.company_invitations;
CREATE POLICY "Members view company invitations"
  ON public.company_invitations FOR SELECT TO authenticated
  USING (
    public.is_company_member(auth.uid(), company_id)
    OR (accepted_at IS NULL AND expires_at > now())
  );

DROP POLICY IF EXISTS "Owner can create invitations" ON public.company_invitations;
CREATE POLICY "Owner can create invitations"
  ON public.company_invitations FOR INSERT TO authenticated
  WITH CHECK (public.is_company_owner(auth.uid(), company_id));

DROP POLICY IF EXISTS "Owner or invitee can update invitation" ON public.company_invitations;
CREATE POLICY "Owner or invitee can update invitation"
  ON public.company_invitations FOR UPDATE TO authenticated
  USING (public.is_company_owner(auth.uid(), company_id) OR auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Owner can delete invitations" ON public.company_invitations;
CREATE POLICY "Owner can delete invitations"
  ON public.company_invitations FOR DELETE TO authenticated
  USING (public.is_company_owner(auth.uid(), company_id));

-- =========================================================
-- 6. Backfill existing company_settings owners
-- =========================================================
INSERT INTO public.company_members (company_id, user_id, role)
SELECT cs.id, cs.user_id, 'owner'
FROM public.company_settings cs
WHERE NOT EXISTS (
  SELECT 1 FROM public.company_members cm
  WHERE cm.company_id = cs.id AND cm.user_id = cs.user_id
);
