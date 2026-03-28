-- Fix the chicken-and-egg: allow users to add themselves as the first member
-- Drop existing insert policy
DROP POLICY "Editors can add project members" ON public.project_members;

-- New policy: editors can add members, OR user can add themselves to a project they created
CREATE POLICY "Can add project members"
  ON public.project_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_project_editor(auth.uid(), project_id)
    OR (user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.projects WHERE id = project_id AND created_by = auth.uid()
    ))
  );