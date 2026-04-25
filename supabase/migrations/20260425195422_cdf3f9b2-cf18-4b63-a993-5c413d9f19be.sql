-- Add phase grouping to tasks (Kanban workflow)
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS phase text NOT NULL DEFAULT 'General';

-- Add ordered phase list per project (for add/rename/reorder)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS task_phases text[] NOT NULL DEFAULT ARRAY['Demo','Framing','Electrical','Plumbing','Finish']::text[];

-- Index to speed up phase-based queries
CREATE INDEX IF NOT EXISTS idx_tasks_project_phase ON public.tasks(project_id, phase);