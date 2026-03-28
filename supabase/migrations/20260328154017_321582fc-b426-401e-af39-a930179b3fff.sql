-- Add FK from project_members.user_id to profiles.id so PostgREST can resolve the join
ALTER TABLE public.project_members
  ADD CONSTRAINT project_members_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add unique constraint on project_members to prevent duplicate memberships
ALTER TABLE public.project_members
  ADD CONSTRAINT project_members_project_user_unique UNIQUE (project_id, user_id);

-- Enable realtime for tables not already in publication
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'tasks') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'photos') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.photos;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'blueprints') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.blueprints;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'change_orders') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.change_orders;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'project_members') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.project_members;
  END IF;
END$$;