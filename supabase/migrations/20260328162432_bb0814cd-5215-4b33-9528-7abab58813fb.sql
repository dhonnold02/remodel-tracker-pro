ALTER TABLE public.tasks ADD COLUMN parent_task_id uuid DEFAULT NULL REFERENCES public.tasks(id) ON DELETE CASCADE;

CREATE INDEX idx_tasks_parent_task_id ON public.tasks(parent_task_id);