CREATE TABLE public.command_center_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL,
  week_start_date date NOT NULL,
  notes text NOT NULL DEFAULT '',
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (company_id, week_start_date)
);

ALTER TABLE public.command_center_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view weekly notes"
ON public.command_center_notes FOR SELECT TO authenticated
USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Company members can insert weekly notes"
ON public.command_center_notes FOR INSERT TO authenticated
WITH CHECK (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Company members can update weekly notes"
ON public.command_center_notes FOR UPDATE TO authenticated
USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Company members can delete weekly notes"
ON public.command_center_notes FOR DELETE TO authenticated
USING (public.is_company_member(auth.uid(), company_id));

CREATE TRIGGER update_command_center_notes_updated_at
BEFORE UPDATE ON public.command_center_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();