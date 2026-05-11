-- Create public storage bucket for template cover images

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'template-covers',
  'template-covers',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view template covers"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'template-covers');

CREATE POLICY "Authenticated users can upload template covers"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'template-covers');

CREATE POLICY "Authenticated users can update template covers"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'template-covers');

CREATE POLICY "Authenticated users can delete template covers"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'template-covers');
