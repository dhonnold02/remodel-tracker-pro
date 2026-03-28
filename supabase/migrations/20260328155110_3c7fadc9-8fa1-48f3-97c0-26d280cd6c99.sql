-- Drop the existing restrictive insert policy
DROP POLICY "Authenticated users can create projects" ON public.projects;

-- Create a new insert policy that just requires authentication
-- The created_by field will be set by the client code
CREATE POLICY "Authenticated users can create projects"
  ON public.projects
  FOR INSERT
  TO authenticated
  WITH CHECK (true);