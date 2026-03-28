
-- Create storage bucket for brand logos
INSERT INTO storage.buckets (id, name, public) VALUES ('brand-logos', 'brand-logos', true);

-- Allow authenticated users to upload their own logos
CREATE POLICY "Users can upload brand logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'brand-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to update their own logos
CREATE POLICY "Users can update own brand logos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'brand-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to delete their own logos
CREATE POLICY "Users can delete own brand logos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'brand-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow public read access for brand logos
CREATE POLICY "Public can view brand logos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'brand-logos');
