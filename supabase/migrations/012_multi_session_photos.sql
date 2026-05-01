-- Migration: Replace single photo_url with photo_urls array for multi-photo session posts
-- Backfills existing single URLs into the new array column, then drops the old column.

-- 1. Add new array column (defaults to empty array)
ALTER TABLE sessions
  ADD COLUMN photo_urls TEXT[] NOT NULL DEFAULT '{}';

-- 2. Backfill existing rows: wrap any non-null photo_url into a 1-item array
UPDATE sessions
SET photo_urls = ARRAY[photo_url]
WHERE photo_url IS NOT NULL;

-- 3. Drop the legacy column
ALTER TABLE sessions DROP COLUMN photo_url;

-- 4. Notify PostgREST so it picks up the schema change
NOTIFY pgrst, 'reload schema';
