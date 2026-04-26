-- 1. Fix overly permissive INSERT policy on projects
DROP POLICY IF EXISTS "Authenticated users can create projects" ON public.projects;
CREATE POLICY "Authenticated users can create projects"
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- 2. Make storage buckets private
UPDATE storage.buckets SET public = false WHERE id IN ('brand-logos', 'company-assets');

-- Drop public read policies
DROP POLICY IF EXISTS "Company assets are publicly viewable" ON storage.objects;
DROP POLICY IF EXISTS "Public can view brand logos" ON storage.objects;

-- Add authenticated owner-only read policies
CREATE POLICY "Users can view own brand logos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'brand-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own company assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'company-assets' AND (storage.foldername(name))[1] = auth.uid()::text);