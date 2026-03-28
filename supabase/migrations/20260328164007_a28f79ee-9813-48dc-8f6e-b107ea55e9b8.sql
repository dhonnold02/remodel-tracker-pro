ALTER TABLE public.tasks ADD COLUMN priority text NOT NULL DEFAULT 'medium';
ALTER TABLE public.tasks ADD COLUMN tags text[] NOT NULL DEFAULT '{}';