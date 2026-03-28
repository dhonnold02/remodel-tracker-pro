
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_name text NOT NULL DEFAULT '',
  action_type text NOT NULL,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view activity logs"
  ON public.activity_logs FOR SELECT TO authenticated
  USING (is_project_member(auth.uid(), project_id));

CREATE POLICY "Editors can insert activity logs"
  ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (is_project_editor(auth.uid(), project_id));

ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
