
-- Create storage bucket for channel logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('channel-logos', 'channel-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read channel logos (public bucket)
CREATE POLICY "Public read access for channel logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'channel-logos');

-- Allow authenticated users to upload channel logos
CREATE POLICY "Authenticated users can upload channel logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'channel-logos');

-- Allow authenticated users to update channel logos
CREATE POLICY "Authenticated users can update channel logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'channel-logos');

-- Allow authenticated users to delete channel logos
CREATE POLICY "Authenticated users can delete channel logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'channel-logos');
