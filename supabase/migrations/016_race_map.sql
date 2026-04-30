-- Migration: Cycling race map (1000 km cumulative race between group members)
-- Adds icon_color to profiles and race-icons storage bucket for member PNG icons.

-- 1. Add icon_color column to profiles (hex color used for ring around the avatar)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS icon_color TEXT DEFAULT '#f97316';

-- 2. Create storage bucket for race icons (PNG portraits used on the race map)
INSERT INTO storage.buckets (id, name, public)
VALUES ('race-icons', 'race-icons', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage policies: users can upload to a folder named after their user id
CREATE POLICY "Users can upload their own race icon"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'race-icons'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own race icon"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'race-icons'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own race icon"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'race-icons'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Race icons are publicly viewable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'race-icons');

-- 4. Tell PostgREST about the new column
NOTIFY pgrst, 'reload schema';
