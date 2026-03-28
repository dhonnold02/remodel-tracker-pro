
-- Add address column to projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS address text NOT NULL DEFAULT '';

-- Create invoices table
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by uuid,
  type text NOT NULL DEFAULT 'homeowner',
  description text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  paid boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view invoices" ON public.invoices FOR SELECT TO authenticated USING (is_project_member(auth.uid(), project_id));
CREATE POLICY "Editors can insert invoices" ON public.invoices FOR INSERT TO authenticated WITH CHECK (is_project_editor(auth.uid(), project_id));
CREATE POLICY "Editors can update invoices" ON public.invoices FOR UPDATE TO authenticated USING (is_project_editor(auth.uid(), project_id));
CREATE POLICY "Editors can delete invoices" ON public.invoices FOR DELETE TO authenticated USING (is_project_editor(auth.uid(), project_id));

-- Enable realtime for invoices
ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;
