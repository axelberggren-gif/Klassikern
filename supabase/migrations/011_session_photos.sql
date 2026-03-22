-- Migration: Add photo support to training sessions
-- Photos are stored in Supabase Storage, URL reference saved on the session row

-- 1. Add photo_url column to sessions table
ALTER TABLE sessions ADD COLUMN photo_url TEXT;

-- 2. Create storage bucket for session photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('session-photos', 'session-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage policies: authenticated users can upload to their own folder
CREATE POLICY "Users can upload their own session photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'session-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow anyone to view session photos (bucket is public)
CREATE POLICY "Session photos are publicly viewable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'session-photos');

-- Allow users to delete their own photos
CREATE POLICY "Users can delete their own session photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'session-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Notify PostgREST of schema change
NOTIFY pgrst, 'reload schema';
