-- Project templates table
CREATE TABLE public.project_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  total_budget numeric NOT NULL DEFAULT 0,
  labor_costs numeric NOT NULL DEFAULT 0,
  material_costs numeric NOT NULL DEFAULT 0,
  tasks jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own templates" ON public.project_templates
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Branding preferences on profiles
ALTER TABLE public.profiles ADD COLUMN brand_color text DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN brand_logo_url text DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN brand_name text DEFAULT NULL;