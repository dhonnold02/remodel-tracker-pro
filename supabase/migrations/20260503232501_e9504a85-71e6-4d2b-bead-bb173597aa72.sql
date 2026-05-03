-- Create crew_dispatch table
CREATE TABLE public.crew_dispatch (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid NOT NULL,
  member_id uuid NOT NULL,
  project_id uuid,
  dispatch_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, member_id, dispatch_date)
);

ALTER TABLE public.crew_dispatch ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view crew dispatch"
  ON public.crew_dispatch FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Company members can insert crew dispatch"
  ON public.crew_dispatch FOR INSERT TO authenticated
  WITH CHECK (public.is_company_member(auth.uid(), company_id) AND user_id = auth.uid());

CREATE POLICY "Company members can update crew dispatch"
  ON public.crew_dispatch FOR UPDATE TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Company members can delete crew dispatch"
  ON public.crew_dispatch FOR DELETE TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

CREATE TRIGGER update_crew_dispatch_updated_at
  BEFORE UPDATE ON public.crew_dispatch
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create daily_logs table
CREATE TABLE public.daily_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL,
  log_date date NOT NULL,
  notes text NOT NULL DEFAULT '',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view daily logs"
  ON public.daily_logs FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Company members can insert daily logs"
  ON public.daily_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_company_member(auth.uid(), company_id) AND created_by = auth.uid());

CREATE POLICY "Company members can update daily logs"
  ON public.daily_logs FOR UPDATE TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Company members can delete daily logs"
  ON public.daily_logs FOR DELETE TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

CREATE TRIGGER update_daily_logs_updated_at
  BEFORE UPDATE ON public.daily_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_crew_dispatch_company_date ON public.crew_dispatch(company_id, dispatch_date);
CREATE INDEX idx_daily_logs_company_date ON public.daily_logs(company_id, log_date DESC);