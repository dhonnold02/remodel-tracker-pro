-- Allow project creators to see their own projects (needed for insert...select pattern)
CREATE POLICY "Creators can view own projects"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());