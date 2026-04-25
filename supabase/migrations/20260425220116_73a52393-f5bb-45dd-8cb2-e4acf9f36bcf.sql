-- Create project_events table for calendar events on dates
CREATE TABLE public.project_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'other',
  date TEXT NOT NULL,
  time TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.project_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view project events"
  ON public.project_events FOR SELECT TO authenticated
  USING (is_project_member(auth.uid(), project_id));

CREATE POLICY "Editors can insert project events"
  ON public.project_events FOR INSERT TO authenticated
  WITH CHECK (is_project_editor(auth.uid(), project_id));

CREATE POLICY "Editors can update project events"
  ON public.project_events FOR UPDATE TO authenticated
  USING (is_project_editor(auth.uid(), project_id));

CREATE POLICY "Editors can delete project events"
  ON public.project_events FOR DELETE TO authenticated
  USING (is_project_editor(auth.uid(), project_id));

CREATE INDEX idx_project_events_project_date ON public.project_events(project_id, date);

ALTER PUBLICATION supabase_realtime ADD TABLE public.project_events;