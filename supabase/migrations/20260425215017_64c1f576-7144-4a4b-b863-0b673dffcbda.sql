-- 1. Add author display name to change_orders
ALTER TABLE public.change_orders
  ADD COLUMN IF NOT EXISTS created_by_name text NOT NULL DEFAULT '';

-- 2. Threaded comments table
CREATE TABLE IF NOT EXISTS public.change_order_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  change_order_id uuid NOT NULL REFERENCES public.change_orders(id) ON DELETE CASCADE,
  project_id uuid NOT NULL,
  text text NOT NULL DEFAULT '',
  created_by uuid,
  created_by_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS change_order_comments_change_order_id_idx
  ON public.change_order_comments(change_order_id);
CREATE INDEX IF NOT EXISTS change_order_comments_project_id_idx
  ON public.change_order_comments(project_id);

ALTER TABLE public.change_order_comments ENABLE ROW LEVEL SECURITY;

-- View: project members
CREATE POLICY "Members can view change order comments"
  ON public.change_order_comments FOR SELECT
  TO authenticated
  USING (public.is_project_member(auth.uid(), project_id));

-- Insert: project editors, must be themselves as author
CREATE POLICY "Editors can insert change order comments"
  ON public.change_order_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_project_editor(auth.uid(), project_id)
    AND created_by = auth.uid()
  );

-- Update: only the comment author
CREATE POLICY "Authors can update their comments"
  ON public.change_order_comments FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

-- Delete: comment author OR a project editor
CREATE POLICY "Authors or editors can delete comments"
  ON public.change_order_comments FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_project_editor(auth.uid(), project_id)
  );

-- 3. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.change_order_comments;