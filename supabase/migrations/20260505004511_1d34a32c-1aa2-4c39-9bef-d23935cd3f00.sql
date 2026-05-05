
-- Timecards
CREATE TABLE public.timecards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  crew_member_id uuid NOT NULL,
  work_date date NOT NULL,
  hours numeric NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, crew_member_id, work_date)
);

ALTER TABLE public.timecards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view timecards"
  ON public.timecards FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Company members can insert timecards"
  ON public.timecards FOR INSERT TO authenticated
  WITH CHECK (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Company members can update timecards"
  ON public.timecards FOR UPDATE TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Company members can delete timecards"
  ON public.timecards FOR DELETE TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

CREATE TRIGGER timecards_updated_at
  BEFORE UPDATE ON public.timecards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Daily log photos
CREATE TABLE public.daily_log_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id uuid NOT NULL,
  company_id uuid NOT NULL,
  photo_url text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_log_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view daily log photos"
  ON public.daily_log_photos FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Company members can insert daily log photos"
  ON public.daily_log_photos FOR INSERT TO authenticated
  WITH CHECK (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Company members can delete daily log photos"
  ON public.daily_log_photos FOR DELETE TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('daily-log-photos', 'daily-log-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Daily log photos are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'daily-log-photos');

CREATE POLICY "Authenticated users can upload daily log photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'daily-log-photos');

CREATE POLICY "Authenticated users can delete their daily log photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'daily-log-photos' AND owner = auth.uid());
