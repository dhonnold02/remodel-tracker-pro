-- Set default for created_by to auth.uid() so RLS policy is always satisfied
ALTER TABLE public.projects ALTER COLUMN created_by SET DEFAULT auth.uid();