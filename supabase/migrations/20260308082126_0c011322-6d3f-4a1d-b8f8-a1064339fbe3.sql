-- Create storage bucket for order videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('order-videos', 'order-videos', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for order-videos bucket
CREATE POLICY "Authenticated users can upload videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'order-videos');

CREATE POLICY "Users can view own videos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'order-videos');

CREATE POLICY "Users can delete own videos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'order-videos');