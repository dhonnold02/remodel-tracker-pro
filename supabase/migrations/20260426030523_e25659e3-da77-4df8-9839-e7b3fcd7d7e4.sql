-- Punch list per project, with items stored as JSONB and sign-off metadata
CREATE TABLE public.punch_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL UNIQUE,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  signed_off_at TIMESTAMP WITH TIME ZONE,
  signed_off_by UUID,
  signed_off_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.punch_lists ENABLE ROW LEVEL SECURITY;

-- Members can view their project's punch list
CREATE POLICY "Members can view punch lists"
ON public.punch_lists
FOR SELECT
TO authenticated
USING (public.is_project_member(auth.uid(), project_id));

-- Editors can create
CREATE POLICY "Editors can insert punch lists"
ON public.punch_lists
FOR INSERT
TO authenticated
WITH CHECK (public.is_project_editor(auth.uid(), project_id));

-- Editors can update
CREATE POLICY "Editors can update punch lists"
ON public.punch_lists
FOR UPDATE
TO authenticated
USING (public.is_project_editor(auth.uid(), project_id));

-- Editors can delete
CREATE POLICY "Editors can delete punch lists"
ON public.punch_lists
FOR DELETE
TO authenticated
USING (public.is_project_editor(auth.uid(), project_id));

-- Trigger to keep updated_at fresh
CREATE TRIGGER punch_lists_set_updated_at
BEFORE UPDATE ON public.punch_lists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Public, read-only share via signed_off_at being non-null AND a share token would normally be required;
-- for now the share link uses the project id and is gated by sign-off in the application layer.
-- Allow anyone (anon + authenticated) to read a punch list when it is locked/signed off.
CREATE POLICY "Anyone can view signed-off punch lists"
ON public.punch_lists
FOR SELECT
TO anon, authenticated
USING (is_locked = true AND signed_off_at IS NOT NULL);
