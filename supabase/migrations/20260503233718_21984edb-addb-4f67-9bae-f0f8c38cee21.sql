
CREATE TABLE public.crew_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL,
  name text NOT NULL DEFAULT '',
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.crew_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view crew members"
  ON public.crew_members FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Company members can insert crew members"
  ON public.crew_members FOR INSERT TO authenticated
  WITH CHECK (public.is_company_member(auth.uid(), company_id) AND created_by = auth.uid());

CREATE POLICY "Company members can update crew members"
  ON public.crew_members FOR UPDATE TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Company members can delete crew members"
  ON public.crew_members FOR DELETE TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));
